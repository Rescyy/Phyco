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
import RightSidebar, { SidebarType } from "./RightSidebar"; // assume this exists
import { FaPlus, FaTrash } from "react-icons/fa";
import ChartManager from "../../Application/Manager/ChartManager";
import ChartModel from "../../Application/Models/ChartModel";

export default function TableView() {
  const [columns, setColumns] = useState<ColumnModel[]>([]);
  const [rows, setRows] = useState<RowModel[]>([]);
  const [charts, setCharts] = useState<ChartModel[]>([]);
  const [footerHeight, setFooterHeight] = useState(200);
  const [sidebarWidth, setSidebarWidth] = useState(window.innerWidth / 4);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState<SidebarType>(null);
  const [gridHeight, setGridHeight] = useState(window.innerHeight - footerHeight - 18);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [time, setTime] = useState(Date.now());
  const [loading, setLoading] = useState(false);

  const tableRef = useRef<DataGridHandle>(null);
  const [searchParams] = useSearchParams();
  const filenameRef = useRef<string | null>(searchParams.get("filename"));
  const actionManagerRef = useRef(new ActionManager());
  const dataManagerRef = useRef(new DataManager({
    columnsState: [columns, setColumns],
    rowsState: [rows, setRows],
    refreshTable: () => setTime(Date.now()),
    filenameRef,
    actionManager: actionManagerRef.current,
  }));
  
  const actionManager = actionManagerRef.current;
  const dataManager = dataManagerRef.current;
  dataManager.setStateHandlers({ columnsState: [columns, setColumns], rowsState: [rows, setRows] });
  const chartManagerRef = useRef(new ChartManager(dataManager, actionManager, [charts, setCharts]));

  const chartManager = chartManagerRef.current;
  chartManager.setStateHandlers([charts, setCharts]);

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
      setGridHeight(window.innerHeight - footerHeight - 18);
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
        actionManagerRef.current.undo();
      } else if (event.key === "Z" && event.ctrlKey && event.shiftKey) {
        actionManagerRef.current.redo();
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
        <div className="flex flex-col justify-center items-center flex-1" style={{ height: gridHeight, userSelect: "none" }}>
          {!loading && <h1 className="text-3xl font-bold">Add a new column</h1>}
        </div>
      );
    }

    return (
      <div className="flex-1 " style={{ height: gridHeight }}>
        <DataGrid
          ref={tableRef}
          key={gridHeight + columns.length + time}
          columns={dataManager.getColumns()}
          rows={dataManager.getRows()}
          rowKeyGetter={(row) => row.key}
          style={{ height: gridHeight }}
          className="w-full h-full fill-grid"
          onRowsChange={(rows) => dataManager.editRows(rows)}
          onSelectedCellChange={handleCellSelect}
          onCellClick={handleCellSelect}
        />
      </div>
    );
  };

  const renderFooterButtons = () => (
    <div className="flex flex-row h-full">
      <div className="flex-1">
        <div className="p-2 m-1 flex gap-1 flex-wrap">
          <FunctionalButton onClick={() => dataManager.addColumn()} text="Add Column" />
          <FunctionalButton onClick={() => dataManager.addRow()} text="Add Row" show={columns.length !== 0} />
        </div>
      </div>
      <div className="w-2 bg-zinc-400 flex-none border-l border-r border-zinc-100" />
      <div className="flex-1">
        <div className="p-2 m-1 flex gap-1 flex-wrap">
          <FunctionalButton
            onClick={() => dataManager.editColumn(selectedColumn)}
            text="Edit Column"
            show={selectedColumn !== null && selectedRow === -1 && selectedColumn !== 0}
          />
          <FunctionalButton
            onClick={() => {
              dataManager.deleteColumn(selectedColumn);
              unselect();
            }}
            text="Delete Column"
            show={selectedColumn !== null && selectedRow === -1 && selectedColumn !== 0}
          />
          <FunctionalButton
            onClick={() => {
              dataManager.deleteRow(selectedRow);
              unselect();
            }}
            text="Delete Row"
            show={selectedRow !== null && selectedRow !== -1}
          />
        </div>
      </div>
    </div>
  );

  const renderChartSidePanel = () => (
    <div className="flex flex-col h-full">
      <div className="flex flex-row items-center bg-zinc-300 border-b border-zinc-100">
        <div className="font-bold flex-1 py-1 pl-1 select-none">
          Charts Panel
        </div>
        <div className="w-[1px] bg-zinc-100 h-full"></div>
        <button className="py-2 px-2 hover:bg-zinc-200" onClick={() => chartManager.handleAdd()}>
          <FaPlus className="fill-zinc-600 hover:fill-zinc-500" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {charts.map((chart, i) => (
            <li
              key={chart.key}
              className="flex items-center justify-between bg-zinc-100 hover:bg-zinc-50 py-1 px-2 shadow-sm"
              onClick={() => chartManager.viewChart(chart.key)}
            >
              <span className="text-sm font-medium truncate select-none">{chart.name}</span>
              <div className="flex gap-1">
                <button onClick={(e) => {e.stopPropagation(); chartManager.handleDelete(i);}}>
                  <div className="p-1 hover:bg-zinc-200 rounded-2xl">
                    <FaTrash className="w-4 h-4 fill-zinc-600 hover:fill-zinc-700" />
                  </div>
                </button>
              </div>
            </li>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="pl-2 py-2 bg-zinc-400">
        <div className="flex flex-row w-full bg-zinc-200 border-t border-b border-l border-zinc-100">
          <div className="" style={{ width: window.innerWidth - 18 }}>
            {renderDataGrid()}
            <ResizableFooter
              heightState={[footerHeight, (h) => {
                setFooterHeight(h);
                setGridHeight(window.innerHeight - h - 18);
              }]}
              sidebarOpen={sidebarOpen}
              sidebarWidth={sidebarWidth}
            >
              {renderFooterButtons()}
            </ResizableFooter>
          </div>
          <RightSidebar
            height={window.innerHeight - 16}
            open={sidebarOpen}
            type={sidebarType}
            width={sidebarWidth}
            setOpen={setSidebarOpen}
            setType={setSidebarType}
            setWidth={setSidebarWidth} >
            {renderChartSidePanel()}
          </RightSidebar>
        </div>
      </div>
    </>
  );
}
