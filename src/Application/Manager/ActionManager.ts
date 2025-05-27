import { Dependency } from "../../Core/DependencyGraph";
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
            this.dataManager.dependencyGraph.propagateDependents(column, (baseModel, updatedDependencies) =>
                Boolean(baseModel.onDependencyUpdate(updatedDependencies))
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
        const newColumns = [...columns, this.column];
        const newColumnData = newColumns.map(x => x.columnData());
        this.dataManager.dependencyGraph.applyToAll(x => x.onNewColumns(newColumnData));
        this.dataManager.dependencyGraph.addNode(this.column);
        if (columns.length == 0) {
            const [, setRows] = this.dataManager.rowsState;
            setRows([this.dataManager.newRow(this.column, 0)]);
        }
        this.column.initialize();
        setColumns(newColumns);
    }

    undo(): void {
        const [columns, setColumns] = this.dataManager.columnsState;
        this.dataManager.dependencyGraph.removeNode(columns[columns.length - 1].key);
        this.dataManager.dependencyGraph.applyToAll(x => x.onDeletedColumns([this.column.key]));
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
                const model = dependency.dependent;
                model?.onDependencyNameEdit(newColumn.key, oldColumn.name, newColumn.name);
            });
        }
        if (newColumn.update(oldColumn)) {
            this.dataManager.dependencyGraph.propagateDependents(newColumn, (baseModel, updatedDependencies) => {
                return baseModel?.onDependencyUpdate(updatedDependencies) ?? false;
            });
        }
        columns[this.idx] = newColumn;
        setColumns([...columns]);
    }
}

export class AddRowAction extends DataAction {
    do(): void {
        debugger;
        const [rows, setRows] = this.dataManager.rowsState;
        const newRow = { key: Date.now().toString() };
        const newRows = [...rows, newRow];
        setRows(newRows);
        this.dataManager.dependencyGraph.applyTopological((column) => {
            column.onRowAdded(rows.length, newRow);
        });
    }

    undo(): void {
        const [rows, setRows] = this.dataManager.rowsState;
        const deletedRow = rows[rows.length - 1];
        const newRows = rows.slice(0, -1);
        setRows(newRows);
        this.dataManager.dependencyGraph.applyTopological((column) => {
            column.onRowDeleted(rows.length - 1, deletedRow);
        });
    }
}

type ColumnModelPosition = {
    index: number,
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
        this.dataManager.dependencyGraph.applyToAll(x => x.onDeletedColumns(deletedColumnKeys));
        this.deletedColumns = deletedColumnKeys.map(key => {
            const index = columns.findIndex(x => x.key === key);
            return {
                index,
                column: columns[index]
            };
        });
        setColumns(columns => {
            return columns.filter((_, i) => !this.deletedColumns.some(column => column.index === i));
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
        const [, setColumns] = this.dataManager.columnsState;
        const deletedRows = this.deletedRows;
        this.dataManager.dependencyGraph.addDependenciesUnchecked(this.deletedDependencies);
        this.dataManager.dependencyGraph.addNodes(this.deletedColumns.map(x => x.column));
        setRows(rows => rows.map((x, i) => { return { ...x, ...deletedRows[i] }; }));
        setColumns(columns => {
            this.deletedColumns.forEach(({ column, index: idx }) => {
                columns = columns.splice(idx, 0, column);
            });
            const columnData = columns.map(x => x.columnData());
            this.dataManager.dependencyGraph.applyToAll(x => x.onNewColumns(columnData));
            return columns;
        });
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
            this.dataManager.dependencyGraph.applyTopological((column) => {
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
            this.dataManager.dependencyGraph.applyTopological((column) => {
                column.onRowAdded(this.idx, this.deletedRow!);
            });
        }
    }
}