import { once, UnlistenFn, Event, emitTo } from "@tauri-apps/api/event";
import Datatype, { getDatatype } from "../../Core/Datatype";
import { DataRequest } from "../../Core/Common";
import { Dependency } from "../../Core/DependencyGraph";
import { DataManager, RowModel } from "../Manager/DataManager";
import { BaseModel } from "./BaseModel";

export interface ColumnData {
  name: string,
  key: string,
  type: {
    value: string,
    text: string,
  }, /* determines the type of ColumnData */
};

export type ColumnDataPosition = {
    data: ColumnData,
    index: number,
}

export type ColumnModelInitializeProps = {
  columns: ColumnModel[], rows: RowModel[], dependencies: Dependency[],
}

export class ColumnModel extends BaseModel {
  type: Datatype;
  resizable = false;
  minWidth = 50;
  width = 100;
  editable = true;
  draggable = true;

  constructor(protected dataManager: DataManager, nameOrPayload: string | { name: string, type: string }, type?: string, key?: string) {
    super(typeof nameOrPayload === 'object' ? nameOrPayload.name : nameOrPayload, key);
    this.attributes.statisticValues = new Map<string, number>();
    if (typeof nameOrPayload === "object" && nameOrPayload !== null) {
      this.type = getDatatype(nameOrPayload.type)!;
    } else {
      this.type = getDatatype(type!)!;
    }
  }

  getStatisticValues(model?: BaseModel): Map<string, number> {
    model ??= this;
    return model.attributes.statisticValues;
  }

  clearStatisticValues() {
    this.getStatisticValues().clear();
  }

  columnData(): ColumnData {
    return {
      name: this.name, key: this.key, type: {
        value: this.type.value,
        text: this.type.text,
      }
    };
  }

  async listenDataRequest(): Promise<UnlistenFn> {
    return await once("columnData", (data: Event<DataRequest>) => {
      emitTo(data.payload.callerLabel, "columnDataResponse", this.columnData());
    });
  }

  static async fetchData(callerLabel: string, callback: (columnData: ColumnData) => void) {
    once("columnDataResponse", (data: Event<ColumnData>) => callback(data.payload));
    emitTo("main", "columnData", { callerLabel });
  }

  getDependenciesKeys(): string[] {
    return [];
  }

  override getDependencies(): Dependency[] {
    return [];
  }

  /* dataManager does not include the column at this point */
  override initialize() {

  }

  override update(_oldColumn: BaseModel): boolean {
    return false;
  }

  updateCell(rowIdx: number, columnKey: string, newValue: string): boolean {
    const [, setRows] = this.dataManager.rowsState;
    this.getStatisticValues().clear();

    setRows(rows => {
      rows[rowIdx][columnKey] = newValue;
      return [...rows];
    });
    return true;
  }

  override onDependencyNameEdit(_key: string, _oldName: string, _newName: string) {
    throw new Error("Unreachable code. ColumnModel doesn't have column dependencies");
  }

  /* return true if column row values were modified */
  override onDependencyUpdate(_updatedDependencies: string[]): boolean {
    throw new Error("Unreachable code. ColumnModel doesn't have column dependencies.");
  }

  onNewColumns(_columnData: ColumnData[]): void {
  }
  onDeletedColumns(_keys: string[]): void {
  }

  newRow(_index: number): string {
    return "";
  }

  onRowDeleted(_index: number, row: RowModel) {
    if (row[this.key]) {
      this.getStatisticValues().clear();
    }
  }

  onRowAdded(_index: number, row: RowModel) {
    if (row[this.key]) {
      this.getStatisticValues().clear();
    }
  }
}
