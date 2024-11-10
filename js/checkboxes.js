class Checkboxes {
  constructor(div, attribute, metadata, filters, updateData, options = {}) {

    const { initiateCollapsed = false } = options;

    this.div = div;
    this.attribute = attribute;
    this.filters = filters;
    this.updateData = updateData;
    this.initiateCollapsed = initiateCollapsed;

    //set timeout to be null
    this.timeout = null;

    this.data = metadata;

    this.initialize();
  }

  initialize() {

    let button = this.div.append("div").
      append("button").attr("class", "collapse");
    this.chevron = button.append("i")
      .attr("class", "bx bx-chevron-right")
      .style("rotate", this.initiateCollapsed ? "0deg" : "90deg")
      ;
    button.append("span").text(this.attribute)

    //initialize all as checked
    this.data.forEach(d => { d.checked = true })
    //initialize valueList with all values in it
    this.valueList = this.data.map(d => d.attributeVal)

    this.input = this.div.append("div")

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

    let labels = this.input
      .style("margin-left", "1.25rem")
      .style("margin-bottom", "0.5rem")
      .selectAll("label").data(this.data)
      .join("label")

    this.checkboxes = labels.append("input")
      .attr("type", "checkbox")
      .attr("id", d => d.label)
      .property("checked", true) //initiated all as checked

    this.checkboxes
      .on("click", (event, d) => {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
          console.log("single click")
          d.checked = !d.checked

          if (d.checked) {
            this.valueList.push(d.attributeVal);
          } else {
            this.valueList = this.valueList.filter(val => val != d.attributeVal)
          }
          this.filters[this.attribute] = (d) => this.valueList.includes(d[this.attribute]);
          this.updateData()
        }, 200)
      })
      .on("dblclick", (event, d) => {
        clearTimeout(this.timeout);
        console.log("dblclick")
        this.checkboxes
          .property("checked", dd => {
            dd.checked = (dd.attributeVal == d.attributeVal)
            return dd.checked
          })
        this.valueList = [d.attributeVal]
        this.filters[this.attribute] = (item) => item[this.attribute] === d.attributeVal;

        this.updateData();
      })

    labels.append("span")
      .style("font-size", "0.8rem")
      .text(d => d.label)

    //add control to button
    this.collapsed = false;
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
}

export default Checkboxes;