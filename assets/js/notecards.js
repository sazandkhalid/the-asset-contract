/* ──────────────────────────────────────────────────────────
 * Notecard badges + modal popup.
 *
 * For each iframe[src*="outputs/figures/"] whose filename
 * stem matches a key in assets/data/notecards.json, attaches
 * a small pill-shaped badge to the figure container. Clicking
 * the badge opens a single shared modal (built once and
 * appended to <body>) populated with that figure's reader's
 * guide.
 *
 * Pure DOM augmentation — no edits to index.qmd or to any
 * figure HTML are required.
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* Rotating badge labels so the site doesn't repeat the
     same phrasing on every figure. */
  var LABELS = [
    'How to read this',
    "Reader's note",
    'Open the field guide',
    'What am I looking at?',
    'Decode this chart',
    'A note from the analyst',
    'Show me how'
  ];

  var notecardsData = null;
  var modalEl = null;

  function init() {
    fetch('assets/data/notecards.json')
      .then(function (r) {
        if (!r.ok) throw new Error('fetch failed: ' + r.status);
        return r.json();
      })
      .then(function (data) {
        notecardsData = data;
        buildModal();
        attachBadges();
        attachKeyHandlers();
      })
      .catch(function (err) {
        console.warn('[notecards]', err);
      });
  }

  function buildModal() {
    modalEl = document.createElement('div');
    modalEl.className = 'notecard-modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.innerHTML =
      '<div class="notecard-modal__card">' +
        '<button class="notecard-modal__close" aria-label="Close">×</button>' +
        '<span class="notecard-modal__eyebrow">How to read this</span>' +
        '<h4 class="notecard-modal__title"></h4>' +
        '<div class="notecard-modal__section" data-slot="what">' +
          '<span class="notecard-modal__section-label">What you see</span>' +
          '<p class="notecard-modal__section-text"></p>' +
        '</div>' +
        '<div class="notecard-modal__section" data-slot="how">' +
          '<span class="notecard-modal__section-label">How to use it</span>' +
          '<p class="notecard-modal__section-text"></p>' +
        '</div>' +
        '<div class="notecard-modal__section" data-slot="look">' +
          '<span class="notecard-modal__section-label">What to look for</span>' +
          '<p class="notecard-modal__section-text"></p>' +
        '</div>' +
        '<p class="notecard-modal__source"></p>' +
      '</div>';
    document.body.appendChild(modalEl);

    /* Close on backdrop click or × button. */
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl ||
          e.target.classList.contains('notecard-modal__close')) {
        closeModal();
      }
    });
  }

  function attachBadges() {
    var iframes = document.querySelectorAll(
      'iframe[src*="outputs/figures/"]'
    );

    var i = 0;
    var matched = 0;
    var unmatched = [];

    iframes.forEach(function (iframe) {
      var src = iframe.getAttribute('src') || '';
      var key = Object.keys(notecardsData).find(function (k) {
        return src.indexOf(k) !== -1;
      });
      if (!key) {
        unmatched.push(src.split('/').pop());
        return;
      }

      var container = iframe.closest('.figure-embed-container');
      if (!container) return;
      if (container.querySelector('.notecard-badge')) return; // already attached

      var labelText = LABELS[i % LABELS.length];
      i += 1;

      var badge = document.createElement('button');
      badge.className = 'notecard-badge';
      badge.setAttribute('aria-label',
        'Open reader notes for this figure');
      badge.innerHTML =
        '<span>' + labelText + '</span>' +
        '<span class="notecard-badge__arrow" aria-hidden="true">↗</span>';
      badge.addEventListener('click', function (e) {
        e.stopPropagation();
        openModal(notecardsData[key]);
      });

      container.appendChild(badge);
      matched++;
    });

    console.log('[notecards] attached ' + matched + ' badges; ' +
                'unmatched: ' + (unmatched.length ? unmatched.join(', ') : 'none'));
  }

  function openModal(data) {
    if (!modalEl) return;
    modalEl.querySelector('.notecard-modal__title').textContent     = data.title || '';
    modalEl.querySelector('[data-slot="what"] p').textContent       = data.what_you_see || '';
    modalEl.querySelector('[data-slot="how"] p').textContent        = data.how_to_use || '';
    modalEl.querySelector('[data-slot="look"] p').textContent       = data.what_to_look_for || '';
    modalEl.querySelector('.notecard-modal__source').textContent    = data.source || '';
    modalEl.classList.add('is-open');
    document.body.classList.add('notecard-open');
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    document.body.classList.remove('notecard-open');
  }

  function attachKeyHandlers() {
    document.addEventListener('keydown', function (e) {
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
