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
      yBetweenLabelAndHist: 15,
      rotateAxisLabels: false
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

    this.valueList = this.uniqueKeys;
    console.log("valueList upon initiation", this.valueList)

    this.groupCounts.forEach(d =>
      d.color = (this.colorScale && this.showColors) ? this.colorScale(d.key) : "grey"
    );

    this.setupScales();
    this.setupSvg();
    this.setupBrush();
    this.setupHistogram();
  }

  setupScales() {
    this.xScale = d3.scaleBand().domain(this.uniqueKeys).range([0, this.sliderWidth]).padding(0.2);
    this.yScale = d3.scaleLinear().domain([0, d3.max(this.groupCounts, d => d.count)]).nice().range([this.sliderHeight, this.options.yBetweenLabelAndHist]);
  }

  //default colors for bars
  static greyedoutColor = "grey";
  static selectedColor = "black";
  setupSvg() {
    // Create wrapper and SVG elements
    let wrapper = this.container.append("div").attr("class", "controls").style("margin-top", "10px");
    wrapper.append("div").text(this.label);

    this.svg = wrapper.append("svg")
      .attr("width", this.sliderWidth)
      .attr("height", this.sliderHeight + (this.options.rotateAxisLabels ? 60 : 30))
      .attr("attribute", this.attribute);

  }

  setupBrush() {
    //set up brush
    var brush = d3.brushX().extent([[0, 0],
    [this.sliderWidth, this.sliderHeight]])
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
        console.log(this.valueList)

        console.log((x0 + this.xScale.padding()) / step, start, x1 / step, end)

        //select only the bars in brush selection
        this.groupCounts.forEach(item => item.clicked = (this.valueList.includes(item.key)));
        this.histRects
          .attr("fill", d => d.clicked ? d.color : "white")
          .style('outline-color', d => d.clicked ? ClickableHistogramSlider.selectedColor : ClickableHistogramSlider.greyedoutColor);


        this.filters[this.attribute] = (d) => this.valueList.includes(d[this.attribute] === null ? "N/A" : d[this.attribute]);

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

  setupHistogram() {
    let gXAxis = this.svg.append("g").attr("transform", `translate(0,${this.sliderHeight + 8})`).call(
      d3.axisBottom(this.xScale).tickSizeOuter(0).tickFormat(this.options.scaleFormatter || (d => d))
    );

    if (this.options.rotateAxisLabels) {
      gXAxis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-65)")
      //gXAxis.style("font-size", "9px");
    }


    this.tooltip = this.svg.append("text")
      .attr("class", "tooltip")
      .style("visibility", "hidden") // Hidden initially
      .style("font-size", "12px")
      .attr("fill", "black");

    // Render rectangles
    this.histRects = this.svg.append("g").selectAll("rect").data(this.groupCounts).join("rect")
      .attr("x", d => this.xScale(d.key))
      .attr("y", d => this.yScale(d.count))
      .attr("width", this.xScale.bandwidth())
      .attr("height", d => d.count == 0 ? 0 : this.yScale(0) - this.yScale(d.count) + 5)
      .attr("fill", d => d.color)
      .style("border-radius", "1px")
      .attr("cursor", "pointer") //this makes the cursor change to a pointer when hovering over the bars to indicate that things are clickable
      .style("outline", "solid thin")
      .style("outline-color", "black")
      // .append("title")
      // .text(d => `${d.count} survey responses`)
      .on('mouseover', (event, d) => {
        this.tooltip
          .attr("x", this.xScale(d.key) + this.xScale.bandwidth() / 2)
          .attr("y", this.yScale(d.count) - 10)
          .attr("text-anchor", "middle") // Center the text horizontally
          .attr("dy", "0.35em") // Center the text vertically
          .text(`${d.count}`)
          .style("visibility", "visible"); // Show tooltip

        d3.select(event.target)
          .style("outline-width", "medium")
          .style('outline-color', ClickableHistogramSlider.selectedColor)
      })
      .on('mouseout', (event, d) => {
        this.tooltip
          .style("visibility", "hidden");

        if (!d.clicked) {
          d3.select(event.target)
            .style("outline-width", "thin")
            .style('outline-color', ClickableHistogramSlider.greyedoutColor)
        }
        else {
          d3.select(event.target)
            .style("outline-width", "thin")
            .style('outline-color', ClickableHistogramSlider.selectedColor);
        }
      })
      .on('click', (event, d) => {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
          d.clicked = !d.clicked

          if (d.clicked) {
            d3.select(event.target) //TODO: probably not going to work
              .attr("fill", d => {
                return d.color
              })
              .style('outline-color', ClickableHistogramSlider.selectedColor);

            this.valueList.push(d.key);
          } else {
            d3.select(event.target)
              .attr("fill", "white")

            this.valueList = this.valueList.filter(rating => rating != d.key)
          }
          this.filters[this.attribute] = (d) => this.valueList.includes(d[this.attribute] === null ? "N/A" : d[this.attribute]);
          this.updateData()
        }, 200);
      }).on('dblclick', (event, d) => {
        clearTimeout(this.timeout);
        // Reset all bars to deselected
        this.groupCounts.forEach(item => item.clicked = false);
        // Set only the double-clicked bar to selected
        d.clicked = true;
        this.histRects
          .attr("fill", d => d.clicked ? d.color : "white")
          .style('outline-color', d => d.clicked ? ClickableHistogramSlider.selectedColor : ClickableHistogramSlider.greyedoutColor);

        // Update valueList and filter to only include the double-clicked value
        this.valueList = [d.key];
        console.log(this.valueList)

        this.filters[this.attribute] = (item) => item[this.attribute] === (d.key === "N/A" ? null : d.key);

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

    if ((this.colorScale && this.showColors)) {
      console.log("updatingColor to true, attribute: ", this.attribute)
      this.histRects.attr("fill", d => d.color)
    } else {
      this.histRects.attr("fill", "grey")
    }


    if (bool) {
      console.log("updatingColor to true, attribute: ", this.attribute)
      console.log("this.colorScale", this.colorScale)
      console.log("this.showColors", this.showColors)
      console.log("this.colorScale && this.showColors", this.colorScale && this.showColors)

    }
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
      count: countsMap.get(group.key === "N/A" ? null : group.key) || 0 // Set to 0 if no data in the group
    }));

    //update y scale
    this.yScale.domain([0, d3.max(this.groupCounts, d => d.count)])

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