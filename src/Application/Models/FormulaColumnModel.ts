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
                    const columnRows = dataManager.getRow(column.key).map(x => Number(x));
                    statisticValues[type] = statisticFunction(columnRows);
                }
            });
            column.attribute.statisticValues = statisticValues;
            columnMap.set(column.key, column);
        });
        setRows(rows => {
            const formulaInputs = rows.map(row => {
                const formulaInput: FormulaInput = {};
                columnMap.forEach((column, key) =>
                    formulaInput[key] = {
                        val: parseFloat(row[key]),
                        ...column.attribute.statisticValues
                    });
                return formulaInput;
            });
            const newRows = this.formula.evaluate(formulaInputs).map(x => x.toString());
            return rows.map((row, i) => {
                row[this.key] = newRows[i];
                return row;
            })
        });
    }

    override update(dataManager: DataManager, oldColumn: FormulaColumnModel): boolean {
        if (this.formula.rawExpression !== oldColumn.formula.rawExpression) {
            this.initialize(dataManager);
            return true;
        }
        this.formula = oldColumn.formula;
        return false;
    }

    onDependencyNameEdit(dataManager: DataManager, oldName: string, newName: string) {
        this.formula.dependencies.replace(oldName, newName);
        this.formula.rawExpression = this.formula.rawExpression.replace(oldName, newName);
    }
}