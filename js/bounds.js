//function that returns x,y placement that guarantees to be within bounds
function calculateBounds(
  containerWidth,
  containerHeight,
  objectWidth,
  objectHeight,
  x,
  y,
  bufferX = 15,
  bufferY = 15
) {
  const spaceBelow = containerHeight - y - objectHeight - bufferY;
  const spaceRight = containerWidth - x - objectWidth - bufferX;

  let yTooltip = y + bufferY;
  let xTooltip = x + bufferX;

  //this assumes that containerWidth > objectWidth and containerHeight > objectHeight
  if (spaceBelow < 0) {
    yTooltip = y - objectHeight - bufferY;
  }

  if (spaceRight < 0) {
    xTooltip = x - objectWidth - bufferX;
  }

  return { x: xTooltip, y: yTooltip };
}

export default calculateBounds;
