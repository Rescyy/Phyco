import { DataManager } from "../Application/Manager/DataManager";
import { ColumnModel } from "../Application/Models/ColumnModel";

export type ColumnDependency = {
    /* dependent points to dependee */
    dependent: string, /* source */
    dependee: string,  /* destination */
    attribute?: any,
}

export class ColumnDependencyGraph {
    interior: ColumnDependency[] = [];

    queryDependencies(key: string): ColumnDependency[] {
        return this.interior.filter(x => x.dependent === key);
    }

    queryDependents(key: string): ColumnDependency[] {
        return this.interior.filter(x => x.dependee === key);
    }

    removeNode(key: string) {
        this.interior = this.interior.filter(x => x.dependent !== key && x.dependee !== key);
    }

    popNodes(keys: string[]) {
        const result = this.interior.filter(x => keys.some(key => key === x.dependent || key === x.dependee));
        this.interior = this.interior.filter(x => keys.some(key => key !== x.dependee && key !== x.dependent));
        return result;
    }

    addDependency(dependency: ColumnDependency) {
        if (this.checkCircularDependency(dependency.dependent, dependency.dependee)) {
            throw new Error("Circular dependency encountered");
        }
        this.addDependencyUnchecked(dependency);
    }

    addDependencies(dependencies: ColumnDependency[]) {
        dependencies.forEach(dependency => {
            this.addDependency(dependency);
        });
    }

    addDependencyUnchecked(dependency: ColumnDependency) {
        this.interior.push(dependency);
    }

    addDependenciesUnchecked(dependencies: ColumnDependency[]) {
        dependencies.forEach(dependency => {
            this.addDependencyUnchecked(dependency);
        });
    }

    removeDependencies(dependent: string) {
        this.interior = this.interior.filter(x => x.dependent !== dependent);
    }

    removeDependency(dependent: string, dependee: string) {
        this.interior = this.interior.filter(x => x.dependee !== dependee && x.dependent !== dependent);
    }

    /* returns true if a circular dependency will be created */
    checkCircularDependency(dependent: string, dependee: string): boolean {
        const visited = new Set<string>();

        const dfs = (node: string): boolean => {
            if (node === dependent) return true;
            if (visited.has(node)) return false;
            visited.add(node);

            const next = this.queryDependencies(node);
            return next.some(dep => dfs(dep.dependee));
        };

        return dfs(dependee);
    }

    checkCircularDependencyWithModel(dataManager: DataManager, column: ColumnModel) {
        const [columns] = dataManager.columnsState;
        const testDependencies = [...dataManager.dependencyGraph.interior.filter(x => x.dependent !== column.key), ...column.getDependencies(columns)]
        const testGraph = new ColumnDependencyGraph();
        try {
            testGraph.addDependencies(testDependencies);
        } catch {
            return true;
        }
        return false;
    }

    traverseDependents(key: string): string[] {
        const visited = new Set<string>();
        const result: string[] = [];

        const dfs = (node: string) => {
            if (visited.has(node)) return;
            visited.add(node);

            const dependents = this.queryDependents(node);
            for (const dep of dependents) {
                dfs(dep.dependent);
            }

            result.push(node);
        };

        dfs(key);
        return result.reverse(); // topological order: dependencies first
    }

    propagateDependents(
        key: string,
        hasValueChanged: (key: string, changedDependencies: string[]) => boolean
    ): string[] {
        const visited = new Set<string>();
        const changed = new Set<string>([key]);

        const traverse = (currentKey: string) => {
            if (visited.has(currentKey)) return;
            visited.add(currentKey);

            // Get all dependencies that have changed
            const dependencies = this.queryDependencies(currentKey)
                .map(dep => dep.dependee)
                .filter(dep => changed.has(dep));

            if (dependencies.length === 0) return;

            if (hasValueChanged(currentKey, dependencies)) {
                changed.add(currentKey);
                const dependents = this.queryDependents(currentKey);
                for (const dep of dependents) {
                    traverse(dep.dependent);
                }
            }
        };

        // Start from direct dependents (not the root key)
        for (const dep of this.queryDependents(key)) {
            traverse(dep.dependent);
        }

        return Array.from(changed);
    }

    /* starts from the most dependent */
    topologicalSort(): string[] {
        const visited = new Set<string>();
        const result: string[] = [];

        const dfs = (node: string) => {
            if (visited.has(node)) return;
            visited.add(node);

            const dependents = this.queryDependents(node);
            for (const dep of dependents) {
                dfs(dep.dependent);
            }

            result.push(node);
        };

        // Get all unique nodes in the graph
        const allKeys = new Set<string>();
        for (const { dependent, dependee } of this.interior) {
            allKeys.add(dependent);
            allKeys.add(dependee);
        }

        // Visit all nodes to ensure complete coverage
        for (const key of allKeys) {
            dfs(key);
        }

        return result;
    }
}