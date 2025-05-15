import { ColumnModel } from "../../Application/Models/ColumnModel";
import { ColumnFormula } from "../../Core/ColumnFormula";

export default function Test() {
    var col1 = new ColumnModel("asd", "numerical");
    var columnModels = [col1];

    const columnFormula = new ColumnFormula(
        columnModels,
        "abs([asd] - [asd.min])"
    );

    const row1: any = {};
    row1[col1.key] = 123;

    const row2: any = {};
    row2[col1.key] = 246;

    const rows = [row1, row2];

    console.log(columnFormula);
    // console.log(columnFormula.apply(rows));

    return <></>;
}