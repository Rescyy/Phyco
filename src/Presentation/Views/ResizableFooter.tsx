import { ReactNode, useEffect } from "react";
import { State } from "../Setup";

interface ResizableFooterArgs {
    children?: ReactNode;
    heightState: State<number>;
    isResizingState: State<boolean>;
}

export default function ResizableFooter({ children, heightState, isResizingState }: ResizableFooterArgs) {
    const [height, setHeight] = heightState;
    const [isResizing, setResizing] = isResizingState;

    const onMouseUp = () => {
        setResizing(false);
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newHeight = window.innerHeight - e.clientY;
            setHeight(Math.min(Math.max(100, newHeight), window.innerHeight-100));
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
        <div
            className="fixed bottom-0 left-0 right-0 bg-zinc-900 text-white border-t border-zinc-700 flex flex-col"
            style={{ height: `${height}px` }}>
            <div
                className="h-2 cursor-ns-resize bg-zinc-700 hover:bg-zinc-600"
                onMouseDown={startResizing}
            />
            <div className="flex-1 overflow-auto p-4">
                {children}
            </div>
        </div>
    );
}