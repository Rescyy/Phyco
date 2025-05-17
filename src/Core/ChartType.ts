export default interface ChartType {
    value: string,
    text: string,
};

export const LinearChartType: ChartType = {
    value: "linear",
    text: "Linear",
};

export const BarChartType: ChartType = {
    value: "bar",
    text: "Bar"
};

export const CorrelationMatrixChartType: ChartType = {
    value: "correlation",
    text: "Correlation Matrix"
};

export const allChartTypes = [LinearChartType, BarChartType, CorrelationMatrixChartType];

export function getChartType(type: string) {
    return allChartTypes.find(x => x.value === type);
}