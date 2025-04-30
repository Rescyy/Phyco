import { DataGrid, DataGridHandle } from "react-data-grid";
import { useEffect, useRef, useState } from "react";
import { DataManager as DataManager } from "../../Application/Manager/DataManager";
import { ColumnModel } from "../../Application/Models/ColumnModel";
import ResizableFooter from "./ResizableFooter";
import FunctionalButton from "./FunctionalButton";
import { MultipleEventHandler } from "../../Core/Singletons/MultipleEventHandler";
import { useSearchParams } from "react-router-dom";
import { debounce } from "../../Core/Common";

export default function TableView() {
  const [columns, setColumns] = useState<ColumnModel[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [footerHeight, setFooterHeight] = useState(200);
  const [gridHeight, setGridHeight] = useState(window.innerHeight - footerHeight - 16);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [time, setTime] = useState(Date.now());
  const tableRef = useRef<DataGridHandle>(null);
  
  const [searchParams] = useSearchParams();
  const filenameRef = useRef<string>(searchParams.get("filename"));
  const manager = new DataManager([columns, setColumns], [rows, setRows], () => { setTime(Date.now()); }, filenameRef);
  const [loading, setLoading] = useState(Boolean(filenameRef.current));
  useEffect(() => {
    const filename = filenameRef.current;
    if (filename) {
      debounce("TableView.openProject", async () => {
        await manager.openProject(filename);
        setLoading(false);
      }, 0);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setGridHeight(window.innerHeight - footerHeight - 16);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [footerHeight]);

  const select = function ({ rowIdx, column }: { rowIdx: number, column: { idx: number } }) {
    MultipleEventHandler.setEvent("cellClicked");
    setSelectedRow(rowIdx);
    setSelectedColumn(column.idx);
  }

  const unselect = function () {
    tableRef.current?.selectCell({ idx: -1, rowIdx: -1 });
    setTime(Date.now());
    setSelectedRow(null);
    setSelectedColumn(null);
  };

  useEffect(() => {
    const handleKeypress = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        unselect();
      } else if (event.key === 'Enter') {
        if (selectedRow === -1) {
          manager.editColumn(selectedColumn);
        }
      } else if (event.key === 's' && event.ctrlKey) {
        debugger;
        await manager.saveProject();
      }
    };

    MultipleEventHandler.addListener({ "cellClicked": false, "globalClick": true, "functionalButtonPressed": false }, unselect);
    MultipleEventHandler.addGlobalClickListener();
    document.addEventListener("keydown", handleKeypress);
    return () => {
      document.removeEventListener("keydown", handleKeypress);
      MultipleEventHandler.removeGlobalClickListener();
      MultipleEventHandler.removeListener(unselect);
    };
  }, [selectedColumn, selectedRow]);

  const showDataGrid = function () {
    if (columns.length == 0) {
      return <div className="flex flex-col justify-center items-center"
        style={{ height: gridHeight, userSelect: "none" }}>
        {
          loading ? "" : <h1 className="text-3xl font-bold">
            Add a new column
          </h1>
        }
      </div>;
    } else {
      return <>
        <DataGrid
          ref={tableRef}
          key={gridHeight + manager.getColumns().length + time}
          columns={manager.getColumns()}
          rows={manager.getRows()}
          rowKeyGetter={row => row.key}
          style={{
            height: gridHeight
          }}
          className="w-full h-full fill-grid"
          onRowsChange={rows => manager.editRows(rows)}
          onSelectedCellChange={select}
          onCellClick={select}
        />
      </>;
    }
  };

  return (
    <>
      {
        showDataGrid()
      }
      <ResizableFooter heightState={[footerHeight, (h) => {
        setFooterHeight(h);
        setGridHeight(window.innerHeight - footerHeight - 16);
      }]}>
        <div className="flex flex-row h-full">
          <div className="flex-1">
            <div className="p-2 m-1 flex gap-1 flex-wrap">
              <FunctionalButton onClick={() => manager.addColumn()} text="Add Column" />
              <FunctionalButton onClick={() => manager.addRow()} text="Add Row" disabled={columns.length === 0} />
              <FunctionalButton text="Start Recording" disabled={true} />
            </div>
          </div>
          <div className="w-2 bg-zinc-400 flex-none" />
          <div className="flex-1">
            <div className="p-2 m-1 flex gap-1 flex-wrap">
              <FunctionalButton onClick={() => manager.editColumn(selectedColumn)} text="Edit Column" show={selectedColumn !== null && selectedRow === -1 && selectedColumn !== 0} />
              <FunctionalButton onClick={() => manager.deleteColumn(selectedColumn)} text="Delete Column" show={selectedColumn !== null && selectedRow === -1 && selectedColumn !== 0} />
              <FunctionalButton onClick={() => manager.deleteRow(selectedRow)} text="Delete Row" show={selectedRow !== null && selectedRow !== -1} />
            </div>
          </div>
        </div>
      </ResizableFooter>
    </>
  );
}