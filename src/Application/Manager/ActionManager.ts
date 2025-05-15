import { ColumnDependency } from "../../Core/ColumnDependenciesGraph";
import { ColumnModel } from "../Models/ColumnModel";
import { DataManager, RowModel } from "./DataManager";

interface Action {
    do(dataManager: DataManager): void;
    undo(dataManager: DataManager): void;
}

export class ActionManager {
    private undoStack: Action[] = [];
    private redoStack: Action[] = [];

    push(action: Action) {
        this.undoStack.push(action);
        this.redoStack = [];
    }

    execute(dataManager: DataManager, action: Action) {
        action.do(dataManager);
        this.push(action);
    }

    undo(dataManager: DataManager) {
        const action = this.undoStack.pop();
        if (action) {
            action.undo(dataManager);
            this.redoStack.push(action);
        }
    }

    redo(dataManager: DataManager) {
        const action = this.redoStack.pop();
        if (action) {
            action.do(dataManager);
            this.undoStack.push(action);
        }
    }
}

export class EditCellAction implements Action {
    private prevValue: string | null = null;

    constructor(private columnKey: string, private rowIdx: number, private newValue: string) { }
    do(dataManager: DataManager): void {
        const [rows,] = dataManager.rowsState;
        this.prevValue = rows[this.rowIdx][this.columnKey];
        if (dataManager.getColumn(this.columnKey)?.updateCell(dataManager, this.rowIdx, this.columnKey, this.newValue)) {
            dataManager.dependencyGraph.propagateDependents(this.columnKey, (key, changedDependencies) =>
                Boolean(dataManager.getColumn(key)?.onDependencyUpdate(dataManager, changedDependencies))
            );
        }
    }
    undo(dataManager: DataManager): void {
        if (this.prevValue !== null) {
            dataManager.getColumn(this.columnKey)?.updateCell(dataManager, this.rowIdx, this.columnKey, this.prevValue);
        }
    }
}

export class AddColumnAction implements Action {
    constructor(private column: ColumnModel) { }

    do(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        const dependencies = this.column.getDependencies(columns);
        dataManager.dependencyGraph.addDependencies(dependencies);
        if (columns.length == 0) {
            const [, setRows] = dataManager.rowsState;
            setRows([dataManager.newRow(this.column, 0)]);
        }
        this.column.initialize(dataManager);
        const newColumns = [...columns, this.column];
        setColumns(newColumns);
    }
    undo(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        dataManager.dependencyGraph.removeDependencies(columns[columns.length - 1].key);
        const prevColumns = columns.slice(0, -1);
        if (prevColumns.length === 0) {
            const [, setRows] = dataManager.rowsState;
            setRows([]);
        }
        setColumns(prevColumns);
    }
}

export class EditColumnAction implements Action {
    private prevColumn: ColumnModel | null = null;

    constructor(private newColumn: ColumnModel, private idx: number) { }

    do(dataManager: DataManager): void {
        const [columns] = dataManager.columnsState;
        this.prevColumn = columns[this.idx];
        this.swap(dataManager, this.prevColumn, this.newColumn);
    }
    undo(dataManager: DataManager): void {
        if (this.prevColumn) {
            this.swap(dataManager, this.newColumn, this.prevColumn);
        }
    }
    private swap(dataManager: DataManager, oldColumn: ColumnModel, newColumn: ColumnModel) {
        const [columns, setColumns] = dataManager.columnsState;
        const dependencies = newColumn.getDependencies(columns);
        dataManager.dependencyGraph.removeDependencies(newColumn.key);
        dataManager.dependencyGraph.addDependencies(dependencies);
        if (oldColumn.name !== newColumn.name) {
            dataManager.dependencyGraph.queryDependents(newColumn.key).forEach(dependency => {
                const column = dataManager.getColumn(dependency.dependent);
                column?.onDependencyNameEdit(dataManager, oldColumn!.name, newColumn.name);
            });
        }
        if (newColumn.update(dataManager, oldColumn)) {
            dataManager.dependencyGraph.propagateDependents(newColumn.key, (key, changedDependencies) => {
                const column = dataManager.getColumn(key);
                return column?.onDependencyUpdate(dataManager, changedDependencies) ?? false;
            });
        }
        columns[this.idx] = newColumn;
        setColumns([...columns]);
    }
}

export class AddRowAction implements Action {
    do(dataManager: DataManager): void {
        const [rows, setRows] = dataManager.rowsState;
        setRows([...rows, {key: Date.now().toString()}]);
        dataManager.applyTopological((column) => {
            column.onRowAdded(dataManager, rows.length);
        });
    }

    undo(dataManager: DataManager): void {
        const [rows, setRows] = dataManager.rowsState;
        setRows(rows.slice(0, -1));
        dataManager.applyTopological((column) => {
            column.onRowDeleted(dataManager, rows.length - 1);
        });
    }
}

type ColumnModelPosition = {
    idx: number,
    column: ColumnModel
}

export class DeleteColumnAction implements Action {
    private deletedColumns: ColumnModelPosition[] = [];
    private deletedRows: RowModel[] = [];
    private deletedDependencies: ColumnDependency[] = [];

    constructor(private idx: number) { }

    do(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        const key = columns[this.idx].key;
        const deletedColumnKeys = dataManager.dependencyGraph.traverseDependents(key);
        this.deletedDependencies = dataManager.dependencyGraph.popNodes(deletedColumnKeys);
        this.deletedColumns = deletedColumnKeys.map(key => {
            const idx = columns.findIndex(x => x.key === key);
            return {
                idx,
                column: columns[idx]
            };
        });
        setColumns(columns => {
            return columns.filter((_, i) => !this.deletedColumns.some(column => column.idx === i));
        });
        const [rows] = dataManager.rowsState;
        this.deletedRows = rows.map(row => {
            const deletedRow: RowModel = {};
            deletedColumnKeys.forEach(key => deletedRow[key] = row[key]);
            return deletedRow;
        });
    }

    undo(dataManager: DataManager): void {
        const [, setRows] = dataManager.rowsState;
        const [columns, setColumns] = dataManager.columnsState;
        const deletedRows = this.deletedRows;
        dataManager.dependencyGraph.addDependenciesUnchecked(this.deletedDependencies);
        setRows(rows => rows.map((x, i) => { return { ...x, ...deletedRows[i] }; }));
        this.deletedColumns.forEach(({ column, idx }) => {
            columns.splice(idx, 0, column);
        });
        setColumns(columns);
    }
}

export class DeleteRowAction implements Action {
    private deletedRow: RowModel | null = null;

    constructor(private idx: number) { }

    do(dataManager: DataManager): void {
        debugger;
        const [rows, setRows] = dataManager.rowsState;
        if (this.idx >= 0 && this.idx < rows.length) {
            this.deletedRow = rows[this.idx];
            const newRows = rows.filter((_, filterIdx) => filterIdx !== this.idx);
            setRows(newRows);
            dataManager.applyTopological((column) => {
                column.onRowDeleted(dataManager, this.idx);
            });
        }
    }

    undo(dataManager: DataManager): void {
        if (this.deletedRow !== null) {
            const [rows, setRows] = dataManager.rowsState;
            const prevRows = [
                ...rows.slice(0, this.idx),
                this.deletedRow,
                ...rows.slice(this.idx)
            ];
            setRows(prevRows);
            dataManager.applyTopological((column) => {
                column.onRowAdded(dataManager, this.idx);
            });
        }
    }
}