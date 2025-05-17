import { Dependency } from "../../Core/ColumnDependenciesGraph";
import { alphabeticalUuid } from "../../Core/Common";
import { RowModel } from "../Manager/DataManager";

export abstract class BaseModel {
    key: string;
    attributes: any = {};
    constructor(public name: string, key?: string) {
        this.key = key ?? alphabeticalUuid();
    }
    abstract getDependencies(): Dependency[];
    abstract initialize(): void;
    abstract update(oldModel: BaseModel): boolean;
    abstract onDependencyNameEdit(oldName: string, newName: string): void;
    /* return true if internal values were modified */
    abstract onDependencyUpdate(): boolean;
    onRowDeleted(_index: number, _row: RowModel) {
        this.initialize();
    }
    onRowAdded(_index: number, _row: RowModel) {
        this.initialize();
    }
}