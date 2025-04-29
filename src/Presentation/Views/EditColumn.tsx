import { emitTo } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { closeCurrentWindow } from "../../Core/Common";
import { useSearchParams } from "react-router-dom";

export default function EditColumn() {
    const [searchParams] = useSearchParams();
    const [nameValidation, setNameValidation] = useState("");
    const [name, setName] = useState(searchParams.get("name") ?? "");
    const type = searchParams.get("type") as string | undefined;

    const submitForm = function () {
        const isNameValid = Boolean(name);

        if (!isNameValid) {
            setNameValidation("Name is required");
        } else {
            setNameValidation("");
        }

        if (isNameValid) {
            emitTo("main", "editColumnCallback", name);
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

        return () =>{
            window.removeEventListener('resize', handleResize);
            document.removeEventListener("keydown", handleEscape);
        } 
    }, []);

    return <>
        <form action={submitForm} id="addColumnForm" >
            <div
                style={{ height: height, width: width }}
                className={`bg-gray-100 px-5 flex flex-col justify-around`}>
                <div className="">
                    <label className="block text-xl select-none">
                        Name
                    </label>
                    <div className="bg-white border rounded border-gray-400">
                        <input
                            id="name-input"
                            type="text"
                            className="p-1 w-full"
                            placeholder="Column Name..."
                            autoComplete="off"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <span className="text-sm text-red-300">{nameValidation}</span>
                </div>
                <div className="">
                    <label className="block text-xl select-none">
                        Datatype
                    </label>
                    <div className="border bg-white border-gray-400 rounded">
                        <div className="p-1 w-full text-gray-500 select-none">
                            {type}
                        </div>
                    </div>
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