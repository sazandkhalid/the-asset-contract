/* ──────────────────────────────────────────────────────────
 * Dailymotion opening hero
 *   Embeds video x8q93rj via the geo.dailymotion.com iframe
 *   player, autoplays muted, listens for timeupdate events
 *   over postMessage, and hard-cuts to black at second
 *   CUT_AT (37) before smooth-scrolling to #opening-statement.
 *   A wall-clock setTimeout serves as a fallback in case
 *   timeupdate stalls or the iframe fails to post events.
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var VIDEO_ID    = 'x8q93rj';
  var CUT_AT      = 37;                 // seconds of playback
  var TITLE_DELAY = 5400;               // ms — let the title card animation finish
  var FALLBACK    = TITLE_DELAY + (CUT_AT + 3) * 1000;

  var mountEl = document.getElementById('dm-opening');
  if (!mountEl) return;

  var hasCut = false;
  var iframe = null;

  function hardCutAndScroll() {
    if (hasCut) return;
    hasCut = true;

    var overlay = document.getElementById('clip-fade-overlay');
    if (overlay) {
      overlay.classList.add('hard-cut');
      overlay.style.opacity = '1';
    }

    // Tear the iframe down so video + audio actually stop. The
    // overlay alone only hides the picture; the player keeps
    // playing behind it.
    if (iframe && iframe.parentNode) {
      try { iframe.src = 'about:blank'; } catch (e) {}
      iframe.parentNode.removeChild(iframe);
    }

    setTimeout(function () {
      var target = document.getElementById('opening-statement');
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 600);
  }

  function buildIframe() {
    var params = [
      'video=' + VIDEO_ID,
      'autoplay=1',
      'mute=1',
      'controls=0',
      'ui-logo=0',
      'ui-start-screen-info=0',
      'queue-enable=0',
      'queue-autoplay-next=0',
      'sharing-enable=0'
    ].join('&');

    iframe = document.createElement('iframe');
    iframe.src = 'https://geo.dailymotion.com/player.html?' + params;
    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
    iframe.setAttribute('allowfullscreen', '');
    iframe.frameBorder = '0';
    iframe.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;border:0;' +
      'opacity:0;transition:opacity 1.2s ease;' +
      'filter:grayscale(90%) brightness(0.55) contrast(1.05);';
    mountEl.appendChild(iframe);
    // Fade the iframe in on the next frame so the title card
    // doesn't snap-cut into the video.
    requestAnimationFrame(function () { iframe.style.opacity = '1'; });
  }

  // Hold a black frame while the title card animates, then start
  // the video.
  setTimeout(buildIframe, TITLE_DELAY);

  // The Dailymotion player posts URL-encoded query strings on its
  // contentWindow → window. Example payload: "event=timeupdate&time=12.34"
  function parsePayload(data) {
    if (typeof data !== 'string') return null;
    var out = {};
    data.split('&').forEach(function (pair) {
      var i = pair.indexOf('=');
      if (i === -1) return;
      var k = decodeURIComponent(pair.slice(0, i));
      var v = decodeURIComponent(pair.slice(i + 1));
      out[k] = v;
    });
    return out;
  }

  window.addEventListener('message', function (e) {
    if (!iframe || !iframe.contentWindow || e.source !== iframe.contentWindow) return;
    var p = parsePayload(e.data);
    if (!p || !p.event) return;
    if (p.event === 'timeupdate') {
      var t = parseFloat(p.time);
      if (!isNaN(t) && t >= CUT_AT) hardCutAndScroll();
    }
  });

  // Fallback in case timeupdate events don't arrive.
  setTimeout(hardCutAndScroll, FALLBACK);
})();
