/* ──────────────────────────────────────────────────────────
 * Five Americas Atlas, interactive D3 map.
 *
 * Renders five colored markers on a US states basemap.
 * Clicking any marker slides in a full-detail panel from
 * the right with photo, stats, mechanism context, quote,
 * and three mini-trajectory charts.
 *
 * Dependencies (loaded by index head):
 *   - d3 v7
 *   - topojson-client@3
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const STATES_URL =
    'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';
  const DATA_URL = 'assets/data/five-americas.json';

  let atlasContainer, mapSvg, modalEl;
  let data, projection, path;

  function init() {
    atlasContainer = document.getElementById('five-americas-atlas');
    if (!atlasContainer) return;
    if (typeof d3 === 'undefined') {
      console.error('[atlas] d3 not loaded');
      return;
    }
    if (typeof topojson === 'undefined') {
      console.error('[atlas] topojson-client not loaded');
      return;
    }

    Promise.all([
      fetch(DATA_URL).then(r => r.json()),
      fetch(STATES_URL).then(r => r.json()),
    ]).then(([atlas, states]) => {
      data = atlas;
      buildMap(states);
      buildModal();
      attachKeyHandlers();
    }).catch(err => console.error('[atlas]', err));
  }

  // ─── MAP ────────────────────────────────────

  function buildMap(states) {
    const W = atlasContainer.clientWidth || 1100;
    const H = Math.min(W * 0.62, 700);

    mapSvg = d3.select(atlasContainer)
      .append('svg')
      .attr('class', 'atlas-map')
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const stateFeatures =
      topojson.feature(states, states.objects.states);

    projection = d3.geoAlbersUsa()
      .fitSize([W, H * 0.95], stateFeatures);

    path = d3.geoPath().projection(projection);

    // Background, states.
    mapSvg.append('g')
      .attr('class', 'states-layer')
      .selectAll('path')
      .data(stateFeatures.features)
      .join('path')
      .attr('d', path)
      .attr('fill', '#ece4d3')
      .attr('stroke', '#d4cfc4')
      .attr('stroke-width', 0.8);

    // Foreground, five interactive markers.
    const markers = mapSvg.append('g')
      .attr('class', 'markers-layer')
      .selectAll('g')
      .data(data.communities)
      .join('g')
      .attr('transform', d => {
        const p = projection([d.lon, d.lat]);
        return p ? `translate(${p[0]}, ${p[1]})` : 'translate(-99,-99)';
      })
      .attr('class', 'marker')
      .style('cursor', 'pointer')
      .on('click', (event, d) => openModal(d))
      .on('mouseenter', function () {
        d3.select(this).select('circle.marker-dot')
          .transition().duration(200)
          .attr('r', 24);
      })
      .on('mouseleave', function () {
        d3.select(this).select('circle.marker-dot')
          .transition().duration(200)
          .attr('r', 18);
      });

    // Pulse ring drawn FIRST so the solid dot sits on top.
    markers.append('circle')
      .attr('class', 'pulse-ring')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    markers.append('circle')
      .attr('class', 'marker-dot')
      .attr('r', 18)
      .attr('fill', d => d.color)
      .attr('stroke', '#faf7f1')
      .attr('stroke-width', 3);

    markers.append('text')
      .attr('y', -28)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '13px')
      .attr('font-weight', 600)
      .attr('fill', '#1a1816')
      .text(d => d.name);
  }

  // ─── MODAL ──────────────────────────────────

  function buildModal() {
    modalEl = document.createElement('div');
    modalEl.className = 'atlas-modal';
    modalEl.innerHTML = `
      <div class="atlas-modal__backdrop"></div>
      <div class="atlas-modal__panel">
        <button class="atlas-modal__close" aria-label="Close">×</button>
        <div class="atlas-modal__body"></div>
      </div>
    `;
    document.body.appendChild(modalEl);

    modalEl.querySelector('.atlas-modal__backdrop')
      .addEventListener('click', closeModal);
    modalEl.querySelector('.atlas-modal__close')
      .addEventListener('click', closeModal);
  }

  function openModal(community) {
    const body = modalEl.querySelector('.atlas-modal__body');
    body.innerHTML = renderModalContent(community);
    body.scrollTop = 0;

    modalEl.classList.add('is-open');
    document.body.classList.add('atlas-modal-open');

    // Draw mini charts after the panel is visible so the
    // SVG getBoundingClientRect returns a real width.
    requestAnimationFrame(() => {
      drawMiniChart('chart-income', community.income,
                    community.color, '× national', 0, 1.6);
      drawMiniChart('chart-poverty', community.poverty,
                    community.color, '%', 0, 70);
      drawMiniChart('chart-homeownership',
                    community.homeownership,
                    community.color, '%', 0, 100);
    });
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    document.body.classList.remove('atlas-modal-open');
  }

  function renderModalContent(c) {
    const statBlocks = c.stats.map(s => `
      <div class="stat-block">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-note">${s.note}</div>
      </div>
    `).join('');

    return `
      <header class="modal-header">
        <span class="modal-eyebrow" style="color:${c.color};">
          ${c.mechanism}
        </span>
        <h2 class="modal-title">${c.name}</h2>
      </header>

      <figure class="modal-photo">
        <img src="${c.photo}" alt="${c.name}" loading="lazy">
        <figcaption>${c.photo_caption}</figcaption>
      </figure>

      <div class="modal-stats">${statBlocks}</div>

      <section class="modal-context">
        <p>${c.context}</p>
      </section>

      <blockquote class="modal-quote" style="border-color:${c.color};">
        <p>"${c.quote}"</p>
        <cite>${c.quote_attribution}</cite>
      </blockquote>

      <section class="modal-charts">
        <h3 class="charts-title">Six decades of trajectory</h3>
        <div class="charts-grid">
          <div class="chart-cell">
            <div class="chart-label">Income vs. national median</div>
            <svg id="chart-income" class="mini-chart"></svg>
          </div>
          <div class="chart-cell">
            <div class="chart-label">Poverty rate</div>
            <svg id="chart-poverty" class="mini-chart"></svg>
          </div>
          <div class="chart-cell">
            <div class="chart-label">Homeownership rate</div>
            <svg id="chart-homeownership" class="mini-chart"></svg>
          </div>
        </div>
      </section>
    `;
  }

  // ─── MINI CHART ─────────────────────────────

  function drawMiniChart(elId, series, color, unit, yMin, yMax) {
    const svg = d3.select('#' + elId);
    svg.selectAll('*').remove();
    const node = svg.node();
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const W = rect.width || 280;
    const H = 140;
    const M = {t: 12, r: 18, b: 26, l: 32};

    svg.attr('viewBox', `0 0 ${W} ${H}`);

    const x = d3.scaleLinear()
      .domain(d3.extent(series, d => d.year))
      .range([M.l, W - M.r]);
    const y = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([H - M.b, M.t]);

    // X axis
    svg.append('g')
      .attr('transform', `translate(0, ${H - M.b})`)
      .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format('d')))
      .call(g => g.select('.domain').attr('stroke', '#b8b0a0'))
      .selectAll('text')
        .attr('fill', '#6a6258')
        .attr('font-size', 10);

    // Y axis
    svg.append('g')
      .attr('transform', `translate(${M.l}, 0)`)
      .call(d3.axisLeft(y).ticks(3))
      .call(g => g.select('.domain').attr('stroke', '#b8b0a0'))
      .selectAll('text')
        .attr('fill', '#6a6258')
        .attr('font-size', 10);

    // Line
    const line = d3.line()
      .x(d => x(d.year))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(series)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Markers
    svg.selectAll('circle.dot')
      .data(series)
      .join('circle')
      .attr('class', 'dot')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.value))
      .attr('r', 3)
      .attr('fill', color);
  }

  // ─── KEYBOARD ───────────────────────────────

  function attachKeyHandlers() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' &&
          modalEl &&
          modalEl.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
