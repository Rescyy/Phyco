import { useEffect, useState } from "react";

export default function useResize(): { height: number, width: number } {
    const [height, setHeight] = useState(window.innerHeight);
    const [width, setWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => {
            setHeight(window.innerHeight);
            setWidth(window.innerWidth);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);
    return {height, width};
}