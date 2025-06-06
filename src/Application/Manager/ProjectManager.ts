import { invoke } from "@tauri-apps/api/core";
import ChartManager from "./ChartManager";
import { DataManager, RowModel } from "./DataManager";
import { save } from "@tauri-apps/plugin-dialog";
import { ColumnModel } from "../Models/ColumnModel";
import { FormulaColumnModel } from "../Models/FormulaColumnModel";
import { ColumnDoesNotExistError, ColumnFormula } from "../../Core/ColumnFormula";
import ChartModel from "../Models/ChartModel";

export type ProjectManagerProps = {
    dataManager: DataManager,
    chartManager: ChartManager,
    fileNameRef: React.RefObject<string | null>,
}

type ProjectFileModel = {
    columns: any[],
    rows: RowModel[],
    charts: any[],
    dependencies: any[],
}

export class ProjectManager {
    private dataManager: DataManager;
    private chartManager: ChartManager;
    private fileNameRef: React.RefObject<string | null>;

    constructor({ dataManager, chartManager, fileNameRef }: ProjectManagerProps) {
        this.dataManager = dataManager;
        this.chartManager = chartManager;
        this.fileNameRef = fileNameRef;
    }

    async saveProject() {
        if (!this.fileNameRef.current) {
            this.fileNameRef.current = await save({
                filters: [{ name: "Phyco", extensions: ["phyco"] }]
            });
        }
        if (!this.fileNameRef.current) return;
        const columns = this.dataManager.columnsState[0].map(x => x.toProjectModel());
        const rows = this.dataManager.rowsState[0];
        const charts = this.chartManager.chartsState[0].map(x => x.toProjectModel());
        const dependencies = this.dataManager.dependencyGraph.toProjectModel();
        const project: ProjectFileModel = { columns, rows, dependencies, charts };
        const projectContent = JSON.stringify(project);
        await invoke('save_project',
            { filename: this.fileNameRef.current, content: projectContent }).catch(e => console.error("Couldn't save the project:", e));
    }

    async loadProject() {
        if (!this.fileNameRef.current) return;
        await invoke<string>("read_project", { filename: this.fileNameRef.current })
            .then(result => {
                const [, setColumns] = this.dataManager.columnsState;
                const [, setRows] = this.dataManager.rowsState;
                const [,setCharts] = this.chartManager.chartsState;
                const project: ProjectFileModel = JSON.parse(result);
                const columns: (ColumnModel | undefined)[] = Array(project.columns.length).fill(undefined);
                project.columns.forEach((x: any, i: number) => {
                    if (x.type !== 'formula') {
                        columns[i] = new ColumnModel(this.dataManager, x.name, x.type, x.key);
                    }
                });
                let shouldLoopAgainOverFormulas = true;
                debugger;
                while (shouldLoopAgainOverFormulas) {
                    shouldLoopAgainOverFormulas = false;
                    project.columns.forEach((x: any, i: number) => {
                        if (x.type === 'formula' && !columns[i]) {
                            try {
                                columns[i] = new FormulaColumnModel(this.dataManager, x.name, new ColumnFormula(columns.filter(x => x !== undefined), x.rawExpression), x.key);
                            } catch (e) {
                                if (e instanceof ColumnDoesNotExistError) {
                                    shouldLoopAgainOverFormulas = true;
                                } else {
                                    throw e;
                                }
                            }
                        }
                    });
                }
                columns.forEach(x => {
                    if (!x) {
                        throw new Error("Not all columns could have been initialized");
                    }
                });
                const charts = project.charts.map(x => ChartModel.fromProjectModel(this.chartManager, x));
                try {
                    this.dataManager.dependencyGraph.addNodes([...(columns as ColumnModel[]), ...charts]);
                    this.dataManager.dependencyGraph.loadProjectModel(project.dependencies);
                    setColumns(columns as ColumnModel[]);
                    setRows(project.rows);
                    setCharts(charts);
                } catch (e) {
                    throw e;
                }
            }).catch(e => console.error("Couldn't load the project:", e));
    }
}