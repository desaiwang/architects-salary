
import { geoAlbersUsaPr } from "./geoAlbersUsaPr.js";

export async function hexbinMap(projection, data, categoryColor, categoryRadius, hexBinLayer, widthMap, heightMap) {

  //Hexbin map
  const hexbin = d3.hexbin()
    .extent([[0, 0], [widthMap, heightMap]])
    .radius(10)
    .x(d => {
      if (d.xy) {
        return d.xy[0]
      } else {
        console.log("error: d is", d)
      }
    })
    .y(d => d.xy[1]);

  const bins = hexbin(
    data.filter(d => d.Location !== 'Barrigada, GU, US')
      .map(d => ({
        xy: projection([d.Longitude, d.Latitude]),
        Salary: d.Salary, Satisfaction: d['Job Satisfaction']
      }))
  )
    .map(d => (d.salary = d3.median(d, d => d.Salary), d))
    .map(d => (d.satisfaction = d3.mean(d, d => d.Satisfaction), d));

  console.log("bins", bins)

  // Create the color and radius scales.
  const color = d3.scaleSequential(d3.extent(bins, d => d[categoryColor]), d3.interpolateSpectral);
  const radius = d3.scaleSqrt(d3.extent(bins, d => d[categoryRadius]), [hexbin.radius() * 0.3, hexbin.radius() * 3]);
  //d3.extent(bins, d => d[categoryRadius])

  // Append the hexagons.
  hexBinLayer.selectAll("path").remove();
  hexBinLayer
    .selectAll("path")
    .data(bins)
    .join("path")
    .attr("class", "hexBin")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("d", (d, i) => {
      if (d.x == 857.3651497465942 & d.y == 165) {
        console.log("d is", d, "d[categoryRadius]: ", d[categoryRadius], "radius: ", radius(d[categoryRadius]))
      }
      return hexbin.hexagon(radius(d[categoryRadius]))
    })
    .attr("fill", d => color(d[categoryColor]))
    .attr("stroke", d => d3.lab(color(d[categoryColor])).darker())
    .attr("opacity", 0.8)
    .append("title")
    .text(d => `${d.length.toLocaleString()} survey responses\n${d3.format(".2f")(d.satisfaction)} mean satisfaction\n${d3.format("$.2s")(d.salary)} median salary`);

  hexBinLayer.selectAll("circle").remove();
  hexBinLayer.append("circle")
    .attr("cx", 857.3651)
    .attr("cy", 165)
    .attr("r", 2)
    .attr("fill", "black")
  //zooming functions, uncommented out for now

  // var zoom = d3.zoom()
  //   .scaleExtent([1, 15])
  //   .translateExtent([
  //     [-50, -50],
  //     [widthMap + 50, heightMap + 50]
  //   ]) // to lock to edges
  //   .on("zoom", mapZoomed);

  // mapArea.call(zoom);
  // //manually call zoom interaction to activate any code that's in zoomed()
  // mapArea.call(zoom.transform, d3.zoomIdentity);

  // function mapZoomed({
  //   transform
  // }) {
  //   // Transform the group object to reflect the zoom action
  //   mapArea.attr("transform", transform.toString());

  //   // Divide by scale to make sure strokes remain a consistent width during zooming
  //   // mapArea.select(".state-outline")
  //   //   .style("stroke-width", 2 / transform.k);
  //   // mapArea.select(".county-outline")
  //   //   .style("stroke-width", 1 / transform.k);

  //   // mapArea.selectAll("circle")
  //   //   .style("r", d => radius(d.length) / Math.sqrt(transform.k))

  // }

}