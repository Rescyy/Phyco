import { ReactNode, useEffect, useState } from "react";
import { State } from "../Setup";

interface ResizableFooterArgs {
    children?: ReactNode;
    heightState: State<number>;
}

export default function ResizableFooter({ children, heightState }: ResizableFooterArgs) {
    const [height, setHeight] = heightState;
    const [isResizing, setResizing] = useState(false);

    const onMouseUp = () => {
        setResizing(false);
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newHeight = window.innerHeight - e.clientY;
            setHeight(Math.min(Math.max(100, newHeight), window.innerHeight - 100));
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [height, isResizing]);

    const startResizing = () => {
        setResizing(true);
    };

    return (
        <>
            <div className="fixed bottom-2 left-2 right-2 bg-zinc-200 text-white border-zinc-400 flex flex-col"
                style={{ height: `${height}px` }}>
                <div className="h-2 cursor-ns-resize bg-zinc-400"
                    onMouseDown={startResizing} />
                {children}
            </div>
            <style>
                {
                    isResizing ? "* {user-select: none;}" : ""
                }
            </style>
        </>
    );
}