import { ReactNode, useEffect, useState } from "react";
import { FaChartBar } from "react-icons/fa";

export type SidebarType = string | null;

interface RightSidebarProps {
    open: boolean;
    type: SidebarType;
    width: number;
    height: number;
    setOpen: (open: boolean) => void;
    setType: (type: SidebarType) => void;
    setWidth: (width: number) => void;
    children?: ReactNode;
}

const SIDEBAR_MIN_WIDTH = 100;

export default function RightSidebar({
    open,
    type,
    width,
    setOpen,
    setType,
    setWidth,
    children,
    height,
}: RightSidebarProps) {
    const [resizing, setResizing] = useState(false);

    useEffect(() => {
        if (!resizing) return;
        const handleMouseMove = (e: MouseEvent) => {
            const newWidth = window.innerWidth - e.clientX - 28;
            if (newWidth >= SIDEBAR_MIN_WIDTH && newWidth <= window.innerWidth - 100) {
                setWidth(newWidth);
            }
        };
        const stopResizing = () => setResizing(false);
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resizing, setWidth]);

    const toggleType = (newType: SidebarType) => {
        if (open && type === newType) {
            setOpen(false);
            setType(null);
        } else {
            setOpen(true);
            setType(newType);
        }
    };

    return (
        <>
            {/* Icon bar */}
            <div className="flex flex-col items-center gap-2 bg-zinc-400 border-zinc-100 border-l">
                <button onClick={() => toggleType("charts")} title="Charts" className="p-2 border-b border-zinc-100">
                    <FaChartBar size={16} color={"#2d2d2d"}/>
                </button>
            </div>

            {/* Sidebar panel */}
            {open && (
                <div
                    className="fixed top-2 right-8 h-full bg-zinc-200 z-20 flex flex-row"
                    style={{ width, height }}
                >
                    <div
                        className="w-2 h-full bg-zinc-400 cursor-ew-resize z-30 border-l border-zinc-100"
                        onMouseDown={() => setResizing(true)}
                    />
                    <div className="flex-grow overflow-auto p-4 border border-zinc-100">
                        {children}
                    </div>
                </div>
            )}
        </>
    );
}
