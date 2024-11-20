import { geoAlbersUsaPr } from "./geoAlbersUsaPr.js";
import { Legend } from "./legend.js";
import calculateBounds from "./bounds.js";

class HexbinMap {
  constructor(divID, data, stateMesh, colorScales) {
    this.divID = divID;
    this.data = data;
    this.stateMesh = stateMesh;
    this.colorScales = colorScales;

    this.colorAttribute = "Job Satisfaction";
    this.sizeAttribute = "length";
    this.initialize();
  }

  initialize() {
    //set up for map
    this.widthMap = 928;
    this.heightMap = 581;

    // Create the container SVG for map
    this.container = d3.select(`div#${this.divID}`);
    this.svgMap = this.container
      .append("svg")
      .attr("viewBox", [0, 0, this.widthMap, this.heightMap + 80]) //50 is for legends at the bottom
      .attr("style", "max-width: 90%; height: auto;");

    this.svgColorScale = this.container.append("g");
    this.svgSizeScale = this.svgMap.append("g");

    this.mapArea = this.svgMap.append("g");

    this.projection = geoAlbersUsaPr()
      .scale((4 / 3) * this.widthMap)
      .translate([this.widthMap / 2, this.heightMap / 2]);

    // Append the state mesh.
    this.mapArea
      .append("path")
      .datum(this.stateMesh)
      .attr("class", "stateOutline")
      .attr("fill", "none")
      .attr("stroke-linejoin", "round")
      .attr("d", d3.geoPath(this.projection));

    //set up the layer used for hexBin rendering
    this.hexBinLayer = this.mapArea.append("g");
    this.hexBinHover = this.mapArea.append("g");
    this.hexBinColorScale = this.svgColorScale.attr("id", "hexBinColorScale");
    //.style("transform", `translate(${200}px, ${this.heightMap + 10}px)`);
    this.hexBinSizeScale = this.svgSizeScale
      .attr("id", "hexBinSizeScale")
      .style(
        "transform",
        `translate(${this.widthMap - 200}px, ${this.heightMap + 10}px)`
      );

    //set up hexbinGenerator
    this.hexbin = d3
      .hexbin()
      .extent([
        [0, 0],
        [this.widthMap, this.heightMap],
      ])
      .radius(10)
      .x((d) => {
        if (d.xy) {
          return d.xy[0];
        } else {
          console.log("error: d is", d);
        } //TODO: remove this line in production
      })
      .y((d) => d.xy[1]);

    //create tooltip
    this.tooltipDiv = this.container
      .append("div")
      .attr("id", "tooltip")
      .attr("class", "tooltip")
      .style("visibility", "hidden")
      .style("position", "absolute")
      .style("background", "white")
      .style("padding", "18px")
      .style("border", "2px solid #181D27")
      .style("border-radius", "5px")
      .style("pointer-events", "none");
  }

  updateColorScale() {
    if (
      this.colorAttribute == "firmTypeMode" ||
      this.colorAttribute == "firmSizeMode"
    ) {
      this.color = this.colorScales[this.colorAttribute];
      this.hexBinColorScale.selectAll("*").remove();

      //TODO: how to get the nodes to render into this svg?
    } else {
      this.color = d3.scaleSequential(
        d3.extent(this.bins, (d) => d[this.colorAttribute]),
        this.colorScales[this.colorAttribute]
      );

      this.hexBinColorScale.selectAll("*").remove();
      const legendElement = Legend(this.color);
      legendElement.style.display = null;
      legendElement.style.padding = "10px";
      console.log(legendElement);
      this.hexBinColorScale.node().append(legendElement);
    }
  }

  updateColorAttribute(colorAttribute) {
    this.colorAttribute = colorAttribute;
    this.updateColorScale();

    this.hexBinLayer
      .selectAll("path")
      .attr("fill", (d) => this.color(d[this.colorAttribute]))
      .attr("stroke", (d) =>
        d3.lab(this.color(d[this.colorAttribute])).darker()
      );
  }

