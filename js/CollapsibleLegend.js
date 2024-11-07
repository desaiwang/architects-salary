import { Legend } from './legend.js';

class CollapsibleLegend {
  constructor(div, initialcolorAttribute, initialLegendNode, options = {}) {

    const { } = options;

    this.div = div;
    this.initialize();
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
    this.colorLegend = this.input.append("div").attr("id", "colorLegend").style("margin", "0.5rem 1.5rem");

    //add control to button
    this.collapsed = false;
    button.on("click", () => {
      this.collapsed = !this.collapsed;
      this.onCollapsedChange();
    });

  }

  updateColorScale(colorAttribute, legendNode) {

    // Remove existing child nodes
    while (this.colorLegend.node().firstChild) {
      this.colorLegend.node().removeChild(this.colorLegend.node().firstChild);
    }

    this.colorLegend.append("div").attr("id", "colorLegendAttribute")
      .style("margin-bottom", "0.3rem")
      .style("font-size", "0.8rem")
      .text(colorAttribute);

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