class SearchBar {
  constructor(div, attribute, filters, updateData, options = {}) {

    const { placeholderText = "type to search...", initiateCollapsed = false } = options;
    this.div = div;
    this.attribute = attribute;
    this.filters = filters;
    this.updateData = updateData;

    this.placeholderText = placeholderText
    this.initiateCollapsed = initiateCollapsed;
    this.initialize();
  }

  initialize() {

    let buttons = this.div.append("div").attr("class", "buttons")
      .style("display", "flex")
      .style("justify-content", "space-between");
    let button = buttons.
      append("button").attr("class", "collapse");
    this.chevron = button.append("i")
      .attr("class", "bx bx-chevron-right")
      .style("rotate", this.initiateCollapsed ? "0deg" : "90deg")
      ;
    button.append("span").text(this.attribute)

    //button for clearing filters
    this.buttonClearFilters = buttons.append("div").attr("class", "clear-filters")
      .append("button").attr("class", "clear-filters").style("visibility", "hidden");
    this.buttonClearFilters.append("i")
      .attr("class", "bx bx-x");
    this.buttonClearFilters.append("span").text("clear");

    this.buttonClearFilters.on("click", () => { this.clearFilters(); });


    this.input = this.div.append("div")
      .style("margin", "0.25rem 0 0.5rem 1.25rem")

    if (this.initiateCollapsed) {
      this.input.style("opacity", 0)
        .style("visibility", "hidden")
        .style("display", "none");
    }
    else {
      this.input
        .style("display", "block")
        .style("opacity", 1)
        .style("visibility", "visible")
    }

    this.input
      .append("input")
      .style("width", "200")
      .attr("id", this.attribute)
      .attr("type", "text")
      .attr("placeholder", this.placeholderText)
      .on("input", (event) => {
        const query = event.target.value;
        if (query === "") {
          this.buttonClearFilters.style("visibility", "hidden");

          this.filters[this.attribute] = d =>
            true;
        }
        else {

          this.buttonClearFilters.style("visibility", "visible");

          if (query === "any") {
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
        }


        this.updateData();
      });

    //add control to button
    this.collapsed = this.initiateCollapsed;
    button.on("click", () => {
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


  clearFilters() {

    //clear input field
    this.input.select("input").property("value", "");
    this.filters[this.attribute] = (d) => true;
    this.buttonClearFilters.style("visibility", "hidden");

    this.updateData();
  }


}

export default SearchBar;