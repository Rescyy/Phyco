import Datatype, { getDatatype } from "../../Core/Datatype";

export class ColumnModel {
    name: string;
    key: string;
    type: Datatype;
    resizable = true;
    minWidth = 50;
    width = 100;
    editable = true;
  
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
  }
  