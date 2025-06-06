import { BaseModel } from './BaseModel';
import { Dependency } from '../../Core/DependencyGraph';
import ChartType, { getChartType } from '../../Core/ChartType';
import { UnlistenFn } from '@tauri-apps/api/event';
import { ChartOptions, ChartDatasetConfiguration, ViewChartEvents } from '../../Presentation/Views/Chart/ViewChart';
import ChartManager from '../Manager/ChartManager';
import { ColumnData } from './ColumnModel';

export default class ChartModel extends BaseModel {
    toProjectModel() {
        debugger;
        return {
            type: this.type.value,
            options: this.options,
            name: this.name,
            datasets: this.datasets,
            key: this.key,
        };
    }
    type: ChartType;
    open: boolean = false;
    options: ChartOptions = {};
    datasets: ChartDatasetConfiguration[] = [];

    private unlistens: UnlistenFn[] = [];

    static fromProjectModel(chartManager: ChartManager, projectModel: any): ChartModel {
        debugger;
        const chart = new ChartModel(chartManager, projectModel.name, projectModel.type, projectModel.key);
        chart.options = projectModel.options;
        chart.datasets = projectModel.datasets;
        return chart;
    }

    disposeListeners() {
        this.open = false;
        this.unlistens.forEach(x => x());
        this.unlistens = [];
    }
    addUnlistens(...unlistens: UnlistenFn[]) {
        unlistens.forEach(unlisten => this.unlistens.push(unlisten));
    }

    constructor(private chartManager: ChartManager, name: string, type: string, key?: string) {
        super(name, key);
        this.type = getChartType(type)!;
    }
    static getDatasetsKeys(datasets: ChartDatasetConfiguration[]): string[] {
        const dependencies = new Set<string>();
        const pushDependency = (dependencyKey: string | undefined) => {
            if (dependencyKey) {
                dependencies.add(dependencyKey);
            }
        };
        datasets.forEach(dataset => {
            pushDependency(dataset.xKey);
            pushDependency(dataset.yKey);
        });
        return Array.from(dependencies);
    }
    getDependenciesKeys(): string[] {
        return ChartModel.getDatasetsKeys(this.datasets);
    }
    getDependencies(): Dependency[] {
        const models = this.chartManager.dataManager.dependencyGraph.models;
        return this.getDependenciesKeys().map(key => { return { dependee: models.get(key)!, dependent: this } });
    }
    initialize(): void {
        throw new Error('Method not implemented.');
    }
    update(_oldModel: BaseModel): boolean {
        throw new Error('Method not implemented.');
    }
    onDependencyNameEdit(key: string, oldName: string, newName: string): void {
        ViewChartEvents.MainEvents.emitDataUpdate(this.key, {
            nameUpdate: {
                key, oldName, newName
            }
        });
    }
    onDependencyUpdate(changedDependencies: string[]): boolean {
        debugger;
        const dataManager = this.chartManager.dataManager;
        ViewChartEvents.MainEvents.emitDataUpdate(this.key, {
            columnsUpdate: dataManager.getColumnRowData(changedDependencies)
        });
        return true;
    }
    onNewColumns(columnData: ColumnData[]): void {
        ViewChartEvents.MainEvents.emitDataUpdate(this.key, {
            newColumns: columnData
        });
    }
    onDeletedColumns(keys: string[]): void {
        ViewChartEvents.MainEvents.emitDataUpdate(this.key, {
            deleteColumns: keys
        });
    }
    onRowDeleted(_index: number): void {
        const dataManager = this.chartManager.dataManager;
        ViewChartEvents.MainEvents.emitDataUpdate(this.key, {
            columnsUpdate: dataManager.getColumnRowData(this.getDependenciesKeys())
        });
    }
    onRowAdded(_index: number): void {
        const dataManager = this.chartManager.dataManager;
        ViewChartEvents.MainEvents.emitDataUpdate(this.key, {
            columnsUpdate: dataManager.getColumnRowData(this.getDependenciesKeys())
        });
    }
}