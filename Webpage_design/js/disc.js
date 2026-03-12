// constants
const width = 1200;
const height = 500;
const disc_spacing = 160;
let num_discs = 5;
const centre_size_prop = 0.30;
let year_text = null;
const min_year = 1950; // to ensure there's enough data to visualize, data before 1950 more spotty
const max_year = 2023; // more recent data is likely still being updated
const disc_y = 250;

// create a svg obj
let svg= d3.select("#viz-vinyl").append("svg").attr("height", height).attr("width", width);
let group=svg.append("g")
let circlesGroup = group.append("g")
    .attr("class", "circles-group");

// linear scale
let pop_scale = d3.scaleLinear().domain([0, 100]).range([0, 150]);

// data
let data = null;

// render the disc visualization
renderDiscs();

function displayPopUp(d, e) {
    console.log('1');
    console.log(d);
    console.log(e);
    const tooltip = d3.select("#tooltip");
    tooltip.html(`<strong>Genre: ${d.Genre}<br>
        <strong>Popularity:</strong> ${d["Average Popularity"]} / 100<br>
            <strong> Energy:</strong> ${d["Average Energy"]} / 1.0`);

    tooltip.style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY + 10) + "px")
        .transition()
        .duration(300)
        .style("opacity", 1);
}

function renderDiscs()
{
    // initial year to render on screen
    const initial_year = 1990;

    // render the year text on screen
    year_text = group.append("text")
        .attr("id", "year-text")
        .attr("x", width / 2 - 20)       // horizontal center
        .attr("y", 400)// vertical position
        .attr("text-anchor", "middle") // center the text horizontally
        .attr("alignment-baseline", "middle") // center vertically
        .style("font-family", "Futura, sans-serif")
        .style("font-size", "24px")
        .style("font-weight", "bold")
        .style("fill", "white")
        .text("Year: " + initial_year);

    // load the csv, convert numeric data to numbers
    d3.csv("../data/energy_and_pop_data.csv", row => {
        row.Year = +row.Year;
        row["Average Popularity"] = +row["Average Popularity"];
        row["Average Energy"] = +row["Average Energy"];
        return row;
    }).then(csv_data =>
    {
        // create a year slider
        data = csv_data
        const years = Array.from(new Set(data.map(d => d.Year)));

        console.log(data);

        createYearSlider(years);

        // log the data, filter the data by the initial year
        const dataForYear = data.filter(d => d.Year === initial_year);

        // sort the genres by popularity descending
        const sortedGenres = dataForYear.sort((a, b) =>
        {return b["Average Popularity"] - a["Average Popularity"]});

        console.log(sortedGenres);
        let top_5 = sortedGenres.slice(0, num_discs);

        // base discs
        let discs = circlesGroup.selectAll(".disc")
            .data(top_5)
            .enter()
            .append("g")
            .attr("class", "disc")
            .attr("transform", (d, i) =>
                `translate(${100 + i * disc_spacing}, ${disc_y})`
            );
        discs.append("circle")
            .attr("class", "outer")
            .attr("r", d => pop_scale(d["Average Popularity"]))
            .attr("fill", "black");

        // concentric rings
        generateRings(discs)

        // center ring
        discs.append("circle").attr("class", "center").attr("r", d =>
        pop_scale(d["Average Popularity"] * centre_size_prop)).attr("fill", "red");

        // add genre in the center
        discs.append("text")
            .attr("class", "disc_text")
            .text(d => d.Genre) // or any property you want
            .attr("text-anchor", "middle") // horizontally center
            .attr("alignment-baseline", "middle") // vertically center
            .attr("fill", "black") // contrast with red
            .style("font-size", d => Math.max(10, pop_scale(d["Average Popularity"] * centre_size_prop) / 2)) // optional dynamic font size
            .style("font-family", "Futura, sans-serif");

        console.log('ok');

        // listen for clicks
        discs.on("click", (e, d) => {
            displayPopUp(d, e);
        })

    })
}

// generate the rings for each vinyl disc
function generateRings(discs)
{
    discs.each(function(d)
    {
        // retrieve the disc rad
        const discRad = pop_scale(d["Average Popularity"]);

        const energy = (d["Average Energy"]);

        // eventually this is based on energy (the formula is round(energy * 10))
        const num_rings = Math.round(10 * energy);
        console.log('energy: ' + energy);
        console.log('num_rings: ' + num_rings);
        const ring_arr = d3.range(1, num_rings + 1);

        const rings = d3.select(this)
            .selectAll(".ring")
            .data(ring_arr);

        // exit pattern,
        rings.exit().remove();

        rings.enter()
            .append("circle")
            .attr("class", "ring")
            .merge(rings)
            .attr("r", r => discRad * (r / (ring_arr.length + 1)))
            .attr("fill", "none")
            .attr("stroke", "#818281")
            .attr("stroke-width", 1);

    })
}

// update the discs based on the new year
function updateDiscs(year)
{
    // log the data, filter the data by the year user choose
    const dataForYear = data.filter(d => d.Year === +year);

    // sort the genres by popularity descending
    const sortedGenres = dataForYear.sort((a, b) =>
    {return b["Average Popularity"] - a["Average Popularity"]});

    // select only the top 5 genres
    let top_5 = sortedGenres.slice(0, num_discs);

    // compute disc radii
    top_5.forEach(d => {d.radius = d["Average Popularity"]});

    // disc padding
    let disc_padding = 90;

    // compute updated spacing
    top_5.forEach((d, i) =>
    {
        if (i === 0)
        {
            d.x = 150
        }
        else
        {
            let prev = top_5[i - 1]
            d.x = prev.x + prev.radius + d.radius + disc_padding;
        }
    })

    console.log(top_5);

    const discs = circlesGroup
        .selectAll(".disc")
        .data(top_5);

    discs.transition()
        .duration(600)
        .attr("transform", d => `translate(${d.x}, ${disc_y})`);

    discs.select(".outer")
        .transition()
        .duration(600)
        .attr("r", d => pop_scale(d["Average Popularity"]));

    generateRings(discs);

    discs.select(".center")
        .transition()
        .duration(600)
        .attr("r", d => pop_scale(d["Average Popularity"] * centre_size_prop));

    discs.select(".disc_text")
        .transition()
        .duration(600)
        .text(d => d.Genre);
}

function createYearSlider(years)
{
    console.log(min_year);
    console.log(d3.max(years));
    let year_slider = d3
        .select("#slider_container")
        .append("input")
        .attr("type", "range")
        .attr("min", min_year)
        .attr("max", max_year)
        .attr("value", 1990)
        .attr("step", 1)
        .style("width", "300px")
        .style("margin", "20px")
        .style("display", "block");

// respond to slider changes
    year_slider.on("input", function() {
        console.log("Slider value:", this.value);
        let curr_year = document.getElementById("year-text");
        curr_year.textContent = "Year: " + this.value;
        updateDiscs(this.value);
    });
}
