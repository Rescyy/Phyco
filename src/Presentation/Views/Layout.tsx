import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

export default function Layout() {
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

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <>
        <div className="p-2 bg-zinc-400" style={{ height: height, width: width }}>
            <div className="bg-zinc-200 h-full">
                <Outlet />
            </div>
        </div>
    </>;
}