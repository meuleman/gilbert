import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// get container size
export const useContainerSize = (containerRef) => {
	const [containerSize, setContainerSize] = useState({ width: 1, height: 1 });
  
  useEffect(() => {
		if (!containerRef?.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.target.clientWidth,
          height: entry.target.clientHeight,
        });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    // Initial measurement
    setContainerSize({
      width: containerRef?.current.clientWidth,
      height: containerRef?.current.clientHeight
    });
    return () => resizeObserver.disconnect();
  }, [containerRef]);

	return containerSize;
}