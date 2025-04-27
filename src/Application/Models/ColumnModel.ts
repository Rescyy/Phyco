import Datatype from "../../Core/Datatype";

export class ColumnModel {
    name: string;
    key: string;
    type: Datatype;
  
    constructor(name: string, type: Datatype);
    constructor(payload: { key: string; name: string; type: Datatype });
    constructor(nameOrPayload: any, type?: Datatype) {
      if (typeof nameOrPayload === "object" && nameOrPayload !== null) {
        // Construct from payload
        this.name = nameOrPayload.name;
        this.key = nameOrPayload.key;
        this.type = nameOrPayload.type;
      } else {
        // Construct from name + type
        this.name = nameOrPayload;
        this.key = `${nameOrPayload}${Date.now()}`;
        this.type = type!;
      }
    }
  }
  