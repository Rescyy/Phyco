import { ColumnModel } from "../Models/ColumnModel";
import { invoke } from '@tauri-apps/api/core';
import { listen, Event } from "@tauri-apps/api/event";
import { Column, textEditor } from "react-data-grid";
import { OrdinalColumnModel } from "../Models/OrdinalColumnModel";
import { save } from '@tauri-apps/plugin-dialog';

export type AddColumnCallbackProps = {
  name: string,
  type: string,
};

type OpenProjectProps = {
  columns: { name: string, type: string }[],
  rows: any[]
};

function serialiseCellValue(value: unknown) {
  if (typeof value === 'string') {
    const formattedValue = value.replace(/"/g, '""');
    return formattedValue.includes(',') ? `"${formattedValue}"` : formattedValue;
  }
  return value;
}


export class DataManager {
  async saveProject() {
    this.projectFile.current ??= await save({
      filters: [{
        "name": "CSV",
        "extensions": ["csv"]
      }]
    });
    if (this.projectFile.current === null) return;
    this.refreshTable();
    const columnNames = this.columnsState[0].map(column => column.name);
    const columnTypes = this.columnsState[0].map(column => column.type.value);
    const rows = this.rowsState[0].map(row =>
      this.columnsState[0].map(column => row[column.key])
    );
    const content = [columnNames, columnTypes, ...rows]
      .map((cells) => cells.map(serialiseCellValue).join(','))
      .join('\n');
    await invoke("save_project", { content, filename: this.projectFile.current }).catch(e => console.error(e));
  }

  async openProject(filename: string) {
    const [, setColumns] = this.columnsState;
    const [, setRows] = this.rowsState;
    await invoke<OpenProjectProps>("read_project", { filename }).then(
      (payload) => {
        const { columns, rows } = payload;
        const processedColumns = columns.map(column => new ColumnModel(column));
        const nameToKeyMapping: { [name: string]: string } = {};
        processedColumns.forEach(column => nameToKeyMapping[column.name] = column.key);
        setColumns(processedColumns);
        setRows(rows.map((row, idx) => {
          const processedRow: any = {};
          for (let name in row) {
            debugger;
            processedRow[nameToKeyMapping[name]] = row[name];
          }
          debugger;
          return { ...processedRow, key: idx };
        }));
      }
    ).catch(e => console.error(e));
  }

  editRows(newRows: any[]) {
    const [rows, setRows] = this.rowsState;
    const [columns] = this.columnsState;
    columns.forEach(column => {
      if (column.type.isValid === undefined && column.type.preprocess === undefined) return;
      newRows = newRows.map((newRow, idx) => {
        const key = column.key;
        const prevValue = rows[idx] ? rows[idx][key] : undefined;
        const type = column.type;
        if (newRow[key] !== prevValue) {
          if (type.isValid !== undefined && !type.isValid(newRow[key])) {
            return prevValue;
          }
          if (type.preprocess !== undefined) {
            newRow[key] = type.preprocess(newRow[key]);
          }
        }
        return newRow;
      });
    });
    setRows(newRows);
  }

  deleteColumn(columnIdx: number | null): void {
    const [columns, setColumns] = this.columnsState;
    if (columnIdx === null || columnIdx < 0 || columnIdx > columns.length) return;
    columnIdx = columnIdx - 1;
    setColumns(prev => prev.filter((_, idx) => idx !== columnIdx));
  }

  deleteRow(rowIdx: number | null): void {
    const [rows, setRows] = this.rowsState;
    if (rowIdx === null || rowIdx < 0 || rowIdx >= rows.length) return;
    setRows(prev => prev.filter((_, idx) => idx !== rowIdx));
  }

  async editColumn(columnIdx: number | null, callback?: () => void) {
    if (columnIdx !== null) {
      const [columns, setColumns] = this.columnsState;
      const unlisten = await listen("editColumnCallback", (event: Event<string>) => {
        columns[columnIdx - 1].name = event.payload;
        setColumns(columns);
        this.refreshTable();
        callback ? callback() : null;
        unlisten();
      });
      const column = columns[columnIdx - 1];
      await invoke("edit_column", { name: column.name, type: column.type.text }).catch((e) => console.error(e));
    }
  }

  private columnsState: [ColumnModel[], React.Dispatch<React.SetStateAction<ColumnModel[]>>];
  private rowsState: [any[], React.Dispatch<React.SetStateAction<any[]>>];
  private refreshTable: () => void;
  private projectFile: React.RefObject<string | null>;

  constructor(
    columnsState: [ColumnModel[], React.Dispatch<React.SetStateAction<ColumnModel[]>>],
    rowsState: [any[], React.Dispatch<React.SetStateAction<any[]>>],
    refreshTable: () => void,
    projectFile: React.RefObject<string | null>
  ) {
    this.columnsState = columnsState;
    this.rowsState = rowsState;
    this.refreshTable = refreshTable;
    this.projectFile = projectFile;
  }

  addRow() {
    const [columns] = this.columnsState;
    if (columns) {
      const [rows, setRows] = this.rowsState;
      setRows([...rows, this.newRow()]);
    }
  }

  newRow(columns?: ColumnModel[] | ColumnModel) {
    const newRow: any = {
      key: Date.now()
    };
    if (columns instanceof ColumnModel) {
      columns = [columns];
    } else {
      columns ??= this.columnsState[0];
    }
    columns.forEach(column => {
      newRow[column.key] = "";
    });
    return newRow;
  }

  async addColumn() {
    const unlisten = await listen("addColumnCallback", (event: Event<AddColumnCallbackProps>) => {
      const [columns, setColumns] = this.columnsState;
      const column = new ColumnModel(event.payload);
      if (columns.length == 0) {
        const [, setRows] = this.rowsState;
        setRows([this.newRow(column)]);
      }
      setColumns([...columns, column]);
      unlisten();
    });
    await invoke("add_column").catch((e) => console.error(e));
  }

  getColumns(): Column<any, any>[] {
    let [columns] = this.columnsState;
    columns = [OrdinalColumnModel(), ...columns]
    return columns.map(column => ({
      name: column.name,
      key: column.key,
      editable: column.editable,
      frozen: true,
      resizable: column.resizable,
      minWidth: column.minWidth,
      width: column.width,
      renderEditCell: textEditor,
    }));
  }

  getRows(): any[] {
    let [rows] = this.rowsState;
    rows = rows.map((row, idx) => {
      return {
        order: idx + 1,
        ...row
      };
    });
    return rows;
  }
}
