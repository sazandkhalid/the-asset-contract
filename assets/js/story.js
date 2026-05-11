/* ── Resize handshake for embedded Plotly figure iframes.
   Called from each iframe's onload="resizeFigure(this)" attribute,
   plus on window load and resize. Lives at top level so the inline
   onload attribute can reach it. */
function resizeFigure(iframe) {
  try { iframe.contentWindow.postMessage('resize', '*'); } catch (e) {}
  iframe.style.width = '1px';
  iframe.style.width = '100%';
  setTimeout(function () {
    try { iframe.contentWindow.dispatchEvent(new Event('resize')); } catch (e) {}
  }, 300);
}

window.addEventListener('load', function () {
  document.querySelectorAll('.figure-iframe').forEach(function (f) {
    resizeFigure(f);
  });
});

window.addEventListener('resize', function () {
  document.querySelectorAll('.figure-iframe').forEach(function (f) {
    resizeFigure(f);
  });
}, { passive: true });


(function () {
  'use strict';

  /* ── 1. YOUTUBE IFRAME API ───────────────────────────────── */
  var ytApiLoaded = false;
  var players = {};
  /* Per-player clip windows, indexed by data-yt-id. The viewport
     observer reads these so it can hard-snap to clipStart when the
     section re-enters view (otherwise YouTube's loop wrap can leave
     the playhead at t=0 and the video resumes from the wrong frame). */
  var clipWindows = {};
  /* Audio is OFF by default. The user enables it via the audio
     toggle (which counts as the user-interaction browsers require
     for sound). Once enabled, sound follows the in-viewport
     section only. */
  var audioEnabled = false;

  function loadYouTubeAPI() {
    if (ytApiLoaded) return;
    ytApiLoaded = true;
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  window.onYouTubeIframeAPIReady = function () {
    document.querySelectorAll('iframe[data-yt-id]')
      .forEach(function (iframe) {
        var id = iframe.getAttribute('data-yt-id');
        /* Strict clip boundaries — if the iframe declares a
           data-start / data-end window, enforce it manually because
           YouTube's loop=1 + end= URL params don't reliably restart
           at start. We set a timer at every PLAYING state and seek
           back to start when the timer fires (or when ENDED hits). */
        var clipStart = parseInt(iframe.getAttribute('data-start') || '0', 10);
        var clipEnd   = parseInt(iframe.getAttribute('data-end')   || '0', 10);
        var hasWindow = clipEnd > clipStart;
        var loopTimer = null;

        if (hasWindow) {
          clipWindows[id] = { start: clipStart, end: clipEnd };
        }

        function restartClip(player) {
          try {
            player.seekTo(clipStart, true);
            player.playVideo();
          } catch (err) {}
        }

        players[id] = new YT.Player(iframe, {
          events: {
            onReady: function (e) { e.target.mute(); },
            onStateChange: function (e) {
              if (e.data === YT.PlayerState.ENDED) {
                if (hasWindow) {
                  /* Loop the clip strictly between start and end. */
                  restartClip(e.target);
                } else {
                  fadeOutVideoSection(
                    iframe.closest('.video-section, #opening-video')
                  );
                }
              }

              if (e.data === YT.PlayerState.PLAYING && hasWindow) {
                /* Belt-and-suspenders: schedule a forced seek-back
                   200ms before the configured end. Only restart if
                   the player is still PLAYING (so a viewport pause
                   in the meantime doesn't get unexpectedly resumed). */
                clearTimeout(loopTimer);
                var ms = (clipEnd - clipStart) * 1000;
                loopTimer = setTimeout(function () {
                  try {
                    if (e.target.getPlayerState() === YT.PlayerState.PLAYING) {
                      restartClip(e.target);
                    }
                  } catch (err) {}
                }, Math.max(500, ms - 200));
              }

              if (e.data === YT.PlayerState.PAUSED ||
                  e.data === YT.PlayerState.ENDED) {
                /* When paused (e.g., scrolled out of view), drop
                   the pending restart so the player stays paused. */
                clearTimeout(loopTimer);
              }
            }
          }
        });
      });
  };

  function fadeOutVideoSection(section) {
    if (!section) return;
    var overlay = section.querySelector('.fade-to-black');
    if (overlay) overlay.style.opacity = '1';
  }

  /* ── 2. MUTE / PLAY based on viewport ────────────────────── */
  function initVideoViewport() {
    var videoSections = document.querySelectorAll(
      '.video-section, #opening-video'
    );

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var section = entry.target;
        var iframe = section.querySelector('iframe[data-yt-id]');
        var id = iframe && iframe.getAttribute('data-yt-id');
        var player = id ? players[id] : null;

        if (entry.isIntersecting) {
          section.classList.add('in-view');
          section.classList.remove('leaving');
          if (player && player.playVideo) {
            try {
              if (audioEnabled) {
                player.unMute(); player.setVolume(70);
              } else {
                player.mute();
              }
              /* Hard-snap to clipStart if the playhead drifted out
                 of the clip window (YouTube's loop wrap can leave
                 it at t=0; pausing past the end can leave it at
                 clipEnd). Without this, re-entering the section
                 plays from the wrong frame. */
              var w = clipWindows[id];
              if (w && player.getCurrentTime) {
                var t = player.getCurrentTime() || 0;
                if (t < w.start || t >= w.end - 0.25) {
                  player.seekTo(w.start, true);
                }
              }
              player.playVideo();
            } catch (e) {}
          }
        } else {
          /* Below the threshold (30%) — silence and pause this player
             whether the section is approaching from below or scrolled
             past. This is what prevents previous-section audio bleed
             when scrolling forward into a new chapter. */
          section.classList.remove('in-view');
          if (player) {
            try { player.mute(); player.pauseVideo(); } catch (e) {}
          }
          var rect = entry.boundingClientRect;
          if (rect.bottom < 0) {
            section.classList.add('leaving');
          }
        }
      });
    }, { threshold: 0.3 });

    videoSections.forEach(function (s) { observer.observe(s); });
  }

  /* ── 3. STORY NAVIGATION DOTS ────────────────────────────── */
  function buildStoryNav() {
    var sections = document.querySelectorAll('[data-chapter]');
    if (!sections.length) return;

    var nav = document.createElement('nav');
    nav.id = 'story-nav';
    nav.setAttribute('aria-label', 'Story navigation');

    sections.forEach(function (section, i) {
      var chapter = section.getAttribute('data-chapter');
      var item = document.createElement('div');
      item.className = 'story-nav__item';
      item.setAttribute('data-target', section.id || ('section-' + i));
      item.innerHTML =
        '<span class="story-nav__label">' + chapter + '</span>' +
        '<span class="story-nav__dot"></span>';
      item.addEventListener('click', function () {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      nav.appendChild(item);
    });
    document.body.appendChild(nav);
    updateStoryNav();
  }

  function updateStoryNav() {
    var sections = document.querySelectorAll('[data-chapter]');
    var navItems = document.querySelectorAll('.story-nav__item');
    var midpoint = window.innerHeight * 0.5;

    var currentIndex = 0;
    sections.forEach(function (section, i) {
      var rect = section.getBoundingClientRect();
      if (rect.top <= midpoint) currentIndex = i;
    });

    navItems.forEach(function (item, i) {
      item.classList.toggle('active', i === currentIndex);
    });
  }

  /* ── 4. CHAPTER FLASH ────────────────────────────────────── */
  function initChapterFlash() {
    var overlay = document.createElement('div');
    overlay.id = 'chapter-flash';
    overlay.innerHTML =
      '<p class="chapter-flash__eyebrow"></p>' +
      '<p class="chapter-flash__title"></p>';
    document.body.appendChild(overlay);

    var sections = document.querySelectorAll(
      '.video-section[data-chapter]'
    );
    var fired = new WeakSet();

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.7
            && !fired.has(entry.target)) {
          fired.add(entry.target);
          var eyebrow = entry.target.getAttribute('data-eyebrow') || '';
          var title = entry.target.getAttribute('data-chapter') || '';
          overlay.querySelector('.chapter-flash__eyebrow').textContent = eyebrow;
          overlay.querySelector('.chapter-flash__title').textContent = title;
          overlay.classList.add('visible');
          setTimeout(function () {
            overlay.classList.remove('visible');
          }, 2000);
        }
      });
    }, { threshold: 0.7 });

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ── 5. SCROLL REVEAL ─────────────────────────────────────── */
  function initSectionReveal() {
    var elemObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          entry.target.classList.remove('past');
        } else {
          var rect = entry.boundingClientRect;
          if (rect.bottom < 0) {
            entry.target.classList.add('past');
            entry.target.classList.remove('in-view');
          } else {
            entry.target.classList.remove('in-view');
            entry.target.classList.remove('past');
          }
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });

    document.querySelectorAll('.fade-up').forEach(function (el) {
      elemObserver.observe(el);
    });

    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-active');
          entry.target.classList.remove('section-past');
        } else {
          var rect = entry.boundingClientRect;
          if (rect.bottom < 0) {
            entry.target.classList.add('section-past');
            entry.target.classList.remove('section-active');
          }
        }
      });
    }, { threshold: 0.05 });

    document.querySelectorAll('.narrative-section, .analysis-section')
      .forEach(function (s) {
        s.classList.add('section-hidden');
        sectionObserver.observe(s);
      });
  }

  /* ── 6. AUDIO TOGGLE ──────────────────────────────────────── */
  function initAudioToggle() {
    var btn = document.createElement('button');
    btn.id = 'audio-toggle';
    btn.setAttribute('aria-label', 'Toggle audio');
    btn.innerHTML =
      '<svg class="audio-icon icon-off" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '  <path d="M3 6h2l3-3v10l-3-3H3V6z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
      '  <path d="M11 5l4 6m0-6l-4 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
      '</svg>' +
      '<svg class="audio-icon icon-on" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
      '  <path d="M3 6h2l3-3v10l-3-3H3V6z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>' +
      '  <path d="M11 5c1 1 1 5 0 6M13 3c2 2 2 8 0 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
      '</svg>' +
      '<span class="audio-toggle__label">Sound</span>';
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      audioEnabled = !audioEnabled;
      btn.classList.toggle('audio-on', audioEnabled);
      /* Expose globally so other modules (e.g. opening-sequence.js)
         can read the current state and react. */
      window.__assetContractAudio = audioEnabled;
      window.dispatchEvent(new CustomEvent('asset-contract-audio', {
        detail: { enabled: audioEnabled }
      }));
      /* Apply immediately to whichever chapter player is currently
         in view. The opening sequencer listens for the event above
         and handles its own players. */
      document.querySelectorAll(
        '.video-section.in-view, #opening-video.in-view'
      ).forEach(function (section) {
        var iframe = section.querySelector('iframe[data-yt-id]');
        var id = iframe && iframe.getAttribute('data-yt-id');
        var player = id ? players[id] : null;
        if (!player) return;
        try {
          if (audioEnabled) { player.unMute(); player.setVolume(70); }
          else { player.mute(); }
        } catch (e) {}
      });
    });
  }

  /* ── 7. NAVBAR SCROLL ─────────────────────────────────────── */
  function initNavbar() {
    var navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', function () {
      navbar.classList.toggle('scrolled', window.scrollY > 80);
    }, { passive: true });
  }

  /* ── 8. SECTION THEME TRACKING ────────────────────────────
     Sets body.reading-dark / body.reading-light based on
     which top-level section currently dominates the viewport.
     Used by CSS to switch story-nav contrast against the
     theme of the page under the reader. */
  function initThemeTracker() {
    var DARK_SELECTORS = [
      '#opening-video',
      '#orientation',
      '.video-section',
      'section.narrative-section[data-chapter="The Mechanism"]',
      'section.narrative-section[data-chapter="The Inflection"]',
      'section.narrative-section[data-chapter="Consequences"]',
      'section.narrative-section[data-chapter="Recommendations"]',
      '#methodology'
    ];
    var LIGHT_SELECTORS = [
      'section.narrative-section[data-chapter="The Architecture"]',
      'section.narrative-section[data-chapter="What Worked"]',
      'section.narrative-section[data-chapter="What Averages Conceal"]',
      'section.narrative-section[data-chapter="The Mechanisms"]',
      'section.narrative-section[data-chapter="The Asset Gap"]',
      'section.narrative-section[data-chapter="Find Yourself"]',
      'section.narrative-section:not([data-chapter])',
      'section.analysis-section',
      '#dream-index-scrolly'
    ];
    var darkNodes  = document.querySelectorAll(DARK_SELECTORS.join(','));
    var lightNodes = document.querySelectorAll(LIGHT_SELECTORS.join(','));
    var sections = [];
    darkNodes.forEach(function (n)  { sections.push({el: n, theme: 'dark'}); });
    lightNodes.forEach(function (n) { sections.push({el: n, theme: 'light'}); });

    if (!sections.length) {
      document.body.classList.add('reading-dark');
      return;
    }

    function pickActive() {
      var mid = window.innerHeight * 0.5;
      var best = null;
      var bestDist = Infinity;
      sections.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var center = (r.top + r.bottom) / 2;
        var d = Math.abs(center - mid);
        if (d < bestDist) { bestDist = d; best = s; }
      });
      if (!best) return;
      document.body.classList.toggle('reading-dark',  best.theme === 'dark');
      document.body.classList.toggle('reading-light', best.theme === 'light');
    }

    pickActive();
    window.addEventListener('scroll', pickActive, { passive: true });
    window.addEventListener('resize', pickActive);
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  function init() {
    loadYouTubeAPI();
    buildStoryNav();
    initChapterFlash();
    initSectionReveal();
    initVideoViewport();
    initAudioToggle();
    initNavbar();
    initThemeTracker();
    window.addEventListener('scroll', updateStoryNav, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
