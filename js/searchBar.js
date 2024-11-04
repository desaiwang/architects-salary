class SearchBar {
  constructor(input, attribute, filters, updateData) {
    this.input = input;
    this.attribute = attribute;
    this.filters = filters;
    this.updateData = updateData;
    this.initialize();
  }

  initialize() {
    console.log("this.input", this.input)
    this.input.on("input", (event) => {
      const query = event.target.value;
      this.filters[this.attribute] = d =>
        d[this.attribute] &&
        d[this.attribute].toLowerCase().includes(query.toLowerCase());
      this.updateData();
    });
  }

}

export default SearchBar;