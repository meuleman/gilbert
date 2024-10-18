import { useEffect, useRef } from 'react';
import createScatterplot from 'regl-scatterplot';
import { scaleSequential, scaleLinear, scaleLog } from 'd3-scale';
import { range, groups, extent } from 'd3-array';
import { rgb } from 'd3-color';
import { interpolateViridis, interpolateTurbo, interpolateCool } from 'd3-scale-chromatic';

// import styles from  "./Scatter.module.css"


import PropTypes from 'prop-types';
ScatterPlot.propTypes = {
  points: PropTypes.array.isRequired,   // an array of [x,y] points
  colors: PropTypes.array,              // an array of integer values
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  pointSize: PropTypes.number,
  pointColor: PropTypes.array,
  opacity: PropTypes.number,
  duration: PropTypes.number,
  onScatter: PropTypes.func,
  onView: PropTypes.func,
  onSelect: PropTypes.func,
  onHover: PropTypes.func,
};


function ScatterPlot ({ 
  points, 
  width, 
  height, 
  duration = 1000,
  pointSize = 1,
  opacity = 0.75,
  pointColor = [250/255, 128/255, 114/255, 1], // salmon
  onScatter,
  onView,
  onSelect,
  onHover,
}) {

  const container = useRef();
  const xDomain = useRef([-1, 1]);
  const yDomain = useRef([-1, 1]);
  const xScale = scaleLinear()
    .domain(xDomain.current)
  const yScale = scaleLinear()
    .domain(yDomain.current)

  const scatterplotRef = useRef(null);
  // setup the scatterplot on first render
  useEffect(() => {
    console.log("init scatterplot")
    const scatterSettings = { 
      canvas: container.current,
      width,
      height,
      pointColorHover: [0.1, 0.1, 0.1, 0.5],
      xScale,
      yScale,
    }
    const scatterplot = createScatterplot(scatterSettings);
    scatterplotRef.current = scatterplot;

    onView && onView(xScale, yScale)
    scatterplot.subscribe(
      "view",
      ({ camera, view, xScale: xs, yScale: ys }) => {
        xDomain.current = xs.domain();
        yDomain.current = ys.domain();
        onView && onView(xDomain.current, yDomain.current)
    }
    );
    scatterplot.subscribe("select", ({ points }) => {
      onSelect && onSelect(points)
    });
    scatterplot.subscribe("deselect", () => {
      onSelect && onSelect([])
    });
    scatterplot.subscribe("pointOver", (pointIndex) => {
      onHover && onHover(pointIndex)
    });
    scatterplot.subscribe("pointOut", () => {
      onHover && onHover(null)
    });
  
    onScatter && onScatter(scatterplot)

    return () => {
      scatterplotRef.current = null;
      scatterplot.destroy();
    };
  }, [width, height, onScatter, onView, onSelect, onHover])

  const prevPointsRef = useRef();
  useEffect(() => {
    const scatterplot = scatterplotRef.current;
    const prevPoints = prevPointsRef.current;
    if(scatterplot && points && points.length){
    
      if(points[0].length == 3){
        scatterplot.set({colorBy: 'valueA'});
      } 
      scatterplot.set({
        opacity: opacity,
        pointSize: pointSize,
        pointColor: pointColor,
      })
      if(prevPoints && prevPoints.length === points.length) {
        console.log("transitioning scatterplot" )
        scatterplot.draw(points, { transition: true, transitionDuration: duration}).then(() => {
          // don't color till after
          // scatterplot.set({
          //   pointColor: pointColor,
          // })
          scatterplot.draw(points, { transition: false });
        })
      } else {
        console.log("fresh draw scatterplot")
        // scatterplot.set({
        //   pointColor: pointColor,
        // })
        scatterplot.draw(points, { transition: false });
      }
      prevPointsRef.current = points;
    }
    // TODO: why is it triggering when these come from just numbers
  }, [points])//, duration, pointSize, opacity, pointColor]);

  return <canvas className="scatter" ref={container} />;
}

export default ScatterPlot;
