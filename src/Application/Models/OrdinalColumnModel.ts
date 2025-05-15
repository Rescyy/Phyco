import { TextDatatype } from "../../Core/Datatype";

export function OrdinalColumnModel() {
    return {
        width: 40,
        key: "order",
        name: "",
        type: TextDatatype,
        resizable: false,
        minWidth: 40,
        editable: false,
        draggable: false,
    };
}