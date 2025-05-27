import {
    ChartDataset, Point, Chart,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
} from "chart.js";
import { ChartComponents, ChartComponentsProps, ChartDatasetConfiguration, ViewChartEvents } from "./ViewChart";
import { Scatter } from 'react-chartjs-2';
import { ColumnData } from "../../../Application/Models/ColumnModel";
import { ColumnRowData } from "../../../Application/Manager/DataManager";

export function lineChartComponents(props: ChartComponentsProps): ChartComponents {
    const {
        key,
        columnRowDataState: [columnRowData, setColumnRowData],
        columns,
        optionsState: [options],
        datasetConfigsState: [datasetConfigs, setDatasetConfigs],
        size: { height, width },
        footerHeightState: [footerHeight, setFooterHeight]
    } = props;

    Chart.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

    const colors = ["#ea5252", "#3c649f", "#ff6119", "#189111"];

    const handleAddDataset = () => {
        if (footerHeight < 251) setFooterHeight(251);
        setDatasetConfigs((prev) => [...prev, { xKey: undefined, yKey: undefined, config: { label: `Dataset ${prev.length + 1}`, borderColor: colors[prev.length % colors.length], pointStyle: false } }]);
    };
    
    const handleDatasetKeyChange = async (index: number, axis: "xKey" | "yKey", columnKey: string) => {
        const existingData = columnRowData[columnKey];
        if (!existingData) {
            await ViewChartEvents.ChartEvents.requestData(key, columnKey, (response) => {
                setColumnRowData((columnRowData) => {
                    const copy = { ...columnRowData };
                    copy[columnKey] = response[columnKey];
                    return copy;
                });
            });
        }
        setDatasetConfigs((datasetConfigs) => {
            const copy = [...datasetConfigs];
            copy[index] = { ...copy[index], [axis]: columnKey };
            ViewChartEvents.ChartEvents.emitChartUpdateEvent(key, {
                datasets: copy
            });
            return copy;
        });
    };

    const renderChart = () => {
        const data = { datasets: prepareDatasets(datasetConfigs, columnRowData) };
        return <div style={{ width: width - 32, height: height - 32 - footerHeight }}>
            <Scatter options={{ ...options, aspectRatio: (width - 32) / (height - 32 - footerHeight) }} data={data} />
        </div>
    };

    const renderCustomizationMenu = () => (
        <div className="p-4 space-y-4 w-full max-w-3xl h-full">
            <button
                onClick={handleAddDataset}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                Add Dataset
            </button>

            {datasetConfigs.map((config, index) => (
                <div
                    key={index}
                    className="border border-gray-300 rounded-lg p-4 space-y-4 bg-white shadow-sm"
                >
                    <h3 className="font-semibold text-gray-700">Dataset #{index + 1}</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">X Axis</label>
                            <select
                                className="w-full p-2 border rounded focus:outline-none focus:ring focus:border-blue-400"
                                value={config.xKey || ""}
                                onChange={(e) => handleDatasetKeyChange(index, "xKey", e.target.value)}
                            >
                                <option value="">(Auto)</option>
                                {columns.map((col: ColumnData) => (
                                    <option key={col.key} value={col.key}>
                                        {col.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Y Axis</label>
                            <select
                                className="w-full p-2 border rounded focus:outline-none focus:ring focus:border-blue-400"
                                value={config.yKey || ""}
                                onChange={(e) => handleDatasetKeyChange(index, "yKey", e.target.value)}
                            >
                                <option value="">(Auto)</option>
                                {columns.map((col: ColumnData) => (
                                    <option key={col.key} value={col.key}>
                                        {col.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return {
        chart: renderChart(),
        customizationMenu: renderCustomizationMenu(),
    };
}

function prepareDatasets(datasetConfigs: ChartDatasetConfiguration[], columnRowData: ColumnRowData): ChartDataset<"scatter", Point>[] {
    const datasets: ChartDataset<"scatter", Point>[] = [];
    datasetConfigs.forEach(config => {
        const xKey = config.xKey;
        const yKey = config.yKey;
        if (!xKey && !yKey) return;

        const xValues = xKey ? columnRowData[xKey]?.data : undefined;
        const yValues = yKey ? columnRowData[yKey]?.data : undefined;

        const fallbackLength = xValues?.length ?? yValues?.length ?? 0;

        const x = xValues ?? Array.from({ length: fallbackLength }, (_, i) => i);
        const y = yValues ?? Array.from({ length: fallbackLength }, (_, i) => i);

        const dataset: ChartDataset<"scatter", Point> = {
            ...config.config,
            showLine: true,
            data: x.map((xVal, i) => ({ x: xVal, y: y[i] }))
        };
        datasets.push(dataset);
    });
    return datasets;
}