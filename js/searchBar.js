class SearchBar {
  constructor(div, attribute, filters, updateData, options = {}) {

    const { placeholderText = "type to search..." } = options;
    this.div = div;
    this.attribute = attribute;
    this.filters = filters;
    this.updateData = updateData;

    this.placeholderText = placeholderText
    this.initialize();
  }

  initialize() {

    let button = this.div.append("div").
      append("button").attr("class", "collapse");
    this.chevron = button.append("i")
      .attr("class", "bx bx-chevron-right")
      .style("rotate", "90deg")
      ;
    button.append("span").text(this.attribute)

    this.input = this.div.append("input")
    this.input
      .style("margin-left", "1.25rem")
      .attr("type", "text")
      .attr("id", this.attribute)
      .attr("placeholder", this.placeholderText)
      .on("input", (event) => {
        const query = event.target.value;
        if (query === "") {
          this.filters[this.attribute] = d =>
            true;
        }
        else if (query === "any") {
          this.filters[this.attribute] = d =>
            d[this.attribute];
        }
        else if (query === "none") {
          this.filters[this.attribute] = d =>
            !d[this.attribute];
        }
        else {
          this.filters[this.attribute] = d =>
            d[this.attribute] &&
            d[this.attribute].toLowerCase().includes(query.toLowerCase());
        }

        this.updateData();
      });

    //add control to button
    this.collapsed = false;
    button.on("click", async () => {
      this.collapsed = !this.collapsed;
      this.onCollapsedChange();
    });
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

export default SearchBar;