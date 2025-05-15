import { ReactNode, useEffect, useState } from "react";

interface ResizableFooterArgs {
  children?: ReactNode;
  heightState: [number, (height: number) => void];
}

const MIN_HEIGHT = 24;
const DEFAULT_HEIGHT = 200;

export default function ResizableFooter({ children, heightState }: ResizableFooterArgs) {
  const [height, setHeight] = heightState;
  const [isResizing, setIsResizing] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [previousHeight, setPreviousHeight] = useState(DEFAULT_HEIGHT);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || collapsed) return;
      const newHeight = window.innerHeight - e.clientY;
      const clamped = Math.min(Math.max(100, newHeight), window.innerHeight - 100);
      setHeight(clamped);
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, collapsed]);

  const toggleCollapsed = () => {
    if (collapsed) {
      setHeight(previousHeight);
    } else {
      setPreviousHeight(height);
      setHeight(MIN_HEIGHT);
    }
    setCollapsed(!collapsed);
  };

  return (
    <>
      <div
        className={"fixed left-2 right-2 text-black flex flex-col "}
        style={{ height: `${height}px` }}
      >
        {/* Drag handle + collapse toggle */}
        <div className={"h-6 cursor-pointer flex items-center justify-between px-2 " + (collapsed ? "bg-zinc-500" : "bg-zinc-400")} >
          <div
            className={(collapsed ? "cursor-not-allowed" : "cursor-ns-resize") + " select-none"}
            onMouseDown={() => !collapsed && setIsResizing(true)}
          >
            ::
          </div>
          <button
            onClick={toggleCollapsed}
            className="text-xs text-white px-2 py-1 bg-zinc-600 hover:bg-zinc-500 rounded select-none"
          >
            {collapsed ? "↑" : "↓"}
          </button>
        </div>

        {!collapsed && (
          <div className="overflow-auto h-full">
            {children}
          </div>
        )}
      </div>

      {isResizing && <style>{`* { user-select: none; }`}</style>}
    </>
  );
}
