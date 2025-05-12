import { DataGrid, DataGridHandle } from "react-data-grid";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataManager as DataManager, RowModel } from "../../Application/Manager/DataManager";
import { ColumnModel } from "../../Application/Models/ColumnModel";
import ResizableFooter from "./ResizableFooter";
import FunctionalButton from "./FunctionalButton";
import { MultipleEventHandler } from "../../Core/Singletons/MultipleEventHandler";
import { useSearchParams } from "react-router-dom";
import { debounce } from "../../Core/Common";
import { ActionManager } from "../../Application/Manager/ActionManager";

export default function TableView() {
  const [columns, setColumns] = useState<ColumnModel[]>([]);
  const [rows, setRows] = useState<RowModel[]>([]);
  const [footerHeight, setFooterHeight] = useState(200);
  const [gridHeight, setGridHeight] = useState(window.innerHeight - footerHeight - 16);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [time, setTime] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  const tableRef = useRef<DataGridHandle>(null);
  const [searchParams] = useSearchParams();
  const filenameRef = useRef<string | null>(searchParams.get("filename"));
  const actionManagerRef = useRef(new ActionManager());
  const dataManagerRef = useRef<DataManager | null>(null);

  // Initialize dataManager once
  if (!dataManagerRef.current) {
    dataManagerRef.current = new DataManager({
      columnsState: [columns, setColumns],
      rowsState: [rows, setRows],
      refreshTable: () => setTime(Date.now()),
      filenameRef,
      actionManagerRef,
    });
  }

  const dataManager = dataManagerRef.current;
  dataManager.setStateHandlers({ columnsState: [columns, setColumns], rowsState: [rows, setRows] });

  useEffect(() => {
    const filename = filenameRef.current;
    if (filename) {
      setLoading(true);
      debounce("TableView.openProject", async () => {
        await dataManager?.openProject(filename);
        setLoading(false);
      }, 0);
    }

    const handleResize = () => {
      setGridHeight(window.innerHeight - footerHeight - 16);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [footerHeight]);

  const unselect = useCallback(() => {
    tableRef.current?.selectCell({ idx: -1, rowIdx: -1 });
    setSelectedRow(null);
    setSelectedColumn(null);
    setTime(Date.now());
  }, []);

  const handleKeypress = useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        unselect();
      } else if (event.key === "Enter" && selectedRow === -1) {
        dataManager?.editColumn(selectedColumn);
      } else if (event.key === "s" && event.ctrlKey) {
        event.preventDefault();
        await dataManager?.saveProject();
      } else if (event.key === "z" && event.ctrlKey) {
        actionManagerRef.current.undo(dataManager!);
      } else if (event.key === "Z" && event.ctrlKey && event.shiftKey) {
        actionManagerRef.current.redo(dataManager!);
      }
    },
    [selectedRow, selectedColumn]
  );

  useEffect(() => {
    MultipleEventHandler.addListener({ cellClicked: false, globalClick: true, functionalButtonPressed: false }, unselect);
    MultipleEventHandler.addGlobalClickListener();
    document.addEventListener("keydown", handleKeypress);

    return () => {
      MultipleEventHandler.removeListener(unselect);
      MultipleEventHandler.removeGlobalClickListener();
      document.removeEventListener("keydown", handleKeypress);
    };
  }, [handleKeypress, unselect]);

  const handleCellSelect = ({ rowIdx, column }: { rowIdx: number; column: { idx: number } }) => {
    MultipleEventHandler.setEvent("cellClicked");
    setSelectedRow(rowIdx);
    setSelectedColumn(column.idx);
  };

  const renderDataGrid = () => {
    if (columns.length === 0) {
      return (
        <div className="flex flex-col justify-center items-center" style={{ height: gridHeight, userSelect: "none" }}>
          {!loading && <h1 className="text-3xl font-bold">Add a new column</h1>}
        </div>
      );
    }

    return (
      <DataGrid
        ref={tableRef}
        key={gridHeight + columns.length + time}
        columns={dataManager!.getColumns()}
        rows={dataManager!.getRows()}
        rowKeyGetter={(row) => row.key}
        style={{ height: gridHeight }}
        className="w-full h-full fill-grid"
        onRowsChange={(rows) => dataManager!.editRows(rows)}
        onSelectedCellChange={handleCellSelect}
        onCellClick={handleCellSelect}
      />
    );
  };

  const renderFooterButtons = () => (
    <div className="flex flex-row h-full">
      <div className="flex-1">
        <div className="p-2 m-1 flex gap-1 flex-wrap">
          <FunctionalButton onClick={() => dataManager!.addColumn()} text="Add Column" />
          <FunctionalButton onClick={() => dataManager!.addRow()} text="Add Row" disabled={columns.length === 0} />
          <FunctionalButton text="Start Recording" disabled />
        </div>
      </div>
      <div className="w-2 bg-zinc-400 flex-none" />
      <div className="flex-1">
        <div className="p-2 m-1 flex gap-1 flex-wrap">
          <FunctionalButton
            onClick={() => dataManager!.editColumn(selectedColumn)}
            text="Edit Column"
            show={selectedColumn !== null && selectedRow === -1 && selectedColumn !== 0}
          />
          <FunctionalButton
            onClick={() => {
              dataManager!.deleteColumn(selectedColumn);
              unselect();
            }}
            text="Delete Column"
            show={selectedColumn !== null && selectedRow === -1 && selectedColumn !== 0}
          />
          <FunctionalButton
            onClick={() => {
              dataManager!.deleteRow(selectedRow);
              unselect();
            }}
            text="Delete Row"
            show={selectedRow !== null && selectedRow !== -1}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {renderDataGrid()}
      <ResizableFooter
        heightState={[
          footerHeight,
          (h) => {
            setFooterHeight(h);
            setGridHeight(window.innerHeight - h - 16);
          },
        ]}
      >
        {renderFooterButtons()}
      </ResizableFooter>
    </>
  );
}
