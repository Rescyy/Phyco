import { useEffect, useRef, useState } from "react";
import { closeCurrentWindow, isResultValid, ValidationResult } from "../../../Core/Common";
import { emitTo, once, Event } from "@tauri-apps/api/event";
import Datatype, { allDatatypes, primitiveDatatypes } from "../../../Core/Datatype";
import ValidationSpan from "../ValidationSpan";
import { DataManager } from "../../../Application/Manager/DataManager";

export type AddColumnCallbackModel = {
    name: string;
    type: string;
    formula?: string;
};

export type AddColumnCallbackResponse = {
    name: ValidationResult;
    type: ValidationResult;
    formula?: ValidationResult;
}

export default function AddColumn() {
    const [isRendered, setRendered] = useState(false);
    const [name, setName] = useState("");
    const [nameValidation, setNameValidation] = useState("");
    const [type, setType] = useState("");
    const [typeValidation, setTypeValidation] = useState("");
    const [formula, setFormula] = useState("");
    const [formulaValidation, setFormulaValidation] = useState("");
    const availableDatatypesRef = useRef<Datatype[]>([]);
    const availableDatatypes = availableDatatypesRef.current;
    console.log(availableDatatypes);

    const submitForm = async function () {
        const payload: AddColumnCallbackModel = { name, type, formula };
        await once("addColumnCallbackResponse", (response: Event<AddColumnCallbackResponse>) => {
            const data = response.payload;
            if (!data.name.result) {
                setNameValidation(data.name.message);
            } else {
                setNameValidation("");
            }

            if (!data.type.result) {
                setTypeValidation(data.type.message);
            } else {
                setTypeValidation("");
            }

            if (data.formula && !data.formula.result) {
                setFormulaValidation(data.formula.message);
            } else {
                setFormulaValidation("");
            }

            if (isResultValid(data)) {
                closeCurrentWindow();
            }
        });
        emitTo("main", "addColumnCallback", payload);
    };

    const [height, setHeight] = useState(window.innerHeight);
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        DataManager.fetchData("addColumn", (data) => {
            if (data.columns.some(column => column.type.value === 'numerical')) {
                availableDatatypesRef.current = allDatatypes;
            } else {
                availableDatatypesRef.current = primitiveDatatypes;
            }
            setRendered(true);
        });

        const handleResize = () => {
            setHeight(window.innerHeight);
            setWidth(window.innerWidth);
        };

        window.addEventListener("resize", () => {
            setHeight(window.innerHeight);
            setWidth(window.innerWidth);
        });

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key == 'Escape') {
                closeCurrentWindow();
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener("keydown", handleEscape);
        }
    }, []);

    if (isRendered) {
        return <>
            <div
                style={{ height: height, width: width }}
                className="bg-gray-100 px-5 py-3 flex flex-col">
                <div className="w-50 mb-1">
                    <label className="block text-xl select-none">
                        Name
                    </label>
                    <div className="bg-white border rounded border-gray-400">
                        <input
                            id="name-input"
                            type="text"
                            className="p-1 w-full"
                            placeholder="Column Name..."
                            autoComplete="nope"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <ValidationSpan message={nameValidation} />
                </div>
                <div className="w-50 my-1">
                    <label className="block text-xl select-none">
                        Datatype
                    </label>
                    <div className="border bg-white border-gray-400 rounded">
                        <select
                            className="p-1 w-full"
                            value={type}
                            onChange={(e) => setType(e.target.value)}>
                            {type ? "" : <option>Choose a datatype...</option>}
                            {availableDatatypes.map(item => <option key={item.value} value={item.value}>
                                {item.text}
                            </option>)}
                        </select>
                    </div>
                    <ValidationSpan message={typeValidation} />
                </div>
                {
                    type === 'formula' ?
                        <div className="mt-1">
                            <label className="block text-xl select-none">
                                Formula
                            </label>
                            <div className="bg-white border rounded border-gray-400 h-[100px]">
                                <textarea
                                    style={{ resize: "none" }}
                                    className="w-full p-1 h-[100px]"
                                    autoComplete="off"
                                    value={formula}
                                    onChange={(e) => setFormula(e.target.value)}
                                />
                            </div>
                            <ValidationSpan message={formulaValidation} />
                        </div> : <></>
                }
                <div className="flex-1"></div>
                <div className="">
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
}