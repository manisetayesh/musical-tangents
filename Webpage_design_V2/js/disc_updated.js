// constants
const width = 1200;
const height = 500;
const disc_spacing = 160;
let num_discs = 5;
const centre_size_prop = 0.30;
const min_year = 1950; // to ensure there's enough data to visualize, data before 1950 more spotty
const max_year = 2023; // more recent data is likely still being updated


// load the data and the slider
loadData()
function loadData() {
    d3.csv("../data/energy_and_pop_data.csv", row => {
        row.Year = +row.Year;
        row.Popularity = +row["Average Popularity"];
        row.Energy = +row["Average Energy"];
        return row;
    }).then(data => {
        let vinyl_wall = new VinylWall('vinyl-wall', data)
        loadYearSlider('slider_container', vinyl_wall);
    })
}
// load the slider



class VinylWall {
    constructor(parent_element, raw_data) {
        this.parent_element = parent_element;
        this.raw_data = raw_data;
        this.display_data = [];
        this.initVis();
    }

    initVis() {
        // create the svg for the vinyl wall vis
        let vis = this;
        vis.margin = {top: 20, right: 20, bottom: 20, left: 20};
        vis.width = document.getElementById(vis.parent_element).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = document.getElementById(vis.parent_element).getBoundingClientRect().height - vis.margin.top - vis.margin.bottom;
        vis.svg = d3.select("#" + vis.parent_element).append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)

        console.log('width', vis.width);
        console.log('height', vis.height);

        // create group elem for the vis
        vis.group = vis.svg.append("g")
            .attr('transform', `translate(${vis.margin.left}, ${vis.margin.top})`);
        ;

        // create group for the vinyl circles
        vis.circlesGroup = vis.group.append("g")
            .attr("class", "circles-group");

        // create a scale for genre popularity
        vis.pop_scale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, 150]);

        // create a scale for genre text size
        vis.genre_text_scale = d3.scaleLinear().domain([0, 30]).range([8, 15])

        // initial year
        vis.current_year = 1990;

        // % of disc to be taken up by centre
        vis.disc_ratio = 0.3;

        // initial sorting order
        vis.desc = true;

        vis.wrangleData();
    }

    wrangleData() {
        let vis = this;

        // filter by current_year
        let dataForYear = vis.raw_data.filter(d => d.Year === vis.current_year);

        // sliced data
        if (vis.desc === true) {
            vis.display_data = dataForYear.sort((a, b) => {
                return b.Popularity - a.Popularity
            }).slice(0, 5);
        }
        else {
            vis.display_data = dataForYear.filter(d => d.Popularity > 0).sort((a, b) => {
                return a.Popularity - b.Popularity
            }).slice(0, 5);
        }


        // let's log the display_data
        console.log(this.display_data);

        // update the vis
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // bind data
        let discs = vis.circlesGroup
            .selectAll(".disc")
            .data(vis.display_data, d => d.Genre);

        // enter outer discs, disc centers, and disc text
        let discsEnter = discs.enter().append("g").attr("class", "disc");
        discsEnter.append("circle").attr("class", "outer");
        discsEnter.append("circle").attr("class", "centre");
        discsEnter.append("text").attr("class", "disc_text");

        // merge
        let discsMerge = discsEnter.merge(discs);

        // dynamic x positions (since spacing has to depend on disc size and can't be static)
        let x_positions = [];
        let curr_x = 100;
        let padding = 20;

        discsMerge.each(function(d, i) {
            const radius = vis.pop_scale(d.Popularity);
            if (i === 0) {
                x_positions.push(curr_x);
            }
            else {
                const prev_radius = vis.pop_scale(vis.display_data[i-1].Popularity);
                curr_x += prev_radius + radius + padding;
                x_positions.push(curr_x);
            }
            }
        )

        // spacing
        discsMerge.attr("transform", (d, i) =>
            `translate(${x_positions[i]}, 250)`);

        // disc characteristics
        discsMerge.select(".outer").transition().duration(500).attr("r", d => {
            return vis.pop_scale(d.Popularity)}).attr("fill", "#141414");
        discsMerge.select(".centre").transition().duration(500).attr("r", d => {
            return vis.pop_scale(d.Popularity) * vis.disc_ratio})
        .attr("fill", "#d93636");
        discsMerge.select(".disc_text").attr("font-size", d => {
            const centerRadius = vis.pop_scale(d.Popularity) * vis.disc_ratio;
            return vis.genre_text_scale(centerRadius) + "px";
        }).attr("text-anchor", "middle").attr("alignment-baseline", "middle").text(d => d.Genre)
            .each(function(d) {
                // stop previous rotations
                d3.select(this).interrupt();
                rotateText(d3.select(this), d.Energy);
            });

        vis.generateRings(discsMerge);

        // exit pattern
        discs.exit().remove();

        // check for a pop up
        discsMerge.on("click", (e, d) => {
            vis.renderPopUp(d, e);
        })
        // remove pop ups when user clicks away
        discsMerge.on("mouseout", () => {
            d3.select("#tooltip")
                .transition()
                .duration(300)
                .style("opacity", 0);
        });

        // sorting functionality
        const explorerBox = document.getElementById("explorer");
        const artistBox = document.getElementById("artist");
        explorerBox.addEventListener("click", (e) => {
            vis.desc = false;
            vis.wrangleData();
        })
        artistBox.addEventListener("click", (e) => {
            vis.desc = true;
            vis.wrangleData();
        })
    }


