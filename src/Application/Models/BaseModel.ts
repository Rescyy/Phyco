import { Dependency } from "../../Core/DependencyGraph";
import { alphabeticalUuid } from "../../Core/Common";
import { RowModel } from "../Manager/DataManager";
import { ColumnData } from "./ColumnModel";

export abstract class BaseModel {
    key: string;
    attributes: any = {};
    constructor(public name: string, key?: string) {
        this.key = key ?? alphabeticalUuid();
    }
    abstract getDependenciesKeys(): string[];
    abstract getDependencies(): Dependency[];
    abstract initialize(): void;
    abstract update(oldModel: BaseModel): boolean;
    abstract onDependencyNameEdit(key: string, oldName: string, newName: string): void;
    abstract onNewColumns(columnData: ColumnData[]): void;
    abstract onDeletedColumns(keys: string[]): void;
    /* return true if internal values were modified */
    abstract onDependencyUpdate(updatedDependencies: string[]): boolean;
    onRowDeleted(_index: number, _row: RowModel) {
        this.initialize();
    }
    onRowAdded(_index: number, _row: RowModel) {
        this.initialize();
    }
}