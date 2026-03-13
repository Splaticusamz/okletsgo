// Route mode bootstrap
(function () {
  var isAdminMode = document.documentElement.getAttribute('data-admin-mode') === '1';
  var isTasksMode = document.documentElement.getAttribute('data-tasks-mode') === '1';

  if (isTasksMode) {
    fetch('data/tasks.json', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var updated = document.getElementById('tasksUpdatedAt');
        var content = document.getElementById('tasksContent');
        if (updated) updated.textContent = 'Updated ' + new Date(data.updatedAt).toLocaleString();
        if (!content) return;
        content.innerHTML = '';
        data.sections.forEach(function (section) {
          var wrap = document.createElement('section');
          wrap.style.background = '#0d1023';
          wrap.style.border = '1px solid rgba(255,255,255,.08)';
          wrap.style.borderRadius = '16px';
          wrap.style.padding = '18px';
          var html = '<h2 style="margin:0 0 12px;font-size:18px;">' + section.title + '</h2>';
          html += '<div style="display:grid;gap:10px;">';
          section.items.forEach(function (item) {
            html += '<div style="display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:rgba(255,255,255,.02);">' +
              '<input type="checkbox" disabled ' + (item.done ? 'checked' : '') + ' style="margin-top:3px;width:16px;height:16px;accent-color:#4ecdc4;" />' +
              '<div><div style="font-size:12px;color:#4ecdc4;margin-bottom:4px;">' + item.id + '</div><div>' + item.text + '</div></div>' +
              '</div>';
          });
          html += '</div>';
          wrap.innerHTML = html;
          content.appendChild(wrap);
        });
      })
      .catch(function (err) {
        var content = document.getElementById('tasksContent');
        if (content) content.innerHTML = '<div style="color:#fca5a5;">Failed to load tasks.</div>';
        console.error(err);
      });
    return;
  }

  if (isAdminMode) return;

// Data-driven card rendering
(function () {
  var INSERT_BEFORE_TUESDAY = 'TUESDAY';
  var INSERT_BEFORE_FRIDAY = 'FRIDAY';
  var MODE_ORDER = ['night', 'grownup', 'family'];

  function createCard(dayData) {
    var template = document.getElementById('cardTemplate');
    var fragment = template.content.cloneNode(true);
    var card = fragment.querySelector('.card');
    var imgStrip = fragment.querySelector('.card-img-strip');
    var contentStrip = fragment.querySelector('.card-content-strip');

    MODE_ORDER.forEach(function (mode) {
      var entry = dayData.entries[mode];
      var img = document.createElement('div');
      img.className = 'card-img';
      img.style.backgroundImage = "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 59%), url('" + entry.fallbackImage + "')";
      imgStrip.appendChild(img);

      var content = document.createElement('a');
      content.href = '#';
      content.className = 'card-content';
      content.innerHTML = '<span class="card-day">' + dayData.day + '</span>' +
        '<span class="card-venue">' + entry.venue + '</span>' +
        '<span class="card-city">' + entry.city + '</span>';
      contentStrip.appendChild(content);
    });

    return card;
  }

  fetch('data/current-week.json', { cache: 'no-store' })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var grid = document.getElementById('cardsGrid');
      var ctaTile = grid.querySelector('.utility-tile--cta');
      var brandTile = grid.querySelector('.utility-tile--brand');
      grid.innerHTML = '';

      data.days.forEach(function (day) {
        if (day.day === INSERT_BEFORE_TUESDAY && ctaTile) grid.appendChild(ctaTile);
        if (day.day === INSERT_BEFORE_FRIDAY && brandTile) grid.appendChild(brandTile);
        grid.appendChild(createCard(day));
      });

      if (brandTile && !grid.contains(brandTile)) grid.appendChild(brandTile);

      document.dispatchEvent(new CustomEvent('okletsgo:cards-rendered'));
    })
    .catch(function (err) {
      console.error('Failed to load current week data', err);
    });
})();

