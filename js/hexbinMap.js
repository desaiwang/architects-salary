
export async function hexbinMap() {

  // Load the data.
  const parseDate = d3.utcParse("%m/%d/%Y");
  const walmartsRaw = await d3.tsv("../data/walmart.tsv", d3.autoType)
  const walmarts = walmartsRaw.map((d) => ({
    longitude: +d[0],
    latitude: +d[1],
    date: parseDate(d.date)
  }));;

  //console.log("walmarts", walmarts)
  const us = await d3.json("../data/us-counties-10m.json");
  const stateMesh = topojson.mesh(us, us.objects.states);
  //console.log("stateMesh", stateMesh)


  // Specify the map’s dimensions and projection.
  const width = 928;
  const height = 581;
  const projection = d3.geoAlbersUsa().scale(4 / 3 * width).translate([width / 2, height / 2]);

  // Create the container SVG.
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .attr("style", "max-width: 100%; height: auto;");

  // Create the bins.
  const hexbin = d3.hexbin()
    .extent([[0, 0], [width, height]])
    .radius(10)
    .x(d => d.xy[0])
    .y(d => d.xy[1]);
  const bins = hexbin(walmarts.map(d => ({ xy: projection([d.longitude, d.latitude]), date: d.date })))
    .map(d => (d.date = new Date(d3.median(d, d => d.date)), d))
    .sort((a, b) => b.length - a.length)

  // Create the color and radius scales.
  const color = d3.scaleSequential(d3.extent(bins, d => d.date), d3.interpolateSpectral);
  const radius = d3.scaleSqrt([0, d3.max(bins, d => d.length)], [0, hexbin.radius() * Math.SQRT2]);

  // Append the color legend.
  // svg.append("g")
  //   .attr("transform", "translate(580,20)")
  //   .append(() => legend({
  //     color,
  //     title: "Median opening year",
  //     width: 260,
  //     tickValues: d3.utcYear.every(5).range(...color.domain()),
  //     tickFormat: d3.utcFormat("%Y")
  //   }));

  // Append the state mesh.
  svg.append("path")
    .datum(stateMesh)
    .attr("fill", "none")
    .attr("stroke", "#777")
    .attr("stroke-width", 0.5)
    .attr("stroke-linejoin", "round")
    .attr("d", d3.geoPath(projection));

  // Append the hexagons.
  svg.append("g")
    .selectAll("path")
    .data(bins)
    .join("path")
    .attr("transform", d => `translate(${d.x},${d.y})`)
    .attr("d", d => hexbin.hexagon(radius(d.length)))
    .attr("fill", d => color(d.date))
    .attr("stroke", d => d3.lab(color(d.date)).darker())
    .append("title")
    .text(d => `${d.length.toLocaleString()} stores\n${d.date.getFullYear()} median opening`);

  return svg.node();
}