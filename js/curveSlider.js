
export function curveSlider(dataAll, container, label, attribute, sliderWidth, sliderHeight, updateData, filters,
  { minLimit = null, maxLimit = 0, scaleFormatter = d3.format(",.0f"), numBins = 20, getButtonData = null }) {

  // Get a raw array of values for this property
  let values = dataAll.map(d => d[attribute]).sort(function (a, b) { return b - a }); //sorted for optimization

  // Find min and max for some scales
  let extent = d3.extent(values);
  if (minLimit != null) {
    extent[0] = minLimit;
  }
  if (maxLimit != 0) {
    extent[1] = maxLimit;
  }

  let xScale = d3.scaleLinear().domain(extent)
    .range([10, sliderWidth - 20]); // padding here for ease

  let xAxis = d3.axisBottom(xScale)
    //TODO: maybe set number of ticks as a parameter
    .ticks(6)
    .tickFormat(function (d) {
      // console.log("interval", d);
      return (maxLimit != 0 & d == maxLimit) ? `${scaleFormatter(maxLimit)}+` : scaleFormatter(d);
    })
    ;

  // Create some HTML elements
  let wrapper = container.append("div").attr("class", "controls").style("margin-top", "10px");
  wrapper.append("div").text(label);

  let rowwrapper = wrapper.append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center");

  let canvas = rowwrapper.append("svg").attr("id", "capacity selection")
    .attr("width", sliderWidth)
    .attr("height", sliderHeight + 30)
    .attr("attribute", attribute);
  canvas.append("g").attr("transform", `translate(0,${sliderHeight})`)
    .call(xAxis);

  let buttons = rowwrapper.append("div")
    .style("display", "flex")
    .style("flex-direction", "row")
    .style("justify-content", "center");


  if (getButtonData) {
    let buttonData = getButtonData(attribute, values);
    buttons
      .selectAll("button")
      .data(buttonData)
      .enter()
      .append("button")
      .text(d => d.label)
      .style("margin-right", 8)
      .on("click", function (event, d) {
        brushRegion.call(brush.move, null)

        filters[attribute] = d.filterFunc;

        updateData();
      })
  }

  // Make an area chart
  let areaLayer = canvas.append("g");

  // generate histogram
  let histoGen = d3.histogram().domain(extent)
    .thresholds(numBins);
  let counts = histoGen(values);

  // dummy object at start of graph
  counts.unshift({
    x0: 0,
    x1: counts[0].x0,
    length: counts[0].length
  });

  let yScale = d3.scaleLinear().domain(d3.extent(counts, d => d.length))
    .range([sliderHeight, 10]);

  // Area generator is like a lineGen, but we give y0 and y1 to fill it in
  let area = d3.area().x(d => xScale(d.x1))
    .y0(yScale(0))
    .y1(d => yScale(d.length))
    .curve(d3.curveNatural);

  // Adding the path works just like a line (the area generator just makes a filled region)
  areaLayer.append("path").datum(counts)
    .attr("class", "area")
    .attr("fill", "#9dbbed")
    .attr("d", area);


  let filterFunc = d => true;
  filters[attribute] = filterFunc;

  var brush = d3.brushX().extent([[10, 0], // Upper left corner
  [sliderWidth - 10, sliderHeight]])  // Lower right corner
    .on("brush end", brushMoved);

  function brushMoved(event) {
    // Everything but clicking on brush area
    if (event.selection !== null) {

      // Run scales in reverse to get data values for the ends of the brush
      //  If a scale turns data -> pixels, then scale.invert turns pixels -> data
      let start = xScale.invert(event.selection[0]);
      let end = xScale.invert(event.selection[1]);

      if (maxLimit != 0 & end > maxLimit - Math.floor(maxLimit * 0.001)) { end = Infinity; } //query all the power stations that are big.

      // Overwrite old filter in our dictionary
      // This filter now only returns True if the point's value is between start and end
      let filterFunc = d => d[attribute] >= start && d[attribute] <= end;
      filters[attribute] = filterFunc;
    }

    // Clicking on brush area to empty it out
    else {
      // Selected nothing, let everything pass
      let filterFunc = d => true;
      filters[attribute] = filterFunc;
    }

    //then call updateData at the end
    updateData();
  }

  let brushRegion = canvas.append("g").attr("class", "brush")
  brushRegion.call(brush);
}