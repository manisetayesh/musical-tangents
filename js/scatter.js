

function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b | 0) + d | 0;
      d = d + 1 | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}
let seed = 42
let manual = true

const [xMin, xMax] = [0, 100];
const [yMin, yMax] = [0, 100]
const margin = {top: 10, right: 10, bottom: 60, left: 100};
const scatterwidth = 1000 - margin.left - margin.right;
const scatterheight = 400 - margin.top - margin.bottom;
const scattersvg = d3.select("#viz-regression").append("svg")
    .attr("width", scatterwidth + margin.left + margin.right)
    .attr("height", scatterheight + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
const x = d3.scaleLinear()
    .domain([xMin, xMax+2])
    .range([0, scatterwidth]);
const y = d3.scaleLinear()
    .domain([yMin-5, yMax])
    .range([scatterheight, 0]);
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

let allPredictions = []
const featureKeys = [
    "Danceability", "Energy", "Loudness", "Speechiness", 
    "Acousticness", "Instrumentalness", "Liveness", "Valence"
];
d3.json('data/predictions.json').then(res => {
    allPredictions = res.data
    scattersvg.append("line").attr("id", "lobf");
    d3.selectAll(".weight-input").on("input", wrangleData);
    wrangleData();
});

d3.select("#reshuffleBtn").on("click", () => {
    seed = seed + 1
    wrangleData();
});

d3.select("#toggleModeBtn").on("click", function() {
    manual = !manual;
    const btn = d3.select(this);
    btn.text(manual ? "Our Regressor Prediction" : "Back to your formula");
    btn.classed("active", !manual);

    d3.select("#scatter-vis-header").text(!manual ? "Given a song's attributes, can we tell if it will be a hit?" : "Given a song's attributes, can you tell if it will be a hit?")
    d3.selectAll(".weight-input").style("opacity", manual ? 1 : 0.3);
    d3.select(".equation-list").style("pointer-events", manual ? "all" : "none");
    wrangleData();
});


function wrangleData() {
    const weights = {};
    const myRand = sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, seed); 
    d3.selectAll(".weight-input").each(function() {
        const input = d3.select(this);
        weights[input.attr("data-var")] = +this.value;
    });
    let sampled = [...allPredictions];
    for (let i = sampled.length - 1; i > 0; i--) {
        const j = Math.floor(myRand() * (i + 1));
        [sampled[i], sampled[j]] = [sampled[j], sampled[i]];
    }
    currentPredictions = sampled.slice(0, 500).map(d => {
        if (manual) {
            let manualScore = 0;
            featureKeys.forEach(key => {
                manualScore += (weights[key] * d[key]);
            });
            isClamped = manualScore < xMin || manualScore > xMax;
            finalScore = Math.max(xMin, Math.min(xMax, manualScore));
            d.displayScore = manualScore;
        } else {
            finalScore = d.predicted;
            d.displayScore = d.predicted;
            isClamped = false;
        }
        
        return { 
            ...d, 
            currentX: finalScore, 
            isClamped: isClamped 
        };
    })
    .filter(d => 
        d.currentX >= xMin && d.currentX <= xMax &&
        d.Popularity >= yMin && d.Popularity <= yMax
    )
    
    updateVis();
}

function handleMouseOver(event, d) {
    d3.select(this)
        .attr("r", 8)
        .style("fill", "Blue")
        .style("opacity", 1);
    d3.select("#detail-name").text(`Song: ${d.Track}`);
    d3.select("#detail-artist").text(`Artist: ${d.Artist}`);
    d3.select("#detail-year").text(`Year: ${d.Year}`);

    const predText = d.isClamped 
        ? `${d.currentX.toFixed(2)} (Clamped, actual: ${d.displayScore.toFixed(2)} ⚠️)` 
        : d.currentX.toFixed(2);
    d3.select("#detail-pred").text(`Predicted Popularity: ${predText}`);
    d3.select("#detail-actual").text(`Actual Popularity: ${d.Popularity}`);
}

function handleMouseLeave() {
    d3.select(this)
        .transition().duration(100)
        .attr("r", 3)
        .style("fill", "red")
        .style("opacity", 0.5);
    d3.select("#detail-name").text("Song: --");
    d3.select("#detail-artist").text("Artist: --");
    d3.select("#detail-year").text("Year: --");
    d3.select("#detail-pred").text("Predicted Popularity: --");
    d3.select("#detail-actual").text("Actual Popularity: --");
}

function updateVis() {
    const circles = scattersvg.selectAll("circle")
        .data(currentPredictions, d => d.Track + d.Artist);
    circles.join(
        enter => enter.append("circle")
            .attr("r", 3)
            .style("fill", "red")
            .style("opacity", 0.5)
            .call(enter => enter.transition().duration(500)
                .attr("cx", d => x(d.currentX))
                .attr("cy", d => y(d.Popularity))),
        update => update.transition().duration(500)
            .attr("cx", d => x(d.currentX))
            .attr("cy", d => y(d.Popularity)),
        exit => exit.remove()
    ).on("mouseover", handleMouseOver)
    .on("mouseleave", handleMouseLeave)
    .transition().duration(500)
    .attr("cx", d => x(d.currentX))
    .attr("cy", d => y(d.Popularity))
    .style("fill", d => d.isClamped ? "#ffcc00" : "red")
    .style("stroke", d => d.isClamped ? "#fff" : "none")
    .style("stroke-width", d => d.isClamped ? 1.5 : 0)
    .style("opacity", d => d.isClamped ? 0.9 : 0.5)
    ;
    

    const n = currentPredictions.length;
    const sumX = d3.sum(currentPredictions, d => d.currentX);
    const sumY = d3.sum(currentPredictions, d => d.Popularity);
    const sumXY = d3.sum(currentPredictions, d => d.currentX * d.Popularity);
    const sumXX = d3.sum(currentPredictions, d => d.currentX * d.currentX);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    scattersvg.select("#lobf")
        .transition().duration(500)
        .attr("x1", x(xMin))
        .attr("y1", y(slope * xMin + intercept))
        .attr("x2", x(xMax))
        .attr("y2", y(slope * xMax + intercept));
    
}

