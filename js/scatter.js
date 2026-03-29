d3.json('data/predictions.json').then(res => {
    const allPredictions = res.data;
    const [xMin, xMax] = [10, 60];
    const [yMin, yMax] = [0, 100]
    const predictions = allPredictions
        .sort(() => 0.5 - Math.random())
        .slice(0, 500)
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
        .domain([yMin-5, yMax])
        .range([scatterheight, 0]);
    scattersvg.selectAll("circle")
        .data(predictions)
        .enter().append("circle")
        .attr("cx", d => x(d.predicted))
        .attr("cy", d => y(d.Popularity))
        .attr("r", 3)
        .style("fill", "red")
        .style("opacity", 0.5)
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("r", 8)
                .style("fill", "Blue")
                .style("opacity", 1);
            d3.select("#detail-name").text(`Song: ${d.Track}`);
            d3.select("#detail-artist").text(`Artist: ${d.Artist}`);
            d3.select("#detail-year").text(`Year: ${d.Year}`);
            d3.select("#detail-pred").text(`Predicted: ${d.predicted.toFixed(2)}`);
            d3.select("#detail-actual").text(`Actual: ${d.Popularity}`);
        })
        .on("mouseleave", function() {
            d3.select(this)
                .transition().duration(100)
                .attr("r", 3)
                .style("fill", "red")
                .style("opacity", 0.5);
            d3.select("#detail-name").text("Song: --");
            d3.select("#detail-artist").text("Artist: --");
            d3.select("#detail-year").text("Year: --");
            d3.select("#detail-pred").text("Predicted: --");
            d3.select("#detail-actual").text("Actual: --");
        });
    
    scattersvg.append("g")
        .attr("transform", `translate(0, ${scatterheight})`)
        .call(d3.axisBottom(x))
        .attr("class", "scatter-axis");
    scattersvg.append("g")
        .call(d3.axisLeft(y))
        .attr("class", "scatter-axis");
    scattersvg.append("text")
        .attr("class", "scatter-axis-title")
        .attr("x", scatterwidth / 2 + margin.left)
        .attr("y", scatterheight + margin.bottom - margin.top)
        .text("Predicted Popularity");

    scattersvg.append("text")
        .attr("class", "scatter-axis-title")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 40)
        .attr("x", -scatterheight / 3)
        .text("Actual Popularity");
    
    const n = predictions.length;
    const sumX = d3.sum(predictions, d => d.predicted);
    const sumY = d3.sum(predictions, d => d.Popularity);
    const sumXY = d3.sum(predictions, d => d.predicted * d.Popularity);
    const sumXX = d3.sum(predictions, d => d.predicted * d.predicted);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    scattersvg.append("line")
        .attr("id", "lobf")
        .attr("x1", x(xMin))
        .attr("y1", y(slope * xMin + intercept))
        .attr("x2", x(xMax))
        .attr("y2", y(slope * xMax + intercept))
});
