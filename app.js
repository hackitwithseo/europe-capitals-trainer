(function () {
  'use strict';

  var DATA = window.EUROPE;
  var COUNTRIES = DATA.countries;
  var BY_ISO = {};
  COUNTRIES.forEach(function (c) { BY_ISO[c.iso] = c; });

  var K = Math.cos(52 * Math.PI / 180);
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------------- helpers ---------------- */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  function flag(iso) {
    var code = iso === 'UK' ? 'GB' : iso;
    return String.fromCodePoint.apply(null, code.split('').map(function (ch) {
      return 0x1F1E6 + ch.charCodeAt(0) - 65;
    }));
  }

  function plain(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------------- projection ---------------- */

  var EXTRA = DATA.extra || [];      // neighbours drawn on the map but not quizzed
  var LAND = COUNTRIES.concat(EXTRA);

  var raw = {};
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  LAND.forEach(function (c) {
    var rings = (DATA.shapes[c.iso] || []).map(function (ring) {
      return ring.map(function (p) {
        var x = p[0] * K;
        var y = -p[1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        return [x, y];
      });
    });
    raw[c.iso] = rings;
  });

  var SCALE = 1000 / (maxX - minX);
  var W = 1000;
  var H = (maxY - minY) * SCALE;
  var PAD = 14;
  var HOME = [-PAD, -PAD, W + PAD * 2, H + PAD * 2];

  var geo = {};      // iso -> [[ [x,y], ... ], ...] in user units
  var box = {};      // iso -> {x0,y0,x1,y1,w,h,area}
  var capPt = {};    // iso -> [x,y]

  LAND.forEach(function (c) {
    var rings = (raw[c.iso] || []).map(function (ring) {
      return ring.map(function (p) { return [(p[0] - minX) * SCALE, (p[1] - minY) * SCALE]; });
    });
    geo[c.iso] = rings;

    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    rings.forEach(function (ring) {
      ring.forEach(function (p) {
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[1] > y1) y1 = p[1];
      });
    });
    box[c.iso] = { x0: x0, y0: y0, x1: x1, y1: y1, w: Math.max(x1 - x0, 0.4), h: Math.max(y1 - y0, 0.4) };
    box[c.iso].area = box[c.iso].w * box[c.iso].h;
  });

  COUNTRIES.forEach(function (c) {
    capPt[c.iso] = [(c.lon * K - minX) * SCALE, (-c.lat - minY) * SCALE];
  });

  function pathFor(rings) {
    var d = '';
    rings.forEach(function (ring) {
      ring.forEach(function (p, i) {
        d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
      });
      d += 'Z';
    });
    return d;
  }

  /* ---------------- map ---------------- */

  var svg = document.getElementById('map');
  var hintEl = document.getElementById('mapHint');
  var mapTitle = document.getElementById('mapTitle');
  var resetBtn = document.getElementById('resetMap');
  var labelLayer = null;
  var capDots = [];
  var selected = null;
  var curBox = HOME;

  function buildMap() {
    var order = LAND.slice().sort(function (a, b) { return box[b.iso].area - box[a.iso].area; });
    var html = '<g id="lands">';
    order.forEach(function (c) {
      var ghost = !BY_ISO[c.iso];
      html += '<path class="country' + (ghost ? ' ghost' : '') + '"' +
        (ghost ? '' : ' data-iso="' + c.iso + '"') + ' d="' + pathFor(geo[c.iso]) + '">' +
        '<title>' + esc(c.name) + (ghost || !c.capital ? '' : ' — ' + esc(c.capital)) + '</title></path>';
    });
    html += '</g><g id="dots">';
    COUNTRIES.forEach(function (c) {
      var p = capPt[c.iso];
      var micro = box[c.iso].area < 0.35 ? '1' : '0';
      html += '<circle class="cap-dot" data-iso="' + c.iso + '" data-micro="' + micro + '" cx="' +
        p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="1.9"><title>' + esc(c.capital) + '</title></circle>';
    });
    html += '</g><g id="labels"></g>';
    svg.innerHTML = html;

    labelLayer = svg.querySelector('#labels');
    capDots = Array.prototype.slice.call(svg.querySelectorAll('.cap-dot'));
    applyView(HOME);
  }

  // px per map unit, so dots and labels keep a readable size on any screen
  function pxPerUnit() {
    var w = svg.getBoundingClientRect().width || svg.clientWidth || 1000;
    return (w || 1000) / curBox[2];
  }

  function applyView(b) {
    curBox = b;
    svg.setAttribute('viewBox', b.map(function (v) { return v.toFixed(1); }).join(' '));
    var up = pxPerUnit();
    svg.style.setProperty('--sw', (1.3 / up).toFixed(3));
    capDots.forEach(function (dot) {
      dot.setAttribute('r', ((dot.dataset.micro === '1' ? 4.4 : 2.9) / up).toFixed(2));
    });
    renderLabels();
  }

  function frameFor(iso) {
    var b = box[iso];
    var cx = (b.x0 + b.x1) / 2;
    var cy = (b.y0 + b.y1) / 2;
    var aspect = HOME[2] / HOME[3];
    var w = Math.max(b.w * 2.1, 130);
    var h = w / aspect;
    if (b.h * 2.1 > h) { h = b.h * 2.1; w = h * aspect; }
    w = Math.min(w, HOME[2]);
    h = Math.min(h, HOME[3]);
    var x = clamp(cx - w / 2, HOME[0], HOME[0] + HOME[2] - w);
    var y = clamp(cy - h / 2, HOME[1], HOME[1] + HOME[3] - h);
    return [x, y, w, h];
  }

  function renderLabels() {
    if (!labelLayer) return;
    labelLayer.innerHTML = '';
    if (!selected) return;
    var c = BY_ISO[selected];
    if (!c) return;

    var up = pxPerUnit();
    var cap = capPt[selected];
    var isMicro = box[selected].area < 0.35;

    var pulse = document.createElementNS(NS, 'circle');
    pulse.setAttribute('class', 'sel-pulse');
    pulse.setAttribute('cx', cap[0].toFixed(1));
    pulse.setAttribute('cy', cap[1].toFixed(1));
    pulse.setAttribute('r', (11 / up).toFixed(2));
    labelLayer.appendChild(pulse);

    var dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('class', 'sel-dot');
    dot.setAttribute('cx', cap[0].toFixed(1));
    dot.setAttribute('cy', cap[1].toFixed(1));
    dot.setAttribute('r', (5 / up).toFixed(2));
    labelLayer.appendChild(dot);

    var capText = document.createElementNS(NS, 'text');
    capText.setAttribute('class', 'lbl-capital');
    capText.setAttribute('x', (cap[0] + 10 / up).toFixed(1));
    capText.setAttribute('y', (cap[1] + 4.5 / up).toFixed(1));
    capText.style.fontSize = (12.5 / up).toFixed(2) + 'px';
    capText.style.strokeWidth = (3 / up).toFixed(2) + 'px';
    capText.textContent = c.capital;
    labelLayer.appendChild(capText);

    if (!isMicro) {
      var lx = (c.labLon * K - minX) * SCALE;
      var ly = (-c.labLat - minY) * SCALE;
      var nameText = document.createElementNS(NS, 'text');
      nameText.setAttribute('class', 'lbl-country');
      nameText.setAttribute('x', lx.toFixed(1));
      nameText.setAttribute('y', ly.toFixed(1));
      nameText.setAttribute('text-anchor', 'middle');
      nameText.style.fontSize = (13 / up).toFixed(2) + 'px';
      nameText.style.strokeWidth = (3 / up).toFixed(2) + 'px';
      nameText.textContent = c.name;
      labelLayer.appendChild(nameText);
    }
  }

  function selectCountry(iso, doZoom) {
    selected = iso && BY_ISO[iso] ? iso : null;

    Array.prototype.forEach.call(svg.querySelectorAll('.country'), function (p) {
      p.classList.toggle('is-sel', p.dataset.iso === selected);
    });

    Array.prototype.forEach.call(document.querySelectorAll('#countryList .row'), function (r) {
      r.classList.toggle('is-sel', r.dataset.iso === selected);
    });

    renderCard(selected ? BY_ISO[selected] : null);
    applyView(selected && doZoom !== false ? frameFor(selected) : HOME);
    resetBtn.hidden = !selected;
    mapTitle.textContent = selected ? BY_ISO[selected].name : 'Europe';
    hintEl.textContent = selected ? 'Click another country' : 'Click a country';
  }

  svg.addEventListener('click', function (e) {
    var el = e.target.closest('[data-iso]');
    if (!el) return;
    selectCountry(el.getAttribute('data-iso'), true);
  });

  svg.addEventListener('pointerover', function (e) {
    var el = e.target.closest('.country, .cap-dot');
    if (!el) return;
    var c = BY_ISO[el.getAttribute('data-iso')];
    if (c) hintEl.textContent = c.name + ' · ' + c.capital;
  });

  svg.addEventListener('pointerout', function (e) {
    var el = e.target.closest('.country, .cap-dot');
    if (!el) return;
    hintEl.textContent = selected ? 'Click another country' : 'Click a country';
  });

  resetBtn.addEventListener('click', function () { selectCountry(null); });

  /* ---------------- learn card + list ---------------- */

  var learnCard = document.getElementById('learnCard');
  var listEl = document.getElementById('countryList');
  var searchEl = document.getElementById('search');

  function renderCard(c) {
    if (!c) {
      learnCard.innerHTML = '<p class="muted">Pick a country from the list or click the map to see its capital.</p>';
      return;
    }
    learnCard.innerHTML =
      '<span class="flag" aria-hidden="true">' + flag(c.iso) + '</span>' +
      '<h2>' + esc(c.name) + '</h2>' +
      '<p class="cap-line"><span>Capital</span><strong>' + esc(c.capital) + '</strong></p>' +
      '<p class="hint">Now switch to <strong>Quiz</strong> and see if you remember it.</p>';
  }

  function buildList() {
    listEl.innerHTML = COUNTRIES.map(function (c) {
      return '<button class="row" role="listitem" data-iso="' + c.iso + '" data-search="' +
        esc(plain(c.name + ' ' + c.capital + ' ' + c.iso)) + '">' +
        '<span class="flag" aria-hidden="true">' + flag(c.iso) + '</span>' +
        '<span class="r-name">' + esc(c.name) + '</span>' +
        '<span class="r-cap">' + esc(c.capital) + '</span></button>';
    }).join('');
  }

  listEl.addEventListener('click', function (e) {
    var row = e.target.closest('.row');
    if (!row) return;
    selectCountry(row.dataset.iso, true);
    // on phones the map sits above the list, so bring it into view below the sticky header
    if (window.matchMedia('(max-width: 940px)').matches) {
      var mapCard = document.querySelector('.map-card');
      var header = document.querySelector('.topbar');
      if (mapCard) {
        var top = mapCard.getBoundingClientRect().top + window.scrollY - (header ? header.offsetHeight + 8 : 0);
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    }
  });

  searchEl.addEventListener('input', function () {
    var q = plain(searchEl.value.trim());
    var shown = 0;
    Array.prototype.forEach.call(listEl.querySelectorAll('.row'), function (row) {
      var hit = !q || row.dataset.search.indexOf(q) !== -1;
      row.hidden = !hit;
      if (hit) shown++;
    });
    var msg = listEl.querySelector('.empty');
    if (!shown && !msg) {
      msg = document.createElement('p');
      msg.className = 'empty';
      msg.textContent = 'No country matches that search.';
      listEl.appendChild(msg);
    } else if (shown && msg) {
      msg.remove();
    }
  });

  /* ---------------- tabs ---------------- */

  var mode = 'learn';

  function setMode(next) {
    mode = next;
    document.getElementById('view-learn').hidden = next !== 'learn';
    document.getElementById('view-quiz').hidden = next !== 'quiz';
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
      var on = t.dataset.mode === next;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (next === 'quiz') {
      if (!quiz) renderQuizStart();
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) {
    t.addEventListener('click', function () { setMode(t.dataset.mode); });
  });

  /* ---------------- quiz ---------------- */

  var TOTAL = 10;
  var quiz = null;
  var quizBody = document.getElementById('quizBody');

  function optionsFrom(answer, pool) {
    var others = shuffle(pool.filter(function (v) { return v !== answer; })).slice(0, 3);
    return shuffle([answer].concat(others));
  }

  function makeQuestions() {
    var picks = shuffle(COUNTRIES).slice(0, TOTAL);
    var allCapitals = COUNTRIES.map(function (c) { return c.capital; });
    var allNames = COUNTRIES.map(function (c) { return c.name; });

    return picks.map(function (c) {
      var toCapital = Math.random() < 0.5;
      if (toCapital) {
        return {
          country: c,
          sub: 'Country → capital',
          prompt: 'What is the capital of ' + c.name + '?',
          answer: c.capital,
          options: optionsFrom(c.capital, allCapitals)
        };
      }
      return {
        country: c,
        sub: 'Capital → country',
        prompt: c.capital + ' is the capital of which country?',
        answer: c.name,
        options: optionsFrom(c.name, allNames)
      };
    });
  }

  function renderQuizStart() {
    quiz = null;
    quizBody.innerHTML =
      '<div class="hero">' +
        '<p class="kicker">Ready when you are</p>' +
        '<h2>10 questions across Europe</h2>' +
        '<p>Half ask for the capital city, half show you a capital and ask for the country. ' +
        'You get four choices each time.</p>' +
        '<button class="btn primary" id="startQuiz">Start quiz</button>' +
      '</div>';
    document.getElementById('startQuiz').addEventListener('click', newRound);
  }

  function newRound() {
    quiz = { questions: makeQuestions(), i: 0, score: 0, answered: false, misses: [] };
    renderQuestion();
  }

  function renderQuestion() {
    var q = quiz.questions[quiz.i];
    quiz.answered = false;

    quizBody.innerHTML =
      '<div class="quiz-top"><span>' + esc(q.sub) + '</span>' +
        '<span>Question ' + (quiz.i + 1) + ' / ' + TOTAL + ' · ' + quiz.score + ' right</span></div>' +
      '<div class="bar"><i style="width:' + (quiz.i / TOTAL * 100) + '%"></i></div>' +
      '<h2 class="q-prompt">' + esc(q.prompt) + '</h2>' +
      '<p class="q-sub">Pick one answer.</p>' +
      '<div class="options" id="options">' +
        q.options.map(function (v, i) {
          return '<button class="opt" data-i="' + i + '"><span class="key">' + (i + 1) + '</span>' +
            '<span>' + esc(v) + '</span></button>';
        }).join('') +
      '</div>' +
      '<div class="feedback" id="feedback" role="status"></div>' +
      '<div class="quiz-actions" id="actions"></div>';

    document.getElementById('options').addEventListener('click', function (e) {
      var btn = e.target.closest('.opt');
      if (btn) answer(Number(btn.dataset.i));
    });
  }

  function answer(idx) {
    if (!quiz || quiz.answered) return;
    var q = quiz.questions[quiz.i];
    if (idx < 0 || idx >= q.options.length) return;
    quiz.answered = true;

    var chosen = q.options[idx];
    var right = chosen === q.answer;
    if (right) quiz.score++;
    else quiz.misses.push(q.country);

    Array.prototype.forEach.call(document.querySelectorAll('#options .opt'), function (btn) {
      var v = q.options[Number(btn.dataset.i)];
      btn.disabled = true;
      if (v === q.answer) btn.classList.add('is-correct');
      else if (v === chosen) btn.classList.add('is-wrong');
      else btn.classList.add('is-dim');
    });

    var fb = document.getElementById('feedback');
    if (right) {
      fb.className = 'feedback good';
      fb.textContent = 'Correct! ' + q.country.name + ' → ' + q.country.capital + '.';
    } else {
      fb.className = 'feedback bad';
      fb.textContent = 'Not quite. ' + q.country.name + ' → ' + q.country.capital + '.';
    }

    document.querySelector('.bar i').style.width = ((quiz.i + 1) / TOTAL * 100) + '%';

    var actions = document.getElementById('actions');
    var last = quiz.i === TOTAL - 1;
    actions.innerHTML = '<button class="btn primary" id="nextQ">' + (last ? 'See my result' : 'Next question') + '</button>';
    var nextBtn = document.getElementById('nextQ');
    nextBtn.focus({ preventScroll: true });
    nextBtn.addEventListener('click', next);
  }

  function next() {
    if (!quiz || !quiz.answered) return;
    if (quiz.i === TOTAL - 1) { renderResult(); return; }
    quiz.i++;
    renderQuestion();
  }

  function renderResult() {
    var score = quiz.score;
    var missed = [];
    var seen = {};
    quiz.misses.forEach(function (c) {
      if (!seen[c.iso]) { seen[c.iso] = 1; missed.push(c); }
    });

    var verdict = score === TOTAL ? 'Perfect round. You know Europe.'
      : score >= 8 ? 'Strong round — almost all of them.'
      : score >= 5 ? 'Getting there. Run through the misses once.'
      : 'Keep going — the learn map will make these stick.';

    quizBody.innerHTML =
      '<div class="hero">' +
        '<p class="kicker">Round complete</p>' +
        '<p class="score-big">' + score + '<small> / ' + TOTAL + '</small></p>' +
        '<p style="margin-top:10px">' + esc(verdict) + '</p>' +
        (missed.length
          ? '<ul class="misses">' + missed.map(function (c) {
              return '<li><span>' + flag(c.iso) + '</span><strong>' + esc(c.name) + '</strong>' +
                '<em>— ' + esc(c.capital) + '</em></li>';
            }).join('') + '</ul>'
          : '') +
        '<div style="display:flex;gap:10px;margin-top:24px;flex-wrap:wrap">' +
          '<button class="btn primary" id="again">Play again</button>' +
          '<button class="btn soft" id="toLearn">Review the map</button>' +
        '</div>' +
      '</div>';

    document.getElementById('again').addEventListener('click', newRound);
    document.getElementById('toLearn').addEventListener('click', function () { setMode('learn'); });
  }

  document.addEventListener('keydown', function (e) {
    if (mode !== 'quiz' || !quiz) return;
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.target && e.target.tagName === 'BUTTON') return;
    if (!quiz.answered && e.key >= '1' && e.key <= '4') {
      answer(Number(e.key) - 1);
    } else if (quiz.answered && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      next();
    }
  });

  /* ---------------- boot ---------------- */

  buildMap();
  buildList();
  renderCard(null);
  setMode('learn');

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { applyView(curBox); }, 120);
  });
})();
