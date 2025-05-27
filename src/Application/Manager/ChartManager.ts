import { UnlistenFn } from "@tauri-apps/api/event";
import { isResultValid, State } from "../../Core/Common";
import { listenAddChartCallback } from "../../Presentation/Views/Dialogs/AddChart";
import ChartModel from "../Models/ChartModel";
import { ChartValidator } from "../Validation/ChartValidator";
import { ActionManager, Action } from "./ActionManager";
import { DataManager } from "./DataManager";
import { invoke } from "@tauri-apps/api/core";
import { ViewChartEvents } from "../../Presentation/Views/Chart/ViewChart";

export default class ChartManager {
    private unlistenFunctions: UnlistenFn[] = [];

    constructor(
        public dataManager: DataManager,
        private actionManager: ActionManager,
        public chartsState: State<ChartModel[]>,
    ) { }

    disposeListeners() {
        this.unlistenFunctions.forEach(x => x());
        this.unlistenFunctions = [];
    }

    setStateHandlers(chartsState: State<ChartModel[]>) {
        this.chartsState = chartsState;
    }

    async handleAdd() {
        this.disposeListeners();
        this.unlistenFunctions.push(await listenAddChartCallback((model) => {
            debugger;
            const chartValidator = new ChartValidator(this);
            const result = chartValidator.validateAddChart(model);
            if (isResultValid(result)) {
                const chartModel = new ChartModel(this, model.name, model.type);
                this.actionManager.execute(new AddChartAction(this, chartModel));
            }
            return result;
        }).then(async x => {
            await invoke("add_chart");
            return x;
        }));
    }

    async viewChart(key: string) {
        const [charts] = this.chartsState;
        const chart = charts.find(x => x.key === key)!;
        if (!chart.open) {
            chart.open = true;
            await ViewChartEvents.MainEvents.listenChartCallbackEvents(chart, this)
                .then(async () =>
                    await invoke("view_chart", { key, type: chart.type.value, name: chart.name })
                );
        }
    }

    handleDelete(index: number) {
        this.actionManager.execute(new DeleteChartAction(this, index));
    }
}

abstract class ChartAction implements Action {
    constructor(protected chartManager: ChartManager) { }
    abstract do(): void;
    abstract undo(): void;
}

class AddChartAction extends ChartAction {
    constructor(chartManager: ChartManager, private chart: ChartModel) { super(chartManager); }

    do(): void {
        const [, setCharts] = this.chartManager.chartsState;
        this.chartManager.dataManager.dependencyGraph.addNode(this.chart);
        setCharts(charts => [...charts, this.chart]);
    }
    undo(): void {
        const [charts, setCharts] = this.chartManager.chartsState;
        const deletedChart = charts[charts.length - 1];
        this.chartManager.dataManager.dependencyGraph.removeNode(deletedChart.key);
        setCharts(charts => charts.slice(0, -1));
        ViewChartEvents.MainEvents.emitCloseChart(deletedChart);
    }
}

class DeleteChartAction extends ChartAction {
    private deletedChart?: ChartModel;

    constructor(chartManager: ChartManager, private index: number) { super(chartManager); }

    do(): void {
        const [charts, setCharts] = this.chartManager.chartsState;
        console.log(this.index);
        this.deletedChart = charts[this.index];
        this.chartManager.dataManager.dependencyGraph.removeNode(this.deletedChart.key);
        setCharts(charts => charts.filter((_, i) => i !== this.index));
        ViewChartEvents.MainEvents.emitCloseChart(this.deletedChart);
    }
    undo(): void {
        if (this.deletedChart) {
            const [, setCharts] = this.chartManager.chartsState;
            this.chartManager.dataManager.dependencyGraph.addNode(this.deletedChart);
            setCharts(charts => [...charts.slice(0, this.index), this.deletedChart!, ...charts.slice(this.index)]);
        }
    }
}

