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
      yBetweenLabelAndHist: 10,
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
      console.log("trying to sort groupCounts by sortOrder", this.attribute, this.options.sortOrder);
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
    console.log("groupCounts after sorting", this.groupCounts);

    //set timeout to be null
    this.timeout = null;
    this.uniqueKeys = this.groupCounts.map(d => d.key);
    this.valueList = this.uniqueKeys;

    this.groupCounts.forEach(d =>
      d.color = this.options.colorList ? this.options.colorList[this.uniqueKeys.indexOf(d.key)] : "grey"
    );

    if (this.options.colorList) {
      console.log("colorList", this.options.colorList);
      console.log("groupedData", this.groupedData);
      this.groupedData.map(([key, values]) => {
        console.log("key", key);
        console.log("index of key in groupedData", this.groupedData.indexOf(key));
        console.log("color", this.options.colorList[this.groupedData.indexOf(key)]);
      })
      console.log("groupCounts", this.groupCounts);
    }

    this.setupScales();
    this.setupSvg();
    this.render();
  }

  setupScales() {
    this.xScale = d3.scaleBand().domain(this.uniqueKeys).range([0, this.sliderWidth]).padding(0.2);
    this.yScale = d3.scaleLinear().domain([0, d3.max(this.groupCounts, d => d.count)]).nice().range([this.sliderHeight, 0]);
  }

  setupSvg() {
    // Create wrapper and SVG elements
    let wrapper = this.container.append("div").attr("class", "controls").style("margin-top", "10px");
    wrapper.append("div").style("margin-bottom", `${this.options.yBetweenLabelAndHist || 10}px`).text(this.label);

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

  }

  greyedoutColor = "grey";
  selectedColor = "black";
  render() {

    // Render rectangles
    this.histRects = this.svg.selectAll("rect").data(this.groupCounts).join("rect")
      .attr("x", d => this.xScale(d.key))
      .attr("y", d => this.yScale(d.count))
      .attr("width", this.xScale.bandwidth())
      .attr("height", d => this.yScale(0) - this.yScale(d.count) + 5)
      .attr("fill", d => d.color)
      .style("border-radius", "1px")
      .attr("cursor", "pointer") //this makes the cursor change to a pointer when hovering over the bars to indicate that things are clickable
      .style("outline", "solid thin")
      .style("outline-color", "black")
      .on('mouseover', function (event, d) {
        d3.select(this)
          .style("outline-width", "medium")
          .style('outline-color', this.selectedColor)
      })
      .on('mouseout', function (event, d) {
        if (!d.clicked) {
          d3.select(this)
            .style("outline-width", "thin")
            .style('outline-color', this.greyedoutColor)
        }
        else {
          d3.select(this)
            .style("outline-width", "thin")
            .style('outline-color', this.selectedColor);
        }
      })
      .on('click', (event, d) => {
        console.log("valueList at line 116", this.valueList)
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
          d.clicked = !d.clicked

          if (d.clicked) {
            d3.select(event.target) //TODO: probably not going to work
              .attr("fill", d => {
                return d.color
              })
              .style('outline-color', this.selectedColor);

            this.valueList.push(d.key);
          } else {
            console.log(event)
            d3.select(event.target)
              .attr("fill", "white")

            this.valueList = this.valueList.filter(rating => rating != d.key)
          }
          //console.log("valueList", valueList)
          this.filters[this.attribute] = d => this.valueList.includes(d[this.attribute] === null ? "N/A" : d[this.attribute]);
          this.updateData()
        }, 200);
      }).on('dblclick', (event, d) => {
        clearTimeout(this.timeout);
        //console.log("double clicked", event, d);
        // Reset all bars to deselected
        this.groupCounts.forEach(item => item.clicked = false);
        // Set only the double-clicked bar to selected
        d.clicked = true;

        this.histRects
          .attr("fill", d => d.clicked ? d.color : "white")
          .style('outline-color', d => d.clicked ? this.selectedColor : this.greyedoutColor);

        // Update valueList and filter to only include the double-clicked value
        this.valueList = [d.key];
        this.filters[this.attribute] = item => item[this.attribute] === d.key;
        this.updateData();
      });
  }


}

export default ClickableHistogramSlider;