  updateSizeScale() {
    const sizeAttributeDomain = d3.extent(
      this.bins,
      (d) => d[this.sizeAttribute]
    );

    if (this.sizeAttribute == "length") {
      this.radius = d3.scaleSqrt(sizeAttributeDomain, [
        this.hexbin.radius() * 0.3,
        this.hexbin.radius() * 2.1,
      ]);
    } else {
      this.radius = d3.scaleSqrt(sizeAttributeDomain, [
        this.hexbin.radius() * 0.1,
        this.hexbin.radius() * 1.1,
      ]);
    }

    this.radius = d3.scaleSqrt(
      sizeAttributeDomain,
      this.sizeAttribute == "length"
        ? [this.hexbin.radius() * 0.3, this.hexbin.radius() * 2.5]
        : [this.hexbin.radius() * 0.1, this.hexbin.radius() * 1.1]
    );

    let xAcc = 0;
    const tickData =
      sizeAttributeDomain[1] > 1000 && this.sizeAttribute == "length"
        ? [100, 500, 1000, 1500]
        : this.radius.ticks(5);
    console.log("tickData", tickData);
    this.hexBinSizeScale
      .selectAll("path")
      .data(tickData)
      .join("path")
      .attr("class", "hexBinSizeLegend")
      .attr("d", (d) => this.hexbin.hexagon(this.radius(d)))
      .style("transform", (d, i) => {
        const xPos = xAcc;
        xAcc += this.radius(d) * 2 + 20;
        return `translate(${xPos}px, 18px)`;
      });
  }

  updateSizeAttribute(sizeAttribute) {
    this.sizeAttribute = sizeAttribute;

    this.updateSizeScale();

    this.hexBinLayer
      .selectAll("path")
      .transition()
      .attr("d", (d, i) =>
        this.hexbin.hexagon(this.radius(d[this.sizeAttribute]))
      );
  }
  updateData(data) {
    this.data = data;
    this.render();
  }

  render() {
    this.bins = this.hexbin(
      this.data
        .filter((d) => d.Location !== "Barrigada, GU") //Guam unfortunately is not a part of the geo albers projection, so removing it from map visualization
        .map((d) => ({
          xy: this.projection([d.Longitude, d.Latitude]),
          Salary: d.Salary,
          Satisfaction: d["Job Satisfaction"],
          Licensed: d.Licensed,
          Gender: d.Gender,
          Age: d.Age,
          YearsOfExperience: d["Years of Experience"],
          Location: d.Location,
          JobTitle: d["Job Title"],
          FirmType: d["Firm Type"],
          FirmSize: d["Firm Size"],
          Undergrad: d["Undergraduate School"],
          Grad: d["Graduate School"],
        }))
    ).map((d) => {
      d.Salary = d3.median(d, (d) => d.Salary);
      d["Job Satisfaction"] = d3.mean(d, (d) => d.Satisfaction);
      d.ageMode = d3.mode(d.map((d) => d.Age));
      d.yearsOfExperienceMode = d3.mode(d.map((d) => d.YearsOfExperience));
      d.percentageLicensed =
        d.filter((d) => d.Licensed === "Yes").length / d.length;
      d.percentageFemale =
        d.filter((d) => d.Gender === "Female").length / d.length;
      d.percentageMale = d.filter((d) => d.Gender === "Male").length / d.length;
      d.locationMode = d3.mode(d.map((d) => d.Location));
      d.jobTitleMode = d3.mode(d.map((d) => d.JobTitle));
      d.firmTypeMode = d3.mode(d.map((d) => d.FirmType));
      d.firmSizeMode = d3.mode(d.map((d) => d.FirmSize));
      //need to save this otherwise async issues will cause it to be undefined
      let undergradMode = d3.mode(d.map((d) => d.Undergrad));
      d.undergradMode = undergradMode;
      d.undergradModeCount = d.filter(
        (d) => d.Undergrad == undergradMode
      ).length;
      let gradMode = d3.mode(d.map((d) => d.Grad));
      d.gradMode = gradMode;
      d.gradModeCount = d.filter((d) => d.Grad == gradMode).length;
      return d;
    });

    //restrict bins to only those with a length greater than a certain number
    //TODO: maybe make this an user-controllable variable
    const minBinLength = 5;
    this.bins = this.bins.filter((d) => d.length > minBinLength);

    this.updateSizeScale();
    this.updateColorScale();

    // Append the hexagons
    this.hexBinLayer.selectAll("path").remove();
    this.hexBinLayer
      .selectAll("path")
      .data(this.bins)
      .join("path")
      .attr("class", "hexBin")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .attr("d", (d, i) => {
        // if (d.x == 857.3651497465942 & d.y == 165) {
        //   console.log("d is", d, "d[this.sizeAttribute]: ", d[this.sizeAttribute], "radius: ", radius(d[this.sizeAttribute]))
        // }
        return this.hexbin.hexagon(this.radius(d[this.sizeAttribute]));
      })
      .attr("fill", (d) => this.color(d[this.colorAttribute]))
      .attr("stroke", (d) =>
        d3.lab(this.color(d[this.colorAttribute])).darker()
      )
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => mouseOver(event, d))
      .on("mouseout", (event, d) => {
        d3.select(event.target).attr("opacity", "0.8");
        this.tooltipDiv.style("visibility", "hidden");
        this.hexBinHover.selectAll("*").remove();
      });

