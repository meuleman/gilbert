import { line } from 'd3-shape';
import { zoomIdentity } from 'd3-zoom';
import { getOffsets } from "../../lib/segments"

export function renderSquares(ctx, points, t, o, scales, fill, stroke, sizeMultiple = 1) {
  let step = Math.pow(0.5, o);
  let rw = scales.sizeScale(step) * t.k * sizeMultiple - 1;
  points.forEach(d => {
    let xx = t.x + scales.xScale(d.x) * t.k;
    let yy = t.y + scales.yScale(d.y) * t.k;
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.strokeRect(xx - rw / 2, yy - rw / 2, rw, rw);
    }
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(xx - rw / 2, yy - rw / 2, rw, rw);
    }
  });
}

export function renderPipes(ctx, points, t, o, scales, stroke, sizeMultiple = 1) {
  let linef = line()
    .x(d => d.x)
    .y(d => d.y)
    .context(ctx);
  let step = Math.pow(0.5, o);
  let rw = scales.sizeScale(step) * t.k;
  let srw = rw * sizeMultiple;

  points.forEach((d, i) => {
    let dm1 = points[i - 1];
    let dp1 = points[i + 1];
    let xx = t.x + scales.xScale(d.x) * t.k;
    let yy = t.y + scales.yScale(d.y) * t.k;
    let ps = [];
    if (dm1) {
      let { xoff, yoff } = getOffsets(d, dm1, rw, srw);
      ps.push({ x: xx + xoff, y: yy + yoff });
    }
    ps.push({ x: xx, y: yy });
    if (dp1) {
      let { xoff, yoff } = getOffsets(d, dp1, rw, srw);
      ps.push({ x: xx + xoff, y: yy + yoff });
    }

    ctx.strokeStyle = stroke;
    ctx.lineWidth = srw;
    ctx.beginPath();
    linef(ps);
    ctx.stroke();
  });
}

export const zoomToBox = (xScale, yScale, width, height) => (x0, y0, x1, y1, order, scaleMultiplier = 1) => {
  let centerX = (x0 + x1) / 2;
  let centerY = (y0 + y1) / 2;
  let screenCenterX = xScale(centerX);
  let screenCenterY = yScale(centerY);
  let scale = Math.pow(2, order) * scaleMultiplier;
  let tx = screenCenterX - width / 2 / scale;
  let ty = screenCenterY - height / 2 / scale;
  return zoomIdentity.translate(-tx * scale, -ty * scale).scale(scale);
};