// Animated background video swap
function initAnimatedBackgrounds() {
  var VIDEO_MAP = {
    'images/monday-family.jpg': 'videos/optimized/monday-family.mp4',
    'images/monday-night.jpg': 'videos/optimized/monday-night.mp4',
    'images/monday.png': 'videos/optimized/monday.mp4',
    'images/saturday-night.jpg': 'videos/optimized/saturday-night.mp4',
    'images/saturday.png': 'videos/optimized/saturday.mp4',
    'images/sunday-night.jpg': 'videos/optimized/sunday-night.mp4',
    'images/sunday.png': 'videos/optimized/sunday.mp4',
    'images/sunday-family.jpg': 'videos/optimized/sunday-family.mp4',
    'images/thursday-family.jpg': 'videos/optimized/thursday-family.mp4',
    'images/thursday-night.jpg': 'videos/optimized/thursday-night.mp4',
    'images/thursday.png': 'videos/optimized/thursday.mp4',
    'images/tuesday-family.jpg': 'videos/optimized/tuesday-family.mp4',
    'images/tuesday-night.jpg': 'videos/optimized/tuesday-night.mp4',
    'images/tuesday.png': 'videos/optimized/tuesday.mp4',
    'images/friday.png': 'videos/optimized/friday.mp4',
    'images/friday-night.jpg': 'videos/optimized/friday-night.mp4',
    'images/friday-family.jpg': 'videos/optimized/friday-family.mp4',
    'images/saturday-family.jpg': 'videos/optimized/saturday-family.mp4',
    'images/wednesday-family.jpg': 'videos/optimized/wednesday-family.mp4',
    'images/wednesday-night.jpg': 'videos/optimized/wednesday-night.mp4',
    'images/wednesday.png': 'videos/optimized/wednesday.mp4'
  };

  function extractUrl(el) {
    var style = el.getAttribute('style') || '';
    var match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
    return match ? match[1] : null;
  }

  function buildVideo(videoSrc) {
    var video = document.createElement('video');
    video.className = 'card-video';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'none';
    video.disablePictureInPicture = true;
    video.disableRemotePlayback = true;
    video.removeAttribute('controls');
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x-webkit-airplay', 'deny');
    video.setAttribute('disablepictureinpicture', '');
    video.setAttribute('disableremoteplayback', '');
    video.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback nofullscreen');
    video.setAttribute('tabindex', '-1');
    video.setAttribute('aria-hidden', 'true');
    video.src = videoSrc;
    return video;
  }

  function attachAnimatedLayer(el, videoSrc) {
    var spinner = document.createElement('span');
    spinner.className = 'card-spinner is-visible';
    spinner.setAttribute('aria-hidden', 'true');
    el.appendChild(spinner);

    var video = buildVideo(videoSrc);

    var settled = false;

    function done() {
      if (settled) return;
      settled = true;
      video.classList.add('is-ready');
      setTimeout(function () {
        spinner.classList.remove('is-visible');
      }, 700);
    }

    function fail() {
      if (settled) return;
      settled = true;
      spinner.classList.remove('is-visible');
    }

    video.addEventListener('playing', done, { once: true });
    video.addEventListener('timeupdate', function onTimeUpdate() {
      if (video.currentTime > 0.2) {
        video.removeEventListener('timeupdate', onTimeUpdate);
        done();
      }
    });
    video.addEventListener('error', fail, { once: true });
    el.appendChild(video);

    var started = false;
    function start() {
      if (started) return;
      started = true;
      video.preload = 'auto';
      var p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () {});
      }
    }

    var shouldLazyLoad = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

    if (shouldLazyLoad && 'IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            start();
            observer.unobserve(el);
          }
        });
      }, {
        rootMargin: '300px 0px'
      });
      observer.observe(el);
    } else {
      start();
    }
  }

  document.querySelectorAll('.card-img').forEach(function (el) {
    var src = extractUrl(el);
    var videoSrc = src && VIDEO_MAP[src];
    if (!videoSrc) return;
    attachAnimatedLayer(el, videoSrc);
  });
}

document.addEventListener('okletsgo:cards-rendered', initAnimatedBackgrounds);

// Countdown timer — resets every 48 hours from the start of the week
(function () {
  const countdownEl = document.getElementById('countdown');

  function getSecondsUntilReset() {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday
    const hoursLeft = (7 - day) * 24 - now.getHours() + (23 - now.getMinutes()) / 60;
    // Simple: count down to next Sunday midnight
    const target = new Date(now);
    target.setDate(now.getDate() + (7 - day));
    target.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((target - now) / 1000));
  }

  function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function tick() {
    const remaining = getSecondsUntilReset();
    countdownEl.textContent = formatTime(remaining);
  }

  tick();
  setInterval(tick, 1000);
})();

