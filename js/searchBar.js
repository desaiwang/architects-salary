class SearchBar {
  constructor(input, attribute, filters, updateData) {
    this.input = input;
    this.attribute = attribute;
    this.filters = filters;
    this.updateData = updateData;
    this.initialize();
  }

  initialize() {
    this.input.on("input", (event) => {
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
  }

}

export default SearchBar;