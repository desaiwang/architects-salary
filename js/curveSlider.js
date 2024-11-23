class CurveSlider {
  constructor(
    dataAll,
    container,
    label,
    attribute,
    sliderWidth,
    sliderHeight,
    updateData,
    filters,
    options = {}
  ) {
    const {
      minLimit = null,
      maxLimit = 0,
      scaleFormatter = d3.format(",.0f"),
      numBins = 20,
      getButtonData = null,
    } = options;

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
    this.values = this.dataAll
      .map((d) => d[this.attribute])
      .sort((a, b) => b - a);

    // Find min and max for scales
    this.extent = d3.extent(this.values);
    if (this.minLimit != null) this.extent[0] = this.minLimit;
    if (this.maxLimit !== 0) this.extent[1] = this.maxLimit;

    // Set up scales and axis
    this.xScale = d3
      .scaleLinear()
      .domain(this.extent)
      .range([10, this.sliderWidth - 20]);
    this.xAxis = d3
      .axisBottom(this.xScale)
      .ticks(5)
      .tickFormat((d) =>
        this.maxLimit !== 0 && d === this.maxLimit
          ? `${this.scaleFormatter(this.maxLimit)}+`
          : this.scaleFormatter(d)
      );

    // Create HTML elements
    this.wrapper = this.container.append("div").attr("class", "controls");

    //append collapse button to wrapper
    let buttons = this.wrapper
      .append("div")
      .attr("class", "buttons")
      .style("display", "flex")
      .style("justify-content", "space-between");
    let button = buttons.append("button").attr("class", "collapse");
    let chevron = button
      .append("i")
      .attr("class", "bx bx-chevron-right")
      .style("rotate", "90deg");
    button.append("span").text(this.label);

    //button for clearing filters
    this.buttonClearFilters = buttons
      .append("div")
      .attr("class", "clear-filters")
      .append("button")
      .attr("class", "clear-filters")
      .style("visibility", "hidden");
    this.buttonClearFilters.append("i").attr("class", "bx bx-x");
    this.buttonClearFilters.append("span").text("clear");

    this.buttonClearFilters.on("click", () => {
      this.clearFilters();
    });

    //continue setting up canvas
    //brush area and path element
    this.rowwrapper = this.wrapper
      .append("div")
      .attr("class", "slider-rowwrapper")
      .style("display", "flex")
      .style("flex-direction", "column")
      .style("margin-left", "1.25rem");

    // Buttons
    this.buttons = this.rowwrapper
      .append("div")
      .style("display", "flex")
      .style("flex-direction", "row")
      .style("justify-content", "center");
    if (this.getButtonData) this.setupButtons();

    this.canvas = this.rowwrapper
      .append("svg")
      .attr("width", this.sliderWidth)
      .attr("height", this.sliderHeight + 30)
      .attr("attribute", this.attribute);
    this.canvas
      .append("g")
      .attr("transform", `translate(0,${this.sliderHeight})`)
      .call(this.xAxis);

    //add control to button
    this.collapsed = false;
    button.on("click", async () => {
      this.collapsed = !this.collapsed;

      chevron.transition().style("rotate", this.collapsed ? "0deg" : "90deg");

      if (this.collapsed) {
        this.rowwrapper
          .transition()
          .style("opacity", 0)
          .style("visibility", "hidden")
          .attr("display", "none");

        this.canvas.attr("display", "none");
      } else {
        this.rowwrapper
          .attr("display", "block")
          .transition()
          .style("opacity", 1)
          .style("visibility", "visible");

        this.canvas.attr("display", "block");
      }
    });

    // Area chart and brush setup
    this.setupAreaChart();
    this.setupBrush();
  }

  setupButtons() {
    const buttonData = this.getButtonData(this.attribute, this.values);
    this.buttons
      .selectAll("button")
      .data(buttonData)
      .enter()
      .append("button")
      .text((d) => d.label)
      .style("margin-right", 8)
      .on("click", (event, d) => {
        this.brushRegion.call(this.brush.move, null);
        this.filters[this.attribute] = d.filterFunc;
        this.updateData();
      });
  }

  toggleInflation(attribute) {
    if (this.attribute !== attribute) {
      //transfer filter over to new attribute
      this.filters[attribute] = this.filters[this.attribute];

      //delete old filter
      delete this.filters[this.attribute];

      //update attribute
      this.attribute = attribute;
    }
    this.update();
  }

  update() {
    const filteredData = this.dataAll.filter((d) =>
      CurveSlider.pointPassesFilters(this.filters, this.attribute, d)
    );
    const filteredValues = filteredData
      .map((d) => d[this.attribute])
      .sort((a, b) => b - a);

    this.counts = this.histoGen(filteredValues);
    this.counts.unshift({
      x0: 0,
      x1: this.counts[0].x0,
      length: this.counts[0].length,
    });

    //update domain based on updated counts
    this.yScale.domain(d3.extent(this.counts, (d) => d.length));

    //update area and path generators
    this.area
      .x((d) => this.xScale(d.x1))
      .y0(this.yScale(0))
      .y1((d) => this.yScale(d.length));
    this.path
      .datum(this.counts)
      .transition() // Start transition
      .duration(750) // Set duration for the animation
      .attr("d", this.area); // Redraw path with updated data and yScale
  }

  setupAreaChart() {
    this.areaLayer = this.canvas.append("g");
    this.histoGen = d3.histogram().domain(this.extent).thresholds(this.numBins);
    this.counts = this.histoGen(this.values);

    this.counts.unshift({
      x0: 0,
      x1: this.counts[0].x0,
      length: this.counts[0].length,
    });

    this.yScale = d3
      .scaleLinear()
      .domain(d3.extent(this.counts, (d) => d.length))
      .range([this.sliderHeight, 10]);

    this.area = d3
      .area()
      .x((d) => this.xScale(d.x1))
      .y0(this.yScale(0))
      .y1((d) => this.yScale(d.length))
      .curve(d3.curveNatural);

    this.path = this.areaLayer
      .append("path")
      .datum(this.counts)
      .attr("class", "curveSlider area")
      .attr("fill", "#A4A7AE")
      .attr("d", this.area);

    this.filters[this.attribute] = (d) => true; // Default filter
  }

  setupBrush() {
    this.brush = d3
      .brushX()
      .extent([
        [10, 0],
        [this.sliderWidth - 10, this.sliderHeight],
      ])
      .on("brush end", (event) => {
        this.brushMoved(event);
      });

    this.brushRegion = this.canvas.append("g").attr("class", "brush");
    this.brushRegion.call(this.brush);
  }

  brushMoved(event) {
    if (event.selection !== null) {
      //if there's a selection then filter is visible
      this.buttonClearFilters.style("visibility", "visible");

      let [start, end] = event.selection.map((x) => this.xScale.invert(x));
      if (
        this.maxLimit !== 0 &&
        end > this.maxLimit - Math.floor(this.maxLimit * 0.001)
      )
        end = Infinity;

      this.filters[this.attribute] = (d) =>
        d[this.attribute] >= start && d[this.attribute] <= end;
    } else {
      this.buttonClearFilters.style("visibility", "hidden");

      this.filters[this.attribute] = (d) => true;
    }

    this.updateData();
  }

  clearFilters() {
    this.brushMoved({ selection: null });
    d3.selectAll("rect.selection").style("display", "none");
  }
}

export default CurveSlider;
