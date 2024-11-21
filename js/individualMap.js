import calculateBounds from "./bounds.js";
import { sortOrders } from "./sortOrders.js";

class IndividualMap {
  constructor(divId, width, data, salaryScale, colorScales, filters) {
    this.divId = divId;
    this.width = width;
    this.height = 0;
    this.data = data;
    //store original order
    data.forEach((d, i) => (d.index = i));
    this.salaryScale = salaryScale;
    this.colorScales = colorScales;
    this.filters = filters;
    this.currentTarget = -1;

    //set up for drag vs. scroll
    this.touchBuffer = []; // Buffer to store recent touch points
    this.isDragging = false; // Flag to track dragging state
    this.bufferTime = 50; // Time threshold (0.1 seconds)
    this.threshold = 3; // Pixel movement threshold
    this.angleThreshold = 0.1; // 10% deviation for scrolling angle
    this.preventTooltip = false; // Flag to track tooltip cooldown

    this.initialize();
    this.positionData(); //vizHeight is also set here, after height is determined
    this.setupCanvas();
    this.createDelaunayVoronoi();
    this.addInteraction();
    //default to job satisfaction
    this.setColors("Job Satisfaction");
    this.render();
  }

  initialize() {
    this.vizIndividualsContainer = d3.select(`div#${this.divId}`);

    this.margins = {
      top: 20,
      bottom: 20,
      left: 20,
      right: 15,
    };

    this.vizWidth = this.width - this.margins.left - this.margins.right;
  }

