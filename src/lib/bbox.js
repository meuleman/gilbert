
export function untransform(xx, yy, transform) {
  return {
    x: (xx - transform.x) / transform.k,
    y: (yy - transform.y) / transform.k
  };
}

export function getBboxView(transform, width, height) {
  let tl = untransform(0, 0, transform);
  let br = untransform(width, height, transform);
  return {
    x: tl.x,
    y: tl.y,
    width: br.x - tl.x,
    height: br.y - tl.y,
    topleft: tl,
    bottomright: br
  };
}

export function getBboxDomain(transform, xScale, yScale, width, height) {
  let bbox = getBboxView(transform, width, height);
  let x = xScale.invert(bbox.topleft.x)
  let y = yScale.invert(bbox.topleft.y)
  let brx = xScale.invert(bbox.bottomright.x)
  let bry = yScale.invert(bbox.bottomright.y)
  return (bbox = {
    x, y,
    width: brx - x,
    height: bry - y,
    topleft: {
      x,
      y
    },
    bottomright: {
      x: brx,
      y: bry
    }
  });
}