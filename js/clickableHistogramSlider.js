export function clickableHistogramSlider(dataAll, svgHist, attribute) {

  //TODO: change these placeholder colors
  const greyedoutColor = "grey";
  const selectedColor = "blue";

  const uniqueValues = [...new Set(dataAll.map(d => d[attribute]))].sort((a, b) => a - b);
  console.log("uniqueValues in dataAll", uniqueValues);

  const marginHist = ({ top: 5, right: 20, bottom: 10, left: 10 })
  const widthHist = 275;
  const heightHist = 100;
  let bins = d3.bin().thresholds(uniqueValues).value(d => d[attribute])(dataAll);
  console.log("bins", bins);
  let barPadding = 8;
  //let svgHist = d3.select("#histogram");

  let xScale = d3
    .scaleLinear()
    .domain([bins[0].x0, bins[bins.length - 1].x1 + 0.5])
    .range([marginHist.left, widthHist - marginHist.right])

  let x = d3.scaleBand()
    .domain(uniqueValues)
    .range([marginHist.left, widthHist - marginHist.right + barPadding * 2])
    .padding(0.3) //TODO: maybe set this instead of multiplying in Padding

  let yScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, d => d.length)])
    .nice()
    .range([heightHist - marginHist.bottom, marginHist.top])

  let xAxis = (g) => {
    g
      .attr("transform", `translate(${0},${heightHist - marginHist.bottom})`)
      .call(
        d3.axisBottom(x)
          .ticks(0)
          .tickSizeOuter(0)
          .tickFormat(d3.format(".0f"))
      )
  };

  let ratinglist = []; //used to update ratings

  svgHist
    .selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("x", d => xScale(d.x0) + barPadding) // position of each bar on xAxis, width adjustment (bar padding)
    .attr("y", d => yScale(d.length))
    .attr("width", d => d3.max([0, xScale(5) - xScale(4) - barPadding]))
    .attr("height", d => yScale(0) - yScale(d.length))
    .style("border-radius", "1px")
    .style("outline", "solid")
    .style("outline-width", "thin")
    .style("outline-color", "greyedoutColor")
    .style("outline-width", "thin")
    .attr("fill", "white")
    .attr("cursor", "pointer")
    .on('mouseover', function (event, d) {
      // console.log(event, d)
      if (!d.clicked) {
        d3.select(this).attr("fill", "white").style("outline-width", "medium")
        //d3.select(this).style('outline-color', greyedoutColor);
      }
      else {
        d3.select(this).attr("fill", "#EFE9F8").style("outline-width", "medium")
        //d3.select(this).style('outline-color', selectedColor);            
      }
    })
    .on('mouseout', function (event, d) {
      if (!d.clicked) {
        d3.select(this).attr("fill", "white").style("outline-width", "thin")
        d3.select(this).style('outline-color', greyedoutColor)
        //.attr('style', 'outline: thin solid clear;');
      }
      else {
        d3.select(this).attr("fill", "#EFE9F8").style("outline-width", "thin")
        d3.select(this).style('outline-color', selectedColor);
      }
    })
    .on('click', function (event, d) {
      d.clicked = !d.clicked

      if (d.clicked) {
        d3.select(this).attr("fill", "#EFE9F8")
        d3.select(this).style('outline-color', selectedColor);

        ratinglist.push(d.x0);
        console.log("ratinglist", ratinglist)
        //updateData();
      } else {
        d3.select(this).attr("fill", "white")
        d3.select(this).style('outline-color', greyedoutColor)

        ratinglist = ratinglist.filter(rating => rating != d.x0)
        console.log("ratinglist", ratinglist)
        //updateData();
      }
    });

  svgHist.append("g").call(xAxis);
}

