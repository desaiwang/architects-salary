class IndividualMap {
  constructor(divId, width, data, salaryScale, colorScales, filters) {
    this.divId = divId;
    this.width = width;
    this.height = 0;
    this.data = data;
    this.salaryScale = salaryScale;
    this.colorScales = colorScales;
    this.filters = filters;
    this.currentTarget = -1;

    this.initialize();
    this.positionData(); //vizHeight is also set here, after height is determined
    this.setupCanvas();
    this.createDelaunayVoronoi();
    this.addInteraction();
    //default to job satisfaction
    this.setColors("Job Satisfaction");
    this.render();
  };

  initialize() {
    this.vizIndividualsContainer = d3.select(`div#${this.divId}`);

    this.margins = {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    }

    this.vizWidth = this.width - this.margins.left - this.margins.right;
  };


  setColors(attribute) {
    this.data.forEach(d => {
      d.color = (this.colorScales[attribute])(d[attribute]);
    });
  }

  updateColors(attribute) {
    this.setColors(attribute);
    this.render();
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
        this.context.fillStyle = "lightgrey"; //grey200 to pseudo create 100 due to opacity
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
    console.log("width", this.width)
    const medianSalaryOverall = d3.median(this.data, d => d['Salary']);
    this.maxD = Math.ceil(this.salaryScale(medianSalaryOverall) * 2 + 2);
    this.numPointsPerRow = Math.floor(this.vizWidth / this.maxD);
    this.xOffset = this.maxD / 2 + this.margins.left;
    this.yOffset = this.maxD / 2 + this.margins.top;

    this.data.forEach((d, i) => {
      d.cx = this.cxCalc(i, this.numPointsPerRow, this.maxD, this.xOffset);
      d.cy = this.cyCalc(i, this.numPointsPerRow, this.maxD, this.yOffset);
      d.passesFilter = true;
    });

    //also set the height of the svg (with a buffer of maxD at the end)
    this.height = this.cyCalc(this.data.length - 1, this.numPointsPerRow, this.maxD, this.yOffset) + this.maxD;
    this.vizHeight = this.height - this.margins.top - this.margins.bottom;
  }

  updateWidth(width) {
    this.width = width;
    this.vizWidth = this.width - this.margins.left - this.margins.right;

    this.vizIndividualsContainer.selectAll("*").remove();

    this.positionData(); //height and vizHeight are set here
    this.setupCanvas();
    this.createDelaunayVoronoi();
    this.addInteraction();
    this.render();
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
      .style("padding", "18px")
      .style("border", "2px solid #181D27")
      .style("border-radius", "5px")
      .style("pointer-events", "none");


  }

  createDelaunayVoronoi() {
    this.delaunay = d3.Delaunay.from(this.data, d => d.cx, d => d.cy);
    this.voronoi = this.delaunay.voronoi([0, 0, this.width, this.height]);
    // Uncomment to see Voronoi diagram
    // this.interactiveArea.append("path").attr("stroke", "#181D27").attr("fill", "none").attr("d", this.voronoi.render());
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
        .attr("stroke", "#181D27")
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("pointer-events", "none")
        .attr("r", this.salaryScale(d['Salary']) + 4);

      const personOrPeople = (d['Firm Size'] === 1) ? 'person' : 'people';

      const schoolDiv = (d, attribute, title) => {
        return d[attribute] ? `<div style="line-height: 1.2;display: flex; align-items: baseline;"><p class="tooltip regular">${title}:</p><p class="tooltip light" style="margin-left: 5px;">${d[attribute]}</p></div>` : '';

      }
      const schoolsDiv = (d['Undergraduate School'] || d['Graduate School'] || d['Post-Graduate School']) ? (`<div style="margin-top: 15px; margin-bottom:0px">
            ${schoolDiv(d, 'Undergraduate School', 'UG')}
            ${schoolDiv(d, 'Graduate School', 'Grad')}
            ${schoolDiv(d, 'Post-Graduate School', 'PhD')}
          </div>`) : '';

      this.tooltipDiv.html(`
      <div>
          <div style="display: flex; gap: 20px; width: auto; min-width: 300px; flex-wrap: nowrap;">
            <!-- Column 1 -->
            <div style="flex: 1 1 auto; min-width: 0;">
              <h4 class="tooltip bold">${d['Job Title']}</h4>
              <h4 class="tooltip bold">${d['Location']}</h4>
              <div style="line-height: 1.5;display: flex; align-items: baseline;">
                <h4 class="tooltip bold">${d3.format("$,")(d['Salary'])}</h4>
                <p class="tooltip light" style="margin-left: 5px;">per year</p>
              </div>
              <div style="display: flex; align-items: baseline;">
                <h4 class="tooltip bold">${d['Job Satisfaction']}/10</h4>
                <p class="tooltip light" style="margin-left: 5px;">satisfaction</p>
              </div>
            </div>

            <!-- Column 2 -->
            <div style="flex: 1 1 auto; min-width: 0;margin-top: 2px;">
              <p class="tooltip light">${d['Firm Type'] === "N/A"
          ? `Firm with ${d['Firm Size']} ${personOrPeople}`
          : `${d['Firm Type']} (${d['Firm Size']} ${personOrPeople})`
        }</p>
              <p class="tooltip light" >${d['Years of Experience']} years of experience</p>
              <p class="tooltip light" >${d['Age']} years old</p>
              <p class="tooltip light" >${d['Gender']}, ${d['Licensed'] == "Yes" ? "Licensed" : "Not Licensed"}</p>

            </div>   
          </div>
          ${schoolsDiv}
          <p style="margin-bottom:-10px; align-self: flex-end; text-align: right;" class="tooltip mini">${new Date(d['Date']).toLocaleString('default', { month: 'short', year: 'numeric' })}</p>
      </div>
        `)
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