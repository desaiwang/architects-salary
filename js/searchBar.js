class SearchBar {
  constructor(div, attribute, data, filters, updateData, options = {}) {

    const { placeholderText = "type to search...", initiateCollapsed = false } = options;
    this.div = div;
    this.attribute = attribute;
    this.filters = filters;
    this.updateData = updateData;

    let groupedCounts = d3.groups(data, d => d[this.attribute])
    .map(([key, values]) => ({
      key: key,
      count: values.length,
    })).filter(({key}) => key !== null && key !== "N/A")
    .sort((a, b) => b.count - a.count); //sort descending
    this.attributeData = groupedCounts.map(d => d.key);

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

    this.inputElement = this.input
      .append("input")
      .style("width", "270px")
      .attr("id", this.attribute)
      .attr("type", "text")
      .attr("placeholder", this.placeholderText)
    this.inputElement.on("focus", (event) => {
        if (event.target.value === "") {
        this.displaySuggestions(this.attributeData); 
        }else{
          this.displaySuggestions( this.attributeData.filter(option => option.toLowerCase().includes(event.target.value.toLowerCase())).slice(0, 10));
        }
      })
      .on("input", (event) => {
        const query = event.target.value;

        const queryLowercase = query.toLowerCase();
        const filteredOptions = this.attributeData.filter(option => option.toLowerCase().includes(queryLowercase)).slice(0, 10);
        this.displaySuggestions(filteredOptions);

        this.inputValChanged(query);
      });

      //hide suggestions when clicked outside
      document.addEventListener("click", (event) =>{
       if (this.inputElement.node() !== event.target) {
          this.suggestionsContainer.style("display", "none");
        }
    });

    this.suggestionsContainer = this.input.append("div")
    .attr("class", "suggestionsContainer"); //styling in .css

    //add control to button
    this.collapsed = this.initiateCollapsed;
    button.on("click", () => {
      this.collapsed = !this.collapsed;
      this.onCollapsedChange();
    });
  }

  //formats possible values and adds to below search bar
  displaySuggestions(suggestions){
    if (suggestions.length === 0) {
      this.suggestionsContainer.style("display", "none");
        return;
    }
    
    this.suggestionsContainer
    .style("display", "flex")
    .selectAll("div")
    .data(suggestions)
    .join("div")
    .attr("class", "suggestion")
    .text(d => d)
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      this.buttonClearFilters.style("visibility", "visible");
      this.input.select("input").property("value", d);
      this.suggestionsContainer.style("display", "none");
      this.inputValChanged(d);
    });
  }

  inputValChanged(query){
    console.log("inputValChanged", query)
    if (query === "") {
      this.buttonClearFilters.style("visibility", "hidden");
      this.filters[this.attribute] = d => true;
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
    this.filters[this.attribute] = d => true;
    this.buttonClearFilters.style("visibility", "hidden");

    this.updateData();
  }


}

export default SearchBar;