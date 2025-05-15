import { ColumnDependency } from "../../Core/ColumnDependenciesGraph";
import { ColumnFormula, FormulaInput, getStatisticTypeFunction, StatisticTypeSet, StatisticValues } from "../../Core/ColumnFormula";
import { DataManager } from "../Manager/DataManager";
import { ColumnData, ColumnModel } from "./ColumnModel";

export interface FormulaColumnData extends ColumnData {
    formula: string;
}

export class FormulaColumnModel extends ColumnModel {
    editable = false;

    constructor(name: string, public formula: ColumnFormula, key?: string) {
        super(name, "formula", key);
    }

    /* call and append to the graph before initializing */
    override getDependencies(columns: ColumnModel[]): ColumnDependency[] {
        const dependencies: ColumnDependency[] = [];
        this.formula.dependencies.forEach((value, name) => {
            const column = columns.find(x => x.name === name);
            if (column) {
                dependencies.push({
                    dependent: this.key,
                    dependee: column.key,
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

    override initialize(dataManager: DataManager) {
        const [, setRows] = dataManager.rowsState;
        setRows(rows => {
            console.log(Date.now(), "initialize setRows start");
            const columnMap = new Map<string, ColumnModel>();
            dataManager.dependencyGraph.queryDependencies(this.key).map(dependency => {
                const column = dataManager.getColumn(dependency.dependee);
                if (!column) throw new Error("Missing column model while getting it from dependencies");
                const statisticTypes: StatisticTypeSet | undefined = dependency.attribute;
                if (!statisticTypes) throw new Error("Missing formula column dependency attribute");
                const statisticValues = column.attribute.statisticValues ?? new StatisticValues();
                statisticTypes.forEach(type => {
                    if (!statisticValues[type]) {
                        const statisticFunction = getStatisticTypeFunction(type);
                        const columnRows = rows.map(x => Number(x[column.key]));
                        statisticValues[type] = statisticFunction(columnRows);
                    }
                });
                column.attribute.statisticValues = statisticValues;
                columnMap.set(column.key, column);
            });
            const formulaInputs = rows.map((row, i) => {
                const formulaInput: FormulaInput = new FormulaInput(i);
                columnMap.forEach((column, key) =>
                    formulaInput.data[key] = {
                        val: parseFloat(row[key]),
                        ...column.attribute.statisticValues
                    });
                return formulaInput;
            });
            const newRows = this.formula.evaluateRange(formulaInputs).map(x => x.toString());
            console.log(Date.now(), "initialize setRows end");
            return rows.map((row, i) => {
                row[this.key] = newRows[i];
                return row;
            });
        });
    }

    override update(dataManager: DataManager, oldColumn: FormulaColumnModel): boolean {
        if (this.formula.rawExpression !== oldColumn.formula.rawExpression) {
            this.attribute.statisticValues = new StatisticValues();
            this.initialize(dataManager);
            return true;
        }
        this.formula = oldColumn.formula;
        return false;
    }

    override onDependencyNameEdit(_dataManager: DataManager, oldName: string, newName: string) {
        this.formula.dependencies.replace(oldName, newName);
        this.formula.rawExpression = this.formula.rawExpression.replace(oldName, newName);
    }

    override onDependencyUpdate(dataManager: DataManager, _changedDependencies: string[]): boolean {
        this.attribute.statisticValues = new StatisticValues();
        this.initialize(dataManager);
        return true;
    }

    override updateCell(_dataManager: DataManager, _rowIdx: number, _columnKey: string, _newValue: string): boolean {
        throw new Error("Unreachable code. Formula Column is readonly.");
    }

    override newRow(_dataManager: DataManager, index: number): string {
        return this.formula.evaluate(new FormulaInput(index)).toString();
    }

    override onRowDeleted(dataManager: DataManager, _index: number) {
        this.attribute.statisticValues = new StatisticValues();
        this.initialize(dataManager);
    }

    override onRowAdded(dataManager: DataManager, _index: number) {
        this.attribute.statisticValues = new StatisticValues();
        this.initialize(dataManager);
    }
}