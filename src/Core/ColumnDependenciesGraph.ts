import { DataManager } from "../Application/Manager/DataManager";
import { BaseModel } from "../Application/Models/BaseModel";

export type Dependency = {
    /* dependent points to dependee */
    dependent: BaseModel, /* source */
    dependee: BaseModel,  /* destination */
    attribute?: any,
}

export class DependencyGraph {
    interior: Dependency[] = [];

    queryDependencies(key: string): Dependency[] {
        return this.interior.filter(x => x.dependent.key === key);
    }

    queryDependents(key: string): Dependency[] {
        return this.interior.filter(x => x.dependee.key === key);
    }

    removeNode(key: string) {
        this.interior = this.interior.filter(x => x.dependent.key !== key && x.dependee.key !== key);
    }

    popNodes(keys: string[]) {
        const result = this.interior.filter(x => keys.some(key => key === x.dependent.key || key === x.dependee.key));
        this.interior = this.interior.filter(x => keys.some(key => key !== x.dependee.key && key !== x.dependent.key));
        return result;
    }

    addDependency(dependency: Dependency) {
        if (this.checkCircularDependency(dependency.dependent.key, dependency.dependee.key)) {
            throw new Error("Circular dependency encountered");
        }
        this.addDependencyUnchecked(dependency);
    }

    addDependencies(dependencies: Dependency[]) {
        dependencies.forEach(dependency => {
            this.addDependency(dependency);
        });
    }

    addDependencyUnchecked(dependency: Dependency) {
        this.interior.push(dependency);
    }

    addDependenciesUnchecked(dependencies: Dependency[]) {
        dependencies.forEach(dependency => {
            this.addDependencyUnchecked(dependency);
        });
    }

    removeDependencies(dependent: string) {
        this.interior = this.interior.filter(x => x.dependent.key !== dependent);
    }

    removeDependency(dependent: string, dependee: string) {
        this.interior = this.interior.filter(x => x.dependee.key !== dependee && x.dependent.key !== dependent);
    }

    /* returns true if a circular dependency will be created */
    checkCircularDependency(dependent: string, dependee: string): boolean {
        const visited = new Set<string>();

        const dfs = (node: string): boolean => {
            if (node === dependent) return true;
            if (visited.has(node)) return false;
            visited.add(node);

            const next = this.queryDependencies(node);
            return next.some(dep => dfs(dep.dependee.key));
        };

        return dfs(dependee);
    }

    checkCircularDependencyWithModel(dataManager: DataManager, column: BaseModel) {
        const testDependencies = [...dataManager.dependencyGraph.interior.filter(x => x.dependent.key !== column.key), ...column.getDependencies()]
        const testGraph = new DependencyGraph();
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
                dfs(dep.dependent.key);
            }

            result.push(node);
        };

        dfs(key);
        return result.reverse(); // topological order: dependencies first
    }

    propagateDependents(
        dependee: BaseModel,
        hasValueChanged: (dependent: BaseModel) => boolean
    ) {
        const visited = new Set<string>();
        const changed = new Set<string>([dependee.key]);

        const traverse = (currentModel: BaseModel) => {
            if (visited.has(currentModel.key)) return;
            visited.add(currentModel.key);

            // Get all dependencies that have changed
            const dependencies = this.queryDependencies(currentModel.key)
                .map(dep => dep.dependee.key)
                .filter(dep => changed.has(dep));

            if (dependencies.length === 0) return;

            if (hasValueChanged(currentModel)) {
                changed.add(currentModel.key);
                const dependents = this.queryDependents(currentModel.key);
                for (const dep of dependents) {
                    traverse(dep.dependent);
                }
            }
        };

        // Start from direct dependents (not the root key)
        for (const dep of this.queryDependents(dependee.key)) {
            traverse(dep.dependent);
        }
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
                dfs(dep.dependent.key);
            }

            result.push(node);
        };

        // Get all unique nodes in the graph
        const allKeys = new Set<string>();
        for (const { dependent, dependee } of this.interior) {
            allKeys.add(dependent.key);
            allKeys.add(dependee.key);
        }

        // Visit all nodes to ensure complete coverage
        for (const key of allKeys) {
            dfs(key);
        }

        return result;
    }
}