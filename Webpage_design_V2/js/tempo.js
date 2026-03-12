const tempo_mount = document.getElementById('tempo-chart-host');
const tempo_width = Math.max(320, Math.min(960, ((tempo_mount && tempo_mount.clientWidth) ? tempo_mount.clientWidth : 760) - 8));
const tempo_height = 400;
const tempo_margin = { top: 10, right: 22, bottom: 50, left: 50 };
const tempo_chartWidth = tempo_width - tempo_margin.left - tempo_margin.right;
const tempo_chartHeight = tempo_height - tempo_margin.top - tempo_margin.bottom;

// TODO: Add song selection
const songs = [
    { track: "Desmond Blue", artist: "Paul Desmond" },
    { track: "Tennessee", artist: "Arrested Development" }
]

const colors = ["#31ff8d", "#4fb8ff", "#dbff63"]

// BPM value
const tempo_bpm = 80;
let tempoData = [];
let allEcg = {};
let songOptions = [];
let songLookup = new Map();
const pulseState = {};

const tempo_svg = d3.select(tempo_mount ? '#tempo-chart-host' : '#viz-formula')
    .append('svg')
    .attr('width', tempo_width)
    .attr('height', tempo_height);

const tempo_graph = tempo_svg.append('g')
    .attr('transform', `translate(${tempo_margin.left}, ${tempo_margin.top})`);

// Create scales
const tempo_xScale = d3.scaleLinear()
    .domain([0, 5])
    .range([0, tempo_chartWidth]);

const tempo_yScale = d3.scaleLinear()
    .domain([0, 200])
    .range([tempo_chartHeight, 0]);

// Grid background (theme muted tone)
const tempo_xGrid = d3.axisBottom(tempo_xScale)
    .ticks(24)
    .tickSize(-tempo_chartHeight)
    .tickFormat('');

const tempo_yGrid = d3.axisLeft(tempo_yScale)
    .ticks(14)
    .tickSize(-tempo_chartWidth)
    .tickFormat('');

tempo_graph.append('g')
    .attr('class', 'tempo-grid-x')
    .attr('transform', `translate(0,${tempo_chartHeight})`)
    .call(tempo_xGrid)
    .call(g => g.selectAll('line').attr('stroke', 'rgba(148, 163, 184, 0.32)'))
    .call(g => g.select('.domain').remove());

tempo_graph.append('g')
    .attr('class', 'tempo-grid-y')
    .call(tempo_yGrid)
    .call(g => g.selectAll('line').attr('stroke', 'rgba(148, 163, 184, 0.22)'))
    .call(g => g.select('.domain').remove());

let xAxis = d3.axisBottom().scale(tempo_xScale);
let yAxis = d3.axisLeft().scale(tempo_yScale).tickSize(0).tickFormat('');

// Add axes
const tempo_xAxis = tempo_graph.append('g')
    .attr('transform', `translate(0,${tempo_chartHeight})`)
    .call(xAxis);

// Add x-axis label
tempo_xAxis.append('text')
    .attr('class', 'tempo-axis-label')
    .attr('x', tempo_chartWidth / 2)
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .text('Time (seconds)');

const tempo_yAxis = tempo_graph.append('g')
    .call(yAxis);

// Create line
const tempo_line = d3.line()
    .x(d => tempo_xScale(d.time))
    .y(d => tempo_yScale(d.value))

function findSongIndex(value) {
    if (songLookup.has(value)) {
        return songLookup.get(value);
    }

    const query = String(value || '').toLowerCase().trim();
    if (!query) {
        return null;
    }

    const match = songOptions.find(opt => opt.label.toLowerCase().includes(query));
    return match ? match.index : null;
}

function ensureSongInfoPanel() {
    if (document.getElementById('tempo-song-info')) {
        return;
    }

    const controls = document.getElementById('tempo-controls');
    if (!controls || !controls.parentNode) {
        return;
    }

    const infoPanel = document.createElement('div');
    infoPanel.id = 'tempo-song-info';
    infoPanel.innerHTML = `
      <div class="tempo-song-card" id="tempo-song-card-0">
        <h4>Song 1</h4>
        <p class="empty">No song selected.</p>
      </div>
      <div class="tempo-song-card" id="tempo-song-card-1">
        <h4>Song 2</h4>
        <p class="empty">No song selected.</p>
      </div>
    `;

    controls.insertAdjacentElement('afterend', infoPanel);
}

