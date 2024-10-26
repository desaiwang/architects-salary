import cancelableClick from "./cancelableClick.js";

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
export function clickableHistogramSlider(dataAll, container, label, attribute, sliderWidth, sliderHeight, updateData, filters, { scaleFormatter = null, colorList = null, sortOrder = 'key', ascending = true, yBetweenLabelAndHist = 10 }) {

  let wrapper = container.append("div").attr("class", "controls").style("margin-top", "10px");

  wrapper
    .append("div")
    .style("margin-bottom", `${yBetweenLabelAndHist}px`)
    .text(label);

  let rowwrapper = wrapper.append("div")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center");

  let svgHist = rowwrapper.append("svg").attr("id", "capacity selection")
    .attr("width", sliderWidth)
    .attr("height", sliderHeight + 30)
    .attr("attribute", attribute);

  const groupedData = d3.groups(dataAll, d => d[attribute]);
  const groupCounts = groupedData.map(([key, values]) => ({ key: key === null ? "N/A" : key, count: values.length }));
  //console.log("groupedData", groupedData);
  //console.log("groupCounts", groupCounts);
  if (Array.isArray(sortOrder)) {
    groupCounts.sort((a, b) => {
      const indexA = sortOrder.indexOf(a.key);
      const indexB = sortOrder.indexOf(b.key);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  } else if (sortOrder === 'key') {
    groupCounts.sort((a, b) => ascending ? a.key - b.key : b.key - a.key);
  } else if (sortOrder === 'count') {
    groupCounts.sort((a, b) => ascending ? a.count - b.count : b.count - a.count);
  }
  //console.log("groupCounts after sorting", groupCounts);
  const uniqueKeys = groupCounts.map(d => d.key)
  //console.log("uniqueKeys", uniqueKeys);

  const widthHist = sliderWidth;
  const heightHist = sliderHeight;

  let xScale = d3.scaleBand()
    .domain(uniqueKeys)
    .range([0, widthHist])
    .padding(0.2) //TODO: maybe set this instead of multiplying in Padding

  let yScale = d3
    .scaleLinear()
    .domain([0, d3.max(groupCounts, d => d.count)])
    .nice()
    .range([heightHist, 0])



  let xAxis = (g) => {
    g
      .attr("transform", `translate(${0},${heightHist + 8})`)
      .call(
        d3.axisBottom(xScale)
          .tickSizeOuter(0)
          .tickFormat(scaleFormatter ? scaleFormatter : d => d)
      )
  };
  svgHist.append("g").call(xAxis);

  //initiate valueList with all unique values (all checked)
  let valueList = uniqueKeys; //used to update ratings
  //console.log("valueList at the beginning", valueList)

  //save colors for each bin, set clicked all to true
  groupCounts.forEach((d, i) => {
    d.color = colorList ? colorList[i] : "grey"
    d.clicked = true
  })

  //TODO: change these placeholder colors
  const greyedoutColor = "grey";
  const selectedColor = "black";

  var timeout = null;
  let histRects = svgHist
    .selectAll("rect")
    .data(groupCounts)
    .join("rect")
    .attr("x", d => xScale(d.key))
    .attr("y", d => yScale(d.count))
    .attr("width", xScale.bandwidth())
    .attr("height", d => yScale(0) - yScale(d.count) + 5)
    .style("border-radius", "1px")
    .style("outline", "solid")
    .style("outline-width", "thin")
    .style("outline-color", selectedColor)
    .attr("fill", d => d.color)
    .attr("cursor", "pointer")
    .on('mouseover', function (event, d) {
      d3.select(this)
        .style("outline-width", "medium")
        .style('outline-color', selectedColor)
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
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        d.clicked = !d.clicked

        if (d.clicked) {
          d3.select(this)
            .attr("fill", d => {
              return d.color
            })
            .style('outline-color', selectedColor);

          valueList.push(d.key);
        } else {
          d3.select(this)
            .attr("fill", "white")
            .style('outline-color', greyedoutColor)

          valueList = valueList.filter(rating => rating != d.key)
        }
        //console.log("valueList", valueList)
        filters[attribute] = d => valueList.includes(d[attribute] === null ? "N/A" : d[attribute]);
        updateData()
      }, 200);
    }).on('dblclick', function (event, d) {
      clearTimeout(timeout);
      //console.log("double clicked", event, d);
      // Reset all bars to deselected
      groupCounts.forEach(item => item.clicked = false);
      // Set only the double-clicked bar to selected
      d.clicked = true;

      histRects
        .attr("fill", d => d.clicked ? d.color : "white")
        .style('outline-color', d => d.clicked ? selectedColor : greyedoutColor);

      // Update valueList and filter to only include the double-clicked value
      valueList = [d.key];
      filters[attribute] = item => item[attribute] === d.key;
      updateData();
    });



}

