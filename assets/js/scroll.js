(function() {

  /* ── NAVBAR background on scroll ── */
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 60) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  /* ── REVEAL AND HIDE on scroll ──
     - .fade-up gets .in-view when entering viewport
     - .fade-up gets .out-view when scrolled past (above viewport) */
  function initScrollReveal() {
    var elements = document.querySelectorAll('.fade-up');
    if (!elements.length) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          entry.target.classList.remove('out-view');
        } else {
          var rect = entry.boundingClientRect;
          if (rect.bottom < 0) {
            entry.target.classList.add('out-view');
            entry.target.classList.remove('in-view');
          } else {
            entry.target.classList.remove('in-view');
            entry.target.classList.remove('out-view');
          }
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -8% 0px'
    });

    elements.forEach(function(el) {
      observer.observe(el);
    });
  }

  /* ── FULL-SECTION dim as user scrolls past ── */
  function initSectionFade() {
    var sections = document.querySelectorAll(
      '.narrative-section, .analysis-section'
    );
    if (!sections.length) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.pointerEvents = 'auto';
        } else {
          var rect = entry.boundingClientRect;
          if (rect.bottom < 0) {
            entry.target.style.opacity = '0.3';
          }
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px 0px 0px' });

    sections.forEach(function(sec) {
      sec.style.transition = 'opacity 0.6s ease';
      observer.observe(sec);
    });
  }

  /* ── AUDIO: click-to-unmute for the opening YouTube video ──
     Browsers block autoplay-with-sound, so the iframe always loads muted.
     This wires the YouTube IFrame Player API to a single button so the
     viewer can opt in to audio with one click. */
  function initAudioControl() {
    var btn = document.getElementById('unmute-btn');
    var iframe = document.getElementById('opening-iframe');
    if (!btn || !iframe) return;

    var ytPlayer = null;

    /* Load the YouTube IFrame API once */
    if (!document.getElementById('yt-iframe-api')) {
      var tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = function() {
      ytPlayer = new YT.Player('opening-iframe', {
        events: {
          onReady: function() { /* ready; stays muted until user clicks */ }
        }
      });
    };

    btn.addEventListener('click', function() {
      if (ytPlayer && typeof ytPlayer.unMute === 'function') {
        ytPlayer.unMute();
        try { ytPlayer.setVolume(70); } catch(e) {}
      } else {
        /* Fallback: if YouTube API never loaded, try local <video> */
        var localVid = document.getElementById('local-opening');
        if (localVid) {
          localVid.muted = false;
          localVid.volume = 0.7;
        }
      }
      btn.classList.add('hidden');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initScrollReveal();
      initSectionFade();
      initAudioControl();
    });
  } else {
    initScrollReveal();
    initSectionFade();
    initAudioControl();
  }

})();
