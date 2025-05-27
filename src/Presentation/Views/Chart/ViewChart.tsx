import { useSearchParams } from "react-router-dom";
import ChartModel from "../../../Application/Models/ChartModel";
import ChartManager from "../../../Application/Manager/ChartManager";
import { JSX, useEffect, useState } from "react";
import { emitTo, listen, once, UnlistenFn } from "@tauri-apps/api/event";
import { closeCurrentWindow, handleEvent, State } from "../../../Core/Common";
import useResize from "../../Hooks/Resize";
import ResizableFooter from "../ResizableFooter";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { lineChartComponents } from "./LineChart";
import { ColumnRowData } from "../../../Application/Manager/DataManager";
import { ColumnData, ColumnDataPosition } from "../../../Application/Models/ColumnModel";

const viewChartLabel = (key: string) => `viewChart/${key}`;
const closeChartEvent = (key: string) => `closeChart/${key}`;
const initialDataRequestEvent = (key: string) => `initialDataEventRequest/${key}`;
const initialDataResponseEvent = (key: string) => `initialDataEventResponse/${key}`;
const dataRequestEvent = (key: string) => `dataRequest/${key}`;
const dataResponseEvent = (key: string) => `dataResponse/${key}`;
const dataUpdateEvent = (key: string) => `dataUpdate/${key}`;
const chartUpdateEvent = (key: string) => `chartUpdate/${key}`;

export type ChartOptions = any;
export type ChartDatasetConfiguration = {
    xKey?: string,
    yKey?: string,
    config: any
};

export type NameUpdate = {
    key: string,
    oldName: string,
    newName: string,
};

export type DataRequestModel = {
    columnKeys: string[],
};

export type DataResponseModel = ColumnRowData;

export type InitialResponseModel = {
    options: ChartOptions,
    datasets: ChartDatasetConfiguration[],
    data: ColumnRowData,
    columns: ColumnData[]
};

export type DataUpdateModel = {
    deleteColumns?: string[];
    newColumns?: ColumnData[];
    nameUpdate?: NameUpdate,
    columnsUpdate?: ColumnRowData
};

export type DependencyAction = {
    action: string,
    dependency: string,
};

export type ChartUpdateModel = {
    options?: ChartOptions;
    datasets?: ChartDatasetConfiguration[];
};

export class ViewChartEvents {
    /* main event functions, call from main */
    static MainEvents = {
        async listenChartCallbackEvents(chart: ChartModel, chartManager: ChartManager) {
            const key = chart.key;
            const dataManager = chartManager.dataManager;
            chart.addUnlistens(
                await once(closeChartEvent(key), () => chart.disposeListeners()),

                await once(initialDataRequestEvent(key), () => {
                    const columnRowData: ColumnRowData = {};
                    dataManager.dependencyGraph.queryDependencies(chart.key).forEach(x => {
                        const key = x.dependee.key;
                        const column = dataManager.getColumn(key);
                        if (column) {
                            columnRowData[key] = {
                                data: dataManager.getColumnRowNumbers(key),
                                name: column.name
                            };
                        }
                    });
                    const model: InitialResponseModel = {
                        options: chart.options,
                        datasets: chart.datasets,
                        data: columnRowData,
                        columns: dataManager.columnsState[0].map(x => x.columnData())
                    };
                    emitTo(viewChartLabel(key), initialDataResponseEvent(key), model);
                }),

                await listen(dataRequestEvent(key), handleEvent((requestModel: DataRequestModel) => {
                    emitTo(viewChartLabel(key), dataResponseEvent(key), dataManager.getColumnRowData(requestModel.columnKeys));
                })),

                await listen(chartUpdateEvent(key), handleEvent((model: ChartUpdateModel) => {
                    if (model.options) {
                        chart.options = model.options;
                    }

                    if (model.datasets) {
                        dataManager.dependencyGraph.removeNode(chart.key);
                        chart.datasets = model.datasets;
                        dataManager.dependencyGraph.addNodeUnchecked(chart);
                    }
                })),
            );
        },
        async emitCloseChart(chart: ChartModel) {
            chart.disposeListeners();
            await emitTo(viewChartLabel(chart.key), closeChartEvent(chart.key));
        },
        async emitDataUpdate(key: string, model: DataUpdateModel) {
            console.log(model);
            await emitTo(viewChartLabel(key), dataUpdateEvent(key), model);
        },
    }

