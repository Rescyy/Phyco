import { DataManager } from "../Application/Manager/DataManager";
import { BaseModel } from "../Application/Models/BaseModel";

export type Dependency = {
    /* dependent points to dependee */
    dependent: BaseModel, /* source */
    dependee: BaseModel,  /* destination */
    attribute?: any,
}

export type DependencyProjectModel = {
    dependent: string,
    dependee: string,
    attribute?: any,
}

export class DependencyGraph {
    interior: Dependency[] = [];
    models: Map<string, BaseModel> = new Map<string, BaseModel>();

    toProjectModel(): DependencyProjectModel[] {
        debugger;
        return this.interior.map(x => {
            return {
                dependent: x.dependent.key,
                dependee: x.dependee.key,
                attribute: x.attribute,
            };
        });
    }

    loadProjectModel(projectModel: DependencyProjectModel[]) {
        projectModel.map(x => {
            const dependent = this.models.get(x.dependent);
            if (!dependent) {
                throw new Error("Couldn't find dependent node with key: " + x.dependent);
            }
            const dependee = this.models.get(x.dependee);
            if (!dependee) {
                throw new Error("Couldn't find dependee node with key: " + x.dependee);
            }
            const dependency = {
                dependent, dependee, attribute: x.attribute
            }
            this.addDependency(dependency);
        });
    }

    queryDependencies(key: string): Dependency[] {
        return this.interior.filter(x => x.dependent.key === key);
    }

    queryDependents(key: string): Dependency[] {
        return this.interior.filter(x => x.dependee.key === key);
    }

    removeNode(key: string) {
        this.interior = this.interior.filter(
            x => x.dependent.key !== key && x.dependee.key !== key
        );
        this.models.delete(key);
    }

    popNodes(keys: string[]) {
        const result = this.interior.filter(
            x => keys.some(key => key === x.dependent.key || key === x.dependee.key)
        );
        this.interior = this.interior.filter(
            x => keys.every(key => key !== x.dependent.key && key !== x.dependee.key)
        );
        keys.forEach(key => this.models.delete(key));
        return result;
    }

    addDependency(dependency: Dependency) {
        if (this.checkCircularDependency(dependency.dependent.key, dependency.dependee.key)) {
            throw new Error("Circular dependency encountered");
        }
        this.addDependencyUnchecked(dependency);
    }

    addNode(model: BaseModel) {
        this.models.set(model.key, model);
        this.addDependencies(model.getDependencies());
    }

    addNodeUnchecked(model: BaseModel) {
        this.models.set(model.key, model);
        this.addDependenciesUnchecked(model.getDependencies());
    }

    addDependencies(dependencies: Dependency[]) {
        dependencies.forEach(dep => this.addDependency(dep));
    }

    addDependencyUnchecked(dependency: Dependency) {
        this.interior.push(dependency);
    }

    addNodes(models: BaseModel[]) {
        models.forEach(model => {
            this.models.set(model.key, model);
        });
    }

    addDependenciesUnchecked(dependencies: Dependency[]) {
        dependencies.forEach(dep => this.addDependencyUnchecked(dep));
    }

    removeDependencies(dependent: string) {
        this.interior = this.interior.filter(x => x.dependent.key !== dependent);
    }

    removeDependency(dependent: string, dependee: string) {
        this.interior = this.interior.filter(
            x => !(x.dependent.key === dependent && x.dependee.key === dependee)
        );
    }

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
        const testDependencies = [
            ...dataManager.dependencyGraph.interior.filter(x => x.dependent.key !== column.key),
            ...column.getDependencies()
        ];
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
        hasValueChanged: (dependent: BaseModel, changedDependencies: string[]) => boolean
    ) {
        const changed = new Set<string>([dependee.key]);

        const sorted = this.topologicalSort().reverse();

        for (const model of sorted) {
            const dependencies = this.queryDependencies(model.key)
                .map(dep => dep.dependee.key)
                .filter(depKey => changed.has(depKey));

            if (dependencies.length > 0 && hasValueChanged(model, dependencies)) {
                changed.add(model.key);
            }
        }
    }

    topologicalSort(): BaseModel[] {
        return this.topologicalSortKeys().map(key => this.models.get(key)!);
    }

    topologicalSortKeys(): string[] {
        const visited = new Set<string>();
        const recursionStack = new Set<string>();
        const result: string[] = [];

        const dfs = (node: string) => {
            if (visited.has(node)) return;
            if (recursionStack.has(node)) {
                throw new Error(`Circular dependency detected at node "${node}"`);
            }
            recursionStack.add(node);

            const dependents = this.queryDependents(node);
            for (const dep of dependents) {
                dfs(dep.dependent.key);
            }

            recursionStack.delete(node);
            visited.add(node);
            result.push(node);
        };

        for (const key of this.models.keys()) {
            dfs(key);
        }

        return result;
    }

    applyToAll(func: (model: BaseModel) => void) {
        Array.from(this.models.values()).forEach(model => func(model));
    }

    applyTopological(func: (column: BaseModel) => void) {
        this.topologicalSort().reverse().forEach(model => func(model));
    }
}
