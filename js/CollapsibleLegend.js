import { Legend } from './legend.js';

class CollapsibleLegend {
  constructor(div, initialcolorAttribute, initialLegendNode, salaryScale, options = {}) {

    // Default options
    const defaultOptions = {
      colorLegendWidth: 250,
      colorLegendHeight: 30,
      titleFontSize: "0.8rem",
      tickFontSize: "0.6rem"
    };

    // Merge user-provided options with defaults
    this.options = Object.assign({}, defaultOptions, options);

    this.div = div;
    this.initialize();
    this.setupSalaryLegend(salaryScale);
    this.updateColorScale(initialcolorAttribute, initialLegendNode);
  }

  initialize() {

    let button = this.div.append("div").
      append("button").attr("class", "collapse");
    this.chevron = button.append("i")
      .attr("class", "bx bx-chevron-right")
      .style("rotate", "90deg")
      ;
    button.append("span").text("Legend")

    //this.input stores everthing that can be toggled
    this.input = this.div.append("div").attr("id", "wrapper");
    this.sizeLegend = this.input.append("div").attr("id", "sizeLegend").style("margin", "0rem 1.5rem 0.5rem 1.5rem");
    this.colorLegend = this.input.append("div").attr("id", "colorLegend").style("margin", "0.5rem 1.5rem");

    //add control to button
    this.collapsed = false;
    button.on("click", () => {
      this.collapsed = !this.collapsed;
      this.onCollapsedChange();
    });

  }

  setupSalaryLegend(salaryScale) {

    this.sizeLegend.append("div").attr("id", "colorLegendAttribute")
      .style("margin-bottom", "0.1rem")
      .style("font-size", this.options.titleFontSize)
      .text("Circle Size: Salary");

    let salaryPoints = [50000, 100000, 150000, 200000]

    let circles = this.sizeLegend.append("svg")
      .attr("width", this.options.colorLegendWidth)
      .attr("height", this.options.colorLegendHeight)
      .selectAll()
      .data(salaryPoints)
      .join("g")
      .style("transform", (d, i) => `translate(${25 + i * 50 - 0.5 * salaryScale(d)}px, 8px)`)

    circles
      .append("circle")
      .attr("r", d => salaryScale(d))
      .attr("stroke", "black")
      .attr("stroke-width", 1)
      .attr("fill", "none")

    circles.append("text")
      .style("font-size", this.options.tickFontSize)
      .attr("y", 18)
      .text(d => d3.format("$.2s")(d))
      .each(function (d) { // Center text based on its width
        const textWidth = this.getBBox().width;
        d3.select(this).attr("x", - textWidth / 2);
      })
  }
  updateColorScale(colorAttribute, legendNode) {

    // Remove existing child nodes
    while (this.colorLegend.node().firstChild) {
      this.colorLegend.node().removeChild(this.colorLegend.node().firstChild);
    }

    this.colorLegend.append("div").attr("id", "colorLegendAttribute")
      .style("margin-bottom", "0.3rem")
      .style("font-size", this.options.titleFontSize)
      .text(`Circle Color: ${colorAttribute}`);

    // Append the new legend node
    this.colorLegend.node().appendChild(legendNode);
  }

  changeCollapsed(bool) {
    this.collapsed = bool;
    this.onCollapsedChange();
  }

  onCollapsedChange() {
    this.chevron.transition()
      .style("rotate", this.collapsed ? "0deg" : "90deg")


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
        .style("visibility", "visible")
    }
  }
}

export default CollapsibleLegend;