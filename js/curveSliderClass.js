class CurveSlider {
  constructor(dataAll, container, label, attribute, sliderWidth, sliderHeight, updateData, filters, options = {}) {

    const { minLimit = null, maxLimit = 0, scaleFormatter = d3.format(",.0f"), numBins = 20, getButtonData = null } = options;

    this.dataAll = dataAll;
    this.container = container;
    this.label = label;
    this.attribute = attribute;
    this.sliderWidth = sliderWidth;
    this.sliderHeight = sliderHeight;
    this.updateData = updateData;
    this.filters = filters;
    this.minLimit = minLimit;
    this.maxLimit = maxLimit;
    this.scaleFormatter = scaleFormatter;
    this.numBins = numBins;
    this.getButtonData = getButtonData;


    this.initialize();
  }

  //this one only tests filters that are not this.attribute
  static pointPassesFilters(filters, attribute, point) {
    let stillPassed = true;

    //console.log("filters", filters)
    Object.entries(filters).forEach(([key, filterFunc]) => {
      if (key !== attribute) {
        stillPassed = filterFunc(point) && stillPassed;
      }
    });

    return stillPassed;
  }


  initialize() {
    // Get a raw array of values for this property
    this.values = this.dataAll.map(d => d[this.attribute]).sort((a, b) => b - a);

    // Find min and max for scales
    this.extent = d3.extent(this.values);
    if (this.minLimit != null) this.extent[0] = this.minLimit;
    if (this.maxLimit !== 0) this.extent[1] = this.maxLimit;

    // Set up scales and axis
    this.xScale = d3.scaleLinear().domain(this.extent).range([10, this.sliderWidth - 20]);
    this.xAxis = d3.axisBottom(this.xScale).ticks(6).tickFormat(d => (
      (this.maxLimit !== 0 && d === this.maxLimit) ? `${this.scaleFormatter(this.maxLimit)}+` : this.scaleFormatter(d)
    ));

    // Create HTML elements
    this.wrapper = this.container.append("div").attr("class", "controls").style("margin-top", "10px");
    this.wrapper.append("div").text(this.label);

    this.rowwrapper = this.wrapper.append("div").style("display", "flex").style("flex-direction", "column")
    //.style("align-items", "center");
    this.canvas = this.rowwrapper.append("svg").attr("width", this.sliderWidth).attr("height", this.sliderHeight + 30).attr("attribute", this.attribute);
    this.canvas.append("g").attr("transform", `translate(0,${this.sliderHeight})`).call(this.xAxis);

    // Buttons
    this.buttons = this.rowwrapper.append("div").style("display", "flex").style("flex-direction", "row").style("justify-content", "center");
    if (this.getButtonData) this.setupButtons();

    // Area chart and brush setup
    this.setupAreaChart();
    this.setupBrush();
  }

  setupButtons() {
    const buttonData = this.getButtonData(this.attribute, this.values);
    this.buttons.selectAll("button")
      .data(buttonData)
      .enter()
      .append("button")
      .text(d => d.label)
      .style("margin-right", 8)
      .on("click", (event, d) => {
        this.brushRegion.call(this.brush.move, null);
        this.filters[this.attribute] = d.filterFunc;
        this.updateData();
      });
  }

  update() {
    const filteredData = this.dataAll.filter(d => CurveSlider.pointPassesFilters(this.filters, this.attribute, d));
    const filteredValues = filteredData.map(d => d[this.attribute]).sort((a, b) => b - a);

    this.counts = this.histoGen(filteredValues);
    this.counts.unshift({
      x0: 0,
      x1: this.counts[0].x0,
      length: this.counts[0].length
    });

    //update domain based on updated counts
    this.yScale.domain(d3.extent(this.counts, d => d.length));

    //update area and path generators
    this.area
      .x(d => this.xScale(d.x1))
      .y0(this.yScale(0))
      .y1(d => this.yScale(d.length));
    this.path.datum(this.counts)
      .transition()  // Start transition
      .duration(750)  // Set duration for the animation
      .attr("d", this.area);  // Redraw path with updated data and yScale
  }

  setupAreaChart() {
    this.areaLayer = this.canvas.append("g");
    this.histoGen = d3.histogram().domain(this.extent).thresholds(this.numBins);
    this.counts = this.histoGen(this.values);

    this.counts.unshift({
      x0: 0,
      x1: this.counts[0].x0,
      length: this.counts[0].length
    });

    this.yScale = d3.scaleLinear().domain(d3.extent(this.counts, d => d.length)).range([this.sliderHeight, 10]);

    this.area = d3.area()
      .x(d => this.xScale(d.x1))
      .y0(this.yScale(0))
      .y1(d => this.yScale(d.length))
      .curve(d3.curveNatural);

    this.path = this.areaLayer.append("path").datum(this.counts)
      .attr("class", "area")
      .attr("fill", "#9dbbed")
      .attr("d", this.area);

    this.filters[this.attribute] = d => true;  // Default filter
  }

  setupBrush() {
    this.brush = d3.brushX().extent([[10, 0], [this.sliderWidth - 10, this.sliderHeight]])
      .on("brush end", (event) => this.brushMoved(event));

    this.brushRegion = this.canvas.append("g").attr("class", "brush");
    this.brushRegion.call(this.brush);
  }

  brushMoved(event) {
    if (event.selection !== null) {
      let [start, end] = event.selection.map(x => this.xScale.invert(x));
      if (this.maxLimit !== 0 && end > this.maxLimit - Math.floor(this.maxLimit * 0.001)) end = Infinity;

      this.filters[this.attribute] = d => d[this.attribute] >= start && d[this.attribute] <= end;
    } else {
      this.filters[this.attribute] = d => true;
    }

    this.updateData();
  }

}

export default CurveSlider;