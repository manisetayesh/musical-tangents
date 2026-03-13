const tickInterval = 10;
const keyWidth = 40;
const keyHeight = 200;
const axisHeight = 30;
const pianoPattern = [0, 1, 1, 0, 1, 1, 1];
const yearPositions = new Map();

let pianoData = [];
// Placeholder variables for elements defined inside the D3 chain
let pianoMainGroup, pianoKeys, yearsList;

function renderPiano() {
    // 2. Data Processing
    let genres = Object.values(pianoData.reduce((acc, current) => {
        let year = current.Year;
        let currentPop = current["Average Popularity"];
        let shouldReplace = !acc[year] || (
            pianoDesc 
                ? currentPop < acc[year]["Average Popularity"]
                : currentPop > acc[year]["Average Popularity"]
        );
        if (shouldReplace) {
            acc[year] = current;
        }
        return acc;
    }, {})).sort((a, b) => a.Year - b.Year);
    console.log(genres)
    const uniqueGenres = [...new Set(genres.map(d => d.Genre))];
    const colorScale = d3.scaleOrdinal()
        .domain(uniqueGenres)
        .range(d3.schemeTableau10);

    const minYear = d3.min(pianoData, d => d.Year);
    const maxYear = d3.max(pianoData, d => d.Year);
    yearsList = d3.range(minYear, maxYear + 1);
    
    // 3. Container Setup
    const legend = d3.select("body").append("svg")
        .attr("width", uniqueGenres.length * 100)
        .attr("height", 30)
        .append("g")
        .attr("transform", "translate(10, 10)");

    const pianoContainer = d3.select("body")
        .append("div")
        .attr("id", "piano-container")
        .style("width", "100%") // Ensure container has a width for centering logic
        .style("overflow", "hidden");

    const pianoSvg = pianoContainer.append("svg")
        .attr("width", yearsList.length * keyWidth)
        .attr("height", keyHeight + axisHeight);

    // Create the moving group first so everything inside it moves together
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
                .attr("pointer-events", "none"); // Don't block clicks to colored keys
        } 
    });

    // 5. Drawing Axis
    yearsList.forEach((year) => {
        if (year % tickInterval === 0 && yearPositions.has(year)) {
            axisGroup.append("text")
                .attr("x",  yearPositions.get(year))
                .attr("y", 20) 
                .attr("text-anchor", "middle")
                .text(year);
            axisGroup.append("line")
                .attr("x1", yearPositions.get(year))
                .attr("x2", yearPositions.get(year))
                .attr("y1", 25)
                .attr("y2", axisHeight)
                .attr("stroke", "black");
        }
    });
    // legend
    const legendItem = legend.selectAll(".legend-item")
        .data(uniqueGenres)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 90}, 0)`);
    legendItem.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => colorScale(d));
    legendItem.append("text")
        .attr("x", 20)
        .attr("y", 12.5)
        .text(d => d);
    // 6. Slider Logic
    let slider = d3.select("#slider_container input");
    slider.on("input.piano", function() {
        updatePianoPosition(+this.value);
    });

    // Initial position call
    updatePianoPosition(+slider.property("value"));
};



// 7. Update Function (Defined in scope where it can access globals)
function updatePianoPosition(year) {
    if (!yearPositions.has(year)) return;

    const targetX = yearPositions.get(year);
    // Use the container's visual width to calculate the center
    const containerWidth = document.getElementById("piano-container").clientWidth || 800;
    const translateX = (containerWidth / 2) - targetX;

    pianoMainGroup.transition()
        .duration(300)
        .ease(d3.easeCubicOut)
        .attr("transform", `translate(${translateX}, 0)`);

    // Visual feedback: Highlight the selected year's key
    pianoKeys.selectAll("rect")
        .attr("stroke-width", 1);
    
    pianoKeys.select(`.key-${year}`)
        .attr("stroke-width", 3);
}
explorerBox.addEventListener("click", (e) => {
    pianoDesc = false;
    console.log("clicked")
    renderPiano();
})
artistBox.addEventListener("click", (e) => {
    pianoDesc = true;
    console.log("clicked")

    renderPiano();
})

d3.csv("data/energy_and_pop_data.csv", row => {
    row.Year = +row.Year;
    row["Average Popularity"] = +row["Average Popularity"];
    return row;
}).then(data => {
    pianoData = data;
    renderPiano();
});