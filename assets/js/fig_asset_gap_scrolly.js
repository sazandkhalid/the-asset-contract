/* ──────────────────────────────────────────────────────────
 * Asset Gap five-act sticky-scroll figure.
 *
 * Mirrors the Figure 2 (Dream Index) scrolly pattern:
 * Scrollama detects the active step, and one of five
 * drawAct*() functions paints the sticky SVG on the right.
 *
 * Dependencies (loaded by index head):
 *   - d3 v7
 *   - scrollama v3
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  let svg, chartW, chartH;
  const M = {t: 60, r: 60, b: 60, l: 70};

  // Color palette tuned for the cream chart panel.
  const C = {
    bg:       '#faf7f1',
    text:     '#1a1816',
    dimmed:   '#6a6258',
    grid:     '#e3dccf',
    white:    '#8b6914',   // representing white household
    black:    '#a04020',   // representing Black household
    empty:    'rgba(0,0,0,0.06)',
  };

  function init() {
    if (typeof d3 === 'undefined' ||
        typeof scrollama === 'undefined') {
      return;
    }
    const host = document.getElementById('asset-gap-svg');
    if (!host) return;

    svg = d3.select(host);
    sizeSvg();

    // Draw the empty stage on load (Act I).
    drawStep(0);

    window.addEventListener('resize', () => {
      sizeSvg();
      const active = document.querySelector(
        '.asset-gap-step.is-active'
      );
      const step = active ?
        parseInt(active.dataset.step, 10) : 0;
      drawStep(step);
    });

    const scroller = scrollama();
    scroller
      .setup({
        step: '.asset-gap-step',
        offset: 0.55,
      })
      .onStepEnter(({element}) => {
        document.querySelectorAll('.asset-gap-step')
          .forEach(el => el.classList.remove('is-active'));
        element.classList.add('is-active');
        const stepN = parseInt(element.dataset.step, 10);
        drawStep(stepN);
      });
  }

  function sizeSvg() {
    const node = svg.node();
    const rect = node.getBoundingClientRect();
    chartW = rect.width || 600;
    chartH = rect.height || 600;
    svg.attr('viewBox', `0 0 ${chartW} ${chartH}`);
  }

  function clearChart() {
    svg.selectAll('*').remove();
  }

  // Returns the column geometry for a two-column
  // comparison view. Stacks vertically below 600px so
  // the labels stay anchored to their numbers and the
  // big dollar amounts can't visually collide. The
  // chartH-relative positions in narrow keep the
  // "Median ... household assets" label clear of the
  // two-line title that sits at M.t / M.t + 26.
  function twoColumnLayout() {
    const isNarrow = chartW < 600;

    if (isNarrow) {
      return {
        stacked: true,
        col1X: chartW / 2,
        col2X: chartW / 2,
        col1Y: chartH * 0.30,
        col2Y: chartH * 0.55,
        labelOffset: -42,
        valueSize: Math.min(44, chartW * 0.12),
      };
    }

    // Wide: side-by-side with clear gutter.
    const gutter = 60;
    const availW = chartW - M.l - M.r;
    const colW = (availW - gutter) / 2;
    return {
      stacked: false,
      col1X: M.l + colW / 2,
      col2X: M.l + colW + gutter + colW / 2,
      col1Y: chartH / 2 - 20,
      col2Y: chartH / 2 - 20,
      labelOffset: -70,
      valueSize: Math.min(56, colW * 0.32),
    };
  }

  // Draw a labelled two-way arrow that spans between
  // the two columns of a comparison view. Horizontal
  // when wide, vertical when stacked. Used by Act 3
  // (between $100K and $9.3K) and Act 5 (between $285K
  // and $44K) to make the gap visible at a glance.
  function drawGapArrow(L, labelText) {
    // Estimate the half-width of each big-money label so
    // the arrow shafts stop short of the digits.
    const inset = L.valueSize * 1.8;
    const arrowColor = '#5a544c';

    // Re-usable arrowhead marker, scoped to the SVG by id.
    let defs = svg.select('defs');
    if (defs.empty()) defs = svg.append('defs');
    if (defs.select('#gap-arrow-head').empty()) {
      const m = defs.append('marker')
        .attr('id', 'gap-arrow-head')
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8).attr('refY', 5)
        .attr('markerWidth', 8).attr('markerHeight', 8)
        .attr('orient', 'auto-start-reverse');
      m.append('path')
        .attr('d', 'M0,1 L9,5 L0,9 Z')
        .attr('fill', arrowColor);
    }

    if (L.stacked) {
      // Vertical arrow between the two stacked columns.
      const x = chartW / 2;
      const y1 = L.col1Y + L.valueSize * 0.6 + 6;
      const y2 = L.col2Y + L.labelOffset - 8;
      if (y2 - y1 < 30) return;
      svg.append('line')
        .attr('x1', x).attr('y1', y1)
        .attr('x2', x).attr('y2', y2)
        .attr('stroke', arrowColor)
        .attr('stroke-width', 2)
        .attr('marker-start', 'url(#gap-arrow-head)')
        .attr('marker-end',   'url(#gap-arrow-head)');
      svg.append('rect')
        .attr('x', x - 32).attr('y', (y1 + y2) / 2 - 10)
        .attr('width', 64).attr('height', 20)
        .attr('fill', '#faf7f1');
      svg.append('text')
        .attr('x', x).attr('y', (y1 + y2) / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-weight', 700)
        .attr('font-size', 11)
        .attr('letter-spacing', '0.16em')
        .attr('fill', arrowColor)
        .text(labelText);
      return;
    }

    // Horizontal arrow between the two side-by-side
    // columns, drawn at the values' baseline.
    const x1 = L.col1X + inset;
    const x2 = L.col2X - inset;
    if (x2 - x1 < 60) return;
    const y = L.col1Y - L.valueSize * 0.32;
    svg.append('line')
      .attr('x1', x1).attr('y1', y)
      .attr('x2', x2).attr('y2', y)
      .attr('stroke', arrowColor)
      .attr('stroke-width', 2)
      .attr('marker-start', 'url(#gap-arrow-head)')
      .attr('marker-end',   'url(#gap-arrow-head)');
    const xc = (x1 + x2) / 2;
    svg.append('rect')
      .attr('x', xc - 50).attr('y', y - 11)
      .attr('width', 100).attr('height', 22)
      .attr('fill', '#faf7f1');
    svg.append('text')
      .attr('x', xc).attr('y', y + 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', 700)
      .attr('font-size', 12)
      .attr('letter-spacing', '0.18em')
      .attr('fill', arrowColor)
      .text(labelText);
  }

  // ── DRAW THE FIVE ACTS ──────────────────────

  function drawStep(n) {
    clearChart();
    if      (n === 0) drawAct1Income();
    else if (n === 1) drawAct2Wealth();
    else if (n === 2) drawAct3Setup();
    else if (n === 3) drawAct4Compound();
    else if (n === 4) drawAct5Today();
  }

  // ACT 1, income gap as two bars (out of 100).
  function drawAct1Income() {
    const xCenter = chartW / 2;
    const barW = 70;
    const gap = 80;
    const fullH = chartH - M.t - M.b - 60;

    svg.append('text')
      .attr('x', xCenter).attr('y', 26)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', 18).attr('fill', C.text)
      .text('For every $1 of income…');

    drawBar(
      xCenter - gap/2 - barW, M.t + 20, barW, fullH,
      100, '$1.00', 'White household', C.white,
    );
    drawBar(
      xCenter + gap/2, M.t + 20, barW, fullH,
      64, '64¢', 'Black household', C.black,
    );

    svg.append('text')
      .attr('x', xCenter)
      .attr('y', chartH - 16)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 12).attr('fill', C.dimmed)
      .attr('font-style', 'italic')
      .text('1967: 55¢  •  2024: 64¢  •  Narrowed 9 cents in 57 years');
  }

  // ACT 2, wealth gap, same format, dramatically smaller.
  function drawAct2Wealth() {
    const xCenter = chartW / 2;
    const barW = 70;
    const gap = 80;
    const fullH = chartH - M.t - M.b - 60;

    svg.append('text')
      .attr('x', xCenter).attr('y', 26)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'hanging')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', 18).attr('fill', C.text)
      .text('For every $1 of WEALTH…');

    drawBar(
      xCenter - gap/2 - barW, M.t + 20, barW, fullH,
      100, '$1.00', 'White household', C.white,
    );
    drawBar(
      xCenter + gap/2, M.t + 20, barW, fullH,
      12, '12¢', 'Black household', C.black,
    );

    svg.append('text')
      .attr('x', xCenter)
      .attr('y', chartH - 16)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 12).attr('fill', C.dimmed)
      .attr('font-style', 'italic')
      .text('1989: 9¢  •  2024: 12¢  •  Narrowed 3 cents in 33 years');
  }

  // ACT 3, setup. Two starting bank balances in 1989.
  // Vertical positions are chartH-relative so the layout
  // breathes evenly across the panel height instead of
  // collapsing into the top third.
  function drawAct3Setup() {
    const xCenter = chartW / 2;
    const L = twoColumnLayout();

    // Top title, two lines so it doesn't overflow on
    // narrow viewports.
    svg.append('text')
      .attr('x', xCenter).attr('y', M.t)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', Math.min(20, chartW / 30))
      .attr('fill', C.text)
      .text('Two households in 1989.');

    svg.append('text')
      .attr('x', xCenter).attr('y', M.t + 26)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', Math.min(20, chartW / 30))
      .attr('fill', C.text)
      .text('Same savings rate.');

    // ── White household column ──
    svg.append('text')
      .attr('x', L.col1X)
      .attr('y', L.col1Y + L.labelOffset)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', C.dimmed)
      .text('Median white household assets');

    svg.append('text')
      .attr('x', L.col1X)
      .attr('y', L.col1Y)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', L.valueSize)
      .attr('font-weight', 500)
      .attr('fill', C.white)
      .text('$100,000');

    // ── Black household column ──
    svg.append('text')
      .attr('x', L.col2X)
      .attr('y', L.col2Y + L.labelOffset)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', C.dimmed)
      .text('Median Black household assets');

    svg.append('text')
      .attr('x', L.col2X)
      .attr('y', L.col2Y)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', L.valueSize)
      .attr('font-weight', 500)
      .attr('fill', C.black)
      .text('$9,300');

    // ── Gap arrow between the two values ──
    drawGapArrow(L, '$90,700 GAP');

    // ── Conditions block at the bottom ──
    const condY = L.stacked
      ? L.col2Y + 80
      : chartH - 100;

    svg.append('text')
      .attr('x', xCenter).attr('y', condY)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Georgia, serif')
      .attr('font-style', 'italic')
      .attr('font-size', 14)
      .attr('fill', C.text)
      .text('Both save 8% of income.');

    svg.append('text')
      .attr('x', xCenter).attr('y', condY + 24)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Georgia, serif')
      .attr('font-style', 'italic')
      .attr('font-size', 14)
      .attr('fill', C.text)
      .text('Both earn 6% annual return on assets.');

    svg.append('text')
      .attr('x', xCenter).attr('y', condY + 56)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 13)
      .attr('fill', C.dimmed)
      .text('Only the starting balance differs.');
  }

  // ACT 4, compound trajectories diverging 1989 to 2024.
  function drawAct4Compound() {
    const years = d3.range(1989, 2025);
    function project(start) {
      const series = [];
      let bal = start;
      for (let y of years) {
        series.push({year: y, value: bal});
        bal = bal * 1.06 + 5000;
      }
      return series;
    }
    const whiteSeries = project(100000);
    const blackSeries = project(9300);

    const innerW = chartW - M.l - M.r;
    const innerH = chartH - M.t - M.b - 30;

    const x = d3.scaleLinear()
      .domain([1989, 2024])
      .range([M.l, M.l + innerW]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(whiteSeries, d => d.value) * 1.05])
      .range([M.t + innerH, M.t]);

    svg.append('text')
      .attr('x', M.l).attr('y', M.t - 24)
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', 18).attr('fill', C.text)
      .text('Compounded forward 35 years…');

    svg.append('g')
      .attr('transform', `translate(0, ${M.t + innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format('d')))
      .call(g => g.select('.domain').attr('stroke', '#b8b0a0'))
      .selectAll('text')
        .attr('fill', C.dimmed)
        .attr('font-size', 11);

    svg.append('g')
      .attr('transform', `translate(${M.l}, 0)`)
      .call(d3.axisLeft(y).ticks(5)
        .tickFormat(d => '$' + d3.format('.2s')(d)))
      .call(g => g.select('.domain').attr('stroke', '#b8b0a0'))
      .selectAll('text')
        .attr('fill', C.dimmed)
        .attr('font-size', 11);

    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(whiteSeries)
      .attr('fill', 'none')
      .attr('stroke', C.white)
      .attr('stroke-width', 3)
      .attr('d', line);

    svg.append('path')
      .datum(blackSeries)
      .attr('fill', 'none')
      .attr('stroke', C.black)
      .attr('stroke-width', 3)
      .attr('d', line);

    const wEnd = whiteSeries[whiteSeries.length - 1];
    const bEnd = blackSeries[blackSeries.length - 1];

    svg.append('text')
      .attr('x', x(wEnd.year) + 8)
      .attr('y', y(wEnd.value))
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 13).attr('fill', C.white)
      .attr('font-weight', 700)
      .text('$' + Math.round(wEnd.value / 1000) + 'K');

    svg.append('text')
      .attr('x', x(bEnd.year) + 8)
      .attr('y', y(bEnd.value))
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 13).attr('fill', C.black)
      .attr('font-weight', 700)
      .text('$' + Math.round(bEnd.value / 1000) + 'K');

    const gapAmt = wEnd.value - bEnd.value;
    svg.append('text')
      .attr('x', x(wEnd.year))
      .attr('y', M.t + innerH + 40)
      .attr('text-anchor', 'end')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 13).attr('fill', C.text)
      .text(`Absolute gap widens to ~$${Math.round(gapAmt/1000)}K`);
  }

  // ACT 5, today's wealth gap as two giant numbers.
  // Same chartH-relative spacing as Act III for visual
  // rhythm. Two columns at xCenter * 0.55 and 1.45 form
  // a symmetric pair across the panel.
  function drawAct5Today() {
    const xCenter = chartW / 2;
    const L = twoColumnLayout();

    // Eyebrow at top
    svg.append('text')
      .attr('x', xCenter).attr('y', M.t)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 12)
      .attr('letter-spacing', '0.2em')
      .attr('fill', C.dimmed)
      .text('MEDIAN HOUSEHOLD NET WORTH · 2024');

    // ── White household column ──
    svg.append('text')
      .attr('x', L.col1X)
      .attr('y', L.col1Y + L.labelOffset)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', C.dimmed)
      .text('White household');

    svg.append('text')
      .attr('x', L.col1X)
      .attr('y', L.col1Y)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', L.valueSize)
      .attr('font-weight', 500)
      .attr('fill', C.white)
      .text('$285,000');

    // ── Black household column ──
    svg.append('text')
      .attr('x', L.col2X)
      .attr('y', L.col2Y + L.labelOffset)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 12)
      .attr('font-weight', 600)
      .attr('fill', C.dimmed)
      .text('Black household');

    svg.append('text')
      .attr('x', L.col2X)
      .attr('y', L.col2Y)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', L.valueSize)
      .attr('font-weight', 500)
      .attr('fill', C.black)
      .text('$44,000');

    // ── Gap arrow between the two values ──
    drawGapArrow(L, '$241K GAP');

    // ── Synthesis lines ──
    const synthY = L.stacked
      ? L.col2Y + 80
      : chartH - 130;

    svg.append('text')
      .attr('x', xCenter).attr('y', synthY)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Georgia, serif')
      .attr('font-style', 'italic')
      .attr('font-size', 16)
      .attr('fill', C.text)
      .text('Same effort. Same returns.');

    svg.append('text')
      .attr('x', xCenter).attr('y', synthY + 26)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Georgia, serif')
      .attr('font-style', 'italic')
      .attr('font-size', 16)
      .attr('fill', C.text)
      .text('Different starting balance.');

    svg.append('text')
      .attr('x', xCenter).attr('y', synthY + 60)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 13)
      .attr('fill', C.dimmed)
      .text('The asset contract pays compound interest on what you already own.');
  }

  // ── HELPERS ────────────────────────────────

  function drawBar(x, y, w, h, pctFilled, label,
                   caption, fillColor) {
    svg.append('rect')
      .attr('x', x).attr('y', y)
      .attr('width', w).attr('height', h)
      .attr('fill', C.empty)
      .attr('stroke', '#d4cfc4')
      .attr('stroke-width', 1);

    const fillH = h * (pctFilled / 100);
    svg.append('rect')
      .attr('x', x).attr('y', y + h - fillH)
      .attr('width', w).attr('height', fillH)
      .attr('fill', fillColor);

    svg.append('text')
      .attr('x', x + w/2)
      .attr('y', y + h - fillH - 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Playfair Display, Georgia, serif')
      .attr('font-size', 30).attr('fill', fillColor)
      .attr('font-weight', 500)
      .text(label);

    svg.append('text')
      .attr('x', x + w/2)
      .attr('y', y + h + 22)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', 12).attr('fill', C.text)
      .attr('font-weight', 600)
      .text(caption);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
