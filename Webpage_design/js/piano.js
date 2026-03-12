
const tickInterval = 10;
const keyWidth = 40;
const keyHeight = 200;
const axisHeight = 30;
const pianoPattern = [0, 1, 1, 0, 1, 1, 1];
const yearPositions = new Map();

let pianoMainGroup, pianoKeys, yearsList;

d3.csv("../data/energy_and_pop_data.csv", row => {
    row.Year = +row.Year;
    row["Average Popularity"] = +row["Average Popularity"];
    return row;
}).then(data => {

    // some genre and year data properties
    const genres = Object.values(data.reduce((acc, current) => {
        if (!acc[current.Year] || current["Average Popularity"] > acc[current.Year]["Average Popularity"]) {
            acc[current.Year] = current;
        } return acc;
    }, {})).sort((a, b) => a.Year - b.Year);

    const uniqueGenres = [...new Set(genres.map(d => d.Genre))];
    const colorScale = d3.scaleOrdinal()
        .domain(uniqueGenres)
        .range(d3.schemeTableau10);

    const minYear = d3.min(data, d => d.Year);
    const maxYear = d3.max(data, d => d.Year);
    yearsList = d3.range(minYear, maxYear + 1);
    
    // d3 container set-up
    const legend = d3.select("#viz-piano").append("svg")
        .attr("width", "100%")
        .attr("height", 30)
        .append("g")
        .attr("transform", "translate(10, 10)");
    const pianoContainer = d3.select("#viz-piano")
        .append("div")
        .style("width", "100%")
        .attr("id", "piano-container");
    const pianoSvg = pianoContainer.append("svg")
        .attr("width", yearsList.length * keyWidth)
        .attr("height", keyHeight + axisHeight);
    
    pianoMainGroup = pianoSvg.append("g").attr("id", "piano-moving-group");
    
    const axisGroup = pianoMainGroup.append("g");
    pianoKeys = pianoMainGroup.append("g")
        .attr("id","piano-keys")
        .attr("transform", `translate(0, ${axisHeight})`);
    
    // 4. Drawing Piano Keys
    yearsList.forEach((year, i) => {
        const yearGenre = genres.find(d => d.Year === year);
        const color = yearGenre ? colorScale(yearGenre.Genre) : "white";
           
        pianoKeys.append("rect")
            .attr("x", i * keyWidth)
            .attr("width", keyWidth)
            .attr("height", keyHeight)
            .attr("fill", color)
            .attr("stroke", "black")
            .attr("class", `key-${year}`);

        yearPositions.set(year, i * keyWidth + (keyWidth / 2));

        if (pianoPattern[i % pianoPattern.length] === 1) {
            pianoKeys.append("rect")
                .attr("x", i * keyWidth - ((keyWidth * 0.7) / 2))
                .attr("width", keyWidth * 0.7)
                .attr("height", keyHeight * 0.7)
                .attr("fill", "black")
                .attr("pointer-events", "none");
        } 
    });

    // Axis
    yearsList.forEach((year) => {
        if (year % tickInterval === 0 && yearPositions.has(year)) {
            axisGroup.append("text")
                .attr("x",  yearPositions.get(year))
                .attr("y", 20) 
                .attr("text-anchor", "middle")
                .attr("fill", "white")
                .text(year);
            axisGroup.append("line")
                .attr("x1", yearPositions.get(year))
                .attr("x2", yearPositions.get(year))
                .attr("y1", 25)
                .attr("y2", axisHeight)
                .attr("fill", "white")
        }
    });
    
    // legend
    const legendItem = legend.selectAll(".legend-item")
        .data(uniqueGenres)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 86}, 0)`);
    legendItem.append("rect")
        .attr("width", 10)
        .attr("height", 15)
        .attr("fill", d => colorScale(d));
    legendItem.append("text")
        .attr("x", 20)
        .attr("y", 12.5)
        .text(d => d)
        .attr("fill", "white");
    let slider = d3.select("#slider_container input");
    slider.on("input.piano", function() {
        updatePianoPosition(+this.value);
    });
    updatePianoPosition(+slider.property("value"));
});

function updatePianoPosition(year) {
    if (!yearPositions.has(year)) return;
    const targetX = yearPositions.get(year);
    const containerWidth = document.getElementById("piano-container").clientWidth || 800;
    const translateX = (containerWidth / 2) - targetX;

    pianoMainGroup.transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .attr("transform", `translate(${translateX}, 0)`);

    pianoKeys.selectAll("rect")
        .attr("stroke-width", 1);
    pianoKeys.select(`.key-${year}`)
        .attr("stroke-width", 7);
}