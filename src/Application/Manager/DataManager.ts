import { ColumnModel } from "../Models/ColumnModel";
import { OrdinalColumnModel } from "../Models/OrdinalColumnModel";
import { Column, textEditor } from "react-data-grid";
import { invoke } from '@tauri-apps/api/core';
import { listen, Event, UnlistenFn, emitTo } from "@tauri-apps/api/event";
import { save } from '@tauri-apps/plugin-dialog';
import { State } from "../../Presentation/Setup";
import { ActionManager, AddColumnAction, AddFormulaColumnAction, AddRowAction, DeleteColumnAction, DeleteRowAction, EditCellAction, EditColumnAction } from "./ActionManager";
import { AddColumnCallbackModel } from "../../Presentation/Views/Dialogs/AddColumn";
import { EditColumnCallbackModel } from "../../Presentation/Views/Dialogs/EditColumn";
import { ColumnValidator } from "../Validation/ColumnValidator";
import { isResultValid } from "../../Core/Common";
import { FormulaColumnModel } from "../Models/FormulaColumnModel";
import { ColumnFormula, ColumnStatisticValues } from "../../Core/ColumnFormula";

export type RowModel = {
  [key: string]: string
}

type OpenProjectProps = {
  columns: { name: string; type: string }[];
  rows: RowModel[];
}

