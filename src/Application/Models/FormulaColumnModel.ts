import { Dependency } from "../../Core/ColumnDependenciesGraph";
import { ColumnFormula, FormulaInput, getStatisticTypeFunction, StatisticTypeSet } from "../../Core/ColumnFormula";
import { DataManager } from "../Manager/DataManager";
import { BaseModel } from "./BaseModel";
import { ColumnData, ColumnModel } from "./ColumnModel";

export interface FormulaColumnData extends ColumnData {
    formula: string;
}

export class FormulaColumnModel extends ColumnModel {
    editable = false;

    constructor(dataManager: DataManager, name: string, public formula: ColumnFormula, key?: string) {
        super(dataManager, name, "formula", key);
    }

    /* call and append to the graph before initializing */
    override getDependencies(): Dependency[] {
        const [columns] = this.dataManager.columnsState;
        const dependencies: Dependency[] = [];
        this.formula.dependencies.forEach((value, name) => {
            const column = columns.find(x => x.name === name);
            if (column) {
                dependencies.push({
                    dependent: this,
                    dependee: column,
                    attribute: value
                });
            }
        });
        return dependencies;
    }

    override columnData(): ColumnData {
        const columnDataResponse = super.columnData() as FormulaColumnData;
        columnDataResponse.formula = this.formula.rawExpression;
        return columnDataResponse;
    }

    override initialize() {
        const [, setRows] = this.dataManager.rowsState;
        setRows(rows => {
            const columnMap = new Map<string, ColumnModel>();
            debugger;
            this.dataManager.dependencyGraph.queryDependencies(this.key).map(dependency => {
                const column = dependency.dependee as ColumnModel;
                if (!column) throw new Error("Missing column model while getting it from dependencies");
                const statisticTypes: StatisticTypeSet | undefined = dependency.attribute;
                if (!statisticTypes) throw new Error("Missing formula column dependency attribute");
                const statisticValues = this.getStatisticValues(column);
                statisticTypes.forEach(type => {
                    if (!statisticValues.get(type)) {
                        const statisticFunction = getStatisticTypeFunction(type);
                        const columnRows = rows.filter(x => x[column.key]).map(x => Number(x[column.key]));
                        statisticValues.set(type, statisticFunction(columnRows));
                    }
                });
                columnMap.set(column.key, column);
            });
            const formulaInputs = rows.map((row, i) => {
                const formulaInput: FormulaInput = new FormulaInput(i);
                columnMap.forEach((column, key) =>
                    formulaInput.data[key] = {
                        val: parseFloat(row[key]),
                        ...Object.fromEntries(column.attributes.statisticValues)
                    });
                return formulaInput;
            });
            const newRows = this.formula.evaluateRange(formulaInputs).map(x => x.toString());
            return rows.map((row, i) => {
                row[this.key] = newRows[i];
                return row;
            });
        });
    }

    override update(_oldColumn: BaseModel): boolean {
        const oldColumn = _oldColumn as unknown as FormulaColumnModel;
        if (this.formula.rawExpression !== oldColumn.formula.rawExpression) {
            this.clearStatisticValues();
            this.initialize();
            return true;
        }
        this.formula = oldColumn.formula;
        return false;
    }

    override onDependencyNameEdit(oldName: string, newName: string) {
        this.formula.dependencies.replace(oldName, newName);
        this.formula.rawExpression = this.formula.rawExpression.replace(oldName, newName);
    }

    override onDependencyUpdate(): boolean {
        this.clearStatisticValues();
        this.initialize();
        return true;
    }

    override updateCell(_rowIdx: number, _columnKey: string, _newValue: string): boolean {
        throw new Error("Unreachable code. Formula Column is readonly.");
    }

    override newRow(index: number): string {
        return this.formula.evaluate(new FormulaInput(index)).toString();
    }

    override onRowDeleted(_index: number) {
        this.attributes.statisticValues.clear();
        this.initialize();
    }

    override onRowAdded(_index: number) {
        this.attributes.statisticValues.clear();
        this.initialize();
    }
}