  setColors(attribute) {
    this.data.forEach((d) => {
      d.color = this.colorScales[attribute](d[attribute]);
      d.colorDarker = d3.lab(d.color).darker();
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
    this.data.forEach((d) => {
      if (!d.passesFilter) {
        this.context.beginPath();
        this.context.arc(
          d.cx,
          d.cy,
          this.salaryScale(d["Salary"]),
          0,
          2 * Math.PI
        );
        this.context.fillStyle = "#EFF0F0"; //grey200 to pseudo create 100 due to opacity
        this.context.fill();
      }
    });

    // Draw points that pass the filter on top
    this.data.forEach((d) => {
      if (d.passesFilter) {
        this.context.beginPath();
        this.context.arc(
          d.cx,
          d.cy,
          this.salaryScale(d["Salary"]),
          0,
          2 * Math.PI
        );
        this.context.fillStyle = d.color;
        this.context.fill();

        //add a darker border to highlight the points
        this.context.strokeStyle = d.colorDarker;
        this.context.stroke();
      }
    });
  }

  pointPassesFilters(point) {
    let stillPassed = true;
    // console.log("this.filters", this.filters);
    // console.log("Object.values(this.filters)", Object.values(this.filters));

    Object.values(this.filters).forEach((filterFunc) => {
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
    const medianSalaryOverall = d3.median(this.data, (d) => d["Salary"]);
    this.maxD = Math.ceil(this.salaryScale(medianSalaryOverall) * 2 + 3);
    this.numPointsPerRow = Math.floor(this.vizWidth / this.maxD);
    this.xOffset = this.maxD / 2 + this.margins.left;
    this.yOffset = this.maxD / 2 + this.margins.top;

    this.data.forEach((d, i) => {
      d.cx = this.cxCalc(i, this.numPointsPerRow, this.maxD, this.xOffset);
      d.cy = this.cyCalc(i, this.numPointsPerRow, this.maxD, this.yOffset);
      d.passesFilter = true;
    });

    //also set the height of the svg (with a buffer of maxD at the end)
    this.height =
      this.cyCalc(
        this.data.length - 1,
        this.numPointsPerRow,
        this.maxD,
        this.yOffset
      ) + 15;
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
    this.update(); //update called instead of render because need to re-filter
  }

  updateSortOrder(attribute) {
    console.log("trying to get sort Order", sortOrders[attribute]);
    if (attribute === "Year") {
      console.log("this.originalOrder", this.originalOrder);
      this.data = this.data.sort((a, b) => a.index - b.index);
    } else if (sortOrders[attribute]) {
      this.data.sort((a, b) => {
        const indexA = sortOrders[attribute].indexOf(a[attribute]);
        const indexB = sortOrders[attribute].indexOf(b[attribute]);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    } else {
      this.data.sort((a, b) => b[attribute] - a[attribute]);
    }

    this.vizIndividualsContainer.selectAll("*").remove();

    this.positionData(); //height and vizHeight are set here
    this.setupCanvas();
    this.createDelaunayVoronoi();
    this.addInteraction();
    this.update(); //update called instead of render because need to re-filter
  }

  setupCanvas() {
    this.vizIndividualsCanvas = this.vizIndividualsContainer
      .append("canvas")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("position", "absolute")
      .style("top", "0px")
      .style("left", "0px");
    this.context = this.vizIndividualsCanvas.node().getContext("2d");

    this.svg = this.vizIndividualsContainer
      .append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("position", "absolute")
      .style("top", "0px")
      .style("left", "0px");

    this.interactiveArea = this.svg.append("g").attr("id", "interactiveArea");

    this.interactiveArea
      .append("rect")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("x", 0)
      .attr("y", 0)
      .attr("opacity", 0);

    // Create tooltip div programmatically
    this.tooltipDiv = this.vizIndividualsContainer
      .append("div")
      .attr("id", "tooltip")
      .attr("class", "tooltip")
      .style("visibility", "hidden")
      .style("position", "absolute")
      .style("background", "white")
      .style("border", "2px solid #181D27")
      .style("border-radius", "5px")
      .style("pointer-events", "none");
  }

  createDelaunayVoronoi() {
    this.delaunay = d3.Delaunay.from(
      this.data,
      (d) => d.cx,
      (d) => d.cy
    );
    this.voronoi = this.delaunay.voronoi([0, 0, this.width, this.height]);
    // Uncomment to see Voronoi diagram
    // this.interactiveArea.append("path").attr("stroke", "#181D27").attr("fill", "none").attr("d", this.voronoi.render());
  }

  addInteraction() {
    this.interactiveArea.on("mousemove", (event) => {
      console.log("mousemove event", event);
      console.log("d3.point(event)", d3.pointer(event));
      return this.handleMouseMove(event);
    });
    this.interactiveArea.on("mouseout", () => this.handleMouseOut());

    //mobile touch events (distinguishes between drag and scroll)
    this.interactiveArea.on("touchstart", (event) => {
      this.isDragging = false;
      this.touchBuffer.push({
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      });
    });

    this.interactiveArea.on("touchmove", (event) => {
      const touch = event.touches[0];
      const currentTime = Date.now();

      // Add the current touch point to the buffer
      this.touchBuffer.push({
        x: touch.clientX,
        y: touch.clientY,
        time: currentTime,
      });

      // Remove old points from the buffer
      this.touchBuffer = this.touchBuffer.filter(
        (point) => currentTime - point.time <= this.bufferTime
      );
      // Find oldest point in the buffer
      const referencePoint = this.touchBuffer[0];
      // console.log("currentTime", currentTime);
      console.log("touchBuffer", this.touchBuffer);

      //assume not dragging unless otherwise changed in the checks below
      this.isDragging = false;

      if (referencePoint) {
        // Calculate dx and dy from the reference point
        const dx = touch.clientX - referencePoint.x;
        const dy = touch.clientY - referencePoint.y;

        if (dx == 0 && dy == 0) {
          return;
        }

        const ratio = Math.abs(dy / dx);
        console.log("dx", dx);
        console.log("dy", dy);
        console.log("ratio", ratio);
        console.log("Math.atan(ratio)", Math.atan(ratio));
        console.log(
          "Math.PI / 2 - Math.atan(ratio)",
          Math.PI / 2 - Math.atan(ratio)
        );
        console.log(
          "Math.atan(ratio) < this.angleThreshold",
          Math.PI / 2 - Math.atan(ratio) < this.angleThreshold
        );

        if (
          Math.PI / 2 - Math.atan(ratio) < this.angleThreshold &&
          Math.abs(dy) > this.threshold
        ) {
          // Allow scrolling if within angle threshold
          this.isDragging = true;
        }
      }

      console.log("isDragging", this.isDragging);

      if (!this.isDragging) {
        console.log("prevent tooltip from showing");
        // Not dragging, allow tooltip to show
        if (!this.preventTooltip) {
          event.preventDefault();
          return this.handleMouseMove(event);
        }
      } else {
        setTimeout(() => {
          this.preventTooltip = false; // Reset flag after cooldown
        }, 300); // 0.1 seconds cooldown
        return this.handleMouseOut();
      }
    });
    this.interactiveArea.on("touchend", () => this.handleMouseOut());
  }

  handleMouseMove(event) {
    const loc = d3.pointers(event)[0];
    let index =
      this.currentTarget === -1
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
      this.interactiveArea
        .append("circle")
        .attr("cx", d.cx)
        .attr("cy", d.cy)
        .attr("class", "highlight")
        .attr("opacity", 1)
        .attr("fill", d.color)
        .attr("stroke", d.colorDarker)
        .attr("stroke-width", 1)
        .attr("pointer-events", "none")
        .attr("r", this.salaryScale(d["Salary"]));

      this.interactiveArea
        .append("circle")
        .attr("class", "highlight")
        .attr("cx", d.cx)
        .attr("cy", d.cy)
        .attr("stroke", "#181D27") //grey-900 for outlines
        .attr("stroke-width", 2)
        .attr("fill", "none")
        .attr("pointer-events", "none")
        .attr("r", this.salaryScale(d["Salary"]) + 4);

      const personOrPeople = d["Firm Size"] === 1 ? "person" : "people";

      const schoolDiv = (d, attribute, title) => {
        return d[attribute]
          ? `<div style="line-height: 1.2;display: flex; align-items: baseline;"><p class="tooltip regular">${title}:</p><p class="tooltip light left-margin">${d[attribute]}</p></div>`
          : "";
      };

      const schoolsDiv =
        d["Undergraduate School"] ||
        d["Graduate School"] ||
        d["Post-Graduate School"]
          ? `<div class="schools">
            ${schoolDiv(d, "Undergraduate School", "UG")}
            ${schoolDiv(d, "Graduate School", "Grad")}
            ${schoolDiv(d, "Post-Graduate School", "PhD")}
          </div>`
          : "";

      this.tooltipDiv.html(`
          <div class="columns">
            <!-- Column 1 -->
            <div style="flex: 1 1 auto; white-space:nowrap ">
              <h4 class="tooltip bold">${d["Job Title"]}</h4>
              <h4 class="tooltip bold">${d["Location"]}</h4>
              <div style="line-height: 1.5;display: flex; align-items: baseline;">
                <h4 class="tooltip bold">${d3.format("$,")(d["Salary"])}</h4>
                <p class="tooltip light left-margin">per year</p>
              </div>
              <div style="display: flex; align-items: baseline;">
                <h4 class="tooltip bold">${d["Job Satisfaction"]}/10</h4>
                <p class="tooltip light left-margin">satisfaction</p>
              </div>
            </div>

            <!-- Column 2 -->
            <div style="flex: 1 1 auto; margin-top: 2px; white-space:nowrap ">
              <p class="tooltip light">${
                d["Firm Type"] === "N/A"
                  ? `Firm with ${d["Firm Size"]} ${personOrPeople}`
                  : `${d["Firm Type"]} (${d["Firm Size"]} ${personOrPeople})`
              }</p>
              <p class="tooltip light" >${
                d["Years of Experience"]
              } years of experience</p>
              <p class="tooltip light" >${d["Age"]} years old</p>
              <p class="tooltip light" >${d["Gender"]}, ${
        d["Licensed"] == "Yes" ? "Licensed" : "Not Licensed"
      }</p>

            </div>   
          </div>
          ${schoolsDiv}
          <p class="tooltip mini year">${new Date(d["Date"]).toLocaleString(
            "default",
            { month: "short", year: "numeric" }
          )}</p>
        `);

      //calculate positions (with wrapping)
      const tooltipRect = this.tooltipDiv.node().getBoundingClientRect();

      const offset = window.innerWidth <= 768 ? 12 : 16;
      const bounds = calculateBounds(
        this.width,
        this.height,
        tooltipRect.width,
        tooltipRect.height,
        d.cx,
        d.cy,
        offset
      );

      this.tooltipDiv
        .style("left", `${bounds.x > 0 ? bounds.x : 5}px`)
        .style("top", `${bounds.y}px`)
        .style("visibility", "visible");
    }
  }

  mouseExitedIndividual() {
    d3.selectAll("circle.highlight").remove();
    this.tooltipDiv.style("visibility", "hidden");
  }
}

export default IndividualMap;