export type DataManagerProps = {
  columnsState: State<ColumnModel[]>,
  rowsState: State<RowModel[]>,
  refreshTable: () => void,
  filenameRef: React.RefObject<string | null>,
  actionManagerRef: React.RefObject<ActionManager>,
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
  columnStatisticValues: ColumnStatisticValues = {};
  private filenameRef: React.RefObject<string | null>;
  private actionManagerRef: React.RefObject<ActionManager>;
  private unlistenFunctions: UnlistenFn[] = [];

  constructor({
    columnsState,
    rowsState,
    refreshTable,
    filenameRef,
    actionManagerRef }: DataManagerProps
  ) {
    this.columnsState = columnsState;
    this.rowsState = rowsState;
    this.refreshTable = refreshTable;
    this.filenameRef = filenameRef;
    this.actionManagerRef = actionManagerRef;
  }

  setStateHandlers({
    columnsState,
    rowsState
  }: {
    columnsState: [ColumnModel[], React.Dispatch<React.SetStateAction<ColumnModel[]>>];
    rowsState: [RowModel[], React.Dispatch<React.SetStateAction<RowModel[]>>];
  }) {
    this.dispose();
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
      const processedColumns = columns.map(col => new ColumnModel(col));
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

          this.columnStatisticValues[key].stale = true;
          this.actionManagerRef.current.execute(this, new EditCellAction(key, j, newValue));
          return;
        }
      }
    }
  }

  updateFormulaColumns() {
    const [columns] = this.columnsState;
    const [, setRows] = this.rowsState;

    /* compute the order in which the formula columns should be computed */
    setRows(rows => {
      const formulaColumns = columns.filter(x => x instanceof FormulaColumnModel);
      if (formulaColumns.length == 0) return rows;
      const columnDependenciesGraph: any[] = formulaColumns.map(x => {
        return {
          key: x.key, dependencies: []
        };
      });
      columnDependenciesGraph.forEach((columnNode, i) => {
        const formulaColumn = formulaColumns[i];
        columnNode.dependencies = formulaColumn.formula.columnDependencies.interior.map(x => x.key);
      });
      (formulaColumns.length > 1 ? topologicalSort(columnDependenciesGraph)
      .map(x => formulaColumns.find(y => y.key === x) as FormulaColumnModel) : formulaColumns)
      .forEach(x => {
        x.formula.apply(rows, this.columnStatisticValues).forEach((val, i) => {
          rows[i][x.key] = val.toString();
        });
      });
      return rows;
    });

    function topologicalSort(
      graph: { key: string; dependencies: string[] }[]
    ): string[] {
      const adjList = new Map<string, string[]>();
      const visited = new Set<string>();
      const tempMark = new Set<string>();
      const result: string[] = [];
    
      // Build adjacency list (key -> dependencies)
      for (const node of graph) {
        adjList.set(node.key, node.dependencies);
      }
    
      function visit(nodeKey: string) {
        if (visited.has(nodeKey)) return;
        if (tempMark.has(nodeKey)) {
          throw new Error(`Cycle detected involving: ${nodeKey}`);
        }
    
        tempMark.add(nodeKey);
    
        const deps = adjList.get(nodeKey) || [];
        for (const dep of deps) {
          visit(dep);
        }
    
        tempMark.delete(nodeKey);
        visited.add(nodeKey);
        result.push(nodeKey);
      }
    
      for (const node of graph) {
        if (!visited.has(node.key)) {
          visit(node.key);
        }
      }
    
      return result.reverse(); // Reverse to ensure dependencies come before dependents
    }
  }

  deleteColumn(index: number | null): void {
    if (index === null) return;
    index--;
    this.actionManagerRef.current.execute(this, new DeleteColumnAction(index));
  }

  deleteRow(index: number | null): void {
    if (index === null) return;
    this.actionManagerRef.current.execute(this, new DeleteRowAction(index));
  }

  async editColumn(index: number | null): Promise<void> {
    if (index === null) return;
    index--;

    const [columns] = this.columnsState;
    const column = columns[index];

    const unlisten = await listen("editColumnCallback", async (event: Event<EditColumnCallbackModel>) => {
      const columnValidator = new ColumnValidator(this);
      const validationResult = columnValidator.validateEditColumn(event.payload, index);

      await emitTo("editColumn", "editColumnCallbackResponse", { name: validationResult });

      if (isResultValid(validationResult)) {
        const data = event.payload;
        const newColumn = new ColumnModel(column.name, column.type.value);
        newColumn.name = data.name;
        this.actionManagerRef.current.execute(this,
          new EditColumnAction(
            index, newColumn
          )
        );
        unlisten();
      }
    });

    this.unlistenFunctions.push(unlisten);

    try {
      this.unlistenFunctions.push(await column.listenColumnDataRequest());
      await invoke("edit_column", { name: column.name, type: column.type.text });
    } catch (e) {
      console.error(e);
    }
  }

  async addColumn(): Promise<void> {
    const unlisten = await listen("addColumnCallback", async (event: Event<AddColumnCallbackModel>) => {
      const [columns] = this.columnsState;
      const columnValidator = new ColumnValidator(this);
      const model = event.payload;
      const validationResult = columnValidator.validateAddColumn(model);

      await emitTo("addColumn", "addColumnCallbackResponse", validationResult);

      if (isResultValid(validationResult)) {
        if (model.type === 'formula') {
          this.actionManagerRef.current.execute(this,
            new AddFormulaColumnAction(
              new FormulaColumnModel(model.name,
                new ColumnFormula(columns, model.formula!)
              )
            )
          );
        } else {
          const model = new ColumnModel(event.payload);
          this.columnStatisticValues[model.key] = {stale: false};
          this.actionManagerRef.current.execute(this, new AddColumnAction(model));
        }
        unlisten();
      }
    });

    this.unlistenFunctions.push(unlisten);

    try {
      await invoke("add_column");
    } catch (e) {
      console.error(e);
    }
  }

  addRow(): void {
    this.actionManagerRef.current.execute(this, new AddRowAction());
  }

  newRow(columns?: ColumnModel[] | ColumnModel): any {
    const newRow: any = { key: Date.now() };
    const cols = columns instanceof ColumnModel ? [columns] : (columns ?? this.columnsState[0]);
    cols.forEach(col => newRow[col.key] = "");
    return newRow;
  }

  getColumns(): Column<any, any>[] {
    const [columns] = this.columnsState;
    console.log("getColumns");
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

  dispose() {
    this.unlistenFunctions.forEach(unlisten => unlisten());
    this.unlistenFunctions = [];
  }
}