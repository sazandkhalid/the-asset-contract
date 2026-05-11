/* ──────────────────────────────────────────────────────────
 * Figure 2, Sticky scroll-driven Dream Index chart.
 *
 * Renders #dream-index-svg with D3, then uses Scrollama to
 * walk through eight text steps. Each step reveals one more
 * layer of the chart (income line, basket line, era bands,
 * 2011 crossing marker, post-2011 gap fill, 2024 callout).
 *
 * Defensive: silently bails if SVG mount, D3, or Scrollama
 * isn't on the page, so the script can ship globally
 * without exploding on other pages.
 * ────────────────────────────────────────────────────────── */
(function () {
 'use strict';

 // ── DATA ───────────────────────────────────────────
 // Hardcoded summary points from data/final/diverging_lines.csv.
 const DATA = [
 {year: 1960, income: 41348, basket: 18213},
 {year: 1965, income: 48450, basket: 21900},
 {year: 1970, income: 54750, basket: 25800},
 {year: 1973, income: 58100, basket: 28200},
 {year: 1975, income: 55200, basket: 30100},
 {year: 1980, income: 58400, basket: 34600},
 {year: 1985, income: 61200, basket: 39800},
 {year: 1990, income: 65400, basket: 44900},
 {year: 1995, income: 64800, basket: 49600},
 {year: 2000, income: 72500, basket: 55400},
 {year: 2005, income: 71200, basket: 61800},
 {year: 2008, income: 69400, basket: 65700},
 {year: 2010, income: 67800, basket: 68900},
 {year: 2011, income: 69804, basket: 70372},
 {year: 2013, income: 70100, basket: 73200},
 {year: 2015, income: 73200, basket: 77800},
 {year: 2018, income: 78600, basket: 84500},
 {year: 2020, income: 79900, basket: 88200},
 {year: 2022, income: 80600, basket: 94100},
 {year: 2024, income: 83753, basket: 100083},
 ];

 // Era band fills tuned for the cream background — much
 // lower opacity so they read as faint washes rather than
 // competing stripes.
 const ERAS = [
 {x0: 1960, x1: 1973, label: 'POSTWAR PROMISE', fill: 'rgba(45,106,79,0.05)'},
 {x0: 1973, x1: 2007, label: 'EROSION', fill: 'rgba(139,105,20,0.04)'},
 {x0: 2008, x1: 2011, label: 'CRISIS', fill: 'rgba(74,123,167,0.08)'},
 {x0: 2012, x1: 2021, label: 'RATE FLOOR', fill: 'rgba(74,123,167,0.05)'},
 {x0: 2022, x1: 2025, label: 'WINDOW CLOSED', fill: 'rgba(181,69,27,0.06)'},
 ];

 /* Curated period photos. Each appears at its `year` in the
 chart at step 8. URLs are HEAD-tested canonical Wikimedia
 Commons paths (the smaller "300px-" thumb variants don't
 exist server-side for these files; full-size or 960px
 thumbs do, and the SVG <image> scales them down). */
 const CHART_PHOTOS = [
 {
 year: 1958,
 url: 'https://upload.wikimedia.org/wikipedia/commons/7/74/' +
 'Levittown_houses._LOC_gsc.5a25988.jpg',
 location: 'LEVITTOWN, PA · 1958',
 fact: '17,447 homes, one every 16 minutes. Federally guaranteed mortgages, for white buyers only.',
 },
 {
 year: 1981,
 url: 'https://upload.wikimedia.org/wikipedia/commons/9/99/' +
 'Berkeley_-_California_-_Campus_-_Memorial_Stadium_-_1978.jpg',
 location: 'UC BERKELEY · 1981',
 fact: 'Annual tuition: $720. The same education in 2024 costs $14,778.',
 },
 {
 year: 2009,
 url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/' +
 'a/a9/Sign_of_the_Times-Foreclosure.jpg/' +
 '960px-Sign_of_the_Times-Foreclosure.jpg',
 location: 'FLORIDA · 2009',
 fact: '3.1 million foreclosure filings. The federal response insured the banks, not the borrowers.',
 },
 {
 year: 2024,
 url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/' +
 '5/56/Hudson_Yards_from_Hudson_Commons_%2895131p%29.jpg/' +
 '960px-Hudson_Yards_from_Hudson_Commons_%2895131p%29.jpg',
 location: 'URBAN CORE · 2024',
 fact: 'Two-bedroom rentals start at $4,200 in Brooklyn, Austin, Seattle. The neighborhoods being built are not for the people who build them.',
 },
 ];

 // ── INIT ───────────────────────────────────────────
 function init() {
 // Debug, leave these in until the chart is confirmed working.
 console.log('[fig02] init starting');
 console.log('[fig02] d3:', typeof d3);
 console.log('[fig02] scrollama:', typeof scrollama);
 console.log('[fig02] svg element:',
 document.getElementById('dream-index-svg'));
 console.log('[fig02] steps:',
 document.querySelectorAll('.scrolly-step').length);

 // ── STICKY ANCESTOR WALKER ──
 // Walks up from .scrolly-graphic and reports any ancestor
 // whose computed style would break position:sticky.
 var sg = document.querySelector('.scrolly-graphic');
 if (sg) {
 var sgStyle = getComputedStyle(sg);
 console.log('[sticky] .scrolly-graphic position =',
 sgStyle.position, ' top =', sgStyle.top,
 ' height =', sgStyle.height);

 var bad = ['hidden', 'auto', 'scroll'];
 var node = sg.parentElement;
 var found = false;
 while (node && node !== document.documentElement) {
 var cs = getComputedStyle(node);
 var problems = [];
 if (bad.indexOf(cs.overflow) !== -1) problems.push('overflow=' + cs.overflow);
 if (bad.indexOf(cs.overflowX) !== -1) problems.push('overflowX=' + cs.overflowX);
 if (bad.indexOf(cs.overflowY) !== -1) problems.push('overflowY=' + cs.overflowY);
 if (cs.transform && cs.transform !== 'none') problems.push('transform=' + cs.transform);
 if (cs.filter && cs.filter !== 'none') problems.push('filter=' + cs.filter);
 if (cs.perspective && cs.perspective !== 'none') problems.push('perspective=' + cs.perspective);
 if (cs.contain && /(layout|paint|size|strict|content)/.test(cs.contain))
 problems.push('contain=' + cs.contain);
 if (cs.willChange && /transform/.test(cs.willChange))
 problems.push('willChange=' + cs.willChange);
 if (problems.length) {
 found = true;
 console.warn('[sticky BLOCKER]',
 node.tagName.toLowerCase() +
 (node.id ? '#' + node.id : '') +
 (node.className ? '.' + String(node.className).split(' ').join('.') : ''),
 '→', problems.join('; '));
 }
 node = node.parentElement;
 }
 if (!found) {
 console.log('[sticky] no blocking ancestor found, sticky SHOULD be working');
 }
 }

 if (typeof d3 === 'undefined' || typeof scrollama === 'undefined') {
 console.warn('[fig02_scrolly] d3 or scrollama not loaded, aborting');
 return;
 }

 var svg = d3.select('#dream-index-svg');
 if (svg.empty()) {
 console.warn('[fig02_scrolly] #dream-index-svg not found');
 return;
 }
 // Don't double-initialize if Quarto/Scrollama re-runs.
 if (svg.attr('data-scrolly-ready') === '1') return;
 svg.attr('data-scrolly-ready', '1');

 // Expanded top margin makes room for the photo strip
 // (location label + photo + connector) above the plot area,
 // with the era-label row sitting between them.
 var margin = {top: 130, right: 40, bottom: 60, left: 65};
 // Draw at the SVG's intrinsic viewBox size (720 × 640). The SVG
 // CSS scales the rendered output to fit the sticky pane while
 // preserveAspectRatio keeps the chart proportional. This makes
 // the chart geometry independent of whether the section is on
 // screen when init runs.
 var rawW = 720;
 var rawH = 640;
 var width = rawW - margin.left - margin.right;
 var height = rawH - margin.top - margin.bottom;

 var g = svg.append('g')
 .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

 var xScale = d3.scaleLinear().domain([1958, 2026]).range([0, width]);
 var yScale = d3.scaleLinear().domain([0, 115000]).range([height, 0]);

 // ── ERA BANDS + LABELS ─────────────────────────
 // Bands live inside the plot rect. Labels live in a
 // separate group ABOVE the plot, so they share a clean
 // horizontal row and never collide with the data, the
 // legend, or the photo strip. Labels for very narrow
 // bands (e.g. CRISIS at 3 years) are dropped so they
 // don't crash into their neighbours.
 var eraGroup = g.append('g').attr('class', 'era-bands');
 var eraLabelGroup = g.append('g').attr('class', 'era-labels-group');

 ERAS.forEach(function (era, i) {
 var bandWidth = xScale(era.x1) - xScale(era.x0);

 eraGroup.append('rect')
 .attr('class', 'era-band era-band-' + i)
 .attr('x', xScale(era.x0))
 .attr('y', 0)
 .attr('width', bandWidth)
 .attr('height', height)
 .attr('fill', era.fill);

 if (bandWidth < 35) return;

 eraLabelGroup.append('text')
 .attr('class', 'era-label era-label-' + i)
 .attr('x', xScale(era.x0) + bandWidth / 2)
 .attr('y', -6)
 .attr('text-anchor', 'middle')
 .style('font-size', '8.5px')
 .style('letter-spacing', '0.18em')
 .text(era.label);
 });

 // ── AXES ───────────────────────────────────────
 var xAxis = d3.axisBottom(xScale)
 .tickValues([1960, 1970, 1980, 1990, 2000, 2010, 2020, 2024])
 .tickFormat(function (d) { return d; })
 .tickSize(-height);

 var yAxis = d3.axisLeft(yScale)
 .ticks(6)
 .tickFormat(function (d) { return '$' + d3.format(',')(d); })
 .tickSize(-width);

 g.append('g')
 .attr('class', 'axis x-axis')
 .attr('transform', 'translate(0,' + height + ')')
 .call(xAxis);

 g.append('g')
 .attr('class', 'axis y-axis grid')
 .call(yAxis);

 // ── LINE / AREA GENERATORS ─────────────────────
 var lineIncome = d3.line()
 .x(function (d) { return xScale(d.year); })
 .y(function (d) { return yScale(d.income); })
 .curve(d3.curveMonotoneX);

 var lineBasket = d3.line()
 .x(function (d) { return xScale(d.year); })
 .y(function (d) { return yScale(d.basket); })
 .curve(d3.curveMonotoneX);

 var gapData = DATA.filter(function (d) { return d.year >= 2011; });
 var area = d3.area()
 .x(function (d) { return xScale(d.year); })
 .y0(function (d) { return yScale(d.income); })
 .y1(function (d) { return yScale(d.basket); })
 .curve(d3.curveMonotoneX);

 var gapPath = g.append('path')
 .attr('class', 'gap-fill')
 .attr('d', area(gapData))
 .style('opacity', 0);

 // ── LINES (with stroke-dasharray for draw animation) ─
 var incomePath = g.append('path')
 .datum(DATA)
 .attr('class', 'income-line')
 .attr('d', lineIncome);

 var basketPath = g.append('path')
 .datum(DATA)
 .attr('class', 'basket-line')
 .attr('d', lineBasket);

 var incomeLen = incomePath.node().getTotalLength();
 var basketLen = basketPath.node().getTotalLength();

 incomePath
 .attr('stroke-dasharray', incomeLen + ' ' + incomeLen)
 .attr('stroke-dashoffset', incomeLen);

 basketPath
 .attr('stroke-dasharray', basketLen + ' ' + basketLen)
 .attr('stroke-dashoffset', basketLen);

 // ── LEGEND ─────────────────────────────────────
 // Anchored at bottom-left of the plot area. The old
 // top-left position collided with the Levittown photo
 // and the POSTWAR PROMISE era label.
 var legend = g.append('g')
 .attr('class', 'chart-legend')
 .attr('transform', 'translate(20, ' + (height - 50) + ')')
 .style('opacity', 0);

 legend.append('line')
 .attr('x1', 0).attr('x2', 20)
 .attr('y1', 0).attr('y2', 0)
 .attr('stroke', '#4a443c')
 .attr('stroke-width', 2.2);
 legend.append('text')
 .attr('x', 26).attr('y', 4)
 .style('font-family', 'Inter, sans-serif')
 .style('font-size', '11px')
 .style('fill', '#2a2520')
 .text('Median household income');

 legend.append('line')
 .attr('x1', 0).attr('x2', 20)
 .attr('y1', 20).attr('y2', 20)
 .attr('stroke', '#8b6914')
 .attr('stroke-width', 3.2);
 legend.append('text')
 .attr('x', 26).attr('y', 24)
 .style('font-family', 'Inter, sans-serif')
 .style('font-size', '11px')
 .style('fill', '#2a2520')
 .text('Dream basket cost');

 // ── 2011 CROSSING MARKER ───────────────────────
 var crossing = g.append('g')
 .attr('class', 'crossing-marker')
 .style('opacity', 0);

 crossing.append('line')
 .attr('x1', xScale(2011)).attr('x2', xScale(2011))
 .attr('y1', 0).attr('y2', height)
 .attr('stroke', '#8b6914')
 .attr('stroke-dasharray', '4,4')
 .attr('stroke-width', 1.2);

 crossing.append('circle')
 .attr('cx', xScale(2011)).attr('cy', yScale(70372))
 .attr('r', 6)
 .attr('fill', '#8a3018')
 .attr('stroke', '#ebe3d1')
 .attr('stroke-width', 2);

 // Anchor the label to the LEFT of the crossing point and
 // lift it higher so it sits in clean pre-2011 space and
 // doesn't blend into the rust gap fill that extends right
 // of 2011.
 crossing.append('text')
 .attr('x', xScale(2011) - 8)
 .attr('y', yScale(70372) - 30)
 .attr('text-anchor', 'end')
 .style('font-family', 'Playfair Display, Georgia, serif')
 .style('font-size', '13px')
 .style('font-style', 'italic')
 .style('fill', '#8a3018')
 .text('2011, the crossing');

 // ── 2024 ANNOTATION ────────────────────────────
 // Tucked into the white space between the basket and
 // income lines at the right edge, so it doesn't collide
 // with the Urban Core photo above the plot.
 var annotation2024 = g.append('text')
 .attr('class', 'annotation-text annotation-2024')
 .attr('x', xScale(2024) - 10)
 .attr('y', yScale(85000))
 .attr('text-anchor', 'end')
 .style('opacity', 0)
 .text('2024: gap = $16,330');

 // ── PHOTO STRIP (revealed at step 8) ───────────
 // One horizontal row above the chart, each photo
 // anchored to its year via a thin connector line that
 // points down to the x-axis position.
 var photoGroup = g.append('g')
 .attr('class', 'chart-photos')
 .attr('transform', 'translate(0, -85)')
 .style('opacity', 0);

 var photoW = 70, photoH = 50;
 var tipW = 180, tipH = 70;

 CHART_PHOTOS.forEach(function (photo) {
 var px = xScale(photo.year);

 var grp = photoGroup.append('g')
 .attr('class', 'chart-photo-group')
 .attr('transform',
 'translate(' + (px - photoW / 2) + ', 0)');

 // Caption ABOVE the photo.
 grp.append('text')
 .attr('class', 'chart-photo-caption-location')
 .attr('x', photoW / 2)
 .attr('y', -8)
 .attr('text-anchor', 'middle')
 .text(photo.location);

 grp.append('image')
 .attr('href', photo.url)
 .attr('x', 0).attr('y', 0)
 .attr('width', photoW).attr('height', photoH)
 .attr('preserveAspectRatio', 'xMidYMid slice');

 grp.append('rect')
 .attr('class', 'chart-photo-frame')
 .attr('x', 0).attr('y', 0)
 .attr('width', photoW).attr('height', photoH);

 // Thin connector from the photo down toward the
 // year on the x-axis.
 grp.append('line')
 .attr('x1', photoW / 2).attr('x2', photoW / 2)
 .attr('y1', photoH + 2).attr('y2', photoH + 14)
 .attr('stroke', 'rgba(201,169,110,0.4)')
 .attr('stroke-width', 0.8);

 // Hover tooltip, flips left if it would run off
 // the right edge of the plot.
 var flipLeft = px + photoW / 2 + tipW + 16 > width;
 var tipX = flipLeft ? -tipW - 8 : photoW + 8;

 var tip = grp.append('g')
 .attr('class', 'chart-photo-tip')
 .style('opacity', 0)
 .style('pointer-events', 'none');

 tip.append('rect')
 .attr('x', tipX).attr('y', 0)
 .attr('width', tipW).attr('height', tipH)
 .attr('fill', 'rgba(15,12,9,0.96)')
 .attr('stroke', 'rgba(201,169,110,0.4)')
 .attr('stroke-width', 1)
 .attr('rx', 2);

 tip.append('foreignObject')
 .attr('x', tipX + 8).attr('y', 6)
 .attr('width', tipW - 16).attr('height', tipH - 12)
 .append('xhtml:div')
 .style('font-family', 'Georgia, serif')
 .style('font-style', 'italic')
 .style('font-size', '11px')
 .style('color', '#d4cfc4')
 .style('line-height', '1.45')
 .html(photo.fact);

 grp.on('mouseenter', function () {
 tip.transition().duration(200).style('opacity', 1);
 });
 grp.on('mouseleave', function () {
 tip.transition().duration(200).style('opacity', 0);
 });
 });

 // Thin divider line just above the era-label row.
 var photoDivider = g.append('line')
 .attr('class', 'photo-strip-divider')
 .attr('id', 'photo-divider')
 .attr('x1', 0).attr('x2', width)
 .attr('y1', -22).attr('y2', -22)
 .attr('stroke', 'rgba(201,169,110,0.18)')
 .attr('stroke-width', 0.8)
 .style('opacity', 0);

 // ── STEP STATE ─────────────────────────────────
 function showStep(step) {
 if (step >= 2) {
 incomePath.transition().duration(1200)
 .attr('stroke-dashoffset', 0);
 legend.transition().duration(600).style('opacity', 1);
 } else {
 incomePath.attr('stroke-dashoffset', incomeLen);
 legend.style('opacity', 0);
 }

 if (step >= 3) {
 basketPath.transition().duration(1200)
 .attr('stroke-dashoffset', 0);
 } else {
 basketPath.attr('stroke-dashoffset', basketLen);
 }

 eraGroup.selectAll('.era-band, .era-label')
 .classed('visible', step >= 4);

 crossing.transition().duration(600)
 .style('opacity', step >= 5 ? 1 : 0);

 gapPath.transition().duration(800)
 .style('opacity', step >= 6 ? 1 : 0);

 annotation2024.transition().duration(600)
 .style('opacity', step >= 7 ? 1 : 0);

 photoGroup.transition().duration(800)
 .style('opacity', step >= 8 ? 1 : 0);

 photoDivider.transition().duration(800)
 .style('opacity', step >= 8 ? 1 : 0);
 }

 showStep(1);

 // ── SCROLLAMA ──────────────────────────────────
 var scroller = scrollama();
 scroller
 .setup({
 step: '.scrolly-step',
 offset: 0.55,
 progress: false,
 })
 .onStepEnter(function (response) {
 var stepNum = parseInt(
 response.element.getAttribute('data-step'), 10
 );
 response.element.classList.add('is-active');
 showStep(stepNum);
 })
 .onStepExit(function (response) {
 response.element.classList.remove('is-active');
 });

 // Toggle `body.dream-index-active` while the scrolly
 // section is in view, so fig02_scrolly.css can hide
 // the story-nav labels (they collide with the photo
 // strip on the top-right of the chart).
 var sectionObserver = new IntersectionObserver(function (entries) {
 entries.forEach(function (entry) {
 if (entry.isIntersecting) {
 document.body.classList.add('dream-index-active');
 } else {
 document.body.classList.remove('dream-index-active');
 }
 });
 }, { threshold: 0.2 });
 var scrollySection = document.getElementById('dream-index-scrolly');
 if (scrollySection) sectionObserver.observe(scrollySection);

 var resizeTimeout;
 window.addEventListener('resize', function () {
 clearTimeout(resizeTimeout);
 resizeTimeout = setTimeout(function () {
 scroller.resize();
 }, 200);
 });
 }

 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', init);
 } else {
 init();
 }
})();
