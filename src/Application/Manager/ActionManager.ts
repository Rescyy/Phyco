import { Dependency } from "../../Core/ColumnDependenciesGraph";
import { ColumnModel } from "../Models/ColumnModel";
import { DataManager, RowModel } from "./DataManager";

export interface Action {
    do(): void;
    undo(): void;
}
export class ActionManager {
    private undoStack: Action[] = [];
    private redoStack: Action[] = [];
    execute(action: Action) {
        action.do();
        this.undoStack.push(action);
        this.redoStack.length = 0;
    }
    undo() {
        this.transfer(this.undoStack, this.redoStack, a => a.undo());
    }
    redo() {
        this.transfer(this.redoStack, this.undoStack, a => a.do());
    }
    private transfer(from: Action[], to: Action[], act: (a: Action) => void) {
        const action = from.pop();
        if (!action) return;
        act(action);
        to.push(action);
    }
}
abstract class DataAction implements Action {
    constructor(protected dataManager: DataManager) { }
    abstract do(): void;
    abstract undo(): void;
}

export class EditCellAction extends DataAction {
    private prevValue: string | null = null;

    constructor(dataManager: DataManager, private columnKey: string, private rowIdx: number, private newValue: string) {
        super(dataManager);
    }

    do(): void {
        debugger;
        const [rows,] = this.dataManager.rowsState;
        this.prevValue = rows[this.rowIdx][this.columnKey];
        const column = this.dataManager.getColumn(this.columnKey);
        if (column?.updateCell(this.rowIdx, this.columnKey, this.newValue)) {
            this.dataManager.dependencyGraph.propagateDependents(column, (column) =>
                Boolean(column.onDependencyUpdate())
            );
        }
    }

    undo(): void {
        if (this.prevValue !== null) {
            this.dataManager.getColumn(this.columnKey)?.updateCell(this.rowIdx, this.columnKey, this.prevValue);
        }
    }
}

export class AddColumnAction extends DataAction {
    constructor(dataManager: DataManager, private column: ColumnModel) {
        super(dataManager);
    }

    do(): void {
        const [columns, setColumns] = this.dataManager.columnsState;
        const dependencies = this.column.getDependencies();
        this.dataManager.dependencyGraph.addDependencies(dependencies);
        if (columns.length == 0) {
            const [, setRows] = this.dataManager.rowsState;
            setRows([this.dataManager.newRow(this.column, 0)]);
        }
        this.column.initialize();
        const newColumns = [...columns, this.column];
        setColumns(newColumns);
    }

    undo(): void {
        const [columns, setColumns] = this.dataManager.columnsState;
        this.dataManager.dependencyGraph.removeDependencies(columns[columns.length - 1].key);
        const prevColumns = columns.slice(0, -1);
        if (prevColumns.length === 0) {
            const [, setRows] = this.dataManager.rowsState;
            setRows([]);
        }
        setColumns(prevColumns);
    }
}

export class EditColumnAction extends DataAction {
    private prevColumn: ColumnModel | null = null;

    constructor(dataManager: DataManager, private newColumn: ColumnModel, private idx: number) {
        super(dataManager);
    }

    do(): void {
        const [columns] = this.dataManager.columnsState;
        this.prevColumn = columns[this.idx];
        this.swap(this.prevColumn, this.newColumn);
    }

    undo(): void {
        if (this.prevColumn) {
            this.swap(this.newColumn, this.prevColumn);
        }
    }

    private swap(oldColumn: ColumnModel, newColumn: ColumnModel) {
        const [columns, setColumns] = this.dataManager.columnsState;
        const dependencies = newColumn.getDependencies();
        this.dataManager.dependencyGraph.removeDependencies(newColumn.key);
        this.dataManager.dependencyGraph.addDependencies(dependencies);
        if (oldColumn.name !== newColumn.name) {
            this.dataManager.dependencyGraph.queryDependents(newColumn.key).forEach(dependency => {
                const column = dependency.dependent;
                column?.onDependencyNameEdit(oldColumn.name, newColumn.name);
            });
        }
        if (newColumn.update(oldColumn)) {
            this.dataManager.dependencyGraph.propagateDependents(newColumn, (column) => {
                return column?.onDependencyUpdate() ?? false;
            });
        }
        columns[this.idx] = newColumn;
        setColumns([...columns]);
    }
}

export class AddRowAction extends DataAction {
    do(): void {
        const [rows, setRows] = this.dataManager.rowsState;
        const newRow = { key: Date.now().toString() };
        setRows([...rows, newRow]);
        this.dataManager.applyTopological((column) => {
            column.onRowAdded(rows.length, newRow);
        });
    }

    undo(): void {
        const [rows, setRows] = this.dataManager.rowsState;
        const deletedRow = rows[rows.length - 1];
        setRows(rows.slice(0, -1));
        this.dataManager.applyTopological((column) => {
            column.onRowDeleted(rows.length - 1, deletedRow);
        });
    }
}

type ColumnModelPosition = {
    idx: number,
    column: ColumnModel
};

export class DeleteColumnAction extends DataAction {
    private deletedColumns: ColumnModelPosition[] = [];
    private deletedRows: RowModel[] = [];
    private deletedDependencies: Dependency[] = [];

    constructor(dataManager: DataManager, private idx: number) {
        super(dataManager);
    }

    do(): void {
        const [columns, setColumns] = this.dataManager.columnsState;
        const key = columns[this.idx].key;
        const deletedColumnKeys = this.dataManager.dependencyGraph.traverseDependents(key);
        this.deletedDependencies = this.dataManager.dependencyGraph.popNodes(deletedColumnKeys);
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
        const [rows] = this.dataManager.rowsState;
        this.deletedRows = rows.map(row => {
            const deletedRow: RowModel = {};
            deletedColumnKeys.forEach(key => deletedRow[key] = row[key]);
            return deletedRow;
        });
    }

    undo(): void {
        const [, setRows] = this.dataManager.rowsState;
        const [columns, setColumns] = this.dataManager.columnsState;
        const deletedRows = this.deletedRows;
        this.dataManager.dependencyGraph.addDependenciesUnchecked(this.deletedDependencies);
        setRows(rows => rows.map((x, i) => { return { ...x, ...deletedRows[i] }; }));
        this.deletedColumns.forEach(({ column, idx }) => {
            columns.splice(idx, 0, column);
        });
        setColumns(columns);
    }
}

export class DeleteRowAction extends DataAction {
    private deletedRow: RowModel | null = null;

    constructor(dataManager: DataManager, private idx: number) {
        super(dataManager);
    }

    do(): void {
        debugger;
        const [rows, setRows] = this.dataManager.rowsState;
        if (this.idx >= 0 && this.idx < rows.length) {
            this.deletedRow = rows[this.idx];
            const newRows = rows.filter((_, filterIdx) => filterIdx !== this.idx);
            setRows(newRows);
            this.dataManager.applyTopological((column) => {
                column.onRowDeleted(this.idx, this.deletedRow!);
            });
        }
    }

    undo(): void {
        if (this.deletedRow !== null) {
            const [rows, setRows] = this.dataManager.rowsState;
            const prevRows = [
                ...rows.slice(0, this.idx),
                this.deletedRow,
                ...rows.slice(this.idx)
            ];
            setRows(prevRows);
            this.dataManager.applyTopological((column) => {
                column.onRowAdded(this.idx, this.deletedRow!);
            });
        }
    }
}