// Toggle logic — family/grown-up + daytime/nightlife with interlock
function initToggleLogic() {
  var dayToggle = document.getElementById('dayToggle');
  var familyToggle = document.getElementById('familyToggle');
  var cards = document.querySelectorAll('.card');
  var firstRun = true;

  // Stagger: 720ms total sequence, 400ms slide duration per card
  var slideDuration = 400;
  var totalSequence = 720;
  var stagger = (totalSequence - slideDuration) / (cards.length - 1);
  var contentDelay = 100;
  var imgEasing = 'cubic-bezier(0.4, 0, 0.2, 1)';
  var contentEasing = 'cubic-bezier(0.25, 0.1, 0.25, 1)';

  // Strip transforms for each mode
  // Image strip order: night(0), grown-up(1), family(2)
  // Content strip order: family(0), grown-up(1), night(2)
  var MODES = {
    grownup: { img: 'translateY(-33.33%)', content: 'translateY(-33.33%)' },
    night:   { img: 'translateY(0%)',       content: 'translateY(-66.67%)' },
    family:  { img: 'translateY(-66.67%)',  content: 'translateY(0%)' }
  };

  var familyTitleEl = document.getElementById('familyTitle');
  var familyDescEl = document.getElementById('familyDesc');
  var dayTitleEl = document.getElementById('dayTitle');
  var dayDescEl = document.getElementById('dayDesc');

  function animateLabel(titleEl, descEl, newTitle, newDesc) {
    if (titleEl.textContent === newTitle) return;
    titleEl.classList.add('fading');
    descEl.classList.add('fading');
    setTimeout(function () {
      titleEl.textContent = newTitle;
      descEl.textContent = newDesc;
      titleEl.classList.remove('fading');
      descEl.classList.remove('fading');
    }, 200);
  }

  function updateLabels() {
    var isFamily = familyToggle.checked;
    var isNight = !dayToggle.checked;
    animateLabel(familyTitleEl, familyDescEl,
      isFamily ? 'Family mode' : 'Grown up',
      isFamily ? 'family friendly events' : 'nightlife available'
    );
    animateLabel(dayTitleEl, dayDescEl,
      isNight ? 'Nightlife' : 'Daytime',
      isNight ? 'evening events' : 'daytime events'
    );
  }

  function getMode() {
    var isNight = !dayToggle.checked;
    if (isNight) return 'night';
    if (familyToggle.checked) return 'family';
    return 'grownup';
  }

  function applyMode() {
    var isNight = !dayToggle.checked;
    document.body.classList.toggle('dark-mode', isNight);
    updateLabels();

    var mode = getMode();
    var imgTransform = MODES[mode].img;
    var contentTransform = MODES[mode].content;

    if (firstRun) {
      firstRun = false;
      cards.forEach(function (card) {
        var imgStrip = card.querySelector('.card-img-strip');
        var contentStrip = card.querySelector('.card-content-strip');
        imgStrip.style.transition = 'none';
        contentStrip.style.transition = 'none';
        imgStrip.style.transform = imgTransform;
        contentStrip.style.transform = contentTransform;
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          cards.forEach(function (card) {
            var imgStrip = card.querySelector('.card-img-strip');
            var contentStrip = card.querySelector('.card-content-strip');
            imgStrip.style.transition = '';
            contentStrip.style.transition = '';
          });
        });
      });
      return;
    }

    cards.forEach(function (card, i) {
      var baseDelay = Math.round(i * stagger);
      var imgStrip = card.querySelector('.card-img-strip');
      var contentStrip = card.querySelector('.card-content-strip');
      imgStrip.style.transition = 'transform ' + slideDuration + 'ms ' + imgEasing + ' ' + baseDelay + 'ms';
      contentStrip.style.transition = 'transform ' + slideDuration + 'ms ' + contentEasing + ' ' + (baseDelay + contentDelay) + 'ms';
      imgStrip.style.transform = imgTransform;
      contentStrip.style.transform = contentTransform;
    });
  }

  // Nightlife toggle → force grown-up mode
  dayToggle.addEventListener('change', function () {
    var isNight = !dayToggle.checked;
    if (isNight && familyToggle.checked) {
      familyToggle.checked = false;
    }
    applyMode();
  });

  // Family toggle → force daytime if entering family mode
  familyToggle.addEventListener('change', function () {
    if (familyToggle.checked && !dayToggle.checked) {
      dayToggle.checked = true;
    }
    applyMode();
  });

  applyMode();
}

document.addEventListener('okletsgo:cards-rendered', initToggleLogic);

