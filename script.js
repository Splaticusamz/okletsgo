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
(function () {
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
})();

// Tooltip on card hover
(function () {
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
})();