    let mouseOver = (event, d) => {
      //console.log("mouseOver d", d);
      d3.select(event.target).attr("opacity", "1");

      //show original hexagon: this.hexbin.radius()
      const hexRadius = this.radius(d[this.sizeAttribute]);
      const hoverHexRadius = hexRadius + 3;
      this.hexBinHover
        .append("path")
        .attr("transform", `translate(${d.x},${d.y})`)
        .attr("d", this.hexbin.hexagon(hoverHexRadius))
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);

      let svgRect = this.svgMap.node().getBoundingClientRect();
      let viewBox = this.svgMap.node().viewBox.baseVal;
      //logging statements
      // console.log("svgRect", svgRect);
      // console.log("svgMap viewbox", viewBox);
      // console.log("svgRect left", svgRect.left);
      // console.log("d.x", d.x);
      // console.log("svgRect.width", svgRect.width);
      // console.log("viewBox.width", viewBox.width);
      // console.log(
      //   "attempt to set left as",
      //   svgRect.left + (d.x * svgRect.width) / viewBox.width
      // );
      // console.log("svgRect top", svgRect.top);
      // console.log("d.y", d.y);
      // console.log("svgRect.height", svgRect.height);
      // console.log("viewBox.height", viewBox.height);
      // console.log(
      //   "attempt to set top as ",
      //   svgRect.top + (d.y * svgRect.height) / viewBox.height
      // );

      const personOrPeople = d.firmSizeMode === 1 ? "person" : "people";
      const schoolDiv = (d, attribute, title) => {
        if (d[attribute]) {
          //TODO: should there be count as well?
          //${d[attribute + "Count"]},
          const moreInfo =
            d.length > 1
              ? `(${d3.format(".0%")(d[attribute + "Count"] / d.length)})`
              : "";
          return `<div style="line-height: 1.2;display: flex; align-items: baseline;"><p class="tooltip regular">${title}:</p><p class="tooltip light" style="margin-left: 5px;">${d[attribute]} ${moreInfo}</p></div>`;
        }
        return "";
      };

