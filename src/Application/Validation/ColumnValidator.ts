import { ColumnFormula } from "../../Core/ColumnFormula";
import { ValidationResult } from "../../Core/Common";
import { datatypes } from "../../Core/Datatype";
import { AddColumnCallbackModel } from "../../Presentation/Views/Dialogs/AddColumn";
import { EditColumnCallbackModel } from "../../Presentation/Views/Dialogs/EditColumn";
import { DataManager } from "../Manager/DataManager";

export type AddColumnValidationResult = {
    name: ValidationResult;
    type: ValidationResult;
    formula?: ValidationResult;
}

export type EditColumnValidationResult = {
    name: ValidationResult;
    formula?: ValidationResult;
}

export class ColumnValidator {
    constructor(private dataManager: DataManager) { }

    validateEditColumn(value: EditColumnCallbackModel, idx: number): EditColumnValidationResult {
        const validationResult: EditColumnValidationResult = { name: new ValidationResult() };
        const [columns] = this.dataManager.columnsState;
        const editingColumn = columns[idx];

        if (!value) {
            validationResult.name.setMessage("Name is required");
        } else if (!this.isColumnNameUnique(value.name, idx)) {
            validationResult.name.setMessage("Column name is not unique");
        }

        if (editingColumn.type.value === 'formula') {
            validationResult.formula = this.validateFormula(value.formula);
        }

        return validationResult;
    }

    validateAddColumn(value: AddColumnCallbackModel): AddColumnValidationResult {
        const validationResult: AddColumnValidationResult = { name: new ValidationResult(), type: new ValidationResult() };

        if (!value.name) {
            validationResult.name.setMessage("Name is required");
        } else if (!this.isColumnNameUnique(value.name)) {
            validationResult.name.setMessage("Column name is not unique");
        }

        if (!value.type) {
            validationResult.type.setMessage("Datatype is required");
        } else if (!datatypes.some(x => x.value === value.type)) {
            validationResult.type.setMessage("Datatype does not exist");
        }

        if (value.type === 'formula') {
            validationResult.formula = this.validateFormula(value.formula);
        }

        return validationResult;
    }

    isColumnNameUnique(columnName: string, idx?: number): boolean {
        const [columns] = this.dataManager.columnsState;
        return columns.every((x, i) => x.name !== columnName || i === idx);
    }

    validateFormula(rawExpression: string | undefined): ValidationResult {
        const [columns] = this.dataManager.columnsState;
        if (!rawExpression) return new ValidationResult("Formula is required");
        try {
            new ColumnFormula(columns, rawExpression);
        } catch (e: any) {
            return new ValidationResult(e.message);
        }
        return new ValidationResult();
    }
}