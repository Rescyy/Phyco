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

  constructor(nameOrPayload: string | {name: string, type: string}, type?: string, key?: string) {
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

  getDependencies(columns: ColumnModel[]): ColumnDependency[] {
    return [];
  }

  /* dataManager does not include the column at this point */
  initialize(dataManager: DataManager) {
    const [columns] = dataManager.columnsState;
    if (columns.length == 0) {
      const [,setRows] = dataManager.rowsState;
      setRows([dataManager.newRow(this)]);
    }
  }

  update(dataManager: DataManager, oldColumn: ColumnModel): boolean {
    return false;
  }

  updateCell(dataManager: DataManager, rowIdx: number, idx: number, newValue: string): boolean {
    return true;
  }

  onDependencyNameEdit(dataManager: DataManager, oldName: string, newName: string) {

  }

  /* return true if column internals were modified */
  onDependencyUpdate(dataManager: DataManager, changedDependencies: string[]): boolean {
    return false;
  }
}
