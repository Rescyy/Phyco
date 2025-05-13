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
        debugger;
        const [rows, setRows] = dataManager.rowsState;
        this.prevValue = rows[this.rowIdx][this.columnKey];
        setRows(rows => {
            rows[this.rowIdx][this.columnKey] = this.newValue;
            return [...rows];
        });
        // dataManager.updateFormulaCells();
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
            // dataManager.updateFormulaCells();
        }
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
        // dataManager.updateFormulaCells({ usingColumns: columns });
        // dataManager.updateFormulaColumns(this.prevAttributes.name, this.attributes.name);
    }
    undo(dataManager: DataManager): void {
        if (this.prevAttributes !== null) {
            const [columns, setColumns] = dataManager.columnsState;
            const formulaColumn = columns[this.idx] as FormulaColumnModel;
            formulaColumn.name = this.prevAttributes.name;
            formulaColumn.formula = this.prevAttributes.formula;
            setColumns([...columns]);
            // dataManager.updateFormulaCells({ usingColumns: columns });
            // dataManager.updateFormulaColumns(this.attributes.name, this.prevAttributes.name);
        }
    }
}

export class AddColumnAction implements Action {
    constructor(private column: ColumnModel) { }

    do(dataManager: DataManager): void {
        debugger;
        const [columns, setColumns] = dataManager.columnsState;
        const dependencies = this.column.getDependencies(columns);
        dataManager.dependencyGraph.addDependencies(dependencies);
        this.column.initialize(dataManager);
        const newColumns = [...columns, this.column];
        setColumns(newColumns);
    }
    undo(dataManager: DataManager): void {
        debugger;
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
    private swap(dataManager: DataManager, oldColumn:ColumnModel, newColumn: ColumnModel) {
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