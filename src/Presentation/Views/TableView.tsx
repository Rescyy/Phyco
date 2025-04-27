import { DataGrid } from "react-data-grid";
import { useEffect, useState } from "react";
import { TableDataManager } from "../../Application/Manager/TableDataManager";
import { ColumnModel } from "../../Application/Models/ColumnModel";
import ResizableFooter from "./ResizableFooter";

export default function TableView() {
  const [columns, setColumns] = useState<ColumnModel[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const manager = new TableDataManager([columns, setColumns], [rows, setRows]);
  const [footerHeight, setFooterHeight] = useState(200);
  const [gridHeight, setGridHeight] = useState(window.innerHeight - footerHeight);
  const [isResizing, setResizing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setGridHeight(window.innerHeight - footerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [footerHeight]);

  const showDataGrid = () => {
    if (columns.length == 0) {
      return <div className="flex flex-col
      justify-center items-center" style={{ height: gridHeight, userSelect: "none" }}>
        <h1 className="text-3xl font-bold">
          Add a new column
        </h1>
      </div>;
    } else {
      return <DataGrid
        key={gridHeight + manager.getColumns().length}
        columns={manager.getColumns()}
        rows={manager.getRows()}
        rowKeyGetter={row => row.key}
        style={{
          height: gridHeight,
          userSelect: isResizing ? "none" : undefined
        }}
        className="w-full h-full fill-grid"
        onRowsChange={setRows}
      />;
    }
  };

  return (
    <div className="flex flex-col">
      {
        showDataGrid()
      }
      <ResizableFooter heightState={[footerHeight, (h) => {
        setFooterHeight(h);
        setGridHeight(window.innerHeight - footerHeight);
      }]}
        isResizingState={[isResizing, setResizing]}>
        <div className="flex flex-row my-1 gap-1">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded" onClick={() => manager.addRow()}>Add Row</button>
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded" onClick={async () => await manager.addColumn()}>Add Column</button>
        </div>
      </ResizableFooter>
    </div>
  );
}