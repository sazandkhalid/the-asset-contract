/* ──────────────────────────────────────────────────────────
 * Opening hero — HTML5 <video>
 *   - Source: assets/video/dylan_1965.mov (already muted via
 *     the `muted` attribute so autoplay is allowed).
 *   - Held back behind a black title card for TITLE_DELAY ms,
 *     then fades in and plays.
 *   - At second CUT_AT (37) of playback, hard-cuts the
 *     #clip-fade-overlay to black, removes the <video> from
 *     the DOM (so audio actually stops), and smooth-scrolls
 *     to #opening-statement.
 *   - Listens for the `asset-contract-audio` event so the
 *     bottom-left Sound toggle drives video.muted directly.
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var CUT_AT      = 37;       // seconds of playback
  var TITLE_DELAY = 5400;     // ms — let the title card animation finish
  var FALLBACK    = TITLE_DELAY + (CUT_AT + 4) * 1000;

  var videoEl = document.getElementById('dm-opening');
  if (!videoEl || videoEl.tagName !== 'VIDEO') return;

  var hasCut = false;

  /* The .video-local class handles position/size/object-fit.
     We only override what the JS sequence needs: hidden until
     the title card finishes, no clicks, slight grade. */
  videoEl.style.opacity = '0';
  videoEl.style.transition = 'opacity 1.2s ease';
  videoEl.style.pointerEvents = 'none';
  videoEl.style.filter = 'grayscale(90%) brightness(0.55) contrast(1.05)';
  videoEl.muted = true; // start muted; audio toggle can flip it

  function applyAudio(enabled) {
    try { videoEl.muted = !enabled; } catch (e) {}
    if (enabled) {
      try { videoEl.volume = 0.7; } catch (e) {}
    }
  }

  // Sync with the global Sound toggle in story.js.
  window.addEventListener('asset-contract-audio', function (e) {
    var on = !!(e.detail && e.detail.enabled);
    applyAudio(on);
  });

  function startVideo() {
    videoEl.style.opacity = '1';
    var p = videoEl.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { /* autoplay denied — leave muted preview */ });
    }
    applyAudio(!!window.__assetContractAudio);
  }

  function hardCutAndScroll() {
    if (hasCut) return;
    hasCut = true;

    var overlay = document.getElementById('clip-fade-overlay');
    if (overlay) {
      overlay.classList.add('hard-cut');
      overlay.style.opacity = '1';
    }

    // Stop and tear down the <video>. Just pausing isn't enough —
    // removeChild guarantees no audio leaks past the cut.
    try { videoEl.pause(); } catch (e) {}
    try { videoEl.removeAttribute('src'); videoEl.load(); } catch (e) {}
    if (videoEl.parentNode) videoEl.parentNode.removeChild(videoEl);

    setTimeout(function () {
      var target = document.getElementById('opening-statement');
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 600);
  }

  // Watch playback time; fire the cut at CUT_AT. timeupdate fires
  // ~4× per second on most browsers — accurate enough for our cut.
  videoEl.addEventListener('timeupdate', function () {
    if (!hasCut && videoEl.currentTime >= CUT_AT) hardCutAndScroll();
  });

  // Hold the title card; then start playback.
  setTimeout(startVideo, TITLE_DELAY);

  // Wall-clock fallback in case the video stalls or never reaches CUT_AT.
  setTimeout(hardCutAndScroll, FALLBACK);
})();
