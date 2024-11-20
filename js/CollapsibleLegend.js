import { Legend } from "./legend.js";
class CollapsibleLegend {
  constructor(
    div,
    initialcolorAttribute,
    initialLegendNode,
    salaryScale,
    options = {}
  ) {
    // Default options
    const defaultOptions = {
      colorLegendWidth: 250,
      colorLegendHeight: 40,
      titleFontSize: "0.8rem",
      tickFontSize: "0.6rem",
    };

    // Merge user-provided options with defaults
    this.options = Object.assign({}, defaultOptions, options);

    this.div = div;
    this.initialize();
    this.setupSalaryLegend(salaryScale);
    this.updateColorScale(initialcolorAttribute, initialLegendNode);
  }

  initialize() {
    let button = this.div
      .append("div")
      .append("button")
      .attr("class", "collapse title");
    this.chevron = button
      .append("i")
      .attr("class", "bx bx-chevron-right")
      .style("rotate", "90deg");
    button.append("span").text("Legend");

    //this.input stores everthing that can be toggled
    this.input = this.div
      .append("div")
      .attr("id", "wrapper")
      .style("padding-left", "1.5rem");
    this.sizeLegend = this.input
      .append("div")
      .attr("id", "sizeLegend")
      .style("padding", "0.5rem 0rem");
    this.colorLegend = this.input
      .append("div")
      .attr("id", "colorLegend")
      .style("padding", "0rem 0rem 0.5rem");

    this.sizeLengendHex = this.input
      .append("div")
      .attr("id", "sizeLegend")
      .style("padding", "0.5rem 0rem")
      .style("display", "none");
    this.colorLegendHex = this.input
      .append("div")
      .attr("id", "colorLegend")
      .style("padding", "0rem 0rem 0.5rem")
      .style("display", "none");

    //add control to button
    this.collapsed = false;
    button.on("click", () => {
      this.collapsed = !this.collapsed;
      this.onCollapsedChange();
    });
  }

  toggleIndMap(showIndMap = true) {
    if (showIndMap) {
      this.sizeLegend.style("display", "block");
      this.colorLegend.style("display", "block");
      this.sizeLengendHex.style("display", "none");
      this.colorLegendHex.style("display", "none");
    } else {
      this.sizeLegend.style("display", "none");
      this.colorLegend.style("display", "none");
      this.sizeLengendHex.style("display", "block");
      this.colorLegendHex.style("display", "block");
    }
  }

  setupSalaryLegend(salaryScale) {
    this.sizeLegend
      .append("div")
      .attr("id", "colorLegendAttribute")
      // .style("margin-bottom", "0rem")
      .style("font-size", this.options.titleFontSize)
      .text("salary (circle size)");

    let salaryPoints = [50000, 100000, 150000, 200000, 250000];

    let circles = this.sizeLegend
      .append("svg")
      .attr("width", this.options.colorLegendWidth)
      .attr("height", this.options.colorLegendHeight)
      .selectAll()
      .data(salaryPoints)
      .join("g")
      .style(
        "transform",
        (d, i) => `translate(${35 + i * 50 - 0.5 * salaryScale(d)}px, 18px)`
      );

    circles
      .append("circle")
      .attr("r", (d) => salaryScale(d))
      // .attr("y", d => -0.5 * salaryScale(d))
      .style("transform", (d, i) => `translate(0px,${-1 * salaryScale(d)}px)`)
      .attr("stroke", "#414651") //grey-700
      .attr("stroke-width", 0.8)
      .attr("fill", "none");

    circles
      .append("text")
      .style("font-size", this.options.tickFontSize)
      .attr("y", 12)
      .text((d) => d3.format("$.2s")(d))
      .each(function (d) {
        // Center text based on its width
        const textWidth = this.getBBox().width;
        d3.select(this).attr("x", -textWidth / 2);
      });
  }

  updateColorScale(colorAttribute, legendNode) {
    // Remove existing child nodes
    while (this.colorLegend.node().firstChild) {
      this.colorLegend.node().removeChild(this.colorLegend.node().firstChild);
    }

    this.colorLegend
      .append("div")
      .attr("id", "colorLegendAttribute")
      .style("margin-bottom", "0.5rem")
      .style("font-size", this.options.titleFontSize)
      .text(`${colorAttribute.toLowerCase()} (circle color)`);

    // Append the new legend node
    this.colorLegend
      .append("div")
      .style("margin-left", "0.5rem")
      .node()
      .appendChild(legendNode);
  }

  changeCollapsed(bool) {
    this.collapsed = bool;
    this.onCollapsedChange();
  }

  onCollapsedChange() {
    this.chevron
      .transition()
      .style("rotate", this.collapsed ? "0deg" : "90deg");

    if (this.collapsed) {
      this.input
        .transition()
        .style("opacity", 0)
        .style("visibility", "hidden")
        .style("display", "none");
    } else {
      this.input
        .style("display", "block")
        .transition()
        .style("opacity", 1)
        .style("visibility", "visible");
    }
  }
}

export default CollapsibleLegend;
