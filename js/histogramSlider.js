//base function for making a histogram slider
//function originally from Cornell INFO3300, modified to directly store start and end
//doesn't user filter function since it's just for p/n_estimate
function makeSliderHistogram(data, minMax, colorScale, container, label, attribute, sliderWidth, sliderHeight, stringFormatter, brushUpdateFunction) {


  let thresholds = [];
  if (colorScale.hasOwnProperty('thresholds')) {
    thresholds = colorScale.thresholds();
  } else {
    thresholds = colorScale.quantiles();
  }


  sliderHeight = sliderHeight - 20 //this is to account for buffering
  //remove what's there before
  container.selectAll("*").remove()

  // Get a raw array of values for this property
  let values = data.map(d => d[attribute]);

  // Add minmax to thresholds
  let thresholdsWhole = [minMax[0], ...thresholds, minMax[1]];

  let xScale = d3.scaleLinear().domain(minMax)
    .range([10, sliderWidth - 15]); // padding here for ease
  let xAxis = d3.axisBottom(xScale).tickFormat(stringFormatter).tickValues(thresholdsWhole);

  // Create some HTML elements
  let wrapper = container;
  wrapper.append("div").text(label);
  let canvas = wrapper.append("svg").attr("width", sliderWidth)
    .attr("height", sliderHeight + 30)
    .attr("attribute", attribute)
    .attr("class", "brushGraph");
  canvas.append("g").attr("transform", `translate(0,${sliderHeight + 7})`)
    .call(xAxis);

  // Make an area chart
  let areaLayer = canvas.append("g");

  let histoGen = d3.histogram().domain(minMax).thresholds(thresholdsWhole);
  let counts = histoGen(values);

  let yScale = d3.scaleLinear().domain(d3.extent(counts, d => d.length))
    .range([sliderHeight, 10]);

  for (let i = 0; i < thresholdsWhole.length - 1; i++) {
    let dataStart = thresholdsWhole[i];
    let dataEnd = thresholdsWhole[i + 1];
    let pixelStart = xAxis.scale()(dataStart);
    let pixelEnd = xAxis.scale()(dataEnd);
    areaLayer.append("rect")
      .attr("x", pixelStart)
      .attr("y", yScale(counts[i].length))
      .attr("width", pixelEnd - pixelStart)
      .attr("height", yScale(0) - yScale(counts[i].length))
      .style("fill", colorScale((dataStart + dataEnd) / 2.0));
  }

  //TODO: change when new data comes to mouseup instead of brushMoved
  var brush = d3.brushX().extent([
    [10, 0], // Upper left corner
    [sliderWidth - 10, sliderHeight]
  ]) // Lower right corner
    .on("end", brushMoved);
  // NOTE: we still need to *call the brush* towards the end of our code to "paste" it into HTML

  function brushMoved(event) {

    let est_start = 0;
    let est_end = Infinity;

    // Everything but clicking on brush area
    if (event.selection !== null) {
      // Run scales in reverse to get data values for the ends of the brush
      //  If a scale turns data -> pixels, then scale.invert turns pixels -> data
      //update start and end of slider
      est_start = xScale.invert(event.selection[0]);
      est_end = xScale.invert(event.selection[1]);
    }


    brushUpdateFunction(est_start, est_end);

  }
  canvas.append("g").attr("class", "brush").call(brush);
}