
const tickInterval = 10;
const keyWidth = 40;
const keyHeight = 200;
const axisHeight = 30;
const pianoPattern = [0, 1, 1, 0, 1, 1, 1];
const yearPositions = new Map();

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
    const uniqueGenres = genres.map(d => d.Genre).filter((value, index, self) => self.indexOf(value) === index);
    const colorScale = d3.scaleOrdinal()
        .domain(uniqueGenres)
        .range(d3.schemeTableau10); // TBD: Change color palette since not enough colors for genres
    const years = d3.range(d3.min(data, d => d.Year), d3.max(data, d => d.Year)+1);
    
    // d3 container set-up
    const legend = d3.select("#viz-decade").append("svg")
        .attr("width", uniqueGenres.length * 100)
        .attr("height", 30)
        .append("g")
        .attr("transform", "translate(10, 10)");
    const pianoContainer = d3.select("#viz-decade")
        .append("div")
        .attr("id", "piano-container");
    const pianoSvg = pianoContainer.append("svg")
        .attr("width", years.length * keyWidth)
        .attr("height", keyHeight + axisHeight);
    const axisGroup = pianoSvg.append("g")
    const pianoKeys = pianoSvg.append("g")
        .attr("transform", `translate(0, ${axisHeight})`);
    
    // Piano keys
    years.forEach((year, i) => {
        // colored keys
        yearGenre = genres.find(d => d.Year === year)
        if (yearGenre) {
            color = colorScale(yearGenre.Genre);
        } else { color = "white"; }   
        pianoKeys.append("rect")
            .attr("x", i * keyWidth)
            .attr("width", keyWidth)
            .attr("height", keyHeight)
            .attr("fill", color)
            .attr("stroke", "black");
        yearPositions.set(year, i * keyWidth + (keyWidth / 2));
        // Black keys (decorative)
        if (pianoPattern[i % pianoPattern.length] === 1) {
            pianoKeys.append("rect")
                .attr("x", i * keyWidth - ((keyWidth * 0.7) / 2))
                .attr("width", keyWidth * 0.7)
                .attr("height", keyHeight * 0.7)
                .attr("fill", "black")
                .attr("stroke", "black");
        } 
    });

    // Axis
    years.forEach((year) => {
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
        .attr("transform", (d, i) => `translate(${i * 90}, 0)`);
    legendItem.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", d => colorScale(d));
    legendItem.append("text")
        .attr("x", 20)
        .attr("y", 12.5)
        .text(d => d)
        .attr("fill", "white");
});
