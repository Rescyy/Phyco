import { BaseModel } from './BaseModel';
import { Dependency } from '../../Core/ColumnDependenciesGraph';
import ChartType, { getChartType } from '../../Core/ChartType';
import { UnlistenFn } from '@tauri-apps/api/event';
import { ChartOptions, ChartDatasetConfiguration } from '../../Presentation/Views/Chart/ViewChart';

export default class ChartModel extends BaseModel {
    type: ChartType;
    open: boolean = false;
    options: ChartOptions = {};
    datasets: ChartDatasetConfiguration[] = [];

    private unlistens: UnlistenFn[] = [];
    disposeListeners() {
        this.open = false;
        this.unlistens.forEach(x => x());
        this.unlistens = [];
    }
    addUnlistens(...unlistens: UnlistenFn[]) {
        unlistens.forEach(unlisten => this.unlistens.push(unlisten));
    }

    constructor(name: string, type: string, key?: string) {
        super(name, key);
        this.type = getChartType(type)!;
    }

    getDependencies(): Dependency[] {
        throw new Error('Method not implemented.');
    }
    initialize(): void {
        throw new Error('Method not implemented.');
    }
    update(_oldModel: BaseModel): boolean {
        throw new Error('Method not implemented.');
    }
    onDependencyNameEdit(_oldName: string, _newName: string): void {
        throw new Error('Method not implemented.');
    }
    onDependencyUpdate(): boolean {
        throw new Error('Method not implemented.');
    }
    newRow(_index: number): string {
        throw new Error('Method not implemented.');
    }
    onRowDeleted(_index: number): void {
        throw new Error('Method not implemented.');
    }
    onRowAdded(_index: number): void {
        throw new Error('Method not implemented.');
    }

}