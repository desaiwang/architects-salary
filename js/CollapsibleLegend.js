import { Legend } from './legend.js';

class CollapsibleLegend {
  constructor(div, colorAttribute, colorsAndValueLists, options = {}) {

    const { } = options;

    this.div = div;
    this.colorAttribute = colorAttribute;
    this.colorsAndValueLists = colorsAndValueLists;


    this.initialize();
    this.updateColorScale("Job Satisfaction");
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

  updateColorScale(attribute) {
    this.attribute = attribute;

    this.dictItem = this.colorsAndValueLists[this.attribute];
    console.log("dictItem", this.dictItem)
    const legend = Legend(d3.scaleOrdinal(this.dictItem.valueList, this.dictItem.colors
    ), {
      title: this.attribute,
      // tickValues: [1, "6-10", "16-30", "51-100", "201-500"],
      tickSize: 0,
      width: 225
    })

    //this is for continuous color scale
    // const legend = Legend(d3.scaleSequential([1, 10], d3.piecewise(d3.interpolateRgb, ['#0a1869', '#a9c9e7', "#ffe3a8", '#fc6f03'])), {
    //   title: "Job Satisfaction",
    //   tickValues: [1, 4, 7, 10],
    //   width: 225
    // });


    this.colorLegend.selectAll("*").remove();
    this.colorLegend.node().appendChild(legend);

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