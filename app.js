(function () {
  'use strict';

  var DATA = window.EUROPE;
  var COUNTRIES = DATA.countries;
  var BY_ISO = {};
  COUNTRIES.forEach(function (c) { BY_ISO[c.iso] = c; });
  var TOTAL_COUNTRIES = COUNTRIES.length;

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

  /* ---------------- translations ---------------- */

  // Czech names: [country, capital]
  var CS = {
    AL: ['Albánie', 'Tirana'],
    AD: ['Andorra', 'Andorra la Vella'],
    AT: ['Rakousko', 'Vídeň'],
    BY: ['Bělorusko', 'Minsk'],
    BE: ['Belgie', 'Brusel'],
    BA: ['Bosna a Hercegovina', 'Sarajevo'],
    BG: ['Bulharsko', 'Sofie'],
    HR: ['Chorvatsko', 'Záhřeb'],
    CY: ['Kypr', 'Nikósie'],
    CZ: ['Česko', 'Praha'],
    DK: ['Dánsko', 'Kodaň'],
    EE: ['Estonsko', 'Tallinn'],
    FI: ['Finsko', 'Helsinky'],
    FR: ['Francie', 'Paříž'],
    DE: ['Německo', 'Berlín'],
    GR: ['Řecko', 'Athény'],
    HU: ['Maďarsko', 'Budapešť'],
    IS: ['Island', 'Reykjavík'],
    IE: ['Irsko', 'Dublin'],
    IT: ['Itálie', 'Řím'],
    LV: ['Lotyšsko', 'Riga'],
    LI: ['Lichtenštejnsko', 'Vaduz'],
    LT: ['Litva', 'Vilnius'],
    LU: ['Lucembursko', 'Lucemburk'],
    MT: ['Malta', 'Valletta'],
    MD: ['Moldavsko', 'Kišiněv'],
    MC: ['Monako', 'Monako'],
    ME: ['Černá Hora', 'Podgorica'],
    NL: ['Nizozemsko', 'Amsterdam'],
    MK: ['Severní Makedonie', 'Skopje'],
    NO: ['Norsko', 'Oslo'],
    PL: ['Polsko', 'Varšava'],
    PT: ['Portugalsko', 'Lisabon'],
    RO: ['Rumunsko', 'Bukurešť'],
    RU: ['Rusko', 'Moskva'],
    SM: ['San Marino', 'San Marino'],
    RS: ['Srbsko', 'Bělehrad'],
    SK: ['Slovensko', 'Bratislava'],
    SI: ['Slovinsko', 'Lublaň'],
    ES: ['Španělsko', 'Madrid'],
    SE: ['Švédsko', 'Stockholm'],
    CH: ['Švýcarsko', 'Bern'],
    UA: ['Ukrajina', 'Kyjev'],
    GB: ['Spojené království', 'Londýn'],
    VA: ['Vatikán', 'Vatikán'],
    XK: ['Kosovo', 'Priština'],
  };

  // extra spellings accepted in typed mode: { n: [country], c: [capital] }
  var ALIASES = {
    BA: { n: ['bosnia'] },
    CZ: { n: ['czech republic'] },
    GB: { n: ['uk', 'united kingdom', 'great britain', 'britain'] },
    LU: { n: ['luxemburg'], c: ['luxembourg', 'luxembourg city'] },
    MD: { c: ['kishinev'] },
    MK: { n: ['macedonia'] },
    NL: { n: ['holland'] },
    UA: { c: ['kiev'] },
    VA: { n: ['vatican'], c: ['vatican'] }
  };

  var STR = {
    en: {
      title: 'Europe Capitals Trainer',
      h1: 'Europe Capitals Trainer',
      tagline: '{n} countries · learn the map, then test yourself',
      tabLearn: 'Learn map',
      tabQuiz: 'Quiz',
      europe: 'Europe',
      wholeMap: 'Whole map',
      clickCountry: 'Click a country',
      clickAnother: 'Click another country',
      credit: 'Map shapes: Natural Earth (public domain)',
      pickCountry: 'Pick a country from the list or click the map to see its capital.',
      capital: 'Capital',
      cardHint: 'Now switch to <strong>Quiz</strong> and see if you remember it.',
      search: 'Search country or capital…',
      noMatch: 'No country matches that search.',
      howTitle: 'How it works',
      sideHint: 'New to the map? Open <strong>Learn map</strong> first and click through the countries once.',
      tips: [
        'Pick 10, 20, 30 or all questions per round.',
        '<strong>Country → capital:</strong> find the main city.',
        '<strong>Capital → country:</strong> find the state.',
        'Choose <strong>Type the answer</strong> for the harder round.',
        'Keys <kbd>1</kbd>–<kbd>4</kbd> answer, <kbd>Enter</kbd> continues.'
      ],
      ready: 'Ready when you are',
      roundTitle: '{n} questions, {all} countries in the pool',
      roundTitleAll: 'All {n} countries in one round',
      roundText: 'Half ask for the capital city, half show you a capital and ask for the country. Four choices each time.',
      roundTextType: 'Half ask for the capital city, half show you a capital and ask for the country. You write every answer — no options to help.',
      answers: 'Answers',
      modeChoice: 'Choose from 4',
      modeType: 'Type the answer',
      typeCityHint: 'Write the capital city.',
      typeCountryHint: 'Write the country.',
      typeCityPlaceholder: 'Capital city…',
      typeCountryPlaceholder: 'Country…',
      check: 'Check',
      questions: 'Questions',
      allN: 'All {n}',
      start: 'Start quiz',
      c2c: 'Country → capital',
      cap2c: 'Capital → country',
      counter: 'Question {i} / {n} · {s} right',
      promptCapital: 'What is the capital of {c}?',
      promptCountry: '{c} is the capital of which country?',
      pickOne: 'Pick one answer.',
      correct: 'Correct! {c} → {cap}.',
      wrong: 'Not quite. {c} → {cap}.',
      nextQ: 'Next question',
      seeResult: 'See my result',
      complete: 'Round complete',
      perfect: 'Perfect round. You know Europe.',
      strong: 'Strong round — almost all of them.',
      middle: 'Getting there. Run through the misses once.',
      weak: 'Keep going — the learn map will make these stick.',
      playAgain: 'Play again',
      reviewMap: 'Review the map'
    },
    cs: {
      title: 'Trenér hlavních měst Evropy',
      h1: 'Trenér hlavních měst Evropy',
      tagline: '{n} zemí · nauč se mapu a otestuj se',
      tabLearn: 'Mapa',
      tabQuiz: 'Kvíz',
      europe: 'Evropa',
      wholeMap: 'Celá mapa',
      clickCountry: 'Klikni na zemi',
      clickAnother: 'Klikni na jinou zemi',
      credit: 'Mapa: Natural Earth (volné dílo)',
      pickCountry: 'Vyber zemi ze seznamu nebo klikni na mapu.',
      capital: 'Hlavní město',
      cardHint: 'Přepni na <strong>Kvíz</strong> a zjisti, jestli si to pamatuješ.',
      search: 'Hledej zemi nebo město…',
      noMatch: 'Žádná země neodpovídá hledání.',
      howTitle: 'Jak to funguje',
      sideHint: 'Neznáš mapu? Otevři nejdřív <strong>Mapu</strong> a projdi země.',
      tips: [
        'Zvol 10, 20, 30 nebo všechny otázky v kole.',
        '<strong>Země → město:</strong> najdi hlavní město.',
        '<strong>Město → země:</strong> najdi zemi.',
        'Vyber <strong>Napsat odpověď</strong> pro těžší kolo.',
        'Klávesy <kbd>1</kbd>–<kbd>4</kbd> odpovídají, <kbd>Enter</kbd> pokračuje.'
      ],
      ready: 'Můžeš začít',
      roundTitle: '{n} otázek ze všech {all} zemí',
      roundTitleAll: 'Všech {n} zemí v jednom kole',
      roundText: 'Polovina otázek se ptá na hlavní město, polovina ukáže město a ptá se na zemi. Vždy čtyři možnosti.',
      roundTextType: 'Polovina otázek se ptá na hlavní město, polovina ukáže město a ptá se na zemi. Odpověď musíš napsat — žádné možnosti.',
      answers: 'Odpovědi',
      modeChoice: 'Vybrat ze 4',
      modeType: 'Napsat odpověď',
      typeCityHint: 'Napiš hlavní město.',
      typeCountryHint: 'Napiš zemi.',
      typeCityPlaceholder: 'Hlavní město…',
      typeCountryPlaceholder: 'Země…',
      check: 'Zkontrolovat',
      questions: 'Otázky',
      allN: 'Vše ({n})',
      start: 'Spustit kvíz',
      c2c: 'Země → město',
      cap2c: 'Město → země',
      counter: 'Otázka {i} / {n} · {s} správně',
      promptCapital: 'Jaké je hlavní město země {c}?',
      promptCountry: 'Hlavní město {c} patří které zemi?',
      pickOne: 'Vyber jednu odpověď.',
      correct: 'Správně! {c} → {cap}.',
      wrong: 'Bohužel. {c} → {cap}.',
      nextQ: 'Další otázka',
      seeResult: 'Zobrazit výsledek',
      complete: 'Kolo dokončeno',
      perfect: 'Perfektní kolo. Evropu umíš.',
      strong: 'Silné kolo — skoro všechno.',
      middle: 'Už to jde. Projdi si chyby.',
      weak: 'Nevzdávej to — mapa ti to pomůže zapamatovat.',
      playAgain: 'Hrát znovu',
      reviewMap: 'Projít mapu'
    }
  };

  var lang = (navigator.language || 'en').toLowerCase().indexOf('cs') === 0 ? 'cs' : 'en';

  function t() { return STR[lang]; }
  function cname(c) { return lang === 'cs' && CS[c.iso] ? CS[c.iso][0] : c.name; }
  function ccap(c) { return lang === 'cs' && CS[c.iso] ? CS[c.iso][1] : c.capital; }

  function fmt(str, vals) {
    return str.replace(/\{(\w+)\}/g, function (m, k) {
      return vals && vals[k] != null ? vals[k] : m;
    });
  }

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

  var geo = {};
  var box = {};
  var capPt = {};

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
      var title = ghost ? cname({ iso: c.iso, name: c.name }) : cname(c) + ' — ' + ccap(c);
      html += '<path class="country' + (ghost ? ' ghost' : '') + '"' +
        (ghost ? '' : ' data-iso="' + c.iso + '"') + ' d="' + pathFor(geo[c.iso]) + '">' +
        '<title>' + esc(title) + '</title></path>';
    });
    html += '</g><g id="dots">';
    COUNTRIES.forEach(function (c) {
      var p = capPt[c.iso];
      var micro = box[c.iso].area < 0.35 ? '1' : '0';
      html += '<circle class="cap-dot" data-iso="' + c.iso + '" data-micro="' + micro + '" cx="' +
        p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="1.9"><title>' + esc(ccap(c)) + '</title></circle>';
    });
    html += '</g><g id="labels"></g>';
    svg.innerHTML = html;

    labelLayer = svg.querySelector('#labels');
    capDots = Array.prototype.slice.call(svg.querySelectorAll('.cap-dot'));
    applyView(curBox);
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
    capText.textContent = ccap(c);
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
      nameText.textContent = cname(c);
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
    mapTitle.textContent = selected ? cname(BY_ISO[selected]) : t().europe;
    hintEl.textContent = selected ? t().clickAnother : t().clickCountry;
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
    if (c) hintEl.textContent = cname(c) + ' · ' + ccap(c);
  });

  svg.addEventListener('pointerout', function (e) {
    var el = e.target.closest('.country, .cap-dot');
    if (!el) return;
    hintEl.textContent = selected ? t().clickAnother : t().clickCountry;
  });

  resetBtn.addEventListener('click', function () { selectCountry(null); });

  /* ---------------- learn card + list ---------------- */

  var learnCard = document.getElementById('learnCard');
  var listEl = document.getElementById('countryList');
  var searchEl = document.getElementById('search');

  function renderCard(c) {
    if (!c) {
      learnCard.innerHTML = '<p class="muted">' + esc(t().pickCountry) + '</p>';
      return;
    }
    learnCard.innerHTML =
      '<span class="flag" aria-hidden="true">' + flag(c.iso) + '</span>' +
      '<h2>' + esc(cname(c)) + '</h2>' +
      '<p class="cap-line"><span>' + esc(t().capital) + '</span><strong>' + esc(ccap(c)) + '</strong></p>' +
      '<p class="hint">' + t().cardHint + '</p>';
  }

  function buildList() {
    listEl.innerHTML = COUNTRIES.map(function (c) {
      var cs = CS[c.iso] || ['', ''];
      var needle = plain(c.name + ' ' + c.capital + ' ' + c.iso + ' ' + cs[0] + ' ' + cs[1]);
      return '<button class="row" role="listitem" data-iso="' + c.iso + '" data-search="' + esc(needle) + '">' +
        '<span class="flag" aria-hidden="true">' + flag(c.iso) + '</span>' +
        '<span class="r-name">' + esc(cname(c)) + '</span>' +
        '<span class="r-cap">' + esc(ccap(c)) + '</span></button>';
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
      msg.textContent = t().noMatch;
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
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
      var on = tab.dataset.mode === next;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (next === 'quiz') {
      if (!quiz) renderQuizStart();
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (tab) {
    tab.addEventListener('click', function () { setMode(tab.dataset.mode); });
  });

  /* ---------------- quiz ---------------- */

  var quiz = null;
  var quizView = 'start';
  var quizLen = 10;
  var quizStyle = 'choice';   // 'choice' = pick from four, 'type' = write the answer
  var quizBody = document.getElementById('quizBody');

  function makeQuestions(total) {
    var picks = shuffle(COUNTRIES.slice()).slice(0, total);

    return picks.map(function (c) {
      var toCapital = Math.random() < 0.5;
      var answer = toCapital ? ccap(c) : cname(c);
      var options = [c];
      var seen = {};
      seen[answer] = 1;

      var pool = shuffle(COUNTRIES.filter(function (o) { return o.iso !== c.iso; }));
      for (var i = 0; i < pool.length && options.length < 4; i++) {
        var text = toCapital ? ccap(pool[i]) : cname(pool[i]);
        if (seen[text]) continue;
        seen[text] = 1;
        options.push(pool[i]);
      }

      return { country: c, toCapital: toCapital, options: shuffle(options) };
    });
  }

  function chunkControl() {
    var sizes = [10, 20, 30, 'all'];
    var html = '<div class="chunk-row"><span class="chunk-label">' + esc(t().questions) + '</span>' +
      '<div class="chunk len-chunk" role="group" aria-label="' + esc(t().questions) + '">';
    sizes.forEach(function (n) {
      var active = String(quizLen) === String(n);
      var label = n === 'all' ? fmt(t().allN, { n: TOTAL_COUNTRIES }) : String(n);
      html += '<button class="chip' + (active ? ' is-active' : '') + '" data-n="' + n + '">' + esc(label) + '</button>';
    });
    return html + '</div></div>';
  }

  function styleControl() {
    var opts = [['choice', t().modeChoice], ['type', t().modeType]];
    var html = '<div class="chunk-row"><span class="chunk-label">' + esc(t().answers) + '</span>' +
      '<div class="chunk style-chunk" role="group" aria-label="' + esc(t().answers) + '">';
    opts.forEach(function (o) {
      html += '<button class="chip' + (quizStyle === o[0] ? ' is-active' : '') + '" data-style="' + o[0] + '">' +
        esc(o[1]) + '</button>';
    });
    return html + '</div></div>';
  }

  function bindStyle() {
    var row = quizBody.querySelector('.style-chunk');
    if (!row) return;
    row.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      quizStyle = chip.dataset.style;
      if (quizView === 'start') renderQuizStart();
      else if (quizView === 'result') renderResult();
    });
  }

  function bindChunks() {
    var row = quizBody.querySelector('.len-chunk');
    if (!row) return;
    row.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (!chip) return;
      quizLen = chip.dataset.n === 'all' ? TOTAL_COUNTRIES : Number(chip.dataset.n);
      if (quizView === 'start') renderQuizStart();
      else if (quizView === 'result') renderResult();
    });
  }

  function renderQuizStart() {
    quiz = null;
    quizView = 'start';
    var isAll = quizLen >= TOTAL_COUNTRIES;
    var title = isAll
      ? fmt(t().roundTitleAll, { n: TOTAL_COUNTRIES })
      : fmt(t().roundTitle, { n: quizLen, all: TOTAL_COUNTRIES });

    quizBody.innerHTML =
      '<div class="hero">' +
        '<p class="kicker">' + esc(t().ready) + '</p>' +
        '<h2>' + esc(title) + '</h2>' +
        '<p>' + esc(quizStyle === 'type' ? t().roundTextType : t().roundText) + '</p>' +
        styleControl() +
        chunkControl() +
        '<button class="btn primary" id="startQuiz">' + esc(t().start) + '</button>' +
      '</div>';

    bindStyle();
    bindChunks();
    document.getElementById('startQuiz').addEventListener('click', newRound);
  }

  function newRound() {
    var total = Math.min(quizLen, TOTAL_COUNTRIES);
    quiz = { questions: makeQuestions(total), i: 0, total: total, score: 0, answered: false, chosenIso: null, misses: [], style: quizStyle, typedText: '' };
    renderQuestion();
  }

  function optionText(q, c) { return q.toCapital ? ccap(c) : cname(c); }

  function renderQuestion() {
    var q = quiz.questions[quiz.i];
    var typed = quiz.style === 'type';
    quizView = 'question';

    var prompt = q.toCapital
      ? fmt(t().promptCapital, { c: cname(q.country) })
      : fmt(t().promptCountry, { c: ccap(q.country) });

    var answerArea = typed
      ? '<p class="q-sub">' + esc(q.toCapital ? t().typeCityHint : t().typeCountryHint) + '</p>' +
        '<form class="typed-form" id="typedForm" autocomplete="off" novalidate>' +
          '<input class="typed-input" id="typed" type="text" inputmode="text" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="' +
            esc(q.toCapital ? t().typeCityPlaceholder : t().typeCountryPlaceholder) + '" aria-label="' +
            esc(q.toCapital ? t().typeCityPlaceholder : t().typeCountryPlaceholder) + '">' +
          '<button class="btn primary" id="checkBtn" type="submit">' + esc(t().check) + '</button>' +
        '</form>'
      : '<p class="q-sub">' + esc(t().pickOne) + '</p>' +
        '<div class="options" id="options">' +
          q.options.map(function (c, i) {
            return '<button class="opt" data-iso="' + c.iso + '"><span class="key">' + (i + 1) + '</span>' +
              '<span>' + esc(optionText(q, c)) + '</span></button>';
          }).join('') +
        '</div>';

    quizBody.innerHTML =
      '<div class="quiz-top"><span>' + esc(q.toCapital ? t().c2c : t().cap2c) + '</span>' +
        '<span>' + esc(fmt(t().counter, { i: quiz.i + 1, n: quiz.total, s: quiz.score })) + '</span></div>' +
      '<div class="bar"><i style="width:' + ((quiz.answered ? quiz.i + 1 : quiz.i) / quiz.total * 100) + '%"></i></div>' +
      '<h2 class="q-prompt">' + esc(prompt) + '</h2>' +
      answerArea +
      '<div class="feedback" id="feedback" role="status"></div>' +
      '<div class="quiz-actions" id="actions"></div>';

    if (typed) {
      document.getElementById('typedForm').addEventListener('submit', function (e) {
        e.preventDefault();
        checkTyped();
      });
      if (quiz.answered) paintTyped(q);
      else {
        var inp = document.getElementById('typed');
        try { inp.focus({ preventScroll: true }); } catch (err) { inp.focus(); }
      }
    } else {
      document.getElementById('options').addEventListener('click', function (e) {
        var btn = e.target.closest('.opt');
        if (btn) answer(btn.dataset.iso);
      });
      if (quiz.answered) paintAnswer(q);
    }
  }

  /* ---- typed answers ---- */

  function norm(s) {
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
      .replace(/^the /, '');
  }

  function acceptedAnswers(q) {
    var c = q.country;
    var list = [q.toCapital ? c.capital : c.name];
    var cs = CS[c.iso];
    if (cs) list.push(q.toCapital ? cs[1] : cs[0]);
    var al = ALIASES[c.iso];
    if (al) list = list.concat(q.toCapital ? (al.c || []) : (al.n || []));
    return list;
  }

  function matchesTyped(q, typed) {
    var v = norm(typed);
    if (!v) return false;
    return acceptedAnswers(q).some(function (a) {
      var n = norm(a);
      if (!n) return false;
      if (n === v) return true;
      // "Andorra" for "Andorra la Vella", "Luxembourg" for "Luxembourg City"
      if (v.length >= 4 && n.indexOf(v) === 0) return true;
      if (n.length >= 4 && v.indexOf(n) === 0 && v.length - n.length <= 6) return true;
      return false;
    });
  }

  function syncCounter() {
    var top = document.querySelector('.quiz-top span:last-child');
    if (top) top.textContent = fmt(t().counter, { i: quiz.i + 1, n: quiz.total, s: quiz.score });
  }

  function checkTyped() {
    if (!quiz || quiz.answered) return;
    var q = quiz.questions[quiz.i];
    var inp = document.getElementById('typed');
    var val = inp ? inp.value : '';
    var right = matchesTyped(q, val);

    quiz.answered = true;
    quiz.typedText = val;
    quiz.chosenIso = right ? q.country.iso : null;
    if (right) quiz.score++;
    else quiz.misses.push(q.country);

    paintTyped(q);
    syncCounter();
  }

  function paintTyped(q) {
    var inp = document.getElementById('typed');
    var btn = document.getElementById('checkBtn');
    var right = quiz.chosenIso === q.country.iso;

    if (inp) {
      if (quiz.typedText != null) inp.value = quiz.typedText;
      inp.disabled = true;
      inp.classList.add(right ? 'is-correct' : 'is-wrong');
    }
    if (btn) btn.disabled = true;

    var fb = document.getElementById('feedback');
    if (fb) {
      fb.className = 'feedback ' + (right ? 'good' : 'bad');
      fb.textContent = fmt(right ? t().correct : t().wrong, { c: cname(q.country), cap: ccap(q.country) });
    }

    var bar = document.querySelector('.bar i');
    if (bar) bar.style.width = ((quiz.i + 1) / quiz.total * 100) + '%';

    var actions = document.getElementById('actions');
    if (!actions) return;
    var last = quiz.i === quiz.total - 1;
    actions.innerHTML = '<button class="btn primary" id="nextQ">' +
      esc(last ? t().seeResult : t().nextQ) + '</button>';
    var nextBtn = document.getElementById('nextQ');
    nextBtn.focus({ preventScroll: true });
    nextBtn.addEventListener('click', next);
  }

  function paintAnswer(q) {
    Array.prototype.forEach.call(document.querySelectorAll('#options .opt'), function (btn) {
      var iso = btn.dataset.iso;
      btn.disabled = true;
      if (iso === q.country.iso) btn.classList.add('is-correct');
      else if (iso === quiz.chosenIso) btn.classList.add('is-wrong');
      else btn.classList.add('is-dim');
    });

    var right = quiz.chosenIso === q.country.iso;
    var fb = document.getElementById('feedback');
    if (fb) {
      fb.className = 'feedback ' + (right ? 'good' : 'bad');
      fb.textContent = fmt(right ? t().correct : t().wrong, { c: cname(q.country), cap: ccap(q.country) });
    }

    var bar = document.querySelector('.bar i');
    if (bar) bar.style.width = ((quiz.i + 1) / quiz.total * 100) + '%';

    var actions = document.getElementById('actions');
    if (!actions) return;
    var last = quiz.i === quiz.total - 1;
    actions.innerHTML = '<button class="btn primary" id="nextQ">' +
      esc(last ? t().seeResult : t().nextQ) + '</button>';
    var nextBtn = document.getElementById('nextQ');
    nextBtn.focus({ preventScroll: true });
    nextBtn.addEventListener('click', next);
  }

  function answer(iso) {
    if (!quiz || quiz.answered) return;
    var q = quiz.questions[quiz.i];
    if (!q.options.some(function (o) { return o.iso === iso; })) return;

    quiz.answered = true;
    quiz.chosenIso = iso;
    if (iso === q.country.iso) quiz.score++;
    else quiz.misses.push(q.country);

    paintAnswer(q);
    syncCounter();
  }

  function next() {
    if (!quiz || !quiz.answered) return;
    if (quiz.i === quiz.total - 1) { renderResult(); return; }
    quiz.i++;
    quiz.answered = false;
    quiz.chosenIso = null;
    renderQuestion();
  }

  function verdictFor(score, total) {
    if (score === total) return t().perfect;
    if (score / total >= 0.8) return t().strong;
    if (score / total >= 0.5) return t().middle;
    return t().weak;
  }

  function renderResult() {
    quizView = 'result';
    var quizRef = quiz;
    var missed = [];
    var seen = {};
    quizRef.misses.forEach(function (c) {
      if (!seen[c.iso]) { seen[c.iso] = 1; missed.push(c); }
    });

    quizBody.innerHTML =
      '<div class="hero">' +
        '<p class="kicker">' + esc(t().complete) + '</p>' +
        '<p class="score-big">' + quizRef.score + '<small> / ' + quizRef.total + '</small></p>' +
        '<p style="margin-top:10px">' + esc(verdictFor(quizRef.score, quizRef.total)) + '</p>' +
        (missed.length
          ? '<ul class="misses">' + missed.map(function (c) {
              return '<li><span>' + flag(c.iso) + '</span><strong>' + esc(cname(c)) + '</strong>' +
                '<em>— ' + esc(ccap(c)) + '</em></li>';
            }).join('') + '</ul>'
          : '') +
        '<div style="margin-top:22px">' + styleControl() + chunkControl() + '</div>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="btn primary" id="again">' + esc(t().playAgain) + '</button>' +
          '<button class="btn soft" id="toLearn">' + esc(t().reviewMap) + '</button>' +
        '</div>' +
      '</div>';

    bindStyle();
    bindChunks();
    document.getElementById('again').addEventListener('click', newRound);
    document.getElementById('toLearn').addEventListener('click', function () { setMode('learn'); });
  }

  document.addEventListener('keydown', function (e) {
    if (mode !== 'quiz' || !quiz) return;
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.target && e.target.tagName === 'BUTTON') return;
    if (quiz.style === 'type') return;
    if (!quiz.answered && e.key >= '1' && e.key <= '4') {
      var q = quiz.questions[quiz.i];
      var opt = q.options[Number(e.key) - 1];
      if (opt) answer(opt.iso);
    } else if (quiz.answered && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      next();
    }
  });

  /* ---------------- language ---------------- */

  function applyLanguage(next) {
    lang = next;
    document.documentElement.lang = lang;

    document.title = t().title;
    document.getElementById('appTitle').textContent = t().h1;
    document.getElementById('tagline').textContent = fmt(t().tagline, { n: TOTAL_COUNTRIES });
    document.getElementById('tab-learn').textContent = t().tabLearn;
    document.getElementById('tab-quiz').textContent = t().tabQuiz;
    document.getElementById('mapCredit').textContent = t().credit;
    document.getElementById('howTitle').textContent = t().howTitle;
    document.getElementById('sideHint').innerHTML = t().sideHint;
    document.getElementById('tips').innerHTML = t().tips.map(function (li) { return '<li>' + li + '</li>'; }).join('');
    resetBtn.textContent = t().wholeMap;
    searchEl.placeholder = t().search;

    Array.prototype.forEach.call(document.querySelectorAll('.lang'), function (b) {
      var on = b.dataset.lang === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    buildMap();
    buildList();

    if (selected) selectCountry(selected, true);
    else {
      renderCard(null);
      mapTitle.textContent = t().europe;
      hintEl.textContent = t().clickCountry;
      applyView(HOME);
    }

    var q = searchEl.value.trim();
    if (q) searchEl.dispatchEvent(new Event('input'));

    if (quizView === 'start') renderQuizStart();
    else if (quizView === 'question') renderQuestion();
    else if (quizView === 'result') renderResult();
  }

  Array.prototype.forEach.call(document.querySelectorAll('.lang'), function (b) {
    b.addEventListener('click', function () { applyLanguage(b.dataset.lang); });
  });

  /* ---------------- boot ---------------- */

  buildMap();
  buildList();
  renderCard(null);
  setMode('learn');
  applyLanguage(lang);

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { applyView(curBox); }, 120);
  });
})();
