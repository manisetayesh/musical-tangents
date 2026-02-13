const tempo_width = 1000;
const tempo_height = 400;
const tempo_chartWidth = tempo_width;
const tempo_chartHeight = tempo_height - 60;

// TODO: Add song selection
const songs = [
    { track: "Desmond Blue", artist: "Paul Desmond" },
    { track: "Tennessee", artist: "Arrested Development" }
]

const colors = ["red", "blue", "green"]

// BPM value
const tempo_bpm = 80;

const tempo_svg = d3.select('body')
    .append('svg')
    .attr('width', tempo_width)
    .attr('height', tempo_height);

const tempo_graph = tempo_svg.append('g')
    .attr('transform', `translate(50, 10)`);

//Title
tempo_svg.append('text')
    .attr('x', tempo_width / 2)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .text('Song Tempo Comparison');

// Create scales
const tempo_xScale = d3.scaleLinear()
    .domain([0, 5])
    .range([0, tempo_chartWidth]);

const tempo_yScale = d3.scaleLinear()
    .domain([0, 200])
    .range([tempo_chartHeight, 0]);

let xAxis = d3.axisBottom().scale(tempo_xScale);
let yAxis = d3.axisLeft().scale(tempo_yScale).tickSize(0).tickFormat('');

// Add axes
const tempo_xAxis = tempo_graph.append('g')
    .attr('transform', `translate(0,${tempo_chartHeight})`)
    .call(xAxis);

// Add x-axis label
tempo_xAxis.append('text')
    .attr('x', tempo_chartWidth / 2)
    .attr('y', 40)
    .attr('fill', 'black')
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .text('Time (seconds)');

const tempo_yAxis = tempo_graph.append('g')
    .call(yAxis);

// Create line
const tempo_line = d3.line()
    .x(d => tempo_xScale(d.time))
    .y(d => tempo_yScale(d.value))

// Line update function
function updateChart(id, i) {
    tempo_graph.selectAll(`.ecg-line-${i}`).remove();
    
    let idx = d3.select(id).property('value');

    let row = data[idx];
    let ecgData = allEcg[row.Tempo];

    tempo_graph.append('path')
        .attr('class', `ecg-line ecg-line-${i}`)
        .datum(ecgData)
        .transition()
        .duration(600)
        .attr('fill', 'none')
        .attr('stroke', colors[i])
        .attr('stroke-width', 2)
        .attr('d', tempo_line);
}

function loadData() {
  d3.csv("data/ClassicHit.csv").then((csv) => {
    csv.forEach(function (d) {
      d.Year = +d.Year;
      d.Tempo = Math.round(+d.Tempo);
    });

    data = csv;

    let options = csv.map((d, i) => ({ label: `${d.Track} - ${d.Artist}`, index: i }));

    ['#song1', '#song2'].forEach((id, i) => {
    let sel = d3.select(id);
    sel.append('option').attr('value', '').text('Select Song');
    options.forEach(opt => {
        sel.append('option')
            .attr('value', opt.index)
            .text(opt.label);
    });
    sel.on('change', function() { updateChart(id, i); });;
});

d3.json('data/ecg_clean.json').then((ecg) => {
        allEcg = ecg;
    });

  });
}

loadData();
