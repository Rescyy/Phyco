import { ColumnModel } from "../Models/ColumnModel";
import { OrdinalColumnModel } from "../Models/OrdinalColumnModel";
import { Column, textEditor } from "react-data-grid";
import { invoke } from '@tauri-apps/api/core';
import { listen, Event } from "@tauri-apps/api/event";
import { save } from '@tauri-apps/plugin-dialog';
import { State } from "../../Presentation/Setup";
import { ActionManager, AddColumnAction, EditCellAction } from "./ActionManager";

export type AddColumnCallbackProps = {
  name: string;
  type: string;
};

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
  private filenameRef: React.RefObject<string | null>;
  private actionManagerRef: React.RefObject<ActionManager>;

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
    const [rows, setRows] = this.rowsState;
    const [columns] = this.columnsState;

    for (let i = 0; i < columns.length; i++) {
      const { key, type } = columns[i];

      for (let j = 0; j < newRows.length; j++) {
        const prev = rows[j]?.[key];
        let newValue = newRows[j]?.[key];

        if (newValue !== prev) {
          if (type.isValid && !type.isValid(newValue)) {
            newValue = prev;
            // return;
            break;
          }
          else if (type.preprocess) {
            newValue = type.preprocess(newValue);
          }

          this.actionManagerRef.current.execute(this, new EditCellAction(key, j, prev, newValue));
          return;
          // break;
        }
      }
    }

    // debugger;
    setRows(newRows);
  }

  deleteColumn(index: number | null): void {
    const [columns, setColumns] = this.columnsState;
    if (index == null || index <= 0 || index > columns.length) return;
    setColumns(columns.filter((_, idx) => idx !== index - 1));
  }

  deleteRow(index: number | null): void {
    const [rows, setRows] = this.rowsState;
    if (index == null || index < 0 || index >= rows.length) return;
    setRows(rows.filter((_, idx) => idx !== index));
  }

  async editColumn(index: number | null): Promise<void> {
    if (index === null) return;

    const [columns, setColumns] = this.columnsState;
    const column = columns[index - 1];

    const unlisten = await listen("editColumnCallback", (event: Event<string>) => {
      column.name = event.payload;
      setColumns([...columns]);
      this.refreshTable();
      unlisten();
    });

    try {
      await invoke("edit_column", { name: column.name, type: column.type.text });
    } catch (e) {
      console.error(e);
    }
  }

  async addColumn(): Promise<void> {
    const unlisten = await listen("addColumnCallback", (event: Event<AddColumnCallbackProps>) => {
      this.actionManagerRef.current.execute(this,
        new AddColumnAction(
          new ColumnModel(event.payload)
        )
      );
      unlisten();
    });

    try {
      await invoke("add_column");
    } catch (e) {
      console.error(e);
    }
  }

  addRow(): void {
    const [columns] = this.columnsState;
    const [rows, setRows] = this.rowsState;
    setRows([...rows, this.newRow(columns)]);
  }

  newRow(columns?: ColumnModel[] | ColumnModel): any {
    const newRow: any = { key: Date.now() };
    const cols = columns instanceof ColumnModel ? [columns] : (columns ?? this.columnsState[0]);
    cols.forEach(col => newRow[col.key] = "");
    return newRow;
  }

  getColumns(): Column<any, any>[] {
    const [columns] = this.columnsState;
    debugger;
    return [OrdinalColumnModel(), ...columns].map(col => ({
      name: col.name,
      key: col.key,
      editable: col.editable,
      frozen: true,
      resizable: col.resizable,
      minWidth: col.minWidth,
      width: col.width,
      renderEditCell: textEditor,
    }));
  }

  getRows(): any[] {
    const [rows] = this.rowsState;
    const displayRows = rows.map((row, idx) => ({ order: idx + 1, ...row }));
    console.log(displayRows);
    return displayRows;
  }
}