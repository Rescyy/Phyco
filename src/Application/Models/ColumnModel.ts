import { once, UnlistenFn, Event, emitTo } from "@tauri-apps/api/event";
import Datatype, { getDatatype } from "../../Core/Datatype";
import { DataRequest } from "../../Core/Common";

export interface ColumnData {
  name: string,
  type: {
    value: string,
    text: string,
  }, /* determines the type of ColumnData */
};

export class ColumnModel {
  name: string;
  key: string;
  type: Datatype;
  resizable = false;
  minWidth = 50;
  width = 100;
  editable = true;
  draggable = true;

  constructor(name: string, type: string);
  constructor(payload: { name: string; type: string });
  constructor(nameOrPayload: any, type?: string) {
    if (typeof nameOrPayload === "object" && nameOrPayload !== null) {
      // Construct from payload
      this.name = nameOrPayload.name;
      this.key = `${nameOrPayload.name}${Date.now()}`;
      this.type = getDatatype(nameOrPayload.type);
    } else {
      // Construct from name + type
      this.name = nameOrPayload;
      this.key = `${nameOrPayload.toString()}${Date.now()}`;
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
}
