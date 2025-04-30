import { useEffect, useState } from "react";
import { closeCurrentWindow } from "../../Core/Common";
import { emitTo } from "@tauri-apps/api/event";
import { datatypes } from "../../Core/Datatype";
import { AddColumnCallbackProps } from "../../Application/Manager/DataManager";

export default function AddColumn() {
    const [nameValidation, setNameValidation] = useState("");
    const [typeValidation, setTypeValidation] = useState("");
    const [name, setName] = useState("");
    const [type, setType] = useState("");

    const submitForm = function () {
        const isNameValid = Boolean(name);
        const isDatatypeValid = Boolean(type);

        if (!isNameValid) {
            setNameValidation("Name is required");
        } else {
            setNameValidation("");
        }

        if (!isDatatypeValid) {
            setTypeValidation("Datatype is required");
        } else {
            setTypeValidation("");
        }

        if (isNameValid && isDatatypeValid) {
            const payload: AddColumnCallbackProps = { name, type };
            emitTo("main", "addColumnCallback", payload);
            closeCurrentWindow();
        }
    };

    const [height, setHeight] = useState(window.innerHeight);
    const [width, setWidth] = useState(window.innerWidth);

    useEffect(() => {
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

    return <>
        <form action={submitForm} id="addColumnForm" autoComplete="nope">
            <div
                style={{ height: height, width: width }}
                className={`bg-gray-100 px-5 flex flex-col justify-around`}>
                <div className="">
                    <label className="block text-xl">
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
                    <span className="text-sm text-red-300">{nameValidation}</span>
                </div>
                <div className="">
                    <label className="block text-xl">
                        Datatype
                    </label>
                    <div className="border bg-white border-gray-400 rounded">
                        <select
                            className="p-1 w-full"
                            value={type}
                            onChange={(e) => setType(e.target.value)}>
                            {type ? "" : <option>Choose a datatype...</option>}
                            {datatypes.map(item => <option key={item.value} value={item.value}>
                                {item.text}
                            </option>)}
                        </select>
                    </div>
                    <span className="text-sm text-red-300">{typeValidation}</span>
                </div>
                <div className="">
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