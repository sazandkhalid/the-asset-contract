/* ──────────────────────────────────────────────────────────
 * Mountaintop closing video, controller.
 *
 * Plays roughly the closing two minutes of MLK's April 3
 * 1968 Mason Temple speech. After 115 seconds it fades to
 * black and smooth-scrolls into the policy memo wheel.
 *
 * The Dailymotion iframe handles autoplay + muted + the
 * 41:30 start offset on its own; we only need to drive
 * the caption fade, the hard cut, and the post-cut scroll.
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const CUT_AT_MS         = 115 * 1000;   // 1:55 of playback
  const CAPTION_AT_MS     = 1500;          // 1.5s in
  const CAPTION_HIDE_AT_MS = 8000;         // 8s in

  function init() {
    const host = document.getElementById('mountaintop-closing');
    if (!host) return;

    const caption = host.querySelector(
      '.mountaintop-closing__caption');

    setTimeout(() => {
      caption && caption.classList.add('is-visible');
    }, CAPTION_AT_MS);

    setTimeout(() => {
      caption && caption.classList.remove('is-visible');
    }, CAPTION_HIDE_AT_MS);

    setTimeout(() => {
      host.classList.add('is-cut');

      setTimeout(() => {
        const target = document.querySelector(
          '.policy-memos-section, ' +
          '[data-chapter="The Reckoning"]'
        );
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 900);
    }, CUT_AT_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
