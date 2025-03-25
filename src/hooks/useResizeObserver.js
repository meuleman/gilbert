import { useEffect } from 'react';

export const useResizeObserver = (ref, onResize) => {
    useEffect(() => {
        if (!ref.current) return;
        const updateSize = () => {
            onResize({
                width: ref.current.clientWidth,
                height: ref.current.clientHeight
            });
        };
        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [ref, onResize]);
};