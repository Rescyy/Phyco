import { useSearchParams } from "react-router-dom";
import ChartModel from "../../../Application/Models/ChartModel";
import ChartManager from "../../../Application/Manager/ChartManager";
import { useEffect, useState } from "react";
import { emitTo, listen, once, UnlistenFn } from "@tauri-apps/api/event";
import { closeCurrentWindow } from "../../../Core/Common";
import useResize from "../../Hooks/Resize";
import ResizableFooter from "../ResizableFooter";
import { Scatter } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { getCurrentWindow } from "@tauri-apps/api/window";

const closeChartEvent = (key: string) => `closeChart${key}`;
const viewChartLabel = (key: string) => `viewChart${key}`;

export class ViewChartEvents {
    static async listenChartCallbackEvents(chart: ChartModel, chartManager: ChartManager) {
        await listen("test", (e) => console.log(e));
    }

    static async emitCloseChart(chart: ChartModel) {
        chart.open = false;
        emitTo(viewChartLabel(chart.key), closeChartEvent(chart.key));
    }
}

async function listenCloseEvent(key: string): Promise<UnlistenFn> {
    debugger;
    return await once(closeChartEvent(key), (_) => closeCurrentWindow());
}

const options = {
    scales: {
        y: {
            beginAtZero: true,
        },
    },
};

const data = {
    datasets: [
        {
            label: 'A dataset',
            data: Array.from({ length: 6 }, (v, i) => ({
                x: i,
                y: [23, 123, 32, 123, 5, 346][i],
            })),
            backgroundColor: 'rgba(255, 99, 132, 1)',
        },
    ],
};

export default function ViewChart() {
    const [searchParams] = useSearchParams();
    const key = searchParams.get("key")!;
    const [footerHeight, setFooterHeight] = useState(100);
    const { height, width } = useResize();


    useEffect(() => {
        const closeUnlistenWrapper: { inside?: UnlistenFn } = {};
        getCurrentWindow().once("tauri://close-requested", (event) => { emitTo("main", "test", { closed: true, e: event }); closeCurrentWindow(); });

        (async () => {
            closeUnlistenWrapper.inside = await listenCloseEvent(key);
        })();

        return () => {
            closeUnlistenWrapper.inside?.();
        };
    }, []);

    ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);


    return <>
        <div className="p-2" style={{ height, width }}>
            <Scatter options={options} data={data}></Scatter>
        </div>
        <div className="absolute bottom-0 w-full">
            <ResizableFooter heightState={[footerHeight, setFooterHeight]}>
                <div className="bg-zinc-300" style={{ height: footerHeight - 26 }}></div>
            </ResizableFooter>
        </div>
    </>;
}