import { max, mean, median, min, standardDeviation, sum } from "simple-statistics";
import { RowModel } from "../Application/Manager/DataManager";
import { ColumnModel } from "../Application/Models/ColumnModel";
import Formula from "fparser";

export type StatisticType = "sum" | "mean" | "median" | "stddev" | "min" | "max";

const validStatisticTypes: StatisticType[] = ["sum", "mean", "median", "stddev", "min", "max"];

function isStatisticType(value: string): value is StatisticType {
    return validStatisticTypes.includes(value as StatisticType);
}

export type UnidimensionalStatisticalFunction = (_: number[]) => number;

function getStatisticTypeFunction(value: StatisticType): UnidimensionalStatisticalFunction {
    switch (value) {
        case "sum":
            return sum;
        case "mean":
            return mean;
        case "median":
            return median;
        case "stddev":
            return standardDeviation;
        case "min":
            return min;
        case "max":
            return max;
    }
}

export type ColumnDependency = {
    key: string;
    types: StatisticType[];
}

export type StatisticValues = {
    [statisticType in StatisticType]?: number
} & {
    stale: boolean;
}

export type ColumnStatisticValues = {
    [key: string]: StatisticValues
}

export type FormulaInput = {
    [key: string]: {
        [statisticType in StatisticType]?: number;
    } & { val: number }

}

export class ColumnDependencies {
    interior: ColumnDependency[] = [];

    constructor() { }

    addDependency(columnKey: string, type?: StatisticType) {
        var dependency = this.interior.find(x => x.key === columnKey);
        if (dependency) {
            if (!dependency.types.some(x => x === type) && type) {
                dependency.types.push(type);
            }
        } else {
            this.interior.push({
                key: columnKey,
                types: type === undefined ? [] : [type]
            });
        }
    }
}

export class ColumnFormula {
    columnDependencies: ColumnDependencies;
    columnNames: Set<string> = new Set<string>();
    formula: Formula;

    constructor(public columns: ColumnModel[], public rawExpression: string) {
        this.columnDependencies = new ColumnDependencies();
        const evaluatedExpression = rawExpression.replace(/\[[^\[\]]*\]/g, (substring) => {
            const variableMatch = /^\[([^\[\]\.]+)(\.([^\[\]\.]+))?\]$/g.exec(substring);
            if (variableMatch === null) {
                throw this.badVariableSyntax(substring);
            }

            const columnName = variableMatch[1];
            this.columnNames.add(columnName);
            const column = columns.find(x => x.name === columnName);
            if (column === undefined) {
                throw this.columnDoesNotExist(columnName, substring);
            }

            const columnAttributes = variableMatch.filter(x => x !== undefined);

            switch (columnAttributes.length) {
                case 2:
                    this.columnDependencies.addDependency(column.key);
                    return `[${column.key}.val]`;
                case 4:
                    const statisticType = columnAttributes[3];
                    if (!isStatisticType(statisticType)) {
                        throw this.notStatisticType(statisticType, substring);
                    }
                    this.columnDependencies.addDependency(column.key, statisticType);
                    return `[${column.key}.${statisticType}]`;
                default:
                    throw this.badVariableSyntax(substring);
            }
        });
        this.formula = new Formula(evaluatedExpression, { memoization: true });
    }

    /* return the new column with the formula applied using the columns' rows */
    apply(rows: RowModel[], columnStatisticValues: ColumnStatisticValues): number[] {
        this.columnDependencies.interior.forEach(dependency => {
            if (columnStatisticValues[dependency.key].stale) {
                const statisticValues: StatisticValues = {stale: false};

                const columnValues = rows.map(x =>
                    parseFloat(x[dependency.key])
                ).filter(x => !Number.isNaN(x));
    
                dependency.types.forEach(type => {
                    statisticValues[type] = getStatisticTypeFunction(type)(columnValues);
                });
    
                columnStatisticValues[dependency.key] = statisticValues;
            }
        });

        return rows.map(row => {
            const formulaInput: FormulaInput = {};
            if (this.columnDependencies.interior.some(dependency => {
                const key = dependency.key;
                const rowValue = parseFloat(row[key]);
                if (Number.isNaN(rowValue)) return true;
                formulaInput[key] = {
                    val: parseFloat(row[key]),
                    ...columnStatisticValues[key]
                };
                return false;
            })) return NaN;
            console.log(formulaInput);
            return this.formula.evaluate(formulaInput) as number;
        });
    }

    badVariableSyntax(variable: string): Error {
        return new Error(`Bad variable syntax: ${variable}`);
    }

    columnDoesNotExist(name: string, variable: string): Error {
        return new Error(`Column with name '${name}' does not exist: ${variable}`);
    }

    notStatisticType(type: string, variable: string): Error {
        return new Error(`'${type}' is not a statistic type: ${variable}`);
    }
}