import Datatype from "../../Core/Datatype";
import { ColumnModel } from "../Models/ColumnModel";
import { DataManager } from "./DataManager";

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
        console.log(this.undoStack);
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
    constructor(private columnKey: string, private rowIdx: number, private prevValue: string, private newValue: string) { }
    do(dataManager: DataManager): void {
        const [rows, setRows] = dataManager.rowsState;
        const newRows = rows.map(x => x);
        newRows[this.rowIdx][this.columnKey] = this.newValue;
        setRows(newRows);
    }
    undo(dataManager: DataManager): void {
        const [rows, setRows] = dataManager.rowsState;
        const newRows = rows.map(x => x);
        newRows[this.rowIdx][this.columnKey] = this.prevValue;
        setRows(newRows);
    }
}

export class AddColumnAction implements Action {
    constructor(private column: ColumnModel) { }

    do(dataManager: DataManager): void {
        debugger;
        const [columns, setColumns] = dataManager.columnsState;
        const newColumns = [...columns, this.column];
        if (columns.length === 0) {
            const [, setRows] = dataManager.rowsState;
            setRows([dataManager.newRow(this.column)]);
        }
        setColumns(newColumns);
    }

    undo(dataManager: DataManager): void {
        debugger;
        const [columns, setColumns] = dataManager.columnsState;
        const newColumns = columns.slice(0, -1);
        if (newColumns.length === 0) {
            const [, setRows] = dataManager.rowsState;
            setRows([]);
        }
        setColumns(newColumns);
    }
}