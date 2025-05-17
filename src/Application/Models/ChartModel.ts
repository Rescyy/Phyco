import {v4} from 'uuid';
import { BaseModel } from './BaseModel';
import { Dependency } from '../../Core/ColumnDependenciesGraph';
import ChartType, { getChartType } from '../../Core/ChartType';

export default class ChartModel extends BaseModel {
    type: ChartType;
    open: boolean = false;

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
    update(oldModel: BaseModel): boolean {
        throw new Error('Method not implemented.');
    }
    onDependencyNameEdit(oldName: string, newName: string): void {
        throw new Error('Method not implemented.');
    }
    onDependencyUpdate(): boolean {
        throw new Error('Method not implemented.');
    }
    newRow(index: number): string {
        throw new Error('Method not implemented.');
    }
    onRowDeleted(index: number): void {
        throw new Error('Method not implemented.');
    }
    onRowAdded(index: number): void {
        throw new Error('Method not implemented.');
    }

}