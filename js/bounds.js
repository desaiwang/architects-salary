//function that returns x,y placement that guarantees to be within bounds
function calculateBounds(containerWidth, containerHeight, objectWidth, objectHeight, x, y, buffer = 15) {

  const spaceBelow = containerHeight - y - objectHeight - buffer;
  const spaceRight = containerWidth - x - objectWidth - buffer;


  let yTooltip = y + buffer;
  let xTooltip = x + buffer;

  //this assumes that containerWidth > objectWidth and containerHeight > objectHeight
  if (spaceBelow < 0) {
    yTooltip = y - objectHeight - buffer;
  }

  if (spaceRight < 0) {
    xTooltip = x - objectWidth - buffer;
  }

  return { x: xTooltip, y: yTooltip };

}

export default calculateBounds;