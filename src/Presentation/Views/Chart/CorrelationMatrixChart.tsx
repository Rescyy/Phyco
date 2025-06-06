import {
  Chart,
  ChartConfiguration,
  ChartOptions,
  ChartDataset,
  ChartData,
  registerables
} from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import { ChartComponents, ChartComponentsProps, ViewChartEvents } from './ViewChart';
import ChartModel from '../../../Application/Models/ChartModel';
import { ColumnRowData } from '../../../Application/Manager/DataManager';
import { ColumnData } from '../../../Application/Models/ColumnModel';
 

Chart.register(...registerables, MatrixController, MatrixElement);

interface MatrixDataPoint {
  x: number;
  y: number;
  v?: number;
}

interface MatrixDataset extends ChartDataset<'matrix', MatrixDataPoint[]> {
  width: (ctx: any) => number;
  height: (ctx: any) => number;
}

export function matrixChartComponents(props: ChartComponentsProps): ChartComponents {
  const {
    key,
    columnRowDataState: [columnRowData, setColumnRowData],
    columns,
    optionsState: [options],
    datasetConfigsState: [datasetConfigs, setDatasetConfigs],
    size: { height, width },
    footerHeightState: [footerHeight, _setFooterHeight],
    canvasRef, chartRef,
  } = props;

  const handleDatasetKeyChange = async (index: number, axis: "xKey" | "yKey", columnKey: string) => {
    const existingData = columnRowData[columnKey];
    datasetConfigs[index] = { ...datasetConfigs[index], [axis]: columnKey };
    ViewChartEvents.ChartEvents.emitChartUpdateEvent(key, { datasets: datasetConfigs });

    const datasetKeys = ChartModel.getDatasetsKeys(datasetConfigs);
    setDatasetConfigs([...datasetConfigs]);
    if (!existingData) {
      await ViewChartEvents.ChartEvents.requestData(key, columnKey, (response) => {
        setColumnRowData(prev => {
          const copy: ColumnRowData = {};
          datasetKeys.forEach(k => copy[k] = prev[k]);
          copy[columnKey] = response[columnKey];
          return copy;
        });
      });
    }
  };

  const prepareMatrixData = (): MatrixDataPoint[] => {
    if (!datasetConfigs[0]) return [];
    const { xKey, yKey } = datasetConfigs[0];
    if (!xKey || !yKey) return [];

    const xData = columnRowData[xKey] || [];
    const yData = columnRowData[yKey] || [];

    return xData.data.map((x: number, i: number) => ({
      x,
      y: yData.data[i],
    }));
  };

  const renderChart = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return <></>;

    const matrixData = prepareMatrixData();

    const chartData: ChartData<'matrix'> = {
      datasets: [
        {
          label: 'Matrix Data',
          data: matrixData,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.5)',
          backgroundColor: 'rgba(200,200,0,0.3)',
          width: ({ chart }: any) => (chart.chartArea?.width || 0) / 2 - 1,
          height: ({ chart }: any) => (chart.chartArea?.height || 0) / 2 - 1,
        } as unknown as MatrixDataset
      ]
    };

    const chartOptions: ChartOptions<'matrix'> = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          display: false,
          min: 0.5,
          max: 2.5,
          offset: false
        },
        y: {
          display: false,
          min: 0.5,
          max: 2.5
        }
      },
      ...options
    };

    if (chartRef.current) {
      chartRef.current.data = chartData;
      chartRef.current.options = chartOptions;
      chartRef.current.update();
    } else {
      chartRef.current = new Chart(ctx, {
        type: 'matrix',
        data: chartData,
        options: chartOptions
      } as ChartConfiguration<'matrix'>);
    }

    return (
      <div style={{ width: width - 32, height: height - 32 - footerHeight }}>
        <canvas ref={canvasRef} width={width - 32} height={height - 32 - footerHeight} />
      </div>
    );
  };

  const renderCustomizationMenu = () => (
    <div className="p-4 space-y-4 w-full max-w-3xl h-full">
      <div className="border border-gray-300 rounded-lg px-4 py-2 space-y-2 bg-white shadow-sm">
        <h3 className="font-semibold text-gray-700">Matrix Dataset</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">X Axis</label>
            <select
              className="w-full p-2 border rounded"
              value={datasetConfigs[0]?.xKey || ""}
              onChange={(e) => handleDatasetKeyChange(0, "xKey", e.target.value)}
            >
              <option value="">(Auto)</option>
              {columns.map((col: ColumnData) => (
                <option key={col.key} value={col.key}>{col.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Y Axis</label>
            <select
              className="w-full p-2 border rounded"
              value={datasetConfigs[0]?.yKey || ""}
              onChange={(e) => handleDatasetKeyChange(0, "yKey", e.target.value)}
            >
              <option value="">(Auto)</option>
              {columns.map((col: ColumnData) => (
                <option key={col.key} value={col.key}>{col.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  return {
    chart: renderChart(),
    customizationMenu: renderCustomizationMenu(),
  };
}
