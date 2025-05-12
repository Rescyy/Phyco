import { ColumnFormula } from "../../Core/ColumnFormula";
import { ColumnData, ColumnModel } from "./ColumnModel";

export interface FormulaColumnData extends ColumnData {
    formula: string;
}

export class FormulaColumnModel extends ColumnModel {
    constructor(name: string, public formula: ColumnFormula) {
        super(name, "formula");
    }
    editable = false;

    protected override columnDataResponse(): ColumnData {
        const columnDataResponse = super.columnDataResponse() as FormulaColumnData;
        columnDataResponse.formula = this.formula.rawExpression;
        return columnDataResponse;
    }
}