// constants
const P = {
    cerulean:    '#247BA0',
    icyAqua:     '#ADF5FF',
    spaceIndigo: '#2D3047',
    rosyCopper:  '#DD614A',
    peachFuzz:   '#FFD6BA',
};
 
const ERA_COLORS = {
    "60s–70s": { disc: '#162230', groove: '#1b2d3d', label: P.peachFuzz },
    "80s–90s": { disc: '#251d2a', groove: '#302338', label: P.peachFuzz },
    "90s–00s": { disc: '#271a1a', groove: '#352020', label: P.peachFuzz },
    "00s–10s": { disc: '#1a2228', groove: '#1f2e38', label: P.peachFuzz },
};
 
// load the data
loadData();
 
function loadData() {
    d3.csv("data/ClassicHit.csv", row => {
        row.Year       = +row.Year;
        row.Popularity = +row.Popularity;
        row.Track      = row.Track;
        return row;
    }).then(data => {
        const eraData = wrangleEraData(data);
        new VinylWall2('words-disc', eraData);
    });
}
 
// pre-process: bucket songs into eras, compute word frequency weighted by popularity
function wrangleEraData(data) {
    const eras = {
        "60s–70s": [1960, 1979],
        "80s–90s": [1980, 1999],
        "90s–00s": [1990, 2009],
        "00s–10s": [2000, 2019],
    };
 
    const stopwords = new Set([
        'the','a','an','and','or','of','in','on','at','to','for','is','it','i',
        'my','me','you','your','we','be','do','no','not','if','so','up','as','by',
        'with','this','that','from','are','was','were','have','had','has','will',
        'what','when','where','who','how','all','but','he','she','they','them',
        'their','our','can','get','just','one','two','about','out','go','going',
        'into','its','im','s','t','dont','got','gonna','wanna','come','know',
        'like','let','take','make','now','say','see','been','back','oh','ah',
        'hey','yeah','yes','aint','ll','re','ve','d','m','feat','remaster',
        'remastered','version','radio','edit','live','remix'
    ]);
 
    const result = {};
 
    Object.entries(eras).forEach(([era, [start, end]]) => {
        const songs = data.filter(d => d.Year >= start && d.Year <= end);
        const wordPop = {};
 
        songs.forEach(song => {
            const words = song.Track.toLowerCase().match(/[a-zA-Z']+/g) || [];
            words.forEach(w => {
                if (!stopwords.has(w) && w.length > 2) {
                    wordPop[w] = (wordPop[w] || 0) + song.Popularity;
                }
            });
        });
 
        const sorted  = Object.entries(wordPop).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const maxPop  = sorted[0]?.[1] || 1;
 
        result[era] = {
            count: songs.length,
            words: sorted.map(([word, pop]) => ({
                word,
                score: Math.round(pop / maxPop * 100 * 10) / 10
            }))
        };
    });
 
    return result;
}
 
 
class VinylWall2 {
    constructor(parentId, eraData) {
        this.parentId  = parentId;
        this.eraData   = eraData;
        this.eras      = Object.keys(eraData);
        this.spinState = {};
        this.eras.forEach(e => {
            this.spinState[e] = { angle: 0, velocity: 0, raf: null };
        });
        this.initVis();
    }
 
    initVis() {
        let vis = this;
        vis.margin = { top: 30, right: 20, bottom: 70, left: 20 };
        const container = document.getElementById(vis.parentId);
        container.style.height = container.style.height || '520px';
        vis.width  = container.getBoundingClientRect().width  - vis.margin.left - vis.margin.right;
        vis.height = container.getBoundingClientRect().height - vis.margin.top  - vis.margin.bottom;
 
        vis.svg = d3.select('#' + vis.parentId).append('svg')
            .attr('width',  vis.width  + vis.margin.left + vis.margin.right)
            .attr('height', vis.height + vis.margin.top  + vis.margin.bottom);
 
        vis.group = vis.svg.append('g')
            .attr('transform', `translate(${vis.margin.left},${vis.margin.top})`);
 
        vis.circlesGroup = vis.group.append('g').attr('class', 'circles-group');
 
        const counts = vis.eras.map(e => vis.eraData[e].count);
        vis.discRadiusScale = d3.scaleSqrt()
            .domain([0, d3.max(counts)])
            .range([0, Math.min(vis.height, vis.width / vis.eras.length) * 0.46]);
 
        vis.updateVis();
    }
 
    updateVis() {
        let vis = this;
        const radii = vis.eras.map(e => vis.discRadiusScale(vis.eraData[e].count));
 
        // dynamic x positions
        const padding = 30;
        const xPositions = [];
        let cursor = 0;
        radii.forEach((r, i) => {
            cursor = i === 0 ? r + padding : cursor + radii[i - 1] + r + padding;
            xPositions.push(cursor);
        });
        const totalWidth = cursor + radii[radii.length - 1] + padding;
        const offsetX = Math.max(0, (vis.width - totalWidth) / 2);
        const cy = vis.height * 0.47;
 
        // bind data
        let discs = vis.circlesGroup.selectAll('.disc').data(vis.eras, d => d);
 
        // enter
        let discsEnter = discs.enter().append('g').attr('class', 'disc');
        discsEnter.append('circle').attr('class', 'outer-disc');
        for (let i = 0; i < 7; i++) discsEnter.append('circle').attr('class', `groove-band groove-${i}`);
        discsEnter.append('g').attr('class', 'spin-group');
        discsEnter.append('circle').attr('class', 'centre-hole');
        discsEnter.append('rect').attr('class', 'era-badge');
        discsEnter.append('text').attr('class', 'disc-label');
        discsEnter.append('text').attr('class', 'disc-count');
        discsEnter.append('text').attr('class', 'spin-hint');
 
        // merge
        let discsMerge = discsEnter.merge(discs);
 
        discsMerge.attr('transform', (d, i) =>
            `translate(${offsetX + xPositions[i]}, ${cy})`);
 
        // outer shell
        discsMerge.select('.outer-disc')
            .attr('r', d => radii[vis.eras.indexOf(d)])
            .attr('fill', d => ERA_COLORS[d].disc)
            .attr('stroke', d => ERA_COLORS[d].groove)
            .attr('stroke-width', 2);
 
        // grooves
        for (let gi = 0; gi < 7; gi++) {
            discsMerge.select(`.groove-${gi}`)
                .attr('r', d => {
                    const r   = radii[vis.eras.indexOf(d)];
                    const min = r * 0.26;
                    return min + (r - min) * ((gi + 1) / 8);
                })
                .attr('fill', 'none')
                .attr('stroke', d => ERA_COLORS[d].groove)
                .attr('stroke-width', 0.75);
        }
 
        // words inside spin group
        discsMerge.each(function(d) {
            const r  = radii[vis.eras.indexOf(d)];
            const sg = d3.select(this).select('.spin-group');
            sg.attr('transform', `rotate(${vis.spinState[d].angle * 180 / Math.PI})`);
            vis.placeWords(sg, vis.eraData[d].words, r);
        });
 
        // centre hole (rendered above words)
        discsMerge.select('.centre-hole')
            .attr('r', d => radii[vis.eras.indexOf(d)] * 0.075)
            .attr('fill', P.spaceIndigo)
            .attr('stroke', '#445')
            .attr('stroke-width', 1);
 
        // era label badge
        discsMerge.select('.era-badge')
            .attr('x', d => -radii[vis.eras.indexOf(d)] * 0.44)
            .attr('y', d =>  radii[vis.eras.indexOf(d)] + 12)
            .attr('width',  d => radii[vis.eras.indexOf(d)] * 0.88)
            .attr('height', 22)
            .attr('rx', 3)
            .attr('fill', P.peachFuzz)
            .attr('opacity', 0.1);
 
        discsMerge.select('.disc-label')
            .attr('y', d => radii[vis.eras.indexOf(d)] + 28)
            .attr('fill', P.peachFuzz)
            .attr('font-size', '0.85rem')
            .attr('letter-spacing', '0.1em')
            .attr('text-anchor', 'middle')
            .text(d => d);
 
        discsMerge.select('.disc-count')
            .attr('y', d => radii[vis.eras.indexOf(d)] + 46)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .text(d => `${vis.eraData[d].count.toLocaleString()} songs`);
 
        discsMerge.select('.spin-hint')
            .attr('y', d => -radii[vis.eras.indexOf(d)] - 10)
            .attr('text-anchor', 'middle')
            .attr('fill', 'white')
            .text('drag to spin');
 
        // drag-to-spin
        discsMerge.each(function(era) {
            const discEl    = d3.select(this);
            const spinGroup = discEl.select('.spin-group');
            const state     = vis.spinState[era];
            let dragStartAngle = 0;
            let prevAngle      = 0;
            let prevTime       = 0;
 
            function pointerAngle(event) {
                const [mx, my] = d3.pointer(event, vis.svg.node());
                const idx = vis.eras.indexOf(era);
                const cx  = offsetX + xPositions[idx] + vis.margin.left;
                const cyc = cy + vis.margin.top;
                return Math.atan2(my - cyc, mx - cx);
            }
 
            const drag = d3.drag()
                .on('start', function(event) {
                    discEl.classed('dragging', true);
                    if (state.raf) { cancelAnimationFrame(state.raf); state.raf = null; }
                    dragStartAngle = pointerAngle(event) - state.angle;
                    prevAngle = state.angle;
                    prevTime  = performance.now();
                    d3.select('#tooltip').style('opacity', 0);
                })
                .on('drag', function(event) {
                    const pa    = pointerAngle(event);
                    state.angle = pa - dragStartAngle;
                    const now   = performance.now();
                    const dt    = now - prevTime;
                    if (dt > 0) state.velocity = (state.angle - prevAngle) / dt * 16;
                    prevAngle = state.angle;
                    prevTime  = now;
                    spinGroup.attr('transform', `rotate(${state.angle * 180 / Math.PI})`);
                })
                .on('end', function() {
                    discEl.classed('dragging', false);
                    vis.startInertia(era, spinGroup);
                });
 
            discEl.call(drag);
        });
 
        // tooltip (era + sample words only; no glossary, no score)
        discsMerge
            .on('mouseenter', function(event, d) {
                if (d3.select(this).classed('dragging')) return;
                const era = vis.eraData[d];
                d3.select('#tooltip')
                    .html(`<strong>${d}</strong> ${era.count.toLocaleString()} songs<br><br>` +
                        era.words.slice(0, 5).map(w =>
                            `<span class="tooltip-word">${w.word}</span>`
                        ).join('<br>'))
                    .style('left', (event.clientX + 16) + 'px')
                    .style('top',  (event.clientY - 10) + 'px')
                    .style('opacity', 1);
            })
            .on('mousemove', function(event) {
                d3.select('#tooltip')
                    .style('left', (event.clientX + 16) + 'px')
                    .style('top',  (event.clientY - 10) + 'px');
            })
            .on('mouseleave', () => d3.select('#tooltip').style('opacity', 0));
 
        // exit
        discs.exit().remove();
    }
 
    startInertia(era, spinGroup) {
        const state    = this.spinState[era];
        const friction = 0.955;
 
        const tick = () => {
            state.velocity *= friction;
            state.angle    += state.velocity;
            spinGroup.attr('transform', `rotate(${state.angle * 180 / Math.PI})`);
            if (Math.abs(state.velocity) > 0.0004) {
                state.raf = requestAnimationFrame(tick);
            } else {
                state.raf = null;
            }
        };
        state.raf = requestAnimationFrame(tick);
    }
 
placeWords(wg, words, discR) {
    const centreR = discR * 0.085;

    // slightly tighter outer bound to avoid clipping
    const usableR = discR * 0.9;

    const sorted  = [...words].sort((a, b) => b.score - a.score);

    const positions = sorted.map((w, i) => {
        const frac  = (i + 0.5) / sorted.length;

        // push words further from centre to avoid overlap
        const minR  = centreR * 3.2;

        const r     = usableR - (usableR - minR) * frac;
        const angle = (i / sorted.length) * 2 * Math.PI + 0.4;

        return { ...w, r, angle };
    });

    const sel = wg.selectAll('.word-text').data(positions, d => d.word);

    sel.enter().append('text')
        .attr('class', 'word-text')
        .merge(sel)
        .attr('x', d => d.r * Math.cos(d.angle))
        .attr('y', d => d.r * Math.sin(d.angle))

        // ✅ BALANCED FONT SIZE INCREASE
        .attr('font-size', d => {
            const minFs = Math.max(9,  discR * 0.075);
            const maxFs = Math.max(15, discR * 0.16);
            return (minFs + (maxFs - minFs) * (d.score / 100)) + 'px';
        })

        // optional: emphasize top words slightly
        .attr('font-weight', d => d.score > 60 ? '600' : '400')

        .attr('fill', d => d.score > 30 ? P.rosyCopper : P.peachFuzz)
        .attr('opacity', d => 0.45 + 0.55 * (d.score / 100))

        .attr('transform', d =>
            `rotate(${d.angle * 180 / Math.PI + 90}, ${d.r * Math.cos(d.angle)}, ${d.r * Math.sin(d.angle)})`
        )

        .text(d => d.word);

    sel.exit().remove(); 
}
}
