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

    // Default options
    const defaultOptions = {
      scaleFormatter: null,
      colorList: null,
      sortOrder: 'key',
      ascending: true,
      yBetweenLabelAndHist: 15,
      rotateAxisLabels: false
    };

    // Merge user-provided options with defaults
    this.options = Object.assign({}, defaultOptions, options);

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
      .attr("y", d => this.yScale(d.count))

      // .append("title")
      // .text(d => `n=${d.count}`)
      ;

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
    this.valueList = this.uniqueKeys;
    console.log("valueList upon initiation", this.valueList)

    this.groupCounts.forEach(d =>
      d.color = this.options.colorList ? this.options.colorList[this.uniqueKeys.indexOf(d.key)] : "grey"
    );

    this.setupScales();
    this.setupSvg();
    this.render();
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
          this.filters[this.attribute] = (d) => {
            // if (d[this.attribute] === null) {
            //   console.log(`d[${this.attribute}]`, d[this.attribute])
            //   console.log("this.valueList", this.valueList)
            //   console.log("this.valueList.includes(d[this.attribute])", this.valueList.includes(d[this.attribute] === null ? "N/A" : d[this.attribute]))
            // }
            return this.valueList.includes(d[this.attribute] === null ? "N/A" : d[this.attribute]);
          }
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

  render() {

  }


}

export default ClickableHistogramSlider;