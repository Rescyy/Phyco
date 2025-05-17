import { ColumnData, ColumnModel } from "../Models/ColumnModel";
import { OrdinalColumnModel } from "../Models/OrdinalColumnModel";
import { Column, textEditor } from "react-data-grid";
import { invoke } from '@tauri-apps/api/core';
import { listen, Event, UnlistenFn, emitTo, once } from "@tauri-apps/api/event";
import { save } from '@tauri-apps/plugin-dialog';
import { State } from "../../Presentation/Setup";
import { ActionManager, AddColumnAction, AddRowAction, DeleteColumnAction, DeleteRowAction, EditCellAction, EditColumnAction } from "./ActionManager";
import { AddColumnCallbackModel } from "../../Presentation/Views/Dialogs/AddColumn";
import { EditColumnCallbackModel } from "../../Presentation/Views/Dialogs/EditColumn";
import { ColumnValidator } from "../Validation/ColumnValidator";
import { DataRequest, isResultValid } from "../../Core/Common";
import { FormulaColumnModel } from "../Models/FormulaColumnModel";
import { ColumnFormula } from "../../Core/ColumnFormula";
import { DependencyGraph } from "../../Core/ColumnDependenciesGraph";
import { listenDeleteColumnCallback, listenDeleteColumnDetailsRequest } from "../../Presentation/Views/Dialogs/DeleteColumn";

export type RowModel = {
  [key: string]: string
}

type OpenProjectProps = {
  columns: { name: string; type: string }[];
  rows: RowModel[];
}

export interface DataManagerData {
  columns: ColumnData[];
  selectedColumn?: number;
}

export type DataManagerProps = {
  columnsState: State<ColumnModel[]>,
  rowsState: State<RowModel[]>,
  refreshTable: () => void,
  filenameRef: React.RefObject<string | null>,
  actionManager: ActionManager,
}

