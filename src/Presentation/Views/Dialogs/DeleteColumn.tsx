import { once, UnlistenFn, Event, emitTo } from "@tauri-apps/api/event";
import { DataManager } from "../../../Application/Manager/DataManager";
import { closeCurrentWindow, DataRequest } from "../../../Core/Common";
import { useEffect, useRef, useState } from "react";
import useResize from "../../Hooks/Resize";

export type DeleteColumnDetails = {
    selectedColumn: string,
    dependentColumns: string[],
};

export type DeleteColumnCallbackModel = {
    confirm: boolean,
};

const deleteColumnDetailsRequestEvent = "deleteColumnDetailsRequest";
const deleteColumnDetailsResponseEvent = "deleteColumnDetailsResponse";
const deleteColumnCallbackEvent = "deleteColumnCallback";

export async function listenDeleteColumnDetailsRequest(dataManager: DataManager, idx: number): Promise<UnlistenFn> {
    return await once(deleteColumnDetailsRequestEvent, async (event: Event<DataRequest>) => {
        debugger;
        const column = dataManager.columnsState[0][idx];
        const dependentColumns: string[] = [];
        dataManager.dependencyGraph.propagateDependents(column.key, (key) => {
            const name = dataManager.getColumn(key)?.name;
            if (name) dependentColumns.push(name);
            return true;
        });
        const details: DeleteColumnDetails = {
            selectedColumn: dataManager.columnsState[0][idx].name,
            dependentColumns
        };
        await emitTo(event.payload.callerLabel, deleteColumnDetailsResponseEvent, details);
    });
}

function fetchDetails(callback: (details: DeleteColumnDetails) => void) {
    once(deleteColumnDetailsResponseEvent, async (event: Event<DeleteColumnDetails>) =>
        callback(event.payload)
    ).then(async () => {
        await emitTo("main", deleteColumnDetailsRequestEvent, { callerLabel: "deleteColumn" })
    });
}

export async function listenDeleteColumnCallback(callback: (model: DeleteColumnCallbackModel) => void): Promise<UnlistenFn> {
    return await once(deleteColumnCallbackEvent, (event: Event<DeleteColumnCallbackModel>) => callback(event.payload));
}

function emitCallback(model: DeleteColumnCallbackModel) {
    emitTo("main", deleteColumnCallbackEvent, model);
}

export default function DeleteColumn() {
    const detailsRef = useRef<DeleteColumnDetails | null>(null);
    const details = detailsRef.current;
    const [rendered, setRendered] = useState(false);

    const size = useResize();

    useEffect(() => {
        fetchDetails((details) => {
            console.log(details);
            detailsRef.current = details;
            setRendered(true);
        });
    }, []);

    function onCancel() {
        emitCallback({ confirm: false });
        closeCurrentWindow();
    };

    function onConfirm() {
        emitCallback({ confirm: true });
        closeCurrentWindow();
    };

    const showDependentColumns = () => {
        if (details?.dependentColumns && details.dependentColumns.length !== 0) {
            return <>
                <br />
                The following columns depend on this column and will be deleted: 
                <br/> 
                {details.dependentColumns.map(x => `'${x}'`).join(", ")}
            </>
        }
    };

    if (rendered) {
        return <>
            <div style={{ ...size }} className="bg-gray-100 px-5 pb-3 flex flex-col">
                <div className="flex-1"></div>
                <div className="border bg-white rounded-sm p-1">
                    Are you sure you want to delete the column '{details?.selectedColumn}'?
                    {showDependentColumns()}
                </div>
                <div className="flex-1"></div>
                <div className="">
                    <div className="flex justify-between">
                        <button
                            type="button"
                            className="text-sm/6 font-semibold text-gray-900 hover:bg-white px-3 py-1 hover:text-gray-700 rounded border w-18"
                            onClick={onCancel}>
                            Cancel
                        </button>
                        <button onClick={onConfirm}
                            className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 w-18 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </>;
    }
}