      if (d.length == 1) {
        this.tooltipDiv.html(`
          <div style="display: flex;flex-direction: column;">
            <div style="display: flex; gap: 20px; width: auto; min-width: 300px; flex-wrap: nowrap;">
              <!-- Column 1 -->
              <div style="flex: 1 1 auto; min-width: 0;">
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d["locationMode"]}</h4>
                </div>
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d3.format("$,")(d.Salary)}</h4>
                  <p class="tooltip light" style="margin-left: 5px;">per year</p>
                </div>
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d3.format(".2f")(
                    d["Job Satisfaction"]
                  )}/10</h4>
                  <p class="tooltip light" style="margin-left: 5px;">satisfaction</p>
                </div>
                <p style="margin-top:2px" class="tooltip light">${
                  d[0]["Gender"]
                }, ${
          d[0]["Licensed"] == "Yes" ? "Licensed" : "Not Licensed"
        }</p>
              </div>
  
              <!-- Column 2 -->
              <div style="flex: 1 1 auto; min-width: 0;margin-top: 2px;">
              <p class="tooltip light">Only Response:</p>
              <p class="tooltip light">${d.jobTitleMode}</p>
                <p class="tooltip light">${
                  d.firmTypeMode === "N/A"
                    ? `Firm with ${d.firmSizeMode} ${personOrPeople}`
                    : `${d.firmTypeMode} (${d.firmSizeMode} ${personOrPeople})`
                }</p>
                <p class="tooltip light" >${
                  d.yearsOfExperienceMode
                } years of experience</p>
                <p class="tooltip light" >${d.ageMode} years old</p>
              </div>   
            </div>
            <div style="margin-top:1rem">
              ${schoolDiv(d, "undergradMode", "UG")}
              ${schoolDiv(d, "gradMode", "Grad")}
            </div>
  
            <p style="margin-bottom:-10px; align-self: flex-end; text-align: right;" class="tooltip mini">${
              d.length
            } response</p>
        </div>
          `);
      } else if (d.length > 3) {
        this.tooltipDiv.html(`
          <div style="display: flex;flex-direction: column;row-gap: 1rem;">
            <div style="display: flex; gap: 20px; width: auto; min-width: 300px; flex-wrap: nowrap;">
              <!-- Column 1 -->
              <div style="flex: 1 1 auto; min-width: 0;">
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d["locationMode"]}</h4>
                  <p class="tooltip light" style="margin-left: 5px;">area</p>
                </div>
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d3.format("$,")(d.Salary)}</h4>
                  <p class="tooltip light" style="margin-left: 5px;">median income</p>
                </div>
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d3.format(".2f")(
                    d["Job Satisfaction"]
                  )}/10</h4>
                  <p class="tooltip light" style="margin-left: 5px;">avg satisfaction</p>
                </div>
                <p style="margin-top:2px" class="tooltip light">${d3.format(
                  ".0%"
                )(d.percentageFemale)} female, ${d3.format(".0%")(
          d.percentageMale
        )} male</p>
                <p class="tooltip light">${d3.format(".0%")(
                  d.percentageLicensed
                )} licensed</p>
              </div>
  
              <!-- Column 2 -->
              <div style="flex: 1 1 auto; min-width: 0;margin-top: 2px;">
              <p class="tooltip light">Most Common Responses:</p>
              <p class="tooltip light">${d.jobTitleMode}</p>
                <p class="tooltip light">${
                  d.firmTypeMode === "N/A"
                    ? `Firm with ${d.firmSizeMode} ${personOrPeople}`
                    : `${d.firmTypeMode} (${d.firmSizeMode} ${personOrPeople})`
                }</p>
                <p class="tooltip light" >${
                  d.yearsOfExperienceMode
                } years of experience</p>
                <p class="tooltip light" >${d.ageMode} years old</p>
              </div>   
            </div>
            <div>
              ${schoolDiv(d, "undergradMode", "Most Common UG")}
              ${schoolDiv(d, "gradMode", "Most Common Grad")}
            </div>
  
            <p style="margin-bottom:-10px; align-self: flex-end; text-align: right;" class="tooltip mini">${
              d.length
            } responses</p>
        </div>
          `);
      } else {
        this.tooltipDiv.html(`
          <div style="display: flex;flex-direction: column;row-gap: 1rem">
            <div style="display: flex; gap: 20px; width: auto; min-width: 200px; flex-wrap: nowrap;">
              <!-- Column 1 -->
              <div style="flex: 1 1 auto; min-width: 0;">
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d["locationMode"]}</h4>
                  <p class="tooltip light" style="margin-left: 5px;">area</p>
                </div>
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d3.format("$,")(d.Salary)}</h4>
                  <p class="tooltip light" style="margin-left: 5px;">median income</p>
                </div>
                <div style="display: flex; align-items: baseline;">
                  <h4 class="tooltip bold">${d3.format(".2f")(
                    d["Job Satisfaction"]
                  )}/10</h4>
                  <p class="tooltip light" style="margin-left: 5px;">avg satisfaction</p>
                </div>
              </div>
  
            <p style="margin-bottom:-10px; align-self: flex-end; text-align: right;" class="tooltip mini">${
              d.length
            } responses</p>
        </div>
          `);
      }

      const tooltipRect = this.tooltipDiv.node().getBoundingClientRect();
      const bounds = calculateBounds(
        svgRect.width,
        svgRect.height,
        tooltipRect.width,
        tooltipRect.height,
        (d.x * svgRect.width) / viewBox.width,
        (d.y * svgRect.height) / viewBox.height
      );
      this.tooltipDiv
        .style("left", bounds.x)
        .style("top", bounds.y)
        .style("visibility", "visible");
    };

    // let mapZoomed = ({ transform }) => {
    //   // Transform the group object to reflect the zoom action
    //   this.mapArea.attr("transform", transform.toString());
    //   // Divide by scale to make sure strokes remain a consistent width during zooming
    //   // mapArea.select(".state-outline")
    //   //   .style("stroke-width", 2 / transform.k);
    //   // mapArea.select(".county-outline")
    //   //   .style("stroke-width", 1 / transform.k);
    //   // mapArea.selectAll("circle")
    //   //   .style("r", d => radius(d.length) / Math.sqrt(transform.k))
    // };
    // //zooming functions, uncommented out for now
    // var zoom = d3
    //   .zoom()
    //   .scaleExtent([1, 15])
    //   .translateExtent([
    //     [-50, -50],
    //     [this.widthMap + 50, this.heightMap + 50],
    //   ]) // to lock to edges
    //   .on("zoom", mapZoomed);
    // console.log("this.mapArea", this.mapArea);
    // this.svgMap.call(zoom);
    // //manually call zoom interaction to activate any code that's in zoomed()
    // this.svgMap.call(zoom.transform, d3.zoomIdentity);
  }
}

export default HexbinMap;
