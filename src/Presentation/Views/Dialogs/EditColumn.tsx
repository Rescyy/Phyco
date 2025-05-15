import { emitTo, once, Event } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { closeCurrentWindow, isResultValid, ValidationResult } from "../../../Core/Common";
import { ColumnModel } from "../../../Application/Models/ColumnModel";
import { FormulaColumnData } from "../../../Application/Models/FormulaColumnModel";
import ValidationSpan from "../ValidationSpan";

export type EditColumnCallbackModel = {
    name: string,
    formula?: string,
};

export type EditColumnCallbackResponse = {
    name: ValidationResult,
    formula?: ValidationResult,
};

export default function EditColumn() {
    const [isRendered, setRendered] = useState(false);
    const [nameValidation, setNameValidation] = useState("");
    const [name, setName] = useState("");
    const [formula, setFormula] = useState("");
    const [formulaValidation, setFormulaValidation] = useState("");
    const type = useRef<{ value: string, text: string } | undefined>(undefined);

    const submitForm = async function () {
        await once("editColumnCallbackResponse", (response: Event<EditColumnCallbackResponse>) => {
            const data = response.payload;

            if (!data.name.result) {
                setNameValidation(data.name.message);
            } else {
                setNameValidation("");
            }

            if (data.formula && !data.formula.result) {
                setFormulaValidation(data.formula.message);
            } else {
                setFormulaValidation("");
            }

            debugger;
            if (isResultValid(data)) {
                setNameValidation("");
                closeCurrentWindow();
            }
        });
        emitTo("main", "editColumnCallback", { name, formula });
    };

    const [height, setHeight] = useState(window.innerHeight);
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
        ColumnModel.fetchData("editColumn", (data) => {
            console.log(data);
            if (data.type.value === 'formula') {
                const formulaColumnData = data as FormulaColumnData;
                setFormula(formulaColumnData.formula);
            }
            setName(data.name);
            type.current = data.type;
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
        console.log(type.current);
        return <>
            <form action={submitForm} id="addColumnForm" >
                <div
                    style={{ height: height, width: width }}
                    className={`bg-gray-100 px-5 py-3 flex flex-col items-center`}>
                    <div className="w-75">
                        <label className="block text-xl select-none">
                            Name
                        </label>
                        <div className="bg-white border rounded border-gray-400">
                            <input
                                type="text"
                                className="p-1 w-full"
                                placeholder="Column Name..."
                                autoComplete="off"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <ValidationSpan message={nameValidation} />
                    </div>
                    <div className="w-75">
                        <label className="block text-xl select-none">
                            Datatype
                        </label>
                        <div className="border bg-white border-gray-400 rounded">
                            <div className="p-1 w-full text-gray-500 select-none">
                                {type.current?.text}
                            </div>
                        </div>
                        <ValidationSpan message={""} />
                    </div>
                    {
                        type.current?.value === 'formula' ?
                            <div className="mt-1 w-75">
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
                    <div className="w-75">
                        <div className="flex justify-between gap-5">
                            <button
                                type="button"
                                className="text-sm/6 font-semibold text-gray-900 hover:bg-white px-3 py-1 hover:text-gray-700 rounded border w-18"
                                onClick={closeCurrentWindow}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 w-18 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </>;
    }
}