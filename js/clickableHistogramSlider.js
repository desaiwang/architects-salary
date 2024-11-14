class ClickableHistogramSlider {
  constructor(dataAll, container, label, attribute, sliderWidth, sliderHeight, updateData, filters, options = {}) {
    this.dataAll = dataAll;
    this.container = container;
    this.label = label;
    this.attribute = attribute;
    this.sliderWidth = sliderWidth;
    this.sliderHeight = sliderHeight;
    this.filters = filters;
    this.updateData = updateData;
    this.options = options;
    this.showColors = false;

    // Default options
    const defaultOptions = {
      scaleFormatter: null,
      colorInterpolator: null,
      colorInterpolationType: null,
      colorScheme: d3.schemeCategory10,
      sortOrder: 'key',
      ascending: true,
      //height reserved for tooltip on hover
      yBetweenLabelAndHist: 15,
      rotateAxisLabels: false,
      fontsize: '0.6rem',
      initatiateCollapsed: false
    };

    // Merge user-provided options with defaults
    this.options = Object.assign({}, defaultOptions, options);

    this.initialize();
  }

  initialize() {
    // Define scales and grouped data
    //console.log("options", this.options)
    this.groupedData = d3.groups(this.dataAll, d => d[this.attribute]);
    this.groupCounts = this.groupedData.map(([key, values]) => ({
      key: key === null ? "N/A" : key,
      count: values.length,
      clicked: true,
    }));

    //sort groupCounts into desired order
    if (Array.isArray(this.options.sortOrder)) {
      this.groupCounts.sort((a, b) => {
        const indexA = this.options.sortOrder.indexOf(a.key);
        const indexB = this.options.sortOrder.indexOf(b.key);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    } else if (this.options.sortOrder === 'key') {
      this.groupCounts.sort((a, b) => this.options.ascending ? a.key - b.key : b.key - a.key);
    } else if (this.options.sortOrder === 'count') {
      this.groupCounts.sort((a, b) => this.options.ascending ? a.count - b.count : b.count - a.count);
    }

    //set timeout to be null
    this.timeout = null;
    this.uniqueKeys = this.groupCounts.map(d => d.key);
    //set colorScale if colorInterpolator is provided

    if (this.options.colorInterpolationType) {
      if (this.options.colorInterpolationType === "sequential discrete") {
        this.colorScale = (x) => this.options.colorInterpolator(d3.scalePoint().domain(this.uniqueKeys).range([0, 1])(x))
      }
      else if (this.options.colorInterpolationType === "sequential continuous") {
        this.colorScale = (x) => this.options.colorInterpolator(d3.scaleLinear().domain(d3.extent(this.uniqueKeys)).range([0, 1])(x))
      } else if (this.options.colorInterpolationType === "categorical") {
        this.colorScale = (x) => d3.scaleOrdinal().domain(this.uniqueKeys).range(this.options.colorScheme)(x)
      }
    }

    this.colors = this.uniqueKeys.map(d => this.colorScale(d));
    this.valueList = this.uniqueKeys;

    this.groupCounts.forEach(d =>
      d.color = this.colorScale ? this.colorScale(d.key) : ClickableHistogramSlider.greyFill
    );

    this.setupScales();
    this.setupSvg();
    this.setupBrush();
    this.setupHistogram();
  }

  setupScales() {
    this.xScale = d3.scaleBand().domain(this.uniqueKeys).range([0, this.sliderWidth]).padding(0.12);
    this.yScale = d3.scaleLinear().domain([0, d3.max(this.groupCounts, d => d.count)]).nice().range([this.sliderHeight - 4, this.options.yBetweenLabelAndHist]);
  }



  //default colors for bars
  static greyedoutColor = "#717680"; //grey-500 in style.css
  static selectedColor = "#414651"; //grey-700
  static greyFill = "#A4A7AE"; //grey-400
  static whiteFill = "#FDFDFD"; //grey-25
  setupSvg() {
    // Create wrapper and SVG elements
    let wrapper = this.container.append("div").attr("class", "controls");
    let buttons = wrapper.append("div").attr("class", "buttons")
      .style("display", "flex")
      .style("justify-content", "space-between");
    let button = buttons.
      append("button").attr("class", "collapse");
    this.chevron = button.append("i")
      .attr("class", "bx bx-chevron-right")
      .style("rotate", this.options.initiateCollapsed ? "0deg" : "90deg")
      ;
    button.append("span").text(this.label)

    this.svg = wrapper.append("svg").attr("class", "filter").style("margin-left", "1.25rem")
      .attr("width", this.sliderWidth)
      .attr("height", this.sliderHeight + (this.options.rotateAxisLabels ? 50 : 30));

    if (this.options.initiateCollapsed) {
      this.svg.style("opacity", 0)
        .style("visibility", "hidden")
        .style("display", "none");
    }
    else {
      this.svg
        .style("display", "block")
        .style("opacity", 1)
        .style("visibility", "visible")
    };

    //add control to button
    this.collapsed = this.options.initiateCollapsed;
    button.on("click", async () => {
      this.collapsed = !this.collapsed;
      this.onCollapsedChange();
    });

    //button for clearing filters
    this.buttonClearFilters = buttons.append("div").attr("class", "clear-filters").
      append("button").attr("class", "clear-filters").style("visibility", "hidden");
    this.buttonClearFilters.append("i")
      .attr("class", "bx bx-x");
    this.buttonClearFilters.append("span").text("clear");

    this.buttonClearFilters.on("click", () => { this.clearFilters(); });

  }

  clearFilters() {
    this.groupCounts.forEach(item => item.clicked = true);
    this.histRects
      .attr("fill", d => this.colorRect(d))
      .style('stroke', d => this.colorBorder(d));
    this.filters[this.attribute] = d => true;

    this.buttonClearFilters.style("visibility", "hidden");

    this.updateData();
  }

  changeCollapsed(bool) {
    this.collapsed = bool;
    this.onCollapsedChange();
  }

  onCollapsedChange() {
    this.chevron.transition()
      .style("rotate", this.collapsed ? "0deg" : "90deg")

    if (this.collapsed) {
      this.svg
        .transition()
        .style("opacity", 0)
        .style("visibility", "hidden")
        .style("display", "none");
    } else {
      this.svg
        .style("display", "block")
        .transition()
        .style("opacity", 1)
        .style("visibility", "visible")
    }

  }

  //function for determining color of bars
  colorRect = (d) => d.clicked ? (this.showColors ? d.color : ClickableHistogramSlider.greyFill) : ClickableHistogramSlider.whiteFill

  colorBorder = (d) => d.clicked ? (this.showColors ? d3.lab(d.color).darker() : d3.lab(ClickableHistogramSlider.greyFill).darker()) : ClickableHistogramSlider.greyedoutColor

  //check if there are filters, and if yes, makes buttonClearFilters visible
  updateButtonClearFilters() {
    if (this.valueList.length != this.uniqueKeys.length) {
      this.buttonClearFilters.style("visibility", "visible");
    } else {
      this.buttonClearFilters.style("visibility", "hidden");
    }
  }

  setupBrush() {
    //set up brush
    var brush = d3.brushX().extent([[0, 0],
    [this.sliderWidth, this.sliderHeight + 5]])
      .on("start", (event) => {
        //temporarily disable pointer events on the bars
        this.histRects.style("pointer-events", "none");
      })
      .on("end", (event) => brushMoved.call(this, event));

    let step = this.xScale.step();
    const brushMoved = (event) => {

      if (event.selection !== null) {
        let [x0, x1] = event.selection;
        let start = Math.floor((x0 + this.xScale.padding()) / step);
        let end = Math.ceil(x1 / step);

        // Add uniqueKeys within the brush selection to a new list
        this.valueList = this.uniqueKeys.slice(start, end);
        this.updateButtonClearFilters();

        //select only the bars in brush selection
        this.groupCounts.forEach(item => item.clicked = (this.valueList.includes(item.key)));

        this.histRects
          .attr("fill", d => this.colorRect(d))
          .style('stroke', d => this.colorBorder(d));

        this.filters[this.attribute] = (d) => this.valueList.includes(d[this.attribute]);

        this.updateData();

        // Clear brush selection
        this.brushRegion.call(brush.move, null);
        //re-enable disable pointer events on the bars
      }
      this.histRects.style("pointer-events", "all");
    }

    //append brush region
    this.brushRegion = this.svg.append("g").attr("class", "brush")
    this.brushRegion.call(brush);
  }

  setupLegend(legendWidth, legendHeight, fontSize = this.options.fontsize) {

    const legendSvg = d3.create("svg")
      .attr("width", legendWidth)
      .attr("height", legendHeight + (this.options.rotateAxisLabels ? 35 : 15));


    let xScaleLegend = d3.scaleBand().domain(this.uniqueKeys).range([1, legendWidth]).padding(0.12);
    let gXAxis = legendSvg.append("g").attr("transform", `translate(${this.options.rotateAxisLabels ? 4 : 0},${this.options.rotateAxisLabels ? legendHeight + 2 : legendHeight + 4})`).call(
      d3.axisBottom(xScaleLegend)
        .tickSize(0)
        .tickFormat(this.options.scaleFormatter || (d => d))
    )
      .call(g => g.select(".domain").remove())//remove horizontal line
      ;

    if (this.options.rotateAxisLabels) {
      gXAxis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-60)")
        .style("font-size", fontSize);
    } else {
      gXAxis.selectAll("text")
        .style("font-size", fontSize);
    }

    // Render rectangles
    legendSvg.append("g").selectAll("rect").data(this.groupCounts).join("rect")
      .attr("x", d => xScaleLegend(d.key))
      .attr("y", 1)
      .attr("width", xScaleLegend.bandwidth())
      .attr("height", legendHeight + 1)
      .attr("fill", d => d.color)
      .attr("stroke", d => d3.lab(d.color).darker())
      .attr("stroke-width", "1")
      .style("rx", "2")

    this.legendNode = legendSvg.node();
  }

  getLegendNode() {
    return this.legendNode;
  }

  setupHistogram() {
    let gXAxis = this.svg.append("g").attr("transform", `translate(0,${this.sliderHeight + 4})`).call(
      d3.axisBottom(this.xScale).tickSizeOuter(0).tickFormat(this.options.scaleFormatter || (d => d))
    );

    if (this.options.rotateAxisLabels) {
      gXAxis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-60)")
        .style("font-size", this.options.fontsize);
    } else {
      gXAxis.selectAll("text")
        .style("font-size", this.options.fontsize);
    }


    this.tooltip = this.svg.append("text")
      .attr("class", "tooltip")
      .style("visibility", "hidden") // Hidden initially
      // .style("font-size", "12px")
      .attr("fill", "black");

    // Render rectangles
    this.histRects = this.svg.append("g").selectAll("rect").data(this.groupCounts).join("rect")
      .attr("x", d => this.xScale(d.key))
      .attr("y", d => this.yScale(d.count))
      .attr("width", this.xScale.bandwidth())
      .attr("height", d => d.count == 0 ? 0 : this.yScale(0) - this.yScale(d.count) + 5)
      .attr("fill", d => this.colorRect(d))
      .attr("stroke", d => this.colorBorder(d))
      .attr("stroke-width", "1")
      .style("rx", "2")
      .attr("cursor", "pointer") //this makes the cursor change to a pointer when hovering over the bars to indicate that things are clickable
      .on('mouseover', (event, d) => {
        this.tooltip
          .attr("x", this.xScale(d.key) + this.xScale.bandwidth() / 2)
          .attr("y", this.yScale(d.count) - 8)
          .attr("text-anchor", "middle") // Center the text horizontally
          .attr("dy", "0.35em") // Center the text vertically
          .text(`${d.count}`)
          .style("visibility", "visible"); // Show tooltip

        d3.select(event.target)
          .style("stroke-width", "2")
          .style('stroke', ClickableHistogramSlider.selectedColor)
      })
      .on('mouseout', (event, d) => {
        this.tooltip
          .style("visibility", "hidden");

        d3.select(event.target)
          .style("stroke-width", "1")
          .style('stroke', this.colorBorder(d))


      })
      .on('click', (event, d) => {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
          d.clicked = !d.clicked

          if (d.clicked) {
            d3.select(event.target) //TODO: probably not going to work
              .attr("fill", d => this.showColors ? d.color : ClickableHistogramSlider.greyFill)
              .style('stroke', this.colorBorder(d));

            this.valueList.push(d.key);
          } else {
            d3.select(event.target)
              .attr("fill", ClickableHistogramSlider.whiteFill)
              .style('stroke', this.colorBorder(d));

            this.valueList = this.valueList.filter(rating => rating != d.key)
          }
          this.updateButtonClearFilters();
          this.filters[this.attribute] = (d) => this.valueList.includes(d[this.attribute]);
          this.updateData()
        }, 200);
      }).on('dblclick', (event, d) => {
        clearTimeout(this.timeout);
        // Reset all bars to deselected
        this.groupCounts.forEach(item => item.clicked = false);
        // Set only the double-clicked bar to selected
        d.clicked = true;
        this.histRects
          .attr("fill", d => this.colorRect(d))
          .style('stroke', d => this.colorBorder(d));

        // Update valueList and filter to only include the double-clicked value
        this.valueList = [d.key];
        this.updateButtonClearFilters();

        this.filters[this.attribute] = (item) => item[this.attribute] === d.key;

        this.updateData();
      });
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

  updateColor(bool) {

    this.showColors = bool;

    this.histRects.attr("fill", d => this.colorRect(d))
      .style('stroke', d => this.colorBorder(d))
  }

  update() {

    // Filter dataAll based on some condition
    const filteredData = this.dataAll.filter(d => ClickableHistogramSlider.pointPassesFilters(this.filters, this.attribute, d));

    // console.log("update called on: ", this.attribute, "with filteredData: ", filteredData)
    // Group the filtered data by the same attribute
    const filteredGroupedData = d3.groups(filteredData, d => d[this.attribute]);
    // console.log("filteredGroupedData", filteredGroupedData)
    // Create a map of key to count from the filtered grouped data
    const countsMap = new Map(filteredGroupedData.map(([key, values]) => [key, values.length]));

    // Update the count in groupCounts based on the filtered data
    this.groupCounts = this.groupCounts.map(group => ({
      ...group,
      count: countsMap.get(group.key) || 0 // Set to 0 if no data in the group
    }));

    //update y scale
    this.yScale.domain([0, d3.max(this.groupCounts, d => d.count)]).nice();

    this.histRects
      .data(this.groupCounts, d => d.key) // Use the key as the identifier
      .transition()
      .duration(200)
      .attr("height", d => d.count == 0 ? 0 : this.yScale(0) - this.yScale(d.count) + 5)
      .attr("y", d => this.yScale(d.count));

  }


  render() {

  }


}

export default ClickableHistogramSlider;