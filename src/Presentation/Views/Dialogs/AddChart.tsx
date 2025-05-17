import { UnlistenFn, Event, listen, emitTo, once } from "@tauri-apps/api/event";
import { closeCurrentWindow, isResultValid, ValidationResult } from "../../../Core/Common";
import { useEffect, useState } from "react";
import useResize from "../../Hooks/Resize";
import ValidationSpan from "../ValidationSpan";
import { allChartTypes } from "../../../Core/ChartType";

export type AddChartCallbackModel = {
    name: string,
    type: string,
};

export type AddChartCallbackResponse = {
    name: ValidationResult;
    type: ValidationResult;
};

const addChartCallbackEvent = "addChartCallback";
const addChartCallbackResponseEvent = "addChartCallbackResponse";
const addChartLabel = "addChart";

export async function listenAddChartCallback(callback: (model: AddChartCallbackModel) => AddChartCallbackResponse): Promise<UnlistenFn> {
    return await listen(addChartCallbackEvent,
        (event: Event<AddChartCallbackModel>) => emitTo(addChartLabel, addChartCallbackResponseEvent, callback(event.payload)));
}

function emitCallback(model: AddChartCallbackModel, callback: (response: AddChartCallbackResponse) => void) {
    once(addChartCallbackResponseEvent, (event: Event<AddChartCallbackResponse>) => callback(event.payload))
        .then(async () => await emitTo("main", addChartCallbackEvent, model));
}

export default function AddChart() {
    const [name, setName] = useState("");
    const [nameValidation, setNameValidation] = useState("");
    const [type, setType] = useState("");
    const [typeValidation, setTypeValidation] = useState("");

    const submitForm = async function () {
        const model: AddChartCallbackModel = { name, type };
        emitCallback(model, (response) => {
            if (!response.name.result) {
                setNameValidation(response.name.message);
            } else {
                setNameValidation("");
            }

            if (!response.type.result) {
                setTypeValidation(response.type.message);
            } else {
                setTypeValidation("");
            }

            if (isResultValid(response)) {
                closeCurrentWindow();
            }
        });
    };

    const { height, width } = useResize();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key == 'Escape') {
                closeCurrentWindow();
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("keydown", handleEscape);
        }
    }, []);

    return <>
        <div
            style={{ height: height, width: width }}
            className="bg-gray-100 px-5 py-3 flex flex-col items-center">
            <div className="w-75 mb-1">
                <label className="block text-xl select-none">
                    Name
                </label>
                <div className="bg-white border rounded border-gray-400">
                    <input
                        id="name-input"
                        type="text"
                        className="p-1 w-full"
                        placeholder="Chart Name..."
                        autoComplete="nope"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <ValidationSpan message={nameValidation} />
            </div>
            <div className="w-75 my-1">
                <label className="block text-xl select-none">
                    Chart Type
                </label>
                <div className="border bg-white border-gray-400 rounded">
                    <select
                        className="p-1 w-full"
                        value={type}
                        onChange={(e) => setType(e.target.value)}>
                        {type ? "" : <option>Choose a chart type...</option>}
                        {allChartTypes.map(item => <option key={item.value} value={item.value}>
                            {item.text}
                        </option>)}
                    </select>
                </div>
                <ValidationSpan message={typeValidation} />
            </div>
            <div className="flex-1"></div>
            <div className="w-75">
                <div className="flex justify-between">
                    <button
                        type="button"
                        className="text-sm/6 font-semibold text-gray-900 hover:bg-white px-3 py-1 hover:text-gray-700 rounded border w-18"
                        onClick={closeCurrentWindow}>
                        Cancel
                    </button>
                    <button onClick={submitForm}
                        className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 w-18 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                        Save
                    </button>
                </div>
            </div>
        </div>
    </>;
}