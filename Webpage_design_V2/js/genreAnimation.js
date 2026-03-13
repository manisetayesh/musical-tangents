(function () {
  "use strict";

  const REQUIRED_IDS = [
    "btn-play",
    "btn-reset",
    "btn-genres",
    "year-slider",
    "year-display",
    "genre-selector",
    "genre-chips",
    "genre-count",
    "btn-apply",
    "legend",
    "chart-container",
    "chart"
  ];

  const missingIds = REQUIRED_IDS.filter((id) => !document.getElementById(id));
  if (missingIds.length > 0) {
    console.warn("[genreAnimation] Missing required elements:", missingIds.join(", "));
    return;
  }

  const LABEL_COLORS = ["#DD614A", "#247BA0", "#ADF5FF", "#FFD6BA", "#a488d1ff"];
  const COLORS = LABEL_COLORS;
  const MAX_GENRES = 5;
  const MIN_GENRES = 2;
  const DEFAULT_GENRES = ["Pop", "Rock", "R&B", "Rap", "Country"];
  const MIN_YEAR = 1950;
  const DATA_PATH = "../data/ClassicHit.csv";

  const W = 960;
  const H = 580;
  const ML = 82;
  const MR = 115;
  const MT = 65;
  const MB = 50;
  const chartH = H - MT - MB;

  const trebleTop = MT + chartH * 0.04;
  const trebleBot = MT + chartH * 0.42;
  const tGap = (trebleBot - trebleTop) / 4;
  const trebleLineYs = d3.range(5).map((i) => trebleTop + i * tGap);

  const bassTop = MT + chartH * 0.58;
  const bassBot = MT + chartH * 0.96;
  const bGap = (bassBot - bassTop) / 4;
  const bassLineYs = d3.range(5).map((i) => bassTop + i * bGap);

  const middleCy = (trebleBot + bassTop) / 2;
  const rankYPositions = [
    trebleLineYs[1],
    trebleLineYs[3],
    middleCy,
    bassLineYs[1],
    bassLineYs[3]
  ];

  const NOTE_DRAWERS = [
    drawQuarterNote,
    drawEighthNote,
    drawBeamedEighths,
    drawHalfNote,
    drawSixteenthNote
  ];
  const NOTE_NAMES = ["Quarter", "Eighth", "Beamed", "Half", "16th"];

  let allGenres = [];
  let years = [];
  let rankings = {};
  let selectedGenres = [];
  let pendingGenres = [];
  let currentYearIdx = 0;
  let playing = false;
  let speed = 600;
  let timerHandle = null;
  let animStartTime = 0;
  let rafHandle = null;
  let xScale = null;

  const svg = d3.select("#chart")
    .attr("width", W)
    .attr("height", H)
    .attr("viewBox", "0 0 " + W + " " + H)
    .attr("preserveAspectRatio", "xMidYMid meet");
  const gStaff = svg.append("g").attr("class", "staff-layer");
  const gTrails = svg.append("g").attr("class", "trails-layer");
  const gPlayhead = svg.append("g").attr("class", "playhead-layer");
  const gNotes = svg.append("g").attr("class", "notes-layer");
  const gLabels = svg.append("g").attr("class", "labels-layer");

  function loadCsv(path) {
    return fetch(path)
      .then((response) => {
        if (!response.ok) {
          throw new Error("HTTP " + response.status + " for " + path);
        }
        return response.text();
      })
      .then((text) => {
        const rows = d3.csvParse(text);
        if (!rows || rows.length === 0) {
          throw new Error("CSV loaded but empty: " + path);
        }
        if (!("Genre" in rows[0]) || !("Year" in rows[0]) || !("Popularity" in rows[0])) {
          throw new Error("CSV missing required columns (Genre, Year, Popularity): " + path);
        }
        console.log("[genreAnimation] Loaded data from:", path);
        return rows;
      });
  }

  function processData(raw) {
    const genreYearTopPopularity = {};
    const genreSet = new Set();
    const yearSet = new Set();

    raw.forEach((row) => {
      const genre = row.Genre;
      const year = +row.Year;
      const popularity = +row.Popularity;
      if (!genre || isNaN(year) || year < MIN_YEAR || isNaN(popularity)) {
        return;
      }

      genreSet.add(genre);
      yearSet.add(year);
      if (!genreYearTopPopularity[genre]) {
        genreYearTopPopularity[genre] = {};
      }
      const previousTop = genreYearTopPopularity[genre][year];
      genreYearTopPopularity[genre][year] = (previousTop === undefined)
        ? popularity
        : Math.max(previousTop, popularity);
    });

    allGenres = Array.from(genreSet).sort((a, b) => a.localeCompare(b));
    years = Array.from(yearSet).sort((a, b) => a - b);

    if (allGenres.length === 0 || years.length === 0) {
      throw new Error("No valid genre/year data after processing");
    }

    years.forEach((year) => {
      const topPopularity = allGenres.map((genre) => ({
        genre: genre,
        popularity: (genreYearTopPopularity[genre] && genreYearTopPopularity[genre][year]) || 0
      }));
      topPopularity.sort((a, b) => b.popularity - a.popularity || a.genre.localeCompare(b.genre));

      rankings[year] = {};
      topPopularity.forEach((entry, i) => {
        rankings[year][entry.genre] = i + 1;
      });
    });

    selectedGenres = DEFAULT_GENRES.filter((genre) => allGenres.includes(genre)).slice(0, MAX_GENRES);
    for (let i = 0; i < allGenres.length && selectedGenres.length < MAX_GENRES; i += 1) {
      if (!selectedGenres.includes(allGenres[i])) {
        selectedGenres.push(allGenres[i]);
      }
    }

    if (selectedGenres.length < Math.min(MIN_GENRES, allGenres.length)) {
      throw new Error("Not enough genres available to initialize the chart");
    }
    pendingGenres = [...selectedGenres];

    xScale = d3.scaleLinear()
      .domain([years[0], years[years.length - 1]])
      .range([ML + 68, W - MR - 5]);

    const yearSlider = document.getElementById("year-slider");
    yearSlider.min = 0;
    yearSlider.max = years.length - 1;
    yearSlider.value = 0;
  }

  function getRelativeRanks(year, genres) {
    const absolute = rankings[year] || {};
    const sorted = [...genres].sort((a, b) => {
      const rankA = absolute[a] || Number.MAX_SAFE_INTEGER;
      const rankB = absolute[b] || Number.MAX_SAFE_INTEGER;
      return rankA - rankB || a.localeCompare(b);
    });

    const relative = {};
    sorted.forEach((genre, i) => {
      relative[genre] = i;
    });
    return relative;
  }

  function drawStaff() {
    gStaff.selectAll("*").remove();

    trebleLineYs.forEach((y) => {
      gStaff.append("line")
        .attr("class", "staff-line")
        .attr("x1", ML - 6)
        .attr("x2", W - MR + 6)
        .attr("y1", y)
        .attr("y2", y);
    });

    bassLineYs.forEach((y) => {
      gStaff.append("line")
        .attr("class", "staff-line")
        .attr("x1", ML - 6)
        .attr("x2", W - MR + 6)
        .attr("y1", y)
        .attr("y2", y);
    });

    gStaff.append("line")
      .attr("x1", ML + 24)
      .attr("x2", W - MR)
      .attr("y1", middleCy)
      .attr("y2", middleCy)
      .attr("stroke", "#000000")
      .attr("stroke-width", 0.6)
      .attr("opacity", 0.26)
      .attr("stroke-dasharray", "5,10");

    gStaff.append("line")
      .attr("class", "barline")
      .attr("x1", ML - 6)
      .attr("x2", ML - 6)
      .attr("y1", trebleLineYs[0])
      .attr("y2", bassLineYs[4])
      .attr("stroke-width", 2);

    gStaff.append("line")
      .attr("class", "barline")
      .attr("x1", W - MR + 6)
      .attr("x2", W - MR + 6)
      .attr("y1", trebleLineYs[0])
      .attr("y2", bassLineYs[4])
      .attr("stroke-width", 1);

    gStaff.append("line")
      .attr("class", "barline")
      .attr("x1", W - MR + 10)
      .attr("x2", W - MR + 10)
      .attr("y1", trebleLineYs[0])
      .attr("y2", bassLineYs[4])
      .attr("stroke-width", 2.8);

    const braceX = ML - 14;
    const braceTop = trebleLineYs[0];
    const braceBottom = bassLineYs[4];
    const braceMid = (braceTop + braceBottom) / 2;
    gStaff.append("path")
      .attr("d", "M" + braceX + "," + braceTop +
        " C" + (braceX - 16) + "," + (braceTop + 40) +
        " " + (braceX - 18) + "," + (braceMid - 35) +
        " " + (braceX - 4) + "," + braceMid +
        " C" + (braceX - 18) + "," + (braceMid + 35) +
        " " + (braceX - 16) + "," + (braceBottom - 40) +
        " " + braceX + "," + braceBottom)
      .attr("fill", "none")
      .attr("stroke", "#000000")
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.45)
      .attr("stroke-linecap", "round");

    const trebleCenter = (trebleLineYs[0] + trebleLineYs[4]) / 2;
    const trebleClefHeight = 190;
    const trebleClefWidth = 74;
    drawTrebleClef(
      gStaff,
      ML + 2,
      trebleCenter - (trebleClefHeight / 2),
      trebleClefWidth,
      trebleClefHeight
    );

    const bassCenter = (bassLineYs[0] + bassLineYs[4]) / 2;
    const bassClefHeight = 90;
    const bassClefWidth = 64;
    drawBassClef(
      gStaff,
      ML + 10,
      bassCenter - (bassClefHeight / 2),
      bassClefWidth,
      bassClefHeight
    );

    years.filter((year) => year % 10 === 0).forEach((year) => {
      const x = xScale(year);
      gStaff.append("line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", bassLineYs[4] + 5)
        .attr("y2", bassLineYs[4] + 13)
        .attr("stroke", "#000000")
        .attr("stroke-width", 0.7)
        .attr("opacity", 0.5);

      gStaff.append("text")
        .attr("class", "year-tick-label")
        .attr("x", x)
        .attr("y", bassLineYs[4] + 26)
        .attr("text-anchor", "middle")
        .text(year);
    });
  }

  function drawTrebleClef(parent, x, y, width, height) {
    parent.append("image")
      .attr("href", "js/trebleClef.svg")
      .attr("x", x)
      .attr("y", y)
      .attr("width", width)
      .attr("height", height)
      .attr("opacity", 0.95)
      .attr("preserveAspectRatio", "xMidYMid meet");
  }

  function drawBassClef(parent, x, y, width, height) {
    parent.append("image")
      .attr("href", "js/bassClef.svg")
      .attr("x", x)
      .attr("y", y)
      .attr("width", width)
      .attr("height", height)
      .attr("opacity", 0.95)
      .attr("preserveAspectRatio", "xMidYMid meet");
  }

  function drawQuarterNote(parent, cx, cy, color, scale) {
    const s = scale || 1;
    const group = parent.append("g");
    group.append("ellipse")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("rx", 7.2 * s)
      .attr("ry", 5.2 * s)
      .attr("transform", "rotate(-18," + cx + "," + cy + ")")
      .attr("fill", color);
    group.append("line")
      .attr("x1", cx + 6 * s)
      .attr("y1", cy - 1 * s)
      .attr("x2", cx + 6 * s)
      .attr("y2", cy - 32 * s)
      .attr("stroke", color)
      .attr("stroke-width", 2 * s)
      .attr("stroke-linecap", "round");
  }

  function drawHalfNote(parent, cx, cy, color, scale) {
    const s = scale || 1;
    const group = parent.append("g");
    group.append("ellipse")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("rx", 7.2 * s)
      .attr("ry", 5.2 * s)
      .attr("transform", "rotate(-18," + cx + "," + cy + ")")
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2.2 * s);
    group.append("line")
      .attr("x1", cx + 6 * s)
      .attr("y1", cy - 1 * s)
      .attr("x2", cx + 6 * s)
      .attr("y2", cy - 32 * s)
      .attr("stroke", color)
      .attr("stroke-width", 2 * s)
      .attr("stroke-linecap", "round");
  }

  function drawEighthNote(parent, cx, cy, color, scale) {
    const s = scale || 1;
    const group = parent.append("g");
    group.append("ellipse")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("rx", 7.2 * s)
      .attr("ry", 5.2 * s)
      .attr("transform", "rotate(-18," + cx + "," + cy + ")")
      .attr("fill", color);

    const stemX = cx + 6 * s;
    const stemTop = cy - 32 * s;

    group.append("line")
      .attr("x1", stemX)
      .attr("y1", cy - 1 * s)
      .attr("x2", stemX)
      .attr("y2", stemTop)
      .attr("stroke", color)
      .attr("stroke-width", 2 * s)
      .attr("stroke-linecap", "round");

    group.append("path")
      .attr("d", "M" + (stemX + 1 * s) + "," + stemTop +
        " C" + (stemX + 14 * s) + "," + (stemTop + 6 * s) +
        " " + (stemX + 12 * s) + "," + (stemTop + 16 * s) +
        " " + (stemX + 4 * s) + "," + (stemTop + 22 * s))
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2.4 * s)
      .attr("stroke-linecap", "round");
  }

  function drawSixteenthNote(parent, cx, cy, color, scale) {
    const s = scale || 1;
    const group = parent.append("g");
    group.append("ellipse")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("rx", 7.2 * s)
      .attr("ry", 5.2 * s)
      .attr("transform", "rotate(-18," + cx + "," + cy + ")")
      .attr("fill", color);

    const stemX = cx + 6 * s;
    const stemTop = cy - 32 * s;

    group.append("line")
      .attr("x1", stemX)
      .attr("y1", cy - 1 * s)
      .attr("x2", stemX)
      .attr("y2", stemTop)
      .attr("stroke", color)
      .attr("stroke-width", 2 * s)
      .attr("stroke-linecap", "round");

    group.append("path")
      .attr("d", "M" + (stemX + 1 * s) + "," + stemTop +
        " C" + (stemX + 14 * s) + "," + (stemTop + 5 * s) +
        " " + (stemX + 12 * s) + "," + (stemTop + 13 * s) +
        " " + (stemX + 4 * s) + "," + (stemTop + 18 * s))
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2.4 * s)
      .attr("stroke-linecap", "round");

    group.append("path")
      .attr("d", "M" + (stemX + 1 * s) + "," + (stemTop + 9 * s) +
        " C" + (stemX + 14 * s) + "," + (stemTop + 14 * s) +
        " " + (stemX + 12 * s) + "," + (stemTop + 22 * s) +
        " " + (stemX + 4 * s) + "," + (stemTop + 27 * s))
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2.4 * s)
      .attr("stroke-linecap", "round");
  }

  function drawBeamedEighths(parent, cx, cy, color, scale) {
    const s = scale || 1;
    const group = parent.append("g");
    const gap = 13 * s;
    const leftX = cx - gap / 2;
    const rightX = cx + gap / 2;
    const stemHeight = 30 * s;

    group.append("ellipse")
      .attr("cx", leftX)
      .attr("cy", cy)
      .attr("rx", 6.2 * s)
      .attr("ry", 4.8 * s)
      .attr("transform", "rotate(-18," + leftX + "," + cy + ")")
      .attr("fill", color);

    group.append("ellipse")
      .attr("cx", rightX)
      .attr("cy", cy)
      .attr("rx", 6.2 * s)
      .attr("ry", 4.8 * s)
      .attr("transform", "rotate(-18," + rightX + "," + cy + ")")
      .attr("fill", color);

    group.append("line")
      .attr("x1", leftX + 5 * s)
      .attr("y1", cy - 1 * s)
      .attr("x2", leftX + 5 * s)
      .attr("y2", cy - stemHeight)
      .attr("stroke", color)
      .attr("stroke-width", 2 * s)
      .attr("stroke-linecap", "round");

    group.append("line")
      .attr("x1", rightX + 5 * s)
      .attr("y1", cy - 1 * s)
      .attr("x2", rightX + 5 * s)
      .attr("y2", cy - stemHeight)
      .attr("stroke", color)
      .attr("stroke-width", 2 * s)
      .attr("stroke-linecap", "round");

    group.append("rect")
      .attr("x", leftX + 5 * s)
      .attr("y", cy - stemHeight)
      .attr("width", rightX - leftX + 0.5 * s)
      .attr("height", 3.5 * s)
      .attr("fill", color)
      .attr("rx", 0.5);
  }

  function computePositions(yearIdx, genres) {
    const year = years[yearIdx];
    const relativeRanks = getRelativeRanks(year, genres);
    const positions = {};

    genres.forEach((genre, i) => {
      positions[genre] = {
        cx: xScale(year),
        cy: rankYPositions[relativeRanks[genre]],
        gi: i
      };
    });
    return positions;
  }

  function drawTrails() {
    gTrails.selectAll("*").remove();
    const line = d3.line().x((d) => d.x).y((d) => d.y).curve(d3.curveMonotoneX);

    selectedGenres.forEach((genre, i) => {
      const points = [];
      for (let idx = 0; idx <= currentYearIdx; idx += 1) {
        const year = years[idx];
        const relativeRanks = getRelativeRanks(year, selectedGenres);
        points.push({
          x: xScale(year),
          y: rankYPositions[relativeRanks[genre]]
        });
      }

      gTrails.append("path")
        .attr("class", "trail")
        .attr("d", line(points))
        .attr("stroke", LABEL_COLORS[i]);
    });
  }

  function drawPlayhead(x) {
    gPlayhead.selectAll("*").remove();
    gPlayhead.append("line")
      .attr("class", "playhead")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", trebleLineYs[0] - 6)
      .attr("y2", bassLineYs[4] + 6);
  }

  function renderNotes(positions) {
    gNotes.selectAll("*").remove();
    gLabels.selectAll("*").remove();

    selectedGenres.forEach((genre, i) => {
      const pos = positions[genre];
      if (!pos) {
        return;
      }

      const cx = pos.cx;
      const cy = pos.cy;
      const scale = i === 2 ? 0.78 : 0.88;

      if (Math.abs(cy - middleCy) < 10) {
        gNotes.append("line")
          .attr("x1", cx - 13)
          .attr("x2", cx + 13)
          .attr("y1", middleCy)
          .attr("y2", middleCy)
          .attr("stroke", COLORS[i])
          .attr("stroke-width", 1)
          .attr("opacity", 0.45);
      }

      NOTE_DRAWERS[i](gNotes, cx, cy, COLORS[i], scale);

      gLabels.append("text")
        .attr("class", "genre-right-label")
        .attr("x", W - MR + 18)
        .attr("y", cy + 4.5)
        .attr("fill", LABEL_COLORS[i])
        .text(genre);
    });
  }

  function renderFrame(positions) {
    if (!years.length) {
      return;
    }
    drawTrails();
    drawPlayhead(xScale(years[currentYearIdx]));
    renderNotes(positions);
    document.getElementById("year-display").textContent = String(years[currentYearIdx]);
    document.getElementById("year-slider").value = currentYearIdx;
  }

  function lerpPositions(fromPositions, toPositions, t) {
    const interpolated = {};
    selectedGenres.forEach((genre) => {
      const from = fromPositions[genre];
      const to = toPositions[genre];

      if (from && to) {
        interpolated[genre] = {
          cx: from.cx + (to.cx - from.cx) * t,
          cy: from.cy + (to.cy - from.cy) * t,
          gi: to.gi
        };
      } else {
        interpolated[genre] = to || from;
      }
    });
    return interpolated;
  }

  function easeCubicInOut(t) {
    if (t < 0.5) {
      return 4 * t * t * t;
    }
    return 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animateToYear(fromIdx, toIdx, done) {
    const fromPositions = computePositions(fromIdx, selectedGenres);
    const toPositions = computePositions(toIdx, selectedGenres);
    const duration = speed * 0.75;
    animStartTime = performance.now();

    function tick(now) {
      const elapsed = now - animStartTime;
      const rawT = Math.min(elapsed / duration, 1);
      const t = easeCubicInOut(rawT);
      const interpolated = lerpPositions(fromPositions, toPositions, t);

      renderNotes(interpolated);

      if (selectedGenres.length > 0 && interpolated[selectedGenres[0]]) {
        drawPlayhead(interpolated[selectedGenres[0]].cx);
      }

      if (rawT < 1) {
        rafHandle = requestAnimationFrame(tick);
        return;
      }

      currentYearIdx = toIdx;
      renderFrame(toPositions);
      if (done) {
        done();
      }
    }

    rafHandle = requestAnimationFrame(tick);
  }

  function playStep() {
    if (!playing) {
      return;
    }
    if (currentYearIdx >= years.length - 1) {
      stopPlayback();
      return;
    }

    const fromIdx = currentYearIdx;
    const toIdx = currentYearIdx + 1;

    currentYearIdx = toIdx;
    drawTrails();
    currentYearIdx = fromIdx;

    animateToYear(fromIdx, toIdx, () => {
      if (playing) {
        timerHandle = setTimeout(playStep, speed * 0.25);
      }
    });
  }

  function startPlayback() {
    if (!years.length) {
      return;
    }
    if (currentYearIdx >= years.length - 1) {
      currentYearIdx = 0;
      renderFrame(computePositions(0, selectedGenres));
    }
    playing = true;
    const playButton = document.getElementById("btn-play");
    playButton.innerHTML = "&#9646;&#9646; Pause";
    playButton.classList.add("btn-play");
    playStep();
  }

  function stopPlayback() {
    playing = false;
    if (timerHandle) {
      clearTimeout(timerHandle);
      timerHandle = null;
    }
    if (rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }

    document.getElementById("btn-play").innerHTML = "&#9654; Play";
  }

  function buildLegend() {
    const legend = document.getElementById("legend");
    legend.innerHTML = "";

    selectedGenres.forEach((genre, i) => {
      const item = document.createElement("div");
      item.className = "legend-item";

      const ns = "http://www.w3.org/2000/svg";
      const miniSvg = document.createElementNS(ns, "svg");
      miniSvg.setAttribute("width", "28");
      miniSvg.setAttribute("height", "36");
      miniSvg.setAttribute("viewBox", "-4 -8 36 46");
      miniSvg.setAttribute("class", "legend-note");

      const d3Mini = d3.select(miniSvg);
      NOTE_DRAWERS[i](d3Mini, 12, 28, LABEL_COLORS[i], 0.62);

      item.appendChild(miniSvg);

      const label = document.createElement("span");
      label.className = "legend-label";
      label.style.color = LABEL_COLORS[i];
      label.textContent = genre;
      item.appendChild(label);

      const type = document.createElement("span");
      type.className = "legend-type";
      type.textContent = "(" + NOTE_NAMES[i] + ")";
      item.appendChild(type);

      legend.appendChild(item);
    });
  }

  function buildGenreChips() {
    const chips = document.getElementById("genre-chips");
    chips.innerHTML = "";

    allGenres.forEach((genre) => {
      const chip = document.createElement("button");
      chip.className = "genre-chip" + (pendingGenres.includes(genre) ? " selected" : "");
      chip.textContent = genre;
      chip.addEventListener("click", () => {
        if (pendingGenres.includes(genre)) {
          if (pendingGenres.length <= MIN_GENRES) {
            return;
          }
          pendingGenres = pendingGenres.filter((entry) => entry !== genre);
        } else {
          if (pendingGenres.length >= MAX_GENRES) {
            return;
          }
          pendingGenres.push(genre);
        }
        buildGenreChips();
      });
      chips.appendChild(chip);
    });

    document.getElementById("genre-count").textContent = String(pendingGenres.length);
  }

  function wireControls() {
    document.getElementById("btn-play").addEventListener("click", () => {
      if (playing) {
        stopPlayback();
      } else {
        startPlayback();
      }
    });

    document.getElementById("btn-reset").addEventListener("click", () => {
      stopPlayback();
      currentYearIdx = 0;
      renderFrame(computePositions(0, selectedGenres));
    });

    document.getElementById("year-slider").addEventListener("input", (event) => {
      stopPlayback();
      currentYearIdx = +event.target.value;
      renderFrame(computePositions(currentYearIdx, selectedGenres));
    });

    document.getElementById("btn-genres").addEventListener("click", () => {
      const panel = document.getElementById("genre-selector");
      const isOpen = panel.classList.contains("open");
      if (!isOpen) {
        pendingGenres = [...selectedGenres];
        buildGenreChips();
      }
      panel.classList.toggle("open");
    });

    document.getElementById("btn-apply").addEventListener("click", () => {
      stopPlayback();
      selectedGenres = [...pendingGenres];
      currentYearIdx = 0;
      document.getElementById("genre-selector").classList.remove("open");
      buildLegend();
      renderFrame(computePositions(0, selectedGenres));
    });
  }

  loadCsv(DATA_PATH)
    .then((raw) => {
      processData(raw);
      drawStaff();
      buildLegend();
      wireControls();
      renderFrame(computePositions(0, selectedGenres));
    })
    .catch((err) => {
      console.error("[genreAnimation] Failed to load CSV data", err);
      document.getElementById("chart-container").innerHTML =
        "<p style='color:red;text-align:center;'>Error loading chart data.</p>";
    });
})();

