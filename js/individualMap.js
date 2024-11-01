class IndividualMap {
  constructor(divId) {
    this.divId = divId;

    this.initialize();
  };


  initialize() {
    this.vizIndividualsContainer = d3.select(`div#${this.divId}`);
    console.log("vizIndividualsContainer", this.vizIndividualsContainer);

    this.width = Number(this.vizIndividualsContainer.style("width").replace("px", ""));
    this.height = Number(this.vizIndividualsContainer.style("height").replace("px", ""));

    this.margins = {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20
    }

    this.vizIndividualsCanvas = this.vizIndividualsContainer.append("canvas")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("position", "absolute")
      .style("top", '0px')
      .style("left", '0px');

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
  };

}

export default IndividualMap;