function serialiseCellValue(value: unknown): string | unknown {
  if (typeof value === 'string') {
    const formatted = value.replace(/"/g, '""');
    return formatted.includes(',') ? `"${formatted}"` : formatted;
  }
  return value;
}

export class DataManager {
  columnsState: State<ColumnModel[]>;
  rowsState: State<RowModel[]>;
  refreshTable: () => void;
  dependencyGraph = new DependencyGraph();
  private filenameRef: React.RefObject<string | null>;
  private actionManager: ActionManager;
  private unlistenFunctions: UnlistenFn[] = [];

  constructor({
    columnsState,
    rowsState,
    refreshTable,
    filenameRef,
    actionManager }: DataManagerProps
  ) {
    this.columnsState = columnsState;
    this.rowsState = rowsState;
    this.refreshTable = refreshTable;
    this.filenameRef = filenameRef;
    this.actionManager = actionManager;
  }

  setStateHandlers({
    columnsState,
    rowsState
  }: {
    columnsState: [ColumnModel[], React.Dispatch<React.SetStateAction<ColumnModel[]>>];
    rowsState: [RowModel[], React.Dispatch<React.SetStateAction<RowModel[]>>];
  }) {
    this.disposeListeners();
    this.columnsState = columnsState;
    this.rowsState = rowsState;
  }

  async saveProject(): Promise<void> {
    if (!this.filenameRef.current) {
      this.filenameRef.current = await save({
        filters: [{ name: "Phyco", extensions: ["phyco"] }]
      });
    }
    if (!this.filenameRef.current) return;

    this.refreshTable();
    const [columns] = this.columnsState;
    const [rows] = this.rowsState;

    const header = columns.map(col => col.name);
    const types = columns.map(col => col.type.value);
    const rowData = rows.map(row => columns.map(col => row[col.key]));
    const content = [header, types, ...rowData]
      .map(cells => cells.map(serialiseCellValue).join(','))
      .join('\n');

    try {
      await invoke("save_project", { content, filename: this.filenameRef.current });
    } catch (e) {
      console.error(e);
    }
  }

  async openProject(filename: string): Promise<void> {
    const [, setColumns] = this.columnsState;
    const [, setRows] = this.rowsState;

    try {
      const { columns, rows } = await invoke<OpenProjectProps>("read_project", { filename });
      const processedColumns = columns.map(col => new ColumnModel(this, col));
      const nameToKey: Record<string, string> = {};
      processedColumns.forEach(col => nameToKey[col.name] = col.key);

      setColumns(processedColumns);
      setRows(rows.map((row, idx) => {
        const processed: any = {};
        for (const name in row) {
          processed[nameToKey[name]] = row[name];
        }
        return { ...processed, key: idx };
      }));
    } catch (e) {
      console.error(e);
    }
  }

  applyTopological(func: (column: ColumnModel) => void) {
    const [columns] = this.columnsState;
    const sortedColumns = this.dependencyGraph.topologicalSort().reverse().map(x => this.getColumn(x)!);
    const freeColumns = columns.filter(column => !sortedColumns.some(x => x.key === column.key));
    sortedColumns.forEach(column => {
      func(column);
    });
    freeColumns.forEach(column => {
      func(column);
    });
  }

  editRows(newRows: any[]): void {
    const [rows] = this.rowsState;
    const [columns] = this.columnsState;

    for (let i = 0; i < columns.length; i++) {
      const { key, type } = columns[i];

      for (let j = 0; j < newRows.length; j++) {
        const prev = rows[j]?.[key];
        let newValue = newRows[j]?.[key];

        if (newValue !== prev) {
          if (type.isValid && !type.isValid(newValue)) {
            newValue = prev;
            return;
          }

          if (type.preprocess) {
            newValue = type.preprocess(newValue);
          }

          this.actionManager.execute(new EditCellAction(this, key, j, newValue));
          return;
        }
      }
    }
  }

  getColumn(key: string) {
    const columns = this.columnsState[0];
    return columns.find(x => x.key === key);
  }

  getRow(key: string) {
    const rows = this.rowsState[0];
    return rows.map(row => row[key]);
  }

  async deleteColumn(index: number | null) {
    if (index === null) return;
    index--;
    this.disposeListeners();
    this.unlistenFunctions.push(await listenDeleteColumnDetailsRequest(this, index));
    this.unlistenFunctions.push(await listenDeleteColumnCallback((model) => {
      if (model.confirm) {
        this.actionManager.execute(new DeleteColumnAction(this, index));
      }
    }));
    try {
      await invoke("delete_column");
    } catch (e) {
      console.log(e);
    }
  }

  deleteRow(index: number | null): void {
    if (index === null) return;
    this.actionManager.execute(new DeleteRowAction(this, index));
  }

  async editColumn(index: number | null): Promise<void> {
    if (index === null) return;
    index--;

    const [columns] = this.columnsState;
    const column = columns[index];

    const unlisten = await listen("editColumnCallback", async (event: Event<EditColumnCallbackModel>) => {
      const columnValidator = new ColumnValidator(this);
      const validationResult = columnValidator.validateEditColumn(event.payload, index);

      await emitTo("editColumn", "editColumnCallbackResponse", validationResult);

      if (isResultValid(validationResult)) {
        const callbackModel = event.payload;
        let newColumn: ColumnModel;
        if (column.type.value === 'formula') {
          const formulaColumn = column as FormulaColumnModel;
          const formula = formulaColumn.formula.rawExpression === callbackModel.formula ? formulaColumn.formula : new ColumnFormula(columns, callbackModel.formula!);
          newColumn = new FormulaColumnModel(this, callbackModel.name, formula, column.key);
        } else {
          newColumn = new ColumnModel(this, callbackModel.name, column.type.value, column.key);
        }
        this.actionManager.execute(new EditColumnAction(this, newColumn, index));
        unlisten();
      }
    });

    this.unlistenFunctions.push(unlisten);

    try {
      this.unlistenFunctions.push(await column.listenDataRequest());
      await invoke("edit_column");
    } catch (e) {
      console.error(e);
    }
  }

  async addColumn(): Promise<void> {
    const unlisten = await listen("addColumnCallback", async (event: Event<AddColumnCallbackModel>) => {
      const [columns] = this.columnsState;
      const columnValidator = new ColumnValidator(this);
      const callbackModel = event.payload;
      const validationResult = columnValidator.validateAddColumn(callbackModel);

      await emitTo("addColumn", "addColumnCallbackResponse", validationResult);

      if (isResultValid(validationResult)) {
        let column: ColumnModel;
        if (callbackModel.type === 'formula') {
          column = new FormulaColumnModel(this, callbackModel.name, new ColumnFormula(columns, callbackModel.formula!));
        } else {
          column = new ColumnModel(this, event.payload);
        }
        this.actionManager.execute(new AddColumnAction(this, column));
        unlisten();
      }
    });

    this.disposeListeners();

    this.unlistenFunctions.push(unlisten);
    try {
      this.unlistenFunctions.push(await this.listenDataRequest());
      await invoke("add_column");
    } catch (e) {
      console.error(e);
    }
  }

  addRow(): void {
    console.log(Date.now(), "addRow begin");
    this.actionManager.execute(new AddRowAction(this));
    console.log(Date.now(), "addRow end");
  }

  newRow(columns?: ColumnModel[] | ColumnModel, index?: number): RowModel {
    const newRow: any = { key: Date.now() };
    const cols = columns instanceof ColumnModel ? [columns] : (columns ?? this.columnsState[0]);
    cols.forEach(col => newRow[col.key] = col.newRow(index ?? this.rowsState[0].length));
    return newRow;
  }

  getColumns(): Column<any, any>[] {
    const [columns] = this.columnsState;
    console.log(columns);
    return [OrdinalColumnModel(), ...columns].map(col => ({
      name: col.name,
      key: col.key,
      editable: col.editable,
      frozen: true,
      resizable: col.resizable,
      minWidth: col.minWidth,
      width: col.width,
      renderEditCell: textEditor,
      draggable: col.draggable,
      sortable: true,
    }));
  }

  getRows(): any[] {
    const [rows] = this.rowsState;
    const displayRows = rows.map((row, idx) => ({ order: idx + 1, ...row }));
    return displayRows;
  }

  disposeListeners() {
    this.unlistenFunctions.forEach(unlisten => unlisten());
    this.unlistenFunctions = [];
  }

  dataManagerData(selectedColumn?: number): DataManagerData {
    return {
      columns: this.columnsState[0].map(x => x.columnData()),
      selectedColumn
    };
  }

  async listenDataRequest(): Promise<UnlistenFn> {
    return await once("dataManagerData", (data: Event<DataRequest>) => {
      emitTo(data.payload.callerLabel, "dataManagerDataResponse", this.dataManagerData());
    });
  }

  static async fetchData(callerLabel: string, callback: (data: DataManagerData) => void) {
    once("dataManagerDataResponse", (data: Event<DataManagerData>) => callback(data.payload));
    emitTo("main", "dataManagerData", { callerLabel });
  }
}