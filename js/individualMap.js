class IndividualMap {
  constructor(divId, data, salaryScale, colorScales, filters) {
    this.divId = divId;
    this.data = data;
    this.salaryScale = salaryScale;
    this.colorScales = colorScales;
    this.filters = filters;
    this.currentTarget = -1;

    this.initialize();
    this.positionData();
    this.setupCanvas();
    this.createDelaunayVoronoi();
    this.addInteraction();
    this.setColors("Age");
    this.render();
  };


  initialize() {
    this.vizIndividualsContainer = d3.select(`div#${this.divId}`);

    this.width = Number(this.vizIndividualsContainer.style("width").replace("px", ""));
    this.height = Number(this.vizIndividualsContainer.style("height").replace("px", ""));

    this.margins = {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    }

    this.vizWidth = this.width - this.margins.left - this.margins.right;
    this.vizHeight = this.height - this.margins.top - this.margins.bottom;
  };

  setColors(attribute) {
    this.data.forEach(d => {
      d.color = (this.colorScales[attribute])(d[attribute]);
    });
  }

  render() {

    // Re-render the canvas
    this.context.clearRect(0, 0, this.width, this.height);
    this.context.globalAlpha = 0.8;
    // Draw points that don't pass the filter first
    this.data.forEach(d => {
      if (!d.passesFilter) {
        this.context.beginPath();
        this.context.arc(d.cx, d.cy, this.salaryScale(d['Salary']), 0, 2 * Math.PI);
        this.context.fillStyle = "lightgray";
        this.context.fill();
      }
    });

    // Draw points that pass the filter on top
    this.data.forEach(d => {
      if (d.passesFilter) {
        this.context.beginPath();
        this.context.arc(d.cx, d.cy, this.salaryScale(d['Salary']), 0, 2 * Math.PI);
        this.context.fillStyle = d.color;
        this.context.fill();
      }
    });
  }

  pointPassesFilters(point) {

    let stillPassed = true;
    // console.log("this.filters", this.filters);
    // console.log("Object.values(this.filters)", Object.values(this.filters));

    Object.values(this.filters).forEach(filterFunc => {
      stillPassed = filterFunc(point) && stillPassed;
    });

    return stillPassed;
  }

  update() {
    this.data.forEach((d, i) => {
      d.passesFilter = this.pointPassesFilters(d);
    });
    this.render();

  }

  cxCalc(i, numPointsPerRow, maxD, xOffset) {
    return Math.floor(i % numPointsPerRow) * maxD + xOffset;
  }

  cyCalc(i, numPointsPerRow, maxD, yOffset) {
    return Math.floor(i / numPointsPerRow) * maxD + yOffset;
  }

  positionData() {
    const medianSalaryOverall = d3.median(this.data, d => d['Salary']);
    this.maxD = Math.ceil(this.salaryScale(medianSalaryOverall) * 2 + 2);
    this.numPointsPerRow = Math.floor(this.vizWidth / this.maxD);
    this.xOffset = this.maxD / 2 + this.margins.left;
    this.yOffset = this.maxD / 2 + this.margins.top;

    console.log("maxD", this.maxD, "numPointsPerRow", this.numPointsPerRow, "xOffset", this.xOffset, "yOffset", this.yOffset);
    this.data.forEach((d, i) => {
      d.cx = this.cxCalc(i, this.numPointsPerRow, this.maxD, this.xOffset);
      d.cy = this.cyCalc(i, this.numPointsPerRow, this.maxD, this.yOffset);
      d.passesFilter = true;
    });
  }

  setupCanvas() {
    this.vizIndividualsCanvas = this.vizIndividualsContainer.append("canvas")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("position", "absolute")
      .style("top", '0px')
      .style("left", '0px');
    this.context = this.vizIndividualsCanvas.node().getContext("2d");

    this.svg = this.vizIndividualsContainer.append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("position", "absolute")
      .style("top", '0px')
      .style("left", '0px');

    this.interactiveArea = this.svg.append("g")
      .attr("id", "interactiveArea");

    this.interactiveArea.append("rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("x", 0)
      .attr("y", 0)
      .attr("opacity", 0);

    // Create tooltip div programmatically
    this.tooltipDiv = this.vizIndividualsContainer.append("div")
      .attr("id", "tooltip")
      .attr("class", "tooltip")
      .style("visibility", "hidden")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "10px")
      .style("border", "1px solid black")
      .style("pointer-events", "none");


  }

  createDelaunayVoronoi() {
    this.delaunay = d3.Delaunay.from(this.data, d => d.cx, d => d.cy);
    this.voronoi = this.delaunay.voronoi([0, 0, this.width, this.height]);
    // Uncomment to see Voronoi diagram
    // this.interactiveArea.append("path").attr("stroke", "black").attr("fill", "none").attr("d", this.voronoi.render());
  }

  addInteraction() {
    this.interactiveArea.on("mousemove", (event) => this.handleMouseMove(event));
    this.interactiveArea.on("mouseout", () => this.handleMouseOut());
  }

  handleMouseMove(event) {
    const loc = d3.pointer(event);
    let index = this.currentTarget === -1
      ? this.delaunay.find(loc[0], loc[1])
      : this.delaunay.find(loc[0], loc[1], this.currentTarget);

    if (index !== this.currentTarget) {
      this.currentTarget = index;
      this.mouseExitedIndividual();
      this.mouseEnteredIndividual(index);
    }
  }

  handleMouseOut() {
    this.currentTarget = -1;
    this.mouseExitedIndividual();
  }

  mouseEnteredIndividual(index) {
    const d = this.data[index];
    if (d.passesFilter) {
      this.interactiveArea.append("circle")
        .attr("cx", d.cx)
        .attr("cy", d.cy)
        .attr("class", "highlight")
        .attr("opacity", 1)
        .attr("fill", d.color)
        .attr("pointer-events", "none")
        .attr("r", this.salaryScale(d['Salary']));

      this.interactiveArea.append("circle")
        .attr("class", "highlight")
        .attr("cx", d.cx)
        .attr("cy", d.cy)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("pointer-events", "none")
        .attr("r", this.salaryScale(d['Salary']) + 4);

      this.tooltipDiv.html(`
        <strong>Salary:</strong> ${d3.format("$,")(d['Salary'])}<br>
        <strong>Job Satisfaction:</strong> ${d['Job Satisfaction']}/10<br>
        <strong>Age:</strong> ${d['Age']}<br>
        <strong>Years of Experience:</strong> ${d['Years of Experience']}<br>
        <strong>Location:</strong> ${d['Location']}<br>
        <strong>Survey Date:</strong> ${new Date(d['Date']).toLocaleString('default', { month: 'long', year: 'numeric' })}<br>
        <strong>Firm Type:</strong> ${d['Firm Type']}<br>`)
        .style("left", `${d.cx + 15}px`)
        .style("top", `${d.cy + 15}px`)
        .style("visibility", "visible");
    }
  }

  mouseExitedIndividual() {
    d3.selectAll("circle.highlight").remove();
    this.tooltipDiv.style("visibility", "hidden");
  }

}

export default IndividualMap;