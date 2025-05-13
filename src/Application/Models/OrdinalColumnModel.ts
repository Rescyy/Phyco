import { TextDatatype } from "../../Core/Datatype";

export function OrdinalColumnModel() {
    return {
        width: 30,
        key: "order",
        name: "",
        type: TextDatatype,
        resizable: false,
        minWidth: 30,
        editable: false,
        draggable: false,
    };
}