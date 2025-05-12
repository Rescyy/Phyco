import { ColumnFormula } from "../../Core/ColumnFormula";
import { ColumnData, ColumnModel } from "./ColumnModel";

export interface FormulaColumnData extends ColumnData {
    formula: string;
}

export class FormulaColumnModel extends ColumnModel {

    constructor(name: string, public formula: ColumnFormula) {
        super(name, "formula");
    }
    editable = false;

    override columnData(): ColumnData {
        const columnDataResponse = super.columnData() as FormulaColumnData;
        columnDataResponse.formula = this.formula.rawExpression;
        return columnDataResponse;
    }

    static filter(columns: ColumnModel[]): FormulaColumnModel[] {
        return columns.filter(x => x instanceof FormulaColumnModel);
    }

    static topologicalSort(columns: ColumnModel[]): FormulaColumnModel[] {
        const formulaColumns = FormulaColumnModel.filter(columns);
        if (formulaColumns.length <= 1) return formulaColumns;
        const columnDependenciesGraph: any[] = formulaColumns.map(x => {
            return {
                key: x.key, dependencies: []
            };
        });
        columnDependenciesGraph.forEach((columnNode, i) => {
            const formulaColumn = formulaColumns[i];
            columnNode.dependencies = formulaColumn.formula.columnDependencies.interior.map(x => x.key);
        });
        return graphTopologicalSort(columnDependenciesGraph)
            .map(x => formulaColumns.find(y => y.key === x) as FormulaColumnModel);

        function graphTopologicalSort(
            graph: { key: string; dependencies: string[] }[]
        ): string[] {
            const adjList = new Map<string, string[]>();
            const visited = new Set<string>();
            const tempMark = new Set<string>();
            const result: string[] = [];

            // Build adjacency list (key -> dependencies)
            for (const node of graph) {
                adjList.set(node.key, node.dependencies);
            }

            function visit(nodeKey: string) {
                if (visited.has(nodeKey)) return;
                if (tempMark.has(nodeKey)) {
                    throw new Error(`Cannot have circular dependencies between column formulas`);
                }

                tempMark.add(nodeKey);

                const deps = adjList.get(nodeKey) || [];
                for (const dep of deps) {
                    visit(dep);
                }

                tempMark.delete(nodeKey);
                visited.add(nodeKey);
                result.push(nodeKey);
            }

            for (const node of graph) {
                if (!visited.has(node.key)) {
                    visit(node.key);
                }
            }

            return result.reverse(); // Reverse to ensure dependencies come before dependents
        }
    }
}