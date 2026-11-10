/* app.js — customization panel, settings persistence, and search */
(function () {
  'use strict';
  var R = window.Reader;

  /* ================= settings ================= */

  var DEFAULTS = {
    font: "'Amiri Quran', 'Amiri', serif",
    size: 34, weight: 400, lh: 2,
    strokeW: 0, strokeC: '#000000',
    text: '#17161a', paper: '#faf6ec', back: '#e9e2d2', accent: '#9a7b2d',
    align: 'center', marker: 'circle',
    frame: true, frameW: 2, pageW: 900,
    continuous: true, cue: false, lastPage: 1,
    bmPage: null
  };
  var S = Object.assign({}, DEFAULTS);
  var LS_KEY = 'quran-reader-settings';

  function load() {
    try {
      var h = location.hash;
      if (h.indexOf('#s=') === 0) {
        var obj = JSON.parse(decodeURIComponent(escape(atob(h.slice(3)))));
        Object.assign(S, obj);
        save();
        return;
      }
    } catch (e) { /* ignore bad hash */ }
    try {
      var stored = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (stored) Object.assign(S, stored);
    } catch (e) { /* ignore */ }
  }

  var saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
    }, 250);
  }

  function apply() {
    var r = document.documentElement.style;
    r.setProperty('--font', S.font);
    r.setProperty('--size', S.size + 'px');
    r.setProperty('--weight', S.weight);
    r.setProperty('--lh', S.lh);
    r.setProperty('--stroke-w', S.strokeW + 'px');
    r.setProperty('--stroke-c', S.strokeC);
    r.setProperty('--c-text', S.text);
    r.setProperty('--c-paper', S.paper);
    r.setProperty('--c-back', S.back);
    r.setProperty('--c-accent', S.accent);
    r.setProperty('--align', S.align);
    r.setProperty('--page-w', S.pageW + 'px');
    r.setProperty('--frame-w', S.frameW + 'px');
    document.body.classList.toggle('no-frame', !S.frame);
    document.body.classList.toggle('marker-bracket', S.marker === 'bracket');
    document.body.classList.toggle('marker-none', S.marker === 'none');
    document.body.classList.toggle('cue-on', !!S.cue);
    if (typeof R.setContinuous === 'function') R.setContinuous(S.continuous);
  }

  /* ================= panel ================= */

  var FONTS = [
    ['Amiri Quran — classic mushaf', "'Amiri Quran', 'Amiri', serif"],
    ['Amiri', "'Amiri', serif"],
    ['Scheherazade New', "'Scheherazade New', serif"],
    ['Lateef', "'Lateef', serif"],
    ['Noto Naskh Arabic', "'Noto Naskh Arabic', serif"],
    ['Aref Ruqaa — calligraphic', "'Aref Ruqaa', serif"],
    ['Katibeh', "'Katibeh', serif"],
    ['Reem Kufi — modern', "'Reem Kufi', serif"],
    ['Traditional Arabic (system)', "'Traditional Arabic', serif"],
    ['Sakkal Majalla (system)', "'Sakkal Majalla', serif"],
    ['Arabic Typesetting (system)', "'Arabic Typesetting', serif"],
    ['Segoe UI (system)', "'Segoe UI', sans-serif"]
  ];

  var RANGES = [
    ['r-size', 'Text size', 'size', 16, 96, 1, 'px'],
    ['r-weight', 'Thickness (weight)', 'weight', 100, 900, 50, ''],
    ['r-stroke', 'Stroke width', 'strokeW', 0, 6, 0.25, 'px'],
    ['r-lh', 'Line height', 'lh', 1.2, 3, 0.05, '×'],
    ['r-framew', 'Frame width', 'frameW', 0, 8, 1, 'px'],
    ['r-pagew', 'Page width', 'pageW', 480, 1400, 10, 'px']
  ];

  var COLORS = [
    ['c-text', 'Text color', 'text'],
    ['c-stroke', 'Stroke color', 'strokeC'],
    ['c-paper', 'Page (paper) color', 'paper'],
    ['c-back', 'Background color', 'back'],
    ['c-accent', 'Accent (markers, frame)', 'accent']
  ];

  var panel = document.getElementById('settings-panel');

  function buildPanel() {
    var h = '<div class="sp-head"><span class="sp-title">Customize your Mushaf</span>' +
      '<button class="sp-close" id="sp-close" title="Close">✕</button></div>';

    h += '<div class="sp-section"><h3>Typography</h3>';
    h += '<div class="ctl"><label for="f-font">Font</label><select id="f-font">' +
      FONTS.map(function (f) { return '<option value="' + f[1].replace(/"/g, '&quot;') + '">' + f[0] + '</option>'; }).join('') +
      '</select></div>';
    RANGES.forEach(function (r) {
      if (r[0] === 'r-framew' || r[0] === 'r-pagew') return;
      h += '<div class="ctl"><label for="' + r[0] + '">' + r[1] + '</label>' +
        '<input type="range" id="' + r[0] + '" min="' + r[3] + '" max="' + r[4] + '" step="' + r[5] + '">' +
        '<span class="val" id="' + r[0] + '-val"></span></div>';
    });
    h += '</div>';

    h += '<div class="sp-section"><h3>Colors</h3>';
    COLORS.forEach(function (c) {
      h += '<div class="ctl"><label for="' + c[0] + '">' + c[1] + '</label>' +
        '<input type="color" id="' + c[0] + '"><span class="val" id="' + c[0] + '-val"></span></div>';
    });
    h += '<div class="ctl"><label>Swap text / paper</label><button class="btn" id="b-swap" type="button">⇄ Swap</button></div>';
    h += '</div>';

    h += '<div class="sp-section"><h3>Layout & Reading</h3>';
    h += '<div class="ctl"><label for="seg-align">Alignment</label><div class="seg" id="seg-align">' +
      ['center', 'right', 'left', 'justify'].map(function (a) {
        return '<button type="button" data-v="' + a + '">' + a + '</button>';
      }).join('') + '</div></div>';
    h += '<div class="ctl"><label for="seg-marker">Verse markers</label><div class="seg" id="seg-marker">' +
      [['circle', 'circle'], ['bracket', 'brackets'], ['none', 'none']].map(function (m) {
        return '<button type="button" data-v="' + m[0] + '">' + m[1] + '</button>';
      }).join('') + '</div></div>';
    h += '<div class="ctl"><label for="r-framew">Frame width</label>' +
      '<input type="range" id="r-framew" min="0" max="8" step="1"><span class="val" id="r-framew-val"></span></div>';
    h += '<div class="ctl"><label for="r-pagew">Page width</label>' +
      '<input type="range" id="r-pagew" min="480" max="1400" step="10"><span class="val" id="r-pagew-val"></span></div>';
    h += '<div class="ctl"><label for="k-frame">Page frame</label><input type="checkbox" id="k-frame"></div>';
    h += '<div class="ctl"><label for="k-cont">Continuous scroll</label><input type="checkbox" id="k-cont"></div>';
    h += '<div class="ctl"><label for="k-cue">Surah label at page start</label><input type="checkbox" id="k-cue"></div>';
    h += '<div class="ctl"><label for="b-bm-toggle">Bookmark</label><button class="btn" id="b-bm-toggle" type="button"></button></div>';
    h += '</div>';

    h += '<div class="sp-actions">' +
      '<button class="btn" id="b-print-all" type="button">🖨 Print WHOLE Quran</button>' +
      '<button class="btn" id="b-print" type="button">🖨 Print loaded pages</button>' +
      '<button class="btn" id="b-share" type="button">🔗 Copy my look link</button>' +
      '<button class="btn" id="b-reset" type="button">↺ Reset</button></div>' +
      '<p class="sp-hint">Everything is saved automatically in this browser. The stroke draws an outline ' +
      'around each letter — combine it with weight for bold outlines. Use the search bar to jump to any ' +
      'surah, page, or verse. "Print WHOLE Quran" prints all 604 pages with these exact settings — ' +
      'enable "Background graphics" in the print dialog so colors print.</p>';

    panel.innerHTML = h;
    wirePanel();
    refreshPanel();
  }

  function wirePanel() {
    document.getElementById('f-font').addEventListener('change', function () { S.font = this.value; apply(); save(); });
    RANGES.forEach(function (r) {
      var id = r[0], key = r[2];
      var el = document.getElementById(id);
      var val = document.getElementById(id + '-val');
      el.addEventListener('input', function () {
        S[key] = +this.value;
        val.textContent = this.value + r[6];
        apply(); save();
      });
    });
    COLORS.forEach(function (c) {
      var el = document.getElementById(c[0]);
      var val = document.getElementById(c[0] + '-val');
      el.addEventListener('input', function () {
        S[c[2]] = this.value;
        val.textContent = this.value;
        apply(); save();
      });
    });
    ['align', 'marker'].forEach(function (key) {
      var seg = document.getElementById('seg-' + key);
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        S[key] = b.getAttribute('data-v');
        refreshPanel(); apply(); save();
      });
    });
    document.getElementById('k-frame').addEventListener('change', function () { S.frame = this.checked; apply(); save(); });
    document.getElementById('k-cont').addEventListener('change', function () { S.continuous = this.checked; apply(); save(); });
    document.getElementById('k-cue').addEventListener('change', function () { S.cue = this.checked; apply(); save(); });
    document.getElementById('b-bm-toggle').addEventListener('click', function () {
      if (S.bmPage) { S.bmPage = null; save(); refreshBmUI(); toast('Bookmark removed'); }
      else setBookmark();
    });
    document.getElementById('b-swap').addEventListener('click', function () {
      var t = S.text; S.text = S.paper; S.paper = t;
      refreshPanel(); apply(); save();
    });
    document.getElementById('b-print').addEventListener('click', function () { window.print(); });
    document.getElementById('b-print-all').addEventListener('click', function () {
      closePanel();
      setTimeout(function () { R.printAll(); }, 250);
    });
    document.getElementById('b-reset').addEventListener('click', function () {
      S = Object.assign({}, DEFAULTS, { lastPage: S.lastPage });
      refreshPanel(); apply(); save(); toast('Customization reset');
    });
    document.getElementById('b-share').addEventListener('click', shareLook);
    document.getElementById('sp-close').addEventListener('click', closePanel);
  }

  function refreshPanel() {
    document.getElementById('f-font').value = S.font;
    RANGES.forEach(function (r) {
      document.getElementById(r[0]).value = S[r[2]];
      document.getElementById(r[0] + '-val').textContent = S[r[2]] + r[6];
    });
    COLORS.forEach(function (c) {
      document.getElementById(c[0]).value = S[c[2]];
      document.getElementById(c[0] + '-val').textContent = S[c[2]];
    });
    ['align', 'marker'].forEach(function (key) {
      var seg = document.getElementById('seg-' + key);
      var btns = seg.querySelectorAll('button');
      for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('on', btns[i].getAttribute('data-v') === S[key]);
      }
    });
    document.getElementById('k-frame').checked = !!S.frame;
    document.getElementById('k-cont').checked = !!S.continuous;
    document.getElementById('k-cue').checked = !!S.cue;
  }

  /* ---------- bookmark ---------- */

  function setBookmark() {
    var old = S.bmPage;
    var now = R.current;
    if (old === now) { toast('Bookmark is already at page ' + now); return; }
    S.bmPage = now;
    save(); refreshBmUI();
    toast(old ? 'Bookmark moved: page ' + old + ' \u2192 page ' + now : 'Bookmark saved at page ' + now);
  }

  function refreshBmUI() {
    var go = document.getElementById('btn-bm-go');
    var lbl = document.getElementById('bm-go-label');
    var tg = document.getElementById('b-bm-toggle');
    if (S.bmPage) {
      go.hidden = false;
      lbl.textContent = 'Page ' + S.bmPage;
      if (tg) tg.textContent = 'Remove \u00b7 page ' + S.bmPage;
    } else {
      go.hidden = true;
      if (tg) tg.textContent = 'Set at current page';
    }
  }

  document.getElementById('btn-bm-set').addEventListener('click', setBookmark);
  document.getElementById('btn-bm-go').addEventListener('click', function () {
    if (S.bmPage) {
      R.gotoPage(S.bmPage);
      toast('Resumed at your bookmark \u2014 page ' + S.bmPage);
    }
  });

  /* ---------- panel open/close ---------- */

  var scrim = document.getElementById('scrim');
  function openPanel() { panel.classList.add('open'); scrim.classList.add('show'); }
  function closePanel() { panel.classList.remove('open'); scrim.classList.remove('show'); }
  document.getElementById('btn-settings').addEventListener('click', function () {
    panel.classList.contains('open') ? closePanel() : openPanel();
  });
  scrim.addEventListener('click', closePanel);

  function shareLook() {
    var slim = {};
    for (var k in S) if (k !== 'lastPage' && k !== 'bmPage') slim[k] = S[k];
    var url = location.href.split('#')[0] + '#s=' +
      btoa(unescape(encodeURIComponent(JSON.stringify(slim))));
    function done() { toast('Link copied — opens with this exact look'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); });
    } else {
      prompt('Copy this link:', url);
    }
  }

  /* ================= search ================= */

  var searchInput = document.getElementById('search');
  var resultsEl = document.getElementById('search-results');
  var index = null;
  var activeIdx = -1;
  var rows = [];

  function norm(s) {
    return String(s)
      .replace(/[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g, '')
      .replace(/[\u0622\u0623\u0625\u0627\u0671]/g, 'ا')
      .replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/\uFEFF/g, '')
      .toLowerCase().trim();
  }

  function normEn(s) {
    return String(s).toLowerCase()
      .replace(/[^a-z0-9\u0621-\u0652]/g, '')
      .replace(/ee/g, 'i').replace(/aa/g, 'a').replace(/oo/g, 'u');
  }

  function buildIndex() {
    index = [];
    R.pages.forEach(function (list, pi) {
      list.forEach(function (x) {
        index.push({ s: x.s, a: x.a, t: x.t, page: pi + 1, tn: norm(x.t) });
      });
    });
  }

  function search(qraw) {
    var q = qraw.trim();
    if (!q) { hideResults(); return; }
    if (!index) buildIndex();
    var out = [];
    var m;

    if ((m = q.match(/^(?:p|page|pg)\s*[#: ]?\s*(\d{1,3})$/i))) {
      var pg = Math.min(604, Math.max(1, +m[1]));
      out.push({ kind: 'page', page: pg });
    } else if ((m = q.match(/^(\d{1,3})\s*[:.\-/]\s*(\d{1,3})$/))) {
      var rs = +m[1], ra = +m[2];
      var rp = R.ayahPage[rs + ':' + ra];
      if (rp) {
        var rt = '', lst = R.pages[rp - 1];
        for (var li = 0; li < lst.length; li++) if (lst[li].s === rs && lst[li].a === ra) { rt = lst[li].t; break; }
        out.push({ kind: 'ayah', s: rs, a: ra, page: rp, t: rt });
      }
    } else if (/^\d{1,3}$/.test(q)) {
      var n = +q;
      if (n >= 1 && n <= 114) out.push({ kind: 'surah', s: n });
      out.push({ kind: 'page', page: n });
    } else {
      var qn = norm(q);
      var qe = normEn(q);
      R.surahs.forEach(function (su) {
        var nen = normEn(su.en);
        var nar = norm(su.name).replace(/^\u0633\u0648\u0631[\u0629\u0647]\s*/, '');
        if ((qe && nen.indexOf(qe) > -1) || (qe && qe.indexOf(nen) > -1) || nar.indexOf(qn) > -1 || String(su.n) === q) {
          out.push({ kind: 'surah', s: su.n });
        }
      });
      var ayahHits = 0;
      for (var i = 0; i < index.length && ayahHits < 24; i++) {
        if (index[i].tn.indexOf(qn) > -1) { out.push({ kind: 'ayah', s: index[i].s, a: index[i].a, page: index[i].page, t: index[i].t }); ayahHits++; }
      }
    }
    renderResults(out.slice(0, 30));
  }

  function suOf(s) { return R.surahs[s - 1]; }

  function renderResults(list) {
    rows = [];
    activeIdx = -1;
    if (!list.length) {
      resultsEl.innerHTML = '<div class="sr-note">No results. Try a surah name, "page 60", "2:255", or words from a verse.</div>';
      resultsEl.hidden = false;
      return;
    }
    var html = list.map(function (r) {
      if (r.kind === 'page') {
        var su = pageSurah(r.page);
        return '<div class="sr-row" data-kind="page" data-page="' + r.page + '">' +
          '<span class="sr-icon">📄</span><span class="sr-main"><b>Page ' + r.page + '</b>' +
          '<span class="sr-sub">' + (su ? su.en + ' · starts at ' + su.name : '') + '</span></span></div>';
      }
      if (r.kind === 'surah') {
        var s2 = suOf(r.s);
        return '<div class="sr-row" data-kind="surah" data-s="' + r.s + '">' +
          '<span class="sr-icon">📖</span><span class="sr-main"><b>' + s2.en + ' — ' + s2.name + '</b>' +
          '<span class="sr-sub">Surah ' + r.s + ' · page ' + s2.page + ' · ' + s2.count + ' ayahs</span></span></div>';
      }
      var s3 = suOf(r.s);
      return '<div class="sr-row" data-kind="ayah" data-s="' + r.s + '" data-a="' + r.a + '">' +
        '<span class="sr-icon">﴿﴾</span><span class="sr-main"><b>' + s3.en + ' ' + r.s + ':' + r.a + '</b>' +
        '<span class="sr-sub" dir="rtl">' + r.t.slice(0, 90) + '…</span></span></div>';
    }).join('');
    resultsEl.innerHTML = html;
    resultsEl.hidden = false;
    rows = [].slice.call(resultsEl.querySelectorAll('.sr-row'));
  }

  function pageSurah(p) {
    var list = R.pages[p - 1];
    if (!list || !list.length) return null;
    return suOf(list[0].s);
  }

  function hideResults() { resultsEl.hidden = true; activeIdx = -1; }

  resultsEl.addEventListener('mousedown', function (e) {
    var row = e.target.closest('.sr-row');
    if (!row) return;
    pick(row);
  });

  function pick(row) {
    var kind = row.getAttribute('data-kind');
    if (kind === 'page') R.gotoPage(+row.getAttribute('data-page'));
    else if (kind === 'surah') R.gotoAyah(+row.getAttribute('data-s'), 1);
    else R.gotoAyah(+row.getAttribute('data-s'), +row.getAttribute('data-a'));
    hideResults();
    searchInput.blur();
  }

  function setActive(i) {
    if (!rows.length) return;
    activeIdx = (i + rows.length) % rows.length;
    rows.forEach(function (r, j) { r.classList.toggle('active', j === activeIdx); });
    rows[activeIdx].scrollIntoView({ block: 'nearest' });
  }

  var deb = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(deb);
    deb = setTimeout(function () { search(searchInput.value); }, 140);
  });
  searchInput.addEventListener('focus', function () { if (searchInput.value) search(searchInput.value); });
  searchInput.addEventListener('blur', function () { setTimeout(hideResults, 180); });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      var row = rows[activeIdx >= 0 ? activeIdx : 0];
      if (row) pick(row);
    } else if (e.key === 'Escape') {
      searchInput.value = ''; hideResults(); searchInput.blur();
    }
  });

  /* ================= toast + shortcuts ================= */

  var toastEl = document.getElementById('toast');
  var toastT = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.hidden = true; }, 2400);
  }

  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
    else if (e.key === 'Escape') { closePanel(); }
    else if (!typing && !panel.classList.contains('open')) {
      if (e.key === 'b' || e.key === 'B') { e.preventDefault(); setBookmark(); }
      else if (e.key === 'ArrowRight') R.gotoPage(R.current + 1);
      else if (e.key === 'ArrowLeft') R.gotoPage(R.current - 1);
    }
  });

  /* ================= init ================= */

  load();
  apply();
  buildPanel();
  refreshBmUI();
  R.onPageChange(function (p) { S.lastPage = p; save(); });
  R.gotoPage(Math.min(604, Math.max(1, S.lastPage || 1)));
})();
