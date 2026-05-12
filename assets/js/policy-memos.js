/* ──────────────────────────────────────────────────────────
 * Policy Memos, constellation wheel renderer.
 *
 * Seven memo nodes on a circular ring around a center hub
 * that reads "The Reckoning, Seven interventions, One
 * contract, Rewritten." Dotted curved arcs connect related
 * memos. Hover any node to highlight its connections and
 * dim the rest. Click a node to open the full memo as a
 * centered modal with photo-less header bar in node color,
 * title, finding/mechanism/proposal/impact sections,
 * references footer.
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // Wheel geometry, viewBox-relative.
  const VB_W = 900;
  const VB_H = 760;
  const CX = VB_W / 2;
  const CY = VB_H / 2 + 10;
  const RING_R = 290;     // node placement radius
  const NODE_R = 64;      // node disc radius
  const HUB_R = 110;      // center hub radius

  // Icon SVG path snippets, drawn within a roughly 24x24
  // box centered at origin. Stroke applied via node color.
  const ICONS = {
    scales: 'M-10 -2 L10 -2 M0 -2 L0 8 M-12 8 L-6 8 ' +
            'M6 8 L12 8 M-9 -2 L-12 8 M9 -2 L12 8',
    coin:   'M0 -10 A10 10 0 1 0 0 10 A10 10 0 1 0 0 -10 ' +
            'M-3 -4 L3 -4 M-3 0 L3 0 M-3 4 L3 4',
    seed:   'M0 -10 Q-8 -4 -6 6 Q0 12 6 6 Q8 -4 0 -10 ' +
            'M0 -2 L0 8',
    house:  'M-10 0 L0 -10 L10 0 L10 10 L-10 10 Z ' +
            'M-3 10 L-3 4 L3 4 L3 10',
    hands:  'M-10 4 Q-6 -4 0 -4 Q6 -4 10 4 ' +
            'M-6 4 L-6 10 M6 4 L6 10 M-2 -4 L-2 -10 ' +
            'M2 -4 L2 -10',
    cross:  'M-3 -10 L3 -10 L3 -3 L10 -3 L10 3 L3 3 ' +
            'L3 10 L-3 10 L-3 3 L-10 3 L-10 -3 L-3 -3 Z',
    circles:'M-6 0 A4 4 0 1 0 -6 0.1 Z ' +
            'M6 0 A4 4 0 1 0 6 0.1 Z ' +
            'M0 8 A4 4 0 1 0 0 8.1 Z',
  };

  let memos = [];
  let svgEl, wheelG, modalEl;

  function init() {
    const host = document.getElementById('policy-memos-grid');
    if (!host) return;

    fetch('assets/data/policy-memos.json')
      .then(r => r.json())
      .then(data => {
        memos = data.memos;
        buildWheel(host);
        buildModal();
        attachKeys();
      })
      .catch(err => console.error('[memos]', err));
  }

  // ─── WHEEL ──────────────────────────────────

  function buildWheel(host) {
    host.innerHTML = '';

    svgEl = document.createElementNS(
      'http://www.w3.org/2000/svg', 'svg'
    );
    svgEl.setAttribute('class', 'memo-wheel-svg');
    svgEl.setAttribute('viewBox', `0 0 ${VB_W} ${VB_H}`);
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    host.appendChild(svgEl);

    wheelG = document.createElementNS(
      'http://www.w3.org/2000/svg', 'g'
    );
    svgEl.appendChild(wheelG);

    // 1. Background ring, faint guide circle.
    appendCircle(wheelG, CX, CY, RING_R, {
      fill: 'none',
      stroke: '#d4cfc4',
      'stroke-width': 1,
      'stroke-dasharray': '2 6',
      opacity: 0.55,
    });

    // 2. Connections layer (behind nodes).
    drawConnections();

    // 3. Hub.
    drawHub();

    // 4. Nodes (on top).
    drawNodes();
  }

  function nodePosition(angleDeg) {
    const r = (angleDeg * Math.PI) / 180;
    return {
      x: CX + RING_R * Math.cos(r),
      y: CY + RING_R * Math.sin(r),
    };
  }

  function drawConnections() {
    const drawn = new Set();
    memos.forEach(m => {
      const from = nodePosition(m.angle);
      (m.connections || []).forEach(targetNum => {
        const key = [m.number, targetNum].sort().join('-');
        if (drawn.has(key)) return;
        drawn.add(key);

        const target = memos.find(x => x.number === targetNum);
        if (!target) return;
        const to = nodePosition(target.angle);

        const path = document.createElementNS(
          'http://www.w3.org/2000/svg', 'path'
        );
        // Quadratic curve pulled gently toward the hub.
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const ctrlX = midX + (CX - midX) * 0.35;
        const ctrlY = midY + (CY - midY) * 0.35;
        path.setAttribute('d',
          `M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ` +
          `${to.x} ${to.y}`);
        path.setAttribute('class', 'memo-connection');
        path.dataset.from = m.number;
        path.dataset.to = target.number;
        wheelG.appendChild(path);
      });
    });
  }

  function drawHub() {
    const g = document.createElementNS(
      'http://www.w3.org/2000/svg', 'g'
    );
    g.setAttribute('class', 'memo-hub');
    g.setAttribute('transform', `translate(${CX}, ${CY})`);

    appendCircle(g, 0, 0, HUB_R, {
      fill: '#faf7f1',
      stroke: '#d4cfc4',
      'stroke-width': 1,
    });

    const sub = document.createElementNS(
      'http://www.w3.org/2000/svg', 'text'
    );
    sub.setAttribute('class', 'memo-hub__subtitle');
    sub.setAttribute('x', 0);
    sub.setAttribute('y', -16);
    sub.textContent = 'The Reckoning';
    g.appendChild(sub);

    const lines = [
      'Seven interventions.',
      'One contract.',
      'Rewritten.',
    ];
    lines.forEach((txt, i) => {
      const t = document.createElementNS(
        'http://www.w3.org/2000/svg', 'text'
      );
      t.setAttribute('class', 'memo-hub__title');
      t.setAttribute('x', 0);
      t.setAttribute('y', 10 + i * 22);
      t.textContent = txt;
      g.appendChild(t);
    });

    wheelG.appendChild(g);
  }

  function drawNodes() {
    memos.forEach(m => {
      const pos = nodePosition(m.angle);
      const g = document.createElementNS(
        'http://www.w3.org/2000/svg', 'g'
      );
      g.setAttribute('class', 'memo-node');
      g.setAttribute('data-num', m.number);
      g.setAttribute('transform',
        `translate(${pos.x}, ${pos.y})`);

      // Disc
      appendCircle(g, 0, 0, NODE_R, {
        class: 'memo-node__disc',
        fill: '#faf7f1',
        stroke: m.color,
        'stroke-width': 2,
      });

      // Top arc band (color crescent at top of disc).
      const arc = document.createElementNS(
        'http://www.w3.org/2000/svg', 'path'
      );
      arc.setAttribute('d', describeArc(0, 0, NODE_R,
                                        220, 320));
      arc.setAttribute('fill', m.color);
      g.appendChild(arc);

      // Numeral inside the crescent.
      const numeral = document.createElementNS(
        'http://www.w3.org/2000/svg', 'text'
      );
      numeral.setAttribute('class', 'memo-node__numeral');
      numeral.setAttribute('x', 0);
      numeral.setAttribute('y', -NODE_R + 18);
      numeral.textContent = m.number;
      g.appendChild(numeral);

      // Icon
      const icon = document.createElementNS(
        'http://www.w3.org/2000/svg', 'path'
      );
      icon.setAttribute('d', ICONS[m.icon] || '');
      icon.setAttribute('class', 'memo-node__icon');
      icon.setAttribute('stroke', m.color);
      icon.setAttribute('transform', 'translate(0, -10)');
      g.appendChild(icon);

      // Category label
      const cat = document.createElementNS(
        'http://www.w3.org/2000/svg', 'text'
      );
      cat.setAttribute('class', 'memo-node__category');
      cat.setAttribute('x', 0);
      cat.setAttribute('y', 14);
      cat.textContent = m.category;
      g.appendChild(cat);

      // Headline number
      const headline = document.createElementNS(
        'http://www.w3.org/2000/svg', 'text'
      );
      headline.setAttribute('class', 'memo-node__headline');
      headline.setAttribute('x', 0);
      headline.setAttribute('y', 36);
      headline.textContent = m.headline_number;
      g.appendChild(headline);

      // Interactions
      g.addEventListener('mouseenter',
        () => hoverNode(m, true));
      g.addEventListener('mouseleave',
        () => hoverNode(m, false));
      g.addEventListener('click',
        () => openModal(m));

      wheelG.appendChild(g);
    });
  }

  function hoverNode(memo, on) {
    if (on) {
      svgEl.classList.add('has-hover');
      const related = new Set([memo.number,
                               ...(memo.connections || [])]);
      svgEl.querySelectorAll('.memo-node').forEach(n => {
        if (related.has(n.dataset.num)) {
          n.classList.add('is-related');
        } else {
          n.classList.remove('is-related');
        }
      });
      svgEl.querySelectorAll('.memo-connection').forEach(c => {
        const involved = c.dataset.from === memo.number ||
                         c.dataset.to === memo.number;
        c.classList.toggle('is-active', involved);
      });
    } else {
      svgEl.classList.remove('has-hover');
      svgEl.querySelectorAll('.memo-node').forEach(n =>
        n.classList.remove('is-related'));
      svgEl.querySelectorAll('.memo-connection').forEach(c =>
        c.classList.remove('is-active'));
    }
  }

  // ─── MODAL ──────────────────────────────────

  function buildModal() {
    modalEl = document.createElement('div');
    modalEl.className = 'memo-modal';
    modalEl.innerHTML = `
      <div class="memo-modal__backdrop"></div>
      <div class="memo-modal__card">
        <button class="memo-modal__close"
                aria-label="Close">×</button>
        <div class="memo-modal__header"></div>
        <div class="memo-modal__body"></div>
      </div>
    `;
    document.body.appendChild(modalEl);

    modalEl.querySelector('.memo-modal__backdrop')
      .addEventListener('click', closeModal);
    modalEl.querySelector('.memo-modal__close')
      .addEventListener('click', closeModal);
  }

  function openModal(m) {
    const header = modalEl.querySelector('.memo-modal__header');
    header.style.background = m.color;
    header.innerHTML = `
      <span class="memo-modal__numeral">No. ${m.number}</span>
      <span>${m.category}</span>
    `;

    const body = modalEl.querySelector('.memo-modal__body');
    body.innerHTML = `
      <h3 class="memo-modal__title">${m.title}</h3>

      <div class="memo-modal__section">
        <span class="memo-modal__label">The finding</span>
        <p class="memo-modal__text">${m.finding}</p>
      </div>

      <div class="memo-modal__section">
        <span class="memo-modal__label">The mechanism</span>
        <p class="memo-modal__text">${m.mechanism}</p>
      </div>

      <div class="memo-modal__section">
        <span class="memo-modal__label">The proposal</span>
        <p class="memo-modal__text">${m.proposal}</p>
      </div>

      <div class="memo-modal__section">
        <span class="memo-modal__label">Projected impact</span>
        <p class="memo-modal__text">${m.impact}</p>
      </div>

      <div class="memo-modal__footer">
        References: ${m.references}
      </div>
    `;

    modalEl.querySelector('.memo-modal__card').scrollTop = 0;
    modalEl.classList.add('is-open');
    document.body.classList.add('memo-modal-open');
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    document.body.classList.remove('memo-modal-open');
  }

  function attachKeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' &&
          modalEl &&
          modalEl.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

  // ─── HELPERS ────────────────────────────────

  function appendCircle(parent, cx, cy, r, attrs) {
    const c = document.createElementNS(
      'http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', cx);
    c.setAttribute('cy', cy);
    c.setAttribute('r', r);
    Object.entries(attrs || {}).forEach(([k, v]) =>
      c.setAttribute(k, v));
    parent.appendChild(c);
    return c;
  }

  function polarToCartesian(cx, cy, r, angleDeg) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(a),
      y: cy + r * Math.sin(a),
    };
  }

  function describeArc(cx, cy, r, startA, endA) {
    const start = polarToCartesian(cx, cy, r, endA);
    const end = polarToCartesian(cx, cy, r, startA);
    const largeArc = endA - startA <= 180 ? 0 : 1;
    return [
      'M', start.x, start.y,
      'A', r, r, 0, largeArc, 0, end.x, end.y,
      'L', cx, cy,
      'Z',
    ].join(' ');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
