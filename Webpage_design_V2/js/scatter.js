d3.json('data/predictions.json').then(res => {
    const allPredictions = res.data;
    const [xMin, xMax] = [10, 60];
    const [yMin, yMax] = [0, 100]
    const predictions = allPredictions
        .sort(() => 0.5 - Math.random())
        .slice(0, 1000)
        .filter(d => 
            d.predicted >= xMin && d.predicted <= xMax &&
            d.Popularity >= yMin && d.Popularity <= yMax
        );
    const margin = {top: 10, right: 10, bottom: 60, left: 100};
    const scatterwidth = 1000 - margin.left - margin.right;
    const scatterheight = 400 - margin.top - margin.bottom;
    const scattersvg = d3.select("#viz-regression").append("svg")
        .attr("width", scatterwidth + margin.left + margin.right)
        .attr("height", scatterheight + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    
    
    const x = d3.scaleLinear()
        .domain([xMin, xMax])
        .range([0, scatterwidth]);

    const y = d3.scaleLinear()
        .domain([yMin, yMax])
        .range([scatterheight, 0]);
    scattersvg.selectAll("circle")
        .data(predictions)
        .enter().append("circle")
        .attr("cx", d => x(d.predicted))
        .attr("cy", d => y(d.Popularity))
        .attr("r", 3)
        .style("fill", "red")
        .style("opacity", 0.5);

    scattersvg.append("g")
        .attr("transform", `translate(0, ${scatterheight})`)
        .call(d3.axisBottom(x))
        .call(g => {
            g.selectAll("text").attr("fill", "white");
            g.selectAll("line").attr("stroke", "white");
            g.select(".domain").attr("stroke", "white");
        });
    scattersvg.append("g")
        .call(d3.axisLeft(y))
        .call(g => {
            g.selectAll("text").attr("fill", "white");
            g.selectAll("line").attr("stroke", "white");
            g.select(".domain").attr("stroke", "white");
        });
    scattersvg.append("text")
    .attr("text-anchor", "end")
    .attr("x", scatterwidth / 2 + margin.left)
    .attr("y", scatterheight + margin.bottom - margin.top)
    .attr("fill", "white")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .text("Predicted Popularity");

    scattersvg.append("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 40)
        .attr("x", -scatterheight / 3)
        .attr("fill", "white")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .text("Actual Popularity");
    
    
    const reg = calculateRegression(predictions);
    scattersvg.append("line")
    .attr("x1", x(xMin))
    .attr("y1", y(reg.slope * xMin + reg.intercept))
    .attr("x2", x(xMax))
    .attr("y2", y(reg.slope * xMax + reg.intercept))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5")
    .style("opacity", 0.5);
});

function calculateRegression(data) {
    const n = data.length;
    const sumX = d3.sum(data, d => d.predicted);
    const sumY = d3.sum(data, d => d.Popularity);
    const sumXY = d3.sum(data, d => d.predicted * d.Popularity);
    const sumXX = d3.sum(data, d => d.predicted * d.predicted);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
}