function updateSongInfo(slot, row, color) {
    const card = document.getElementById(`tempo-song-card-${slot}`);
    if (!card) {
        return;
    }

    const popularityText = row.Popularity !== undefined && row.Popularity !== null && row.Popularity !== ''
        ? `${row.Popularity}`
        : 'N/A';

    card.innerHTML = `
      <h4><span class="dot" style="background:${color};"></span>Song ${slot + 1}</h4>
      <p><strong>Track:</strong> ${row.Track || 'N/A'}</p>
      <p><strong>Artist:</strong> ${row.Artist || 'N/A'}</p>
      <p><strong>Year:</strong> ${row.Year || 'N/A'}</p>
      <p><strong>Tempo:</strong> ${row.Tempo || 'N/A'} BPM</p>
      <p><strong>Popularity:</strong> ${popularityText}</p>
    `;
}

function clearSongInfo(slot) {
    const card = document.getElementById(`tempo-song-card-${slot}`);
    if (!card) {
        return;
    }
    card.innerHTML = `
      <h4>Song ${slot + 1}</h4>
      <p class="empty">No song selected.</p>
    `;
}

function stopPulse(i) {
    if (pulseState[i] && pulseState[i].rafId) {
        cancelAnimationFrame(pulseState[i].rafId);
    }
    if (pulseState[i] && pulseState[i].marker) {
        pulseState[i].marker.remove();
    }
    if (pulseState[i] && pulseState[i].halo) {
        pulseState[i].halo.remove();
    }
    if (pulseState[i] && pulseState[i].tail) {
        pulseState[i].tail.remove();
    }
    delete pulseState[i];
}

function startPulseAnimation(i, group, corePath, bpm, color) {
    stopPulse(i);

    const pathNode = corePath.node();
    if (!pathNode) {
        return;
    }

    const totalLength = pathNode.getTotalLength();
    const clampedBpm = Math.max(40, Math.min(220, bpm || 80));
    const beatDuration = 60000 / clampedBpm;
    // Slow the motion significantly while keeping BPM correlation:
    // one full sweep takes multiple beats.
    const beatsPerSweep = 8;
    const sweepDuration = beatDuration * beatsPerSweep;
    const halo = group.append('circle')
        .attr('class', 'ecg-pulse-halo')
        .attr('r', 12)
        .attr('fill', color)
        .attr('opacity', 0.26);

    const tail = group.append('path')
        .attr('class', 'ecg-pulse-tail')
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.62);

    const marker = group.append('circle')
        .attr('class', 'ecg-pulse-marker')
        .attr('r', 5.6)
        .attr('fill', color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.3)
        .attr('opacity', 0.98);
    const start = performance.now();

    function animate(now) {
        const elapsed = now - start;
        const phase = (elapsed % sweepDuration) / sweepDuration;
        const headLength = totalLength * phase;
        const point = pathNode.getPointAtLength(headLength);

        const tailPoints = [];
        const tailLength = 38;
        const step = 8;
        for (let dist = 0; dist <= tailLength; dist += step) {
            let sampleLength = headLength - dist;
            if (sampleLength < 0) {
                sampleLength += totalLength;
            }
            const sample = pathNode.getPointAtLength(sampleLength);
            tailPoints.push([sample.x, sample.y]);
        }

        halo.attr('cx', point.x).attr('cy', point.y);
        marker.attr('cx', point.x).attr('cy', point.y);
        tail.attr('d', d3.line()(tailPoints));

        pulseState[i].rafId = requestAnimationFrame(animate);
    }

    pulseState[i] = {
        halo: halo,
        tail: tail,
        marker: marker,
        rafId: requestAnimationFrame(animate)
    };
}

