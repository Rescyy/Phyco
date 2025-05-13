import { max, mean, median, min, standardDeviation, sum } from "simple-statistics";
import { ColumnModel } from "../Application/Models/ColumnModel";
import Formula from "fparser";

export type StatisticType = "sum" | "mean" | "median" | "stddev" | "min" | "max";

const validStatisticTypes: StatisticType[] = ["sum", "mean", "median", "stddev", "min", "max"];

function isStatisticType(value: string): value is StatisticType {
    return validStatisticTypes.includes(value as StatisticType);
}

export type UnidimensionalStatisticalFunction = (_: number[]) => number;

export function getStatisticTypeFunction(value: StatisticType): UnidimensionalStatisticalFunction {
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

export class StatisticValues {
    sum?: number;
    mean?: number;
    median?: number;
    stddev?: number;
    min?: number;
    max?: number;
    stale = false;
};

export type ColumnStatisticValues = {
    [key: string]: StatisticValues
}

export type StatisticTypeSet = Set<StatisticType>;

export type FormulaInput = {
    [key: string]: {
        [statisticType in StatisticType]?: number;
    } & { val: number }
}

export class FormulaColumnDependencies {
    interior: Map<string, StatisticTypeSet> = new Map<string, StatisticTypeSet>();

    get(name: string): StatisticTypeSet {
        let set = this.interior.get(name);
        if (set) {
            return set;
        }
        set = new Set<StatisticType>();
        this.interior.set(name, set);
        return set;
    }

    addDependency(name: string, type?: string) {
        const set = this.get(name);
        if (type && isStatisticType(type)) {
            set.add(type);
        }
    }

    forEach(callbackFn: (value: StatisticTypeSet, key: string, map: Map<string, StatisticTypeSet>) => void) {
        this.interior.forEach(callbackFn);
    }

    has(name: string): boolean {
        return this.interior.has(name);
    }

    replace(oldName: string, newName: string) {
        const set = this.interior.get(oldName);
        if (set) {
            this.interior.delete(oldName);
            this.interior.set(newName, set);
        }
    }
}

export class ColumnFormula {
    dependencies: FormulaColumnDependencies = new FormulaColumnDependencies();
    formula: Formula;

    constructor(public columns: ColumnModel[], public rawExpression: string) {
        const evaluatedExpression = rawExpression.replace(/\[[^\[\]]*\]/g, (substring) => {
            const variableMatch = /^\[([^\[\]\.]+)(\.([^\[\]\.]+))?\]$/g.exec(substring);
            if (variableMatch === null) {
                throw this.badVariableSyntax(substring);
            }

            const columnName = variableMatch[1];
            const column = columns.find(x => x.name === columnName);
            if (column === undefined) {
                throw this.columnDoesNotExist(columnName, substring);
            }

            const columnAttributes = variableMatch.filter(x => x !== undefined);

            switch (columnAttributes.length) {
                case 2:
                    this.dependencies.addDependency(column.name);
                    return `[${column.key}.val]`;
                case 4:
                    const statisticType = columnAttributes[3];
                    if (!isStatisticType(statisticType)) {
                        throw this.notStatisticType(statisticType, substring);
                    }
                    this.dependencies.addDependency(column.name, statisticType);
                    return `[${column.key}.${statisticType}]`;
                default:
                    throw this.badVariableSyntax(substring);
            }
        });
        this.formula = new Formula(evaluatedExpression, { memoization: true });
    }

    evaluate(inputs: FormulaInput[]): number[] {
        return inputs.map(input => this.formula.evaluate(input) as number);
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