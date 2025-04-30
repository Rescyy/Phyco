import { useNavigate } from "react-router-dom";
import { open } from '@tauri-apps/plugin-dialog';

export default function Home() {
    const navigate = useNavigate();

    const newProject = () => {
        navigate("/table", { replace: true })
    };
    const openProject = async () => {
        const filename = await open({
            filters: [{
                "name": "Phyco",
                "extensions": ["phyco"]
            }]
        });
        if (filename) {
            navigate(`/table?filename=${filename}`, { replace: true });
        }
    };

    return <>
        <div className="flex flex-col justify-center items-center h-full">
            <h1 className="text-3xl font-bold">
                Welcome to Phyco!!!
            </h1>
            <div className="flex flex-row mt-2 gap-4">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded" onClick={newProject}>
                    New Project
                </button>
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 border border-blue-700 rounded" onClick={openProject}>
                    Open Project
                </button>
            </div>
        </div>
    </>
}