// Tooltip on card hover
function initTooltips() {
  var tooltip = document.getElementById('tooltip');
  var cards = document.querySelectorAll('.card');
  var OFFSET = 12;

  var EVENT_DATA = [
    { day: '\u2600\uFE0F 28\u00B0C  \u00B7  \uD83C\uDF77 Wine  \u00B7  \uD83D\uDD50 2PM', night: '\uD83C\uDF19 18\u00B0C  \u00B7  \uD83C\uDFB5 Live Music  \u00B7  \uD83D\uDD58 9PM', family: '\u2600\uFE0F 28\u00B0C  \u00B7  \uD83D\uDCDA Storytime  \u00B7  \uD83D\uDD59 10AM' },
    { day: '\u2600\uFE0F 30\u00B0C  \u00B7  \uD83C\uDF47 Tasting  \u00B7  \uD83D\uDD50 1PM', night: '\uD83C\uDF27\uFE0F 16\u00B0C  \u00B7  \uD83D\uDD25 Bonfire  \u00B7  \uD83D\uDD58 8PM', family: '\u2600\uFE0F 30\u00B0C  \u00B7  \uD83D\uDCA6 Splash Pad  \u00B7  \uD83D\uDD5B 12PM' },
    { day: '\u26C5 24\u00B0C  \u00B7  \uD83C\uDF7A Pub  \u00B7  \uD83D\uDD50 3PM', night: '\uD83C\uDF19 12\u00B0C  \u00B7  \uD83D\uDD2D Stargazing  \u00B7  \uD83D\uDD59 10PM', family: '\u26C5 24\u00B0C  \u00B7  \u26F3 Mini Golf  \u00B7  \uD83D\uDD51 2PM' },
    { day: '\u2600\uFE0F 27\u00B0C  \u00B7  \uD83C\uDFD2 Hockey  \u00B7  \uD83D\uDD56 7PM', night: '\u26C5 20\u00B0C  \u00B7  \uD83C\uDFB8 Concert  \u00B7  \uD83D\uDD57 8PM', family: '\u2600\uFE0F 27\u00B0C  \u00B7  \uD83D\uDD2C Science  \u00B7  \uD83D\uDD50 1PM' },
    { day: '\u2600\uFE0F 31\u00B0C  \u00B7  \uD83C\uDF77 Wine  \u00B7  \uD83D\uDD51 2PM', night: '\uD83C\uDF19 19\u00B0C  \u00B7  \uD83C\uDF78 Cocktails  \u00B7  \uD83D\uDD59 10PM', family: '\u2600\uFE0F 31\u00B0C  \u00B7  \uD83C\uDF53 Berry Picking  \u00B7  \uD83D\uDD59 10AM' },
    { day: '\u2600\uFE0F 29\u00B0C  \u00B7  \uD83C\uDF56 BBQ  \u00B7  \uD83D\uDD5B 12PM', night: '\uD83C\uDF19 17\u00B0C  \u00B7  \uD83C\uDF86 Fireworks  \u00B7  \uD83D\uDD58 9PM', family: '\u2600\uFE0F 29\u00B0C  \u00B7  \uD83C\uDFC4 Waterpark  \u00B7  \uD83D\uDD5A 11AM' },
    { day: '\u26C5 25\u00B0C  \u00B7  \uD83C\uDFAA Carnival  \u00B7  \uD83D\uDD50 1PM', night: '\uD83C\uDF27\uFE0F 14\u00B0C  \u00B7  \uD83C\uDFA0 Rides  \u00B7  \uD83D\uDD5A 11PM', family: '\u26C5 25\u00B0C  \u00B7  \uD83D\uDC3E Petting Zoo  \u00B7  \uD83D\uDD59 10AM' }
  ];

  function positionTooltip(e) {
    var x = e.clientX + OFFSET;
    var y = e.clientY + OFFSET;
    var tw = tooltip.offsetWidth;
    var th = tooltip.offsetHeight;
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    if (x + tw > vw) x = e.clientX - tw - OFFSET;
    if (x < 0) x = OFFSET;
    if (y + th > vh) y = e.clientY - th - OFFSET;
    if (y < 0) y = OFFSET;

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }

  cards.forEach(function (card, i) {
    card.addEventListener('mouseenter', function (e) {
      var isNight = document.body.classList.contains('dark-mode');
      var isFamily = document.getElementById('familyToggle').checked;
      tooltip.textContent = isNight ? EVENT_DATA[i].night : (isFamily ? EVENT_DATA[i].family : EVENT_DATA[i].day);
      tooltip.classList.add('visible');
      positionTooltip(e);
    });

    card.addEventListener('mousemove', positionTooltip);

    card.addEventListener('mouseleave', function () {
      tooltip.classList.remove('visible');
    });
  });
}

document.addEventListener('okletsgo:cards-rendered', initTooltips);
})();
