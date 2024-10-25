/**
 * Creates a clickable histogram slider using D3.js.
 * 
 * @param {Array<Object>} dataAll - The dataset to be visualized.
 * @param {Object} svg - The SVG element where the histogram will be rendered.
 * @param {string} attribute - The attribute of the dataset to be used for the histogram.
 * @param {number} sliderWidth - The width of the histogram slider.
 * @param {number} sliderHeight - The height of the histogram slider.
 * @param {function} updateData - The update function after filters are changed.
* @param {Object} filters - The filters object to be updated.
 * @param {Array<string>} [colorList=null] - Optional list of colors for the histogram bars, this must match the number of unique values in sorted order.
 * 
 * @returns {void}
 */
export function clickableHistogramSlider(dataAll, container, label, attribute, sliderWidth, sliderHeight, updateData, filters, { scaleFormatter = d3.format(".0f"), colorList = null }) {

  let wrapper = container.append("div").attr("class", "controls").style("margin-top", "10px");
  wrapper.append("div").text(label);

  let rowwrapper = wrapper.append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center");

  let svgHist = rowwrapper.append("svg").attr("id", "capacity selection")
    .attr("width", sliderWidth)
    .attr("height", sliderHeight + 30)
    .attr("attribute", attribute);

  const groupedData = d3.groups(dataAll, d => d[attribute]);
  const groupCounts = groupedData.map(([key, values]) => ({ key, count: values.length }));

  console.log("groupedData", groupedData);
  console.log("groupCounts", groupCounts);
  groupCounts.sort((a, b) => a.key - b.key);
  console.log("groupCounts after sorting", groupCounts);
  const uniqueValues = [...new Set(dataAll.map(d => d[attribute]))]
  console.log("uniqueValues before sorting", uniqueValues);
  uniqueValues.sort((a, b) => a - b);
  console.log("uniqueValues after sorting", uniqueValues);
  const widthHist = sliderWidth;
  const heightHist = sliderHeight;

  let bins = d3.bin().thresholds(uniqueValues).value(d => d[attribute])(dataAll);
  console.log("bins", bins);

  let xScale = d3.scaleBand()
    .domain(uniqueValues)
    .range([0, widthHist])
    .padding(0.2) //TODO: maybe set this instead of multiplying in Padding

  let yScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .nice()
    .range([heightHist, 0])

  let xAxis = (g) => {
    g
      .attr("transform", `translate(${0},${heightHist})`)
      .call(
        d3.axisBottom(xScale)
          .tickSizeOuter(0)
          .tickFormat(scaleFormatter)
      )
  };
  svgHist.append("g").call(xAxis);

  //initiate valueList with all unique values (all checked)
  let valueList = uniqueValues; //used to update ratings

  //save colors for each bin, set clicked all to true
  bins.forEach((d, i) => {
    d.color = colorList ? colorList[i] : "grey"
    d.clicked = true
  })

  //TODO: change these placeholder colors
  const greyedoutColor = "grey";
  const selectedColor = "black";

  svgHist
    .selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("x", d => xScale(d.x0)) // position of each bar on xAxis, width adjustment (bar padding)
    .attr("y", d => yScale(d.length))
    .attr("width", xScale.bandwidth())
    .attr("height", d => yScale(0) - yScale(d.length))
    .style("border-radius", "1px")
    .style("outline", "solid")
    .style("outline-width", "thin")
    .style("outline-color", selectedColor)
    .attr("fill", d => d.color)
    .attr("cursor", "pointer")
    .on('mouseover', function (event, d) {
      d3.select(this).style("outline-width", "medium")
    })
    .on('mouseout', function (event, d) {
      if (!d.clicked) {
        d3.select(this)
          .style("outline-width", "thin")
          .style('outline-color', greyedoutColor)
      }
      else {
        d3.select(this)
          .style("outline-width", "thin")
          .style('outline-color', selectedColor);
      }
    })
    .on('click', function (event, d) {
      d.clicked = !d.clicked

      if (d.clicked) {
        d3.select(this)
          .attr("fill", d => d.color)
          .style('outline-color', selectedColor);

        valueList.push(d.x0);
        console.log("valueList", valueList)

        filters[attribute] = d => valueList.includes(d[attribute]);
        updateData()
      } else {
        d3.select(this)
          .attr("fill", "white")
          .style('outline-color', greyedoutColor)

        valueList = valueList.filter(rating => rating != d.x0)
        console.log("valueList", valueList)
        filters[attribute] = d => valueList.includes(d[attribute]);
        updateData();
      }
    });



}

