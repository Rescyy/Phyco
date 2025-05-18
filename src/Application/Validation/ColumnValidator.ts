import { ColumnFormula } from "../../Core/ColumnFormula";
import { isResultValid, isStringAlphanumeric, normalizeWhitespace, ValidationResult } from "../../Core/Common";
import { allDatatypes } from "../../Core/Datatype";
import { AddColumnCallbackModel } from "../../Presentation/Views/Dialogs/AddColumn";
import { EditColumnCallbackModel } from "../../Presentation/Views/Dialogs/EditColumn";
import { DataManager } from "../Manager/DataManager";
import { ColumnModel } from "../Models/ColumnModel";
import { FormulaColumnModel } from "../Models/FormulaColumnModel";

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
        const testName = normalizeWhitespace(value.name);
        const testFormula = value.formula ? normalizeWhitespace(value.formula) : undefined;

        if (!value.name) {
            validationResult.name.setMessage("Name is required");
        } else if (!this.isColumnNameUnique(testName, idx)) {
            validationResult.name.setMessage("Column name is not unique");
        } else if (!isStringAlphanumeric(testName)) {
            validationResult.name.setMessage("Column name can't contain special characters")
        }

        if (editingColumn.type.value === 'formula') {
            validationResult.formula = this.validateEditedFormula(testFormula, testName, idx);
        }

        if (isResultValid(validationResult)) {
            value.name = testName;
            value.formula = testFormula;
        }
        return validationResult;
    }

    validateAddColumn(value: AddColumnCallbackModel): AddColumnValidationResult {
        const validationResult: AddColumnValidationResult = { name: new ValidationResult(), type: new ValidationResult() };
        const testName = normalizeWhitespace(value.name);
        const testFormula = value.formula ? normalizeWhitespace(value.formula) : undefined;

        if (!value.name) {
            validationResult.name.setMessage("Name is required");
        } else if (!this.isColumnNameUnique(testName)) {
            validationResult.name.setMessage("Column name is not unique");
        } else if (!isStringAlphanumeric(testName)) {
            validationResult.name.setMessage("Column name can't contain special characters")
        }

        if (!value.type) {
            validationResult.type.setMessage("Datatype is required");
        } else if (!allDatatypes.some(x => x.value === value.type)) {
            validationResult.type.setMessage("Datatype does not exist");
        }

        if (value.type === 'formula') {
            validationResult.formula = this.validateFormula(testFormula, testName);
        }
        
        if (isResultValid(validationResult)) {
            value.name = testName;
            value.formula = testFormula;
        }
        return validationResult;
    }

    

    isColumnNameUnique(columnName: string, idx?: number): boolean {
        const [columns] = this.dataManager.columnsState;
        return columns.every((x, i) => x.name !== columnName || i === idx);
    }

    validateEditedFormula(rawExpression: string | undefined, columnName: string, idx: number): ValidationResult {
        const [columns] = this.dataManager.columnsState;
        if (!rawExpression) return new ValidationResult("Formula is required");
        try {
            const column = columns[idx];
            const formula = new ColumnFormula(columns, rawExpression);
            if (formula.dependencies.has(columnName)) {
                return new ValidationResult("Cannot use column's name inside its formula");
            }
            const newColumn = new FormulaColumnModel(this.dataManager, columnName, formula, column.key);
            if (this.dataManager.dependencyGraph.checkCircularDependencyWithModel(this.dataManager, newColumn)) {
                return new ValidationResult("Cannot have circular dependency between columns");
            }
        } catch (e: any) {
            return new ValidationResult(e.message);
        }
        return new ValidationResult();
    }

    validateFormula(rawExpression: string | undefined, columnName: string): ValidationResult {
        const [columns] = this.dataManager.columnsState;
        if (!rawExpression) return new ValidationResult("Formula is required");
        try {
            const formula = new ColumnFormula([...columns, new ColumnModel(this.dataManager, columnName, "text")], rawExpression);
            if (formula.dependencies.has(columnName)) {
                return new ValidationResult("Cannot use column's name inside its formula");
            }
        } catch (e: any) {
            return new ValidationResult(e.message);
        }
        return new ValidationResult();
    }
}