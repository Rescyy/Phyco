import { allChartTypes } from "../../Core/ChartType";
import { isResultValid, isStringAlphanumeric, ValidationResult } from "../../Core/Common";
import { AddChartCallbackModel } from "../../Presentation/Views/Dialogs/AddChart";
import ChartManager from "../Manager/ChartManager";

export type AddChartValidationResult = {
    name: ValidationResult;
    type: ValidationResult;
}

export class ChartValidator {
    constructor(private chartManager: ChartManager) { }

    validateAddChart(value: AddChartCallbackModel): AddChartValidationResult {
        const validationResult = { name: new ValidationResult(), type: new ValidationResult() };
        const testName = value.name.trim();

        if (!value.name) {
            validationResult.name.setMessage("Name is required");
        } else if (!this.isChartNameUnique(value.name)) {
            validationResult.name.setMessage("Chart name is not unique");
        } else if (!isStringAlphanumeric(testName)) {
            validationResult.name.setMessage("Chart name can't contain special characters")
        }

        if (!value.type){
            validationResult.type.setMessage("Type is required");
        } else if (!allChartTypes.some(x => x.value === value.type)) {
            validationResult.type.setMessage("Chart type does not exist");
        }

        if (isResultValid(validationResult)) {
            value.name = testName;
        }

        return validationResult;
    }

    isChartNameUnique(name: string) {
        const [charts] = this.chartManager.chartsState;
        return charts.every(chart => chart.name !== name);
    }
}