// // generate the rings for each vinyl disc
    generateRings(discs) {
        let vis = this;
        discs.each(function (d) {

            // retrieve the disc rad

            const discRad = vis.pop_scale(d.Popularity);
            const centerRadius = discRad * vis.disc_ratio;

            const energy = d.Energy;

            // num rings is always 3 now
            const num_rings = 3;
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
                .transition().duration(500)
                .attr("r", r => {return centerRadius + (discRad - centerRadius) * (r / (ring_arr.length + 1))})
                .attr("fill", "none")
                .attr("stroke", "#818281")
                .attr("stroke-width", 1);

        })
    }

    renderPopUp(data, e) {
        console.log('pop_up')
        let pop_up_coords = [e.pageX, e.pageY]
        const tooltip = d3.select("#tooltip");
        tooltip.html(`<strong>Genre: ${data.Genre}<br>
        <strong>Popularity:</strong> ${data.Popularity} / 100<br>
            <strong> Energy:</strong> ${data.Energy} / 1.0`);
        // position and show the tooltip
        tooltip.style("left", (pop_up_coords[0] + 10) + "px")
            .style("top", (pop_up_coords[1] + 10) + "px")
            .transition()
            .duration(300)
            .style("opacity", 1);
    }
}

// create the year slider
function loadYearSlider(parent_element, vinylWallInstance)
{
    const min_year = 1950;
    const max_year = 2023;
    const initial_year = 1990;

    const container = d3.select("#" + parent_element);
    container.selectAll("*").remove();

    const header = container.append("div").attr("class", "slider-year-header");
    header.append("span").attr("class", "slider-year-label").text("Year");
    const yearDisplay = header.append("span").attr("class", "slider-year-value").attr("id", "slider-year-display").text(initial_year);

    const trackWrap = container.append("div").attr("class", "slider-track-wrap");
    trackWrap.append("span").attr("class", "slider-year-min").text(min_year);

    const inputWrap = trackWrap.append("div").attr("class", "slider-input-wrap");
    let year_slider = inputWrap
        .append("input")
        .attr("type", "range")
        .attr("min", min_year)
        .attr("max", max_year)
        .attr("value", initial_year)
        .attr("step", 1)
        .attr("aria-label", "Select year");

    trackWrap.append("span").attr("class", "slider-year-max").text(max_year);

    function updateYearDisplay(val) {
        yearDisplay.text(val);
        vinylWallInstance.current_year = val;
        vinylWallInstance.wrangleData();
    }

    year_slider.on("input", function () {
        const curr_year = +this.value;
        updateYearDisplay(curr_year);
    });

    updateYearDisplay(initial_year);
}
function rotateText(selection, energy) {
    const minSpeed = 5000;
    const maxSpeed = 1000;
    const duration = minSpeed - energy * (minSpeed - maxSpeed);

    function repeat() {
        selection
            .transition()
            .duration(duration)
            .ease(d3.easeLinear)
            .attrTween("transform", function() {
                return d3.interpolateString("rotate(0)", "rotate(360)");
            })
            .on("end", repeat);
    }

    repeat();
}

