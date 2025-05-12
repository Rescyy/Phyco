import { once, UnlistenFn, Event, emitTo } from "@tauri-apps/api/event";
import Datatype, { getDatatype } from "../../Core/Datatype";

export type ColumnDataRequest = {
  callerLabel: string,
};

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

  protected columnDataResponse(): ColumnData {
    return {
      name: this.name, type: {
        value: this.type.value,
        text: this.type.text,
      }
    };
  }

  async listenColumnDataRequest(): Promise<UnlistenFn> {
    return await once("columnData", (data: Event<ColumnDataRequest>) => {
      emitTo(data.payload.callerLabel, "columnDataResponse", this.columnDataResponse());
    });
  }

  static async fetchColumnData(callerLabel: string, callback: (columnData: ColumnData) => void) {
    once("columnDataResponse", (data: Event<ColumnData>) => callback(data.payload));
    emitTo("main", "columnData", { callerLabel });
  }
}
