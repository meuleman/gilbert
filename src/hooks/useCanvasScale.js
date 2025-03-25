import { useEffect } from 'react';
import scaleCanvas from '../lib/canvas';

export const useCanvasScale = (canvasRef, width, height) => {
    useEffect(() => {
        if (canvasRef.current) {
            scaleCanvas(canvasRef.current, canvasRef.current.getContext("2d"), width, height);
        }
    }, [canvasRef, width, height]);
};