    /* view chart events, call from view chart */
    static ChartEvents = {
        async emitChartUpdateEvent(key: string, model: ChartUpdateModel) {
            emitTo("main", chartUpdateEvent(key), model);
        },
        async listenCloseEvents(key: string): Promise<UnlistenFn> {
            const unlistenFunctions: UnlistenFn[] = [
                await getCurrentWindow().once("tauri://close-requested", () => {
                    emitTo("main", closeChartEvent(key));
                    closeCurrentWindow();
                }),
                await once(closeChartEvent(key), (_) => closeCurrentWindow())
            ];
            return () => unlistenFunctions.forEach(x => x());
        },
        async emitInitialEvent(key: string, callback: (model: InitialResponseModel) => void) {
            await once(initialDataResponseEvent(key), handleEvent(callback)).then(async () => {
                await emitTo("main", initialDataRequestEvent(key));
            });
        },
        async requestData(key: string, columnKey: string, callback: (model: DataResponseModel) => void) {
            await once(dataResponseEvent(key), handleEvent(callback)).then(async () => {
                await emitTo("main", dataRequestEvent(key), { columnKeys: [columnKey] });
            });
        }
    }
}


export type ChartComponentsProps = {
    key: string,
    name: string,
    columns: ColumnData[],
    columnRowDataState: State<ColumnRowData>,
    optionsState: State<ChartOptions>,
    datasetConfigsState: State<ChartDatasetConfiguration[]>,
    size: { height: number, width: number }
    footerHeightState: State<number>,
};

export type ChartComponents = {
    chart: JSX.Element,
    customizationMenu: JSX.Element,
}

export default function ViewChart() {
    const [searchParams] = useSearchParams();
    const key = searchParams.get("key")!;
    const type = searchParams.get("type")!;
    const name = searchParams.get("name")!;
    const { height, width } = useResize();
    const [footerHeight, setFooterHeight] = useState(98);
    const [columnRowData, setColumnRowData] = useState<ColumnRowData>({});
    const [options, setOptions] = useState<ChartOptions>();
    const [datasets, setDatasets] = useState<ChartDatasetConfiguration[]>([]);
    const [columns, setColumns] = useState<ColumnData[]>([]);
    const [rendered, setRendered] = useState(false);

    useEffect(() => {
        const unlistens: UnlistenFn[] = [];

        (async () => {
            unlistens.push(await ViewChartEvents.ChartEvents.listenCloseEvents(key),
                await listen(dataUpdateEvent(key), handleEvent((model: DataUpdateModel) => {
                    if (model.newColumns) {
                        setColumns(model.newColumns);
                    }

                    if (model.nameUpdate) {
                        const key = model.nameUpdate.key;
                        const name = model.nameUpdate.newName;
                        setColumnRowData(columnRowData => {
                            const copy = { ...columnRowData };
                            copy[key] = { ...copy[key], name };
                            return copy;
                        });
                        setColumns(columns => {
                            const nameIndex = columns.findIndex(x => x.key === key)!;
                            const copy = [...columns];
                            copy[nameIndex] = columns[nameIndex];
                            return copy;
                        });
                    }

                    if (model.deleteColumns) {
                        const deletedKeys = model.deleteColumns;
                        setColumnRowData(columnRowData => {
                            const copy = { ...columnRowData };
                            deletedKeys.forEach(key => delete copy[key]);
                            return copy;
                        });
                        setColumns(columns => columns.filter(x => model.deleteColumns?.includes(x.key)));
                    }

                    if (model.columnsUpdate) {
                        setColumnRowData(columnRowData => {
                            const copy = { ...columnRowData };
                            for (const key in model.columnsUpdate) {
                                copy[key].data = model.columnsUpdate[key].data;
                            }
                            return copy;
                        });
                    }
                })),
            );
        })();

        setTimeout(async () => {
            await ViewChartEvents.ChartEvents.emitInitialEvent(key, (model) => {
                setColumns(model.columns);
                setDatasets(model.datasets);
                setColumnRowData(model.data);
                setOptions(model.options);
                setRendered(true);
            });
        }, 0);

        return () => unlistens.forEach(x => x());
    });

    if (rendered) {
        const { chart, customizationMenu } = (() => {
            switch (type) {
                case "linear":
                    return lineChartComponents;
                case "bar":
                case "correlation":
                    return unimplementedChartType;
                default:
                    return () => { return { chart: <>Unknown chart type</>, customizationMenu: <></> }; }
            }
        })()({
            name,
            key,
            columnRowDataState: [columnRowData, setColumnRowData],
            columns,
            optionsState: [options, (options) => {
                setOptions(options);
            }],
            datasetConfigsState: [datasets, (datasets) => {
                setDatasets(datasets);
            }],
            size: { height, width },
            footerHeightState: [footerHeight, setFooterHeight]
        });

        return <>
            <div className="flex flex-col min-h-screen">
                <div className="absolute top-0 left-0 p-4">
                    {chart}
                </div>
                <div className="flex-1" style={{ height: height - footerHeight }} />
                <div className="w-full z-2">
                    <ResizableFooter heightState={[footerHeight, setFooterHeight]}>
                        <div className="bg-zinc-300 h-full">
                            {customizationMenu}
                        </div>
                    </ResizableFooter>
                </div>
            </div>
        </>;
    }
}

function unimplementedChartType(): ChartComponents {
    return { chart: <>This chart has not yet been implemented</>, customizationMenu: <>This chart has not yer been implemented</> };
}