// Line update function
function updateChart(id, i) {
    if (!Object.keys(allEcg).length) {
        return;
    }

    let selectedText = d3.select(id).property('value');
    if (!selectedText) {
        tempo_graph.selectAll(`.ecg-group-${i}`).remove();
        stopPulse(i);
        clearSongInfo(i);
        return;
    }

    let idx = findSongIndex(selectedText);
    if (idx === null) {
        return;
    }

    tempo_graph.selectAll(`.ecg-group-${i}`).remove();
    stopPulse(i);

    let row = tempoData[idx];
    if (!row) {
        clearSongInfo(i);
        return;
    }

    let ecgData = allEcg[row.Tempo];
    if (!ecgData) {
        clearSongInfo(i);
        return;
    }

    const color = colors[i];
    updateSongInfo(i, row, color);
    const group = tempo_graph.append('g')
        .attr('class', `ecg-group-${i}`);

    group.append('path')
        .attr('class', 'ecg-line-glow')
        .datum(ecgData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 8)
        .attr('opacity', 0.16)
        .attr('d', tempo_line);

    const corePath = group.append('path')
        .attr('class', 'ecg-line-core')
        .datum(ecgData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('stroke-width', 2.4)
        .attr('d', tempo_line);

    const pathLength = corePath.node().getTotalLength();
    corePath
        .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
        .attr('stroke-dashoffset', pathLength)
        .transition()
        .duration(650)
        .attr('stroke-dashoffset', 0)
        .on('end', function () {
            startPulseAnimation(i, group, corePath, row.Tempo, color);
        });
}

function createSearchableDropdown(id, options) {
    const selectNode = d3.select(id).node();
    if (!selectNode) {
        return;
    }

    const labelNode = selectNode.parentNode;
    const inputId = selectNode.id;
    const wrapper = document.createElement('div');
    wrapper.className = 'tempo-combobox';

    const input = document.createElement('input');
    input.id = inputId;
    input.type = 'text';
    input.className = 'tempo-song-picker';
    input.placeholder = 'Select Song';
    input.setAttribute('autocomplete', 'off');

    const list = document.createElement('ul');
    list.className = 'tempo-song-list';

    function renderList(query) {
        const normalizedQuery = String(query || '').toLowerCase().trim();
        const filtered = !normalizedQuery
            ? options
            : options.filter(opt => opt.label.toLowerCase().includes(normalizedQuery));

        list.innerHTML = '';
        filtered.forEach((opt, idx) => {
            const li = document.createElement('li');
            li.textContent = opt.label;
            li.dataset.index = String(opt.index);
            if (idx === 0) {
                li.classList.add('active');
            }
            list.appendChild(li);
        });

        list.classList.toggle('open', filtered.length > 0);
    }

    list.addEventListener('mousedown', function (event) {
        const target = event.target.closest('li');
        if (!target) {
            return;
        }
        const selectedIdx = +target.dataset.index;
        const selected = options.find(opt => opt.index === selectedIdx);
        if (!selected) {
            return;
        }
        input.value = selected.label;
        list.classList.remove('open');
        updateChart(`#${inputId}`, inputId === 'song1' ? 0 : 1);
        event.preventDefault();
    });

    input.addEventListener('focus', function () {
        renderList(input.value);
    });

    input.addEventListener('input', function () {
        renderList(input.value);
    });

    input.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') {
            return;
        }
        const first = list.querySelector('li');
        if (!first) {
            return;
        }
        const selectedIdx = +first.dataset.index;
        const selected = options.find(opt => opt.index === selectedIdx);
        if (!selected) {
            return;
        }
        input.value = selected.label;
        list.classList.remove('open');
        updateChart(`#${inputId}`, inputId === 'song1' ? 0 : 1);
        event.preventDefault();
    });

    input.addEventListener('blur', function () {
        setTimeout(() => list.classList.remove('open'), 120);
    });

    const labelText = String(labelNode.textContent || inputId)
        .replace(':', '')
        .trim();
    const title = document.createElement('span');
    title.className = 'tempo-select-label';
    title.textContent = labelText;

    labelNode.textContent = '';
    wrapper.appendChild(input);
    wrapper.appendChild(list);
    labelNode.appendChild(title);
    labelNode.appendChild(wrapper);
}

function loadData() {
    Promise.all([
        d3.csv("../data/ClassicHit.csv"),
        d3.json('../data/ecg_clean.json')
    ]).then(([csv, ecg]) => {
        csv.forEach(function (d) {
            d.Year = +d.Year;
            d.Tempo = Math.round(+d.Tempo);
            d.Popularity = d.Popularity === undefined ? '' : +d.Popularity;
        });

        tempoData = csv;
        allEcg = ecg || {};
        ensureSongInfoPanel();

        songOptions = csv.map((d, i) => ({ label: `${d.Track} - ${d.Artist}`, index: i }));
        songLookup = new Map(songOptions.map(opt => [opt.label, opt.index]));

        ['#song1', '#song2'].forEach((id, i) => {
            createSearchableDropdown(id, songOptions);
            let sel = d3.select(id);
            sel.on('change', function () { updateChart(id, i); });
        });
    });
}

loadData();
