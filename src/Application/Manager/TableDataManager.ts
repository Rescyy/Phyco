import { ColumnModel } from "../Models//ColumnModel";
import { error } from '@tauri-apps/plugin-log';
import { invoke } from '@tauri-apps/api/core';
import { listen, Event } from "@tauri-apps/api/event";
import { Column, textEditor } from "react-data-grid";

export class TableDataManager {
  private columnsState: [ColumnModel[], React.Dispatch<React.SetStateAction<ColumnModel[]>>];
  private rowsState: [any[], React.Dispatch<React.SetStateAction<any[]>>];

  constructor(
    columnsState: [ColumnModel[], React.Dispatch<React.SetStateAction<ColumnModel[]>>],
    rowsState: [any[], React.Dispatch<React.SetStateAction<any[]>>]
  ) {
    this.columnsState = columnsState;
    this.rowsState = rowsState;
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
    const unlisten = await listen("addColumnCallback", (event: Event<ColumnModel>) => {
      const [columns, setColumns] = this.columnsState;
      const column = new ColumnModel(event.payload);
      if (columns.length == 0) {
        const [, setRows] = this.rowsState;
        setRows([this.newRow(column)]);
      }
      setColumns([...columns, column]);
      unlisten();
    });
    await invoke("add_column").catch((e) => error(e));
  }

  getColumns(): Column<any, any>[] {
    const [columns] = this.columnsState;
    return columns.map(column => ({
      name: column.name,
      key: column.key,
      editable: true,
      frozen: true,
      renderEditCell: textEditor,
    }));
  }

  getRows(): any[] {
    const [rows] = this.rowsState;
    return rows;
  }
}
