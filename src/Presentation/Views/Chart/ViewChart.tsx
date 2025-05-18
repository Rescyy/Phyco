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

export type ColumnData = {
    name: string,
    key: string
};

export type DataRequestModel = {
    columnKeys: string[],
};

export type ColumnRowData = {
    [key: string]: {
        name: string,
        data: number[],
    }
};

export type DataResponseModel = ColumnRowData;

export type InitialResponseModel = {
    options: ChartOptions,
    datasets: ChartDatasetConfiguration[],
    data: ColumnRowData,
    columns: ColumnData[]
};

export type DataUpdateModel = {
    delete?: string;
    new?: ColumnData;
    nameUpdate?: ColumnData,
    columnsUpdate?: {
        [key: string]: {
            data: number[]
        }
    }
};

export type ChartUpdateModel = {
    options?: ChartOptions;
    datasets?: ChartDatasetConfiguration[];
    newDependency?: string,
};

export class ViewChartEvents {
    static async listenChartCallbackEvents(chart: ChartModel, chartManager: ChartManager) {
        const key = chart.key;
        const dataManager = chartManager.dataManager;
        console.log(dataManager);
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
                    columns: dataManager.columnsState[0].map(x => {
                        return {
                            key: x.key,
                            name: x.name,
                        };
                    })
                };
                emitTo(viewChartLabel(key), initialDataResponseEvent(key), model);
            }),

            await listen(dataRequestEvent(key), handleEvent((requestModel: DataRequestModel) => {
                debugger;
                const responseModel: DataResponseModel = {};
                requestModel.columnKeys.forEach(key => {
                    const column = dataManager.getColumn(key);
                    if (column) {
                        responseModel[key] = {
                            data: dataManager.getColumnRowNumbers(key),
                            name: column.name
                        };
                    }
                });
                emitTo(viewChartLabel(key), dataResponseEvent(key), responseModel);
            })),

            await listen(chartUpdateEvent(key), handleEvent((model: ChartUpdateModel) => {
                if (model.options) {
                    chart.options = model.options;
                }

                if (model.datasets) {
                    chart.datasets = model.datasets;
                }

                if (model.newDependency) {
                    dataManager.dependencyGraph.addDependency({
                        dependee: dataManager.getColumn(model.newDependency)!,
                        dependent: chart
                    });
                }
            })),
        );
    }

    static async emitCloseChart(chart: ChartModel) {
        chart.disposeListeners();
        await emitTo(viewChartLabel(chart.key), closeChartEvent(chart.key));
    }

    static async emitDataUpdate(key: string, model: DataUpdateModel) {
        await emitTo(viewChartLabel(key), dataUpdateEvent(key), model);
    }
}

export async function listenCloseEvents(key: string): Promise<UnlistenFn> {
    const unlistenFunctions: UnlistenFn[] = [
        await getCurrentWindow().once("tauri://close-requested", () => {
            emitTo("main", closeChartEvent(key));
            closeCurrentWindow();
        }),
        await once(closeChartEvent(key), (_) => closeCurrentWindow())
    ];
    return () => unlistenFunctions.forEach(x => x());
}

export async function emitInitialEvent(key: string, callback: (model: InitialResponseModel) => void) {
    await once(initialDataResponseEvent(key), handleEvent(callback)).then(async () => {
        await emitTo("main", initialDataRequestEvent(key));
    });
};

export async function requestData(key: string, columnKey: string, callback: (model: DataResponseModel) => void) {
    await once(dataResponseEvent(key), handleEvent(callback)).then(async () => {
        await emitTo("main", dataRequestEvent(key), { columnKeys: [columnKey] });
    });
}

export type ChartComponentsProps = {
    key: string,
    name: string,
    columns: ColumnData[],
    columnRowDataState: State<ColumnRowData>,
    optionsState: State<ChartOptions>,
    datasetConfigsState: State<ChartDatasetConfiguration[]>,
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
    const [footerHeight, setFooterHeight] = useState(300);
    const [columnRowData, setColumnRowData] = useState<ColumnRowData>({});
    const [options, setOptions] = useState<ChartOptions>({});
    const [datasets, setDatasets] = useState<ChartDatasetConfiguration[]>([]);
    const [columns, setColumns] = useState<ColumnData[]>([]);
    const [rendered, setRendered] = useState(false);

    useEffect(() => {
        const unlistens: UnlistenFn[] = [];

        (async () => {
            unlistens.push(await listenCloseEvents(key),
                await listen(dataUpdateEvent(key), handleEvent((model: DataUpdateModel) => {
                    if (model.nameUpdate) {
                        const key = model.nameUpdate.key;
                        const name = model.nameUpdate.name;
                        columnRowData[key].name = name;
                        columns.find(x => x.key === key)!.name;
                    }

                    if (model.delete) {
                        delete columnRowData[model.delete];
                        columns.filter(x => x.key !== model.delete);
                    }

                    if (model.columnsUpdate) {
                        for (const key in model.columnsUpdate) {
                            columnRowData[key].data = model.columnsUpdate[key].data;
                        }
                    }

                    setColumnRowData(columnRowData);
                    setColumns(columns);
                })),
            );
        })();

        setTimeout(async () => {
            await emitInitialEvent(key, (model) => {
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
        });

        return <>
            <div className="p-2" style={{ height, width }}>
                {chart}
            </div>
            <div className="absolute bottom-0 w-full">
                <ResizableFooter heightState={[footerHeight, setFooterHeight]}>
                    <div className="bg-zinc-300" style={{ height: footerHeight - 26 }}>
                        {customizationMenu}
                    </div>
                </ResizableFooter>
            </div>
        </>;
    }
}

function unimplementedChartType(): ChartComponents {
    return { chart: <>This chart has not yet been implemented</>, customizationMenu: <>This chart has not yer been implemented</> };
}
