import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useZoom } from '../../contexts/ZoomContext';
import lenses from '../../components/Lenses/lenses.json'
import { dropdownList as layers } from '../../layers'

/**
 * Custom hook to handle the layer order
 */
function useLayerEffects() {

	const { order } = useZoom()
	const orderRef = useRef(order)
	const [layerOrder, setLayerOrder] = useState(null)
	const [layer, setLayer] = useState(layers[0])
	const layerOrderRef = useRef(layerOrder)
	const [currentLens, setCurrentLens] = useState(lenses["Default"])

	// function to create the layer order based on the lens
	const createLayerOrder = useCallback((lens) => {
		const layerOrder = {};
		Object.keys(lens).forEach((order) => {
			const name = lens[order];
			const dataset = layers.find((d) => d.name === name);
			if (dataset) {
				layerOrder[order] = dataset;
			} else {
				console.error(`No matching dataset found for ${name}`);
			}
		});
		return layerOrder;
	}, [layers]);

	// set the layer as order changes
	useEffect(() => {
		if (orderRef.current !== order) {
      setLayer(layerOrderRef.current[order])
    }
    orderRef.current = order
	}, [order, setLayer])

	// set the layer order when lenses change or on mount
	useEffect(() => {
		setLayerOrder(createLayerOrder(currentLens))
	}, [currentLens])

	// reset the layer when the layer order changes
	useEffect(() => {
		if (layerOrder && layerOrder[orderRef.current]) {
			setLayer(layerOrder[orderRef.current])
			layerOrderRef.current = layerOrder
		}
	}, [layerOrder])

	// function to revert the layer back to the current lens
	const handleRevertLayerOrder = useCallback(() => {
		setLayerOrder(createLayerOrder(currentLens))
	}, [currentLens, setLayerOrder])

	// check if the layer order has deviated from the lens
	const layerOrderDeviated = useMemo(() => {
		if (layerOrder) {
			const defaultLayerOrder = createLayerOrder(currentLens);
			return JSON.stringify(layerOrder) !== JSON.stringify(defaultLayerOrder);
		}
		return false;
	}, [layerOrder, currentLens])

	return {
		layerOrder, 
		setLayerOrder,
		layer,
		setLayer,
		handleRevertLayerOrder,
		layerOrderDeviated
	}
}

export default useLayerEffects;