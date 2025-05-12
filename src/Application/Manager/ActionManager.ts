import { ColumnFormula } from "../../Core/ColumnFormula";
import { ColumnModel } from "../Models/ColumnModel";
import { FormulaColumnModel } from "../Models/FormulaColumnModel";
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
        const [rows, setRows] = dataManager.rowsState;
        this.prevValue = rows[this.rowIdx][this.columnKey];
        setRows(rows => {
            rows[this.rowIdx][this.columnKey] = this.newValue;
            return [...rows];
        })
        dataManager.updateFormulaCells();
    }
    undo(dataManager: DataManager): void {
        if (this.prevValue !== null) {
            const [, setRows] = dataManager.rowsState;
            setRows(rows => {
                if (this.prevValue !== null) {
                    rows[this.rowIdx][this.columnKey] = this.prevValue;
                }
                return [...rows];
            })
            dataManager.updateFormulaCells();
        }
    }
}

export class AddFormulaColumnAction implements Action {
    constructor(private column: FormulaColumnModel) { }

    do(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        const [rows, setRows] = dataManager.rowsState;
        const newColumns = [...columns, this.column];

        const newRows = this.column.formula.apply(rows, dataManager.columnStatisticValues);
        rows.forEach((row, i) => {
            const newRow = newRows[i];
            row[this.column.key] = newRow.toString();
        });
        setRows(rows);
        setColumns(newColumns);
    }
    undo(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        const prevColumns = columns.slice(0, -1);
        if (prevColumns.length === 0) {
            const [, setRows] = dataManager.rowsState;
            setRows([]);
        }
        setColumns(prevColumns);
    }
}

export type EditFormulaColumnActionAttributes = {
    name: string,
    formula: ColumnFormula
};

export class EditFormulaColumnAction implements Action {
    private prevAttributes: EditFormulaColumnActionAttributes | null = null;
    constructor(private idx: number, private attributes: EditFormulaColumnActionAttributes) { }
    do(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        const formulaColumn = columns[this.idx] as FormulaColumnModel;
        this.prevAttributes = {
            name: formulaColumn.name,
            formula: formulaColumn.formula,
        };
        formulaColumn.name = this.attributes.name;
        formulaColumn.formula = this.attributes.formula;
        setColumns([...columns]);
        dataManager.updateFormulaCells({ usingColumns: columns });
        dataManager.updateExpressionsColumnNames(this.prevAttributes.name, this.attributes.name);
    }
    undo(dataManager: DataManager): void {
        if (this.prevAttributes !== null) {
            const [columns, setColumns] = dataManager.columnsState;
            const formulaColumn = columns[this.idx] as FormulaColumnModel;
            formulaColumn.name = this.prevAttributes.name;
            formulaColumn.formula = this.prevAttributes.formula;
            setColumns([...columns]);
            dataManager.updateFormulaCells({ usingColumns: columns });
            dataManager.updateExpressionsColumnNames(this.attributes.name, this.prevAttributes.name);
        }
    }
}

export class AddColumnAction implements Action {
    constructor(private column: ColumnModel) { }

    do(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        const newColumns = [...columns, this.column];
        if (columns.length === 0) {
            const [, setRows] = dataManager.rowsState;
            setRows([dataManager.newRow(this.column)]);
        }
        setColumns(newColumns);
    }
    undo(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        const prevColumns = columns.slice(0, -1);
        if (prevColumns.length === 0) {
            const [, setRows] = dataManager.rowsState;
            setRows([]);
        }
        setColumns(prevColumns);
    }
}

export class EditColumnAction implements Action {
    private prevName: string | null = null;

    constructor(private idx: number, private name: string) { }

    do(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        this.prevName = columns[this.idx].name;
        columns[this.idx].name = this.name;
        setColumns([...columns]);
        dataManager.updateExpressionsColumnNames(this.prevName, this.name);
    }
    undo(dataManager: DataManager): void {
        if (this.prevName !== null) {
            const [columns, setColumns] = dataManager.columnsState;
            columns[this.idx].name = this.prevName;
            setColumns([...columns]);
            dataManager.updateExpressionsColumnNames(this.name, this.prevName);
        }
    }
}

export class AddRowAction implements Action {
    do(dataManager: DataManager): void {
        const [rows, setRows] = dataManager.rowsState;
        setRows([...rows, dataManager.newRow()]);
    }

    undo(dataManager: DataManager): void {
        const [rows, setRows] = dataManager.rowsState;
        setRows(rows.slice(0, -1));
    }
}

export class DeleteColumnAction implements Action {
    private deletedColumn: ColumnModel | null = null;

    constructor(private idx: number) { }

    do(dataManager: DataManager): void {
        const [columns, setColumns] = dataManager.columnsState;
        if (this.idx >= 0 && this.idx < columns.length) {
            this.deletedColumn = columns[this.idx];
            const newColumns = columns.filter((_, filterIdx) => filterIdx !== this.idx);
            setColumns(newColumns);
        }
    }

    undo(dataManager: DataManager): void {
        if (this.deletedColumn !== null) {
            const [columns, setColumns] = dataManager.columnsState;
            const prevColumns = [
                ...columns.slice(0, this.idx),
                this.deletedColumn,
                ...columns.slice(this.idx)
            ];
            setColumns(prevColumns);
        }
    }
}

export class DeleteRowAction implements Action {
    private deletedRow: RowModel | null = null;

    constructor(private idx: number) { }

    do(dataManager: DataManager): void {
        const [rows, setRows] = dataManager.rowsState;
        if (this.idx >= 0 && this.idx < rows.length) {
            this.deletedRow = rows[this.idx];
            const newRows = rows.filter((_, filterIdx) => filterIdx !== this.idx);
            setRows(newRows);
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
        }
    }
}