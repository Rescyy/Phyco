import { once, UnlistenFn, Event, emitTo } from "@tauri-apps/api/event";
import Datatype, { getDatatype } from "../../Core/Datatype";
import { DataRequest } from "../../Core/Common";
import { ColumnDependency } from "../../Core/ColumnDependenciesGraph";
import { DataManager, RowModel } from "../Manager/DataManager";

export interface ColumnData {
  name: string,
  type: {
    value: string,
    text: string,
  }, /* determines the type of ColumnData */
};

export type ColumnModelInitializeProps = {
  columns: ColumnModel[], rows: RowModel[], dependencies: ColumnDependency[],
}

export class ColumnModel {
  name: string;
  key: string;
  type: Datatype;
  resizable = false;
  minWidth = 50;
  width = 100;
  editable = true;
  draggable = true;
  attribute: any = {};

  constructor(nameOrPayload: string | { name: string, type: string }, type?: string, key?: string) {
    if (typeof nameOrPayload === "object" && nameOrPayload !== null) {
      // Construct from payload
      this.name = nameOrPayload.name;
      this.key = key ?? `${nameOrPayload.name}${Date.now()}`;
      this.type = getDatatype(nameOrPayload.type);
    } else {
      // Construct from name + type
      this.name = nameOrPayload;
      this.key = key ?? `${nameOrPayload.toString()}${Date.now()}`;
      this.type = getDatatype(type!);
    }
  }

  columnData(): ColumnData {
    return {
      name: this.name, type: {
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

  getDependencies(_columns: ColumnModel[]): ColumnDependency[] {
    return [];
  }

  /* dataManager does not include the column at this point */
  initialize(_dataManager: DataManager) {

  }

  update(_dataManager: DataManager, _oldColumn: ColumnModel): boolean {
    return false;
  }

  updateCell(dataManager: DataManager, rowIdx: number, columnKey: string, newValue: string): boolean {
    const [, setRows] = dataManager.rowsState;

    setRows(rows => {
      rows[rowIdx][columnKey] = newValue;
      return [...rows];
    });
    return true;
  }

  onDependencyNameEdit(_dataManager: DataManager, _oldName: string, _newName: string) {
    throw new Error("Unreachable code. ColumnModel doesn't have column dependencies");
  }

  /* return true if column row values were modified */
  onDependencyUpdate(_dataManager: DataManager, _changedDependencies: string[]): boolean {
    throw new Error("Unreachable code. ColumnModel doesn't have column dependencies.");
  }

  newRow(_dataManager: DataManager, _index: number): string {
    return "";
  }

  onRowDeleted(_dataManager: DataManager, _index: number) {

  }

  onRowAdded(_dataManager: DataManager, _index: number) {

  }
}
