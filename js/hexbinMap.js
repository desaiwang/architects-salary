import { geoAlbersUsaPr } from "./geoAlbersUsaPr.js";
import { Legend } from "./legend.js";

class HexbinMap {
  constructor(divID, stateMesh, colorScales) {
    this.divID = divID;
    this.stateMesh = stateMesh;
    this.colorScales = colorScales;
    this.initialize();
  }

  initialize() {
    //set up for map
    this.widthMap = 928;
    this.heightMap = 581;

    // Create the container SVG for map
    this.svgMap = d3
      .select(`div#${this.divID}`)
      .append("svg")
      .attr("viewBox", [0, 0, this.widthMap, this.heightMap]);
    //.attr("style", "max-width: 100%; height: auto;");

    this.mapArea = this.svgMap.append("g");

    this.projection = geoAlbersUsaPr()
      .scale((4 / 3) * this.widthMap)
      .translate([this.widthMap / 2, this.heightMap / 2]);

    // Append the state mesh.
    this.mapArea
      .append("path")
      .datum(this.stateMesh)
      .attr("fill", "none")
      .attr("stroke", "#777")
      .attr("stroke-width", 0.5)
      .attr("stroke-linejoin", "round")
      .attr("d", d3.geoPath(this.projection));

    //set up the layer used for hexBin rendering
    this.hexBinLayer = this.mapArea.append("g");
    this.hexBinColorScale = this.mapArea
      .append("g")
      .attr("id", "hexBinColorScale");
  }

  render(data, categoryColor, categoryRadius) {
    console.log("about to render hexbin map", data);
    //Hexbin map
    const hexbin = d3
      .hexbin()
      .extent([
        [0, 0],
        [this.widthMap, this.heightMap],
      ])
      .radius(10)
      .x((d) => {
        if (d.xy) {
          return d.xy[0];
        }
        //else {console.log("error: d is", d);}
      })
      .y((d) => d.xy[1]);

    const bins = hexbin(
      //Guam unfortunately is not a part of the geo albers projection, so removing it from map visualization
      data
        .filter((d) => d.Location !== "Barrigada, GU, US")
        .map((d) => ({
          xy: this.projection([d.Longitude, d.Latitude]),
          Salary: d.Salary,
          Satisfaction: d["Job Satisfaction"],
          Licensed: d.Licensed,
        }))
    )
      .map((d) => ((d.salary = d3.median(d, (d) => d.Salary)), d))
      .map(
        (d) => ((d["Job Satisfaction"] = d3.mean(d, (d) => d.Satisfaction)), d)
      )
      .map(
        (d) => (
          (d.percentageLicensed =
            d.filter((d) => d.Licensed === "Yes").length / d.length),
          d
        )
      );

    // Create the color and radius scales.
    const BuOrColorInterpolator = d3.piecewise(d3.interpolateRgb, [
      "#0a1869",
      "#a9c9e7",
      "#ffe3a8",
      "#fc6f03",
    ]);
    const color = d3.scaleSequential(
      d3.extent(bins, (d) => d[categoryColor]),
      BuOrColorInterpolator
    );

    this.hexBinColorScale.selectAll("*").remove();
    this.hexBinColorScale.node().append(Legend(color));

    const radius = d3.scaleSqrt(
      d3.extent(bins, (d) => d[categoryRadius]),
      [hexbin.radius() * 0.3, hexbin.radius() * 3]
    );

    // Append the hexagons
    this.hexBinLayer.selectAll("path").remove();
    this.hexBinLayer
      .selectAll("path")
      .data(bins)
      .join("path")
      .attr("class", "hexBin")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("d", (d, i) => {
        // if (d.x == 857.3651497465942 & d.y == 165) {
        //   console.log("d is", d, "d[categoryRadius]: ", d[categoryRadius], "radius: ", radius(d[categoryRadius]))
        // }
        return hexbin.hexagon(radius(d[categoryRadius]));
      })
      .attr("fill", (d) => color(d[categoryColor]))
      .attr("stroke", (d) => d3.lab(color(d[categoryColor])).darker())
      .attr("opacity", 0.8)
      .append("title")
      .text(
        (d) =>
          `${d.length.toLocaleString()} survey responses\n${d3.format(".2f")(
            d["Job Satisfaction"]
          )} mean satisfaction\n${d3.format("$.2s")(d.salary)} median salary\n${
            d.percentageLicensed
          } licensed`
      );
  }
}

function hexbinMap(
  projection,
  data,
  categoryColor,
  categoryRadius,
  hexBinLayer,
  widthMap,
  heightMap
) {
  //console.log("bins", bins)
  //d3.extent(bins, d => d[categoryRadius])
  // hexBinLayer.selectAll("circle").remove();
  // hexBinLayer
  //   .append("circle")
  //   .attr("cx", 857.3651)
  //   .attr("cy", 165)
  //   .attr("r", 2)
  //   .attr("fill", "black");
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

export default HexbinMap;
