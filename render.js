/* render.js — builds mushaf pages from QURAN_RAW and manages scrolling/navigation */
(function () {
  'use strict';

  var pagesEl = document.getElementById('pages');
  var sentinel = document.getElementById('sentinel');

  var BASMALA = '';
  var AD = '٠١٢٣٤٥٦٧٨٩';
  function arNum(n) { return String(n).replace(/\d/g, function (d) { return AD[+d]; }); }

  /* ---------- build structures ---------- */

  var surahs = [];
  var pages = [];      // pages[n-1] = [{s, a, t}, ...]
  var ayahPage = {};   // "s:a" -> page number
  var loaded = false;

  (function build() {
    var raw = window.QURAN_RAW && window.QURAN_RAW.data && window.QURAN_RAW.data.surahs;
    if (!raw || !raw.length) return;
    /* the exact basmala spelling of this edition = common prefix of the
       first ayahs of surah 2 and surah 3 (both start with it, then diverge) */
    var b1 = raw[1] && raw[1].ayahs[0] && String(raw[1].ayahs[0].text).replace(/\uFEFF/g, '');
    var b2 = raw[3] && raw[3].ayahs[0] && String(raw[3].ayahs[0].text).replace(/\uFEFF/g, '');
    if (b1 && b2) {
      var bi = 0;
      while (bi < b1.length && bi < b2.length && b1[bi] === b2[bi]) bi++;
      BASMALA = b1.slice(0, bi).replace(/\s+$/, '');
      if (BASMALA.length > 50) BASMALA = ''; /* safety: not a real basmala */
    }
    raw.forEach(function (su) {
      surahs.push({
        n: su.number,
        name: su.name,
        en: su.englishName,
        type: su.revelationType === 'Meccan' ? 'مكية' : 'مدنية',
        count: su.numberOfAyahs || su.ayahs.length,
        page: 0
      });
      su.ayahs.forEach(function (ay) {
        var t = String(ay.text).replace(/\uFEFF/g, '');
        if (ay.numberInSurah === 1 && su.number !== 1) {
          t = t.replace(BASMALA, '').replace(/^\s+/, '');
        }
        if (ay.numberInSurah === 1) surahs[su.number - 1].page = ay.page;
        var p = ay.page;
        (pages[p - 1] = pages[p - 1] || []).push({ s: su.number, a: ay.numberInSurah, t: t });
        ayahPage[su.number + ':' + ay.numberInSurah] = p;
      });
    });
    for (var i = 0; i < pages.length; i++) {
      if (!pages[i]) pages[i] = [];
    }
    loaded = surahs.length === 114;
  })();

  if (!loaded) {
    pagesEl.innerHTML = '<p class="error">تعذّر تحميل بيانات المصحف. تأكّد من وجود الملف "data/quran-data.js" بجانب index.html</p>';
    return;
  }

  /* ---------- page rendering ---------- */

  function ayahHTML(x) {
    return '<span class="ayah" id="v' + x.s + '-' + x.a + '" title="' + arNum(x.s) + ':' + arNum(x.a) + '">' +
      '<span class="a-text">' + x.t + '</span>' +
      '<span class="vm">' + arNum(x.a) + '</span></span>';
  }

  function surahHeadHTML(m) {
    return '<div class="surah-head">' +
      '<div class="sh-rule"></div>' +
      '<div class="sh-name">' + m.name + '</div>' +
      '<div class="sh-meta">' + m.type + ' · آياتها ' + arNum(m.count) + '</div>' +
      '<div class="sh-rule"></div></div>';
  }

  function pageHTML(p) {
    var list = pages[p - 1];
    var html = '';
    var cur = 0;
    list.forEach(function (x, idx) {
      if (x.s !== cur) {
        cur = x.s;
        var m = surahs[cur - 1];
        if (x.a === 1) {
          html += surahHeadHTML(m);
          if (cur !== 1 && cur !== 9) html += '<div class="bismillah">' + BASMALA + '</div>';
        } else if (idx === 0) {
          html += '<div class="page-cue">' + m.name + '</div>';
        }
      }
      html += ayahHTML(x);
    });
    return html;
  }

  function pageSection(p) {
    return '<section class="page" data-page="' + p + '" id="page-' + p + '">' +
      '<div class="page-inner quran-text">' + pageHTML(p) + '</div>' +
      '<div class="page-number">' + arNum(p) + '</div></section>';
  }

  /* ---------- loading / navigation state ---------- */

  var firstLoaded = 0, lastLoaded = 0;
  var continuous = true;
  var current = 1;
  var onPageChange = null;

  function appendPage(n, force) {
    if (!force && (n < 1 || n > 604 || n <= lastLoaded)) return;
    pagesEl.insertAdjacentHTML('beforeend', pageSection(n));
    lastLoaded = n;
    observePages();
  }

  var prepending = false;
  function prependPage(n) {
    if (n < 1 || n >= firstLoaded || prepending) return;
    prepending = true;
    var prevY = window.scrollY;
    var doc = document.documentElement;
    var oldBehavior = doc.style.scrollBehavior;
    doc.style.scrollBehavior = 'auto';
    pagesEl.insertAdjacentHTML('afterbegin', pageSection(n));
    firstLoaded = n;
    var el = pagesEl.firstElementChild;
    window.scrollBy(0, el.getBoundingClientRect().height + 60);
    doc.style.scrollBehavior = oldBehavior;
    observePages();
    prepending = false;
    if (window.scrollY < 260 && n > 1) { /* keep filling upward if needed */ }
  }

  function observePages() {
    var secs = pagesEl.querySelectorAll('.page');
    for (var i = 0; i < secs.length; i++) {
      if (!secs[i]._obs) { secs[i]._obs = true; pageObs.observe(secs[i]); }
    }
  }

  function resetTo(n) {
    pagesEl.innerHTML = '';
    firstLoaded = lastLoaded = n;
    appendPage(n, true);
    if (continuous) {
      window.scrollTo(0, 0);
    } else {
      window.scrollTo(0, 0);
    }
    setPageCurrent(n);
  }

  function gotoPage(n) {
    n = Math.min(604, Math.max(1, n | 0));
    if (continuous && n >= firstLoaded - 1 && n <= lastLoaded + 1 && pagesEl.children.length) {
      var el = document.getElementById('page-' + n);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setPageCurrent(n); return; }
    }
    resetTo(n);
  }

  function setPageCurrent(n) {
    current = n;
    var pill = document.getElementById('page-pill');
    var inp = document.getElementById('page-input');
    if (pill) {
      var su = surahOfPage(n);
      pill.textContent = 'صفحة ' + arNum(n) + ' من ' + arNum(604) + (su ? ' · ' + su.name : '');
    }
    if (inp && document.activeElement !== inp) inp.value = n;
    if (onPageChange) onPageChange(n);
  }

  function surahOfPage(n) {
    var list = pages[n - 1];
    if (!list || !list.length) return null;
    return surahs[list[list.length - 1].s - 1];
  }

  function gotoAyah(s, a) {
    var p = ayahPage[s + ':' + a];
    if (!p) return false;
    var el = document.getElementById('v' + s + '-' + a);
    if (!el) {
      gotoPage(p);
      var tries = 0;
      (function wait() {
        el = document.getElementById('v' + s + '-' + a);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
        } else if (++tries < 40) setTimeout(wait, 25);
      })();
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    }
    return true;
  }

  /* ---------- observers ---------- */

  var pageObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) setPageCurrent(+e.target.getAttribute('data-page'));
    });
  }, { rootMargin: '-38% 0px -55% 0px', threshold: 0 });

  var sentinelObs = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && continuous && lastLoaded < 604) appendPage(lastLoaded + 1);
  }, { rootMargin: '1100px 0px' });
  sentinelObs.observe(sentinel);

  window.addEventListener('scroll', function () {
    if (continuous && !prepending && window.scrollY < 320 && firstLoaded > 1) {
      prependPage(firstLoaded - 1);
    }
  }, { passive: true });

  /* ---------- bottom nav wiring ---------- */

  document.getElementById('btn-prev').addEventListener('click', function () { gotoPage(current - 1); });
  document.getElementById('btn-next').addEventListener('click', function () { gotoPage(current + 1); });
  var pageInput = document.getElementById('page-input');
  pageInput.addEventListener('change', function () { gotoPage(+this.value); });

  /* ---------- whole-Quran printing ---------- */

  function printAll() {
    if (!window.confirm(
      'طباعة المصحف كاملاً (٦٠٤ صفحات)؟\n\n' +
      'سيُستخدم خطّك وحجمك وسماكتك وحدودك وألوانك.\n\n' +
      'نصائح لنافذة الطباعة:\n' +
      '- فعّل خيار "Background graphics" حتى تُطبع ألوان الصفحة والعلامات\n' +
      '- حسب حجم نصّك قد تحتاج مئات الأوراق\n' +
      '- يمكنك اختيار "Save as PDF" بدل الطابعة للحصول على ملف PDF'
    )) return;

    var prevCurrent = current;
    var prevCont = continuous;
    continuous = false; /* stop auto-append while the full book is laid out */

    var html = '';
    for (var p = 1; p <= 604; p++) html += pageSection(p);
    pagesEl.innerHTML = html;
    firstLoaded = 1;
    lastLoaded = 604;
    observePages();

    var doc = document.documentElement;
    var ob = doc.style.scrollBehavior;
    doc.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    doc.style.scrollBehavior = ob;

    function restore() {
      window.removeEventListener('afterprint', restore);
      continuous = prevCont;
      resetTo(prevCurrent);
    }
    window.addEventListener('afterprint', restore);

    var go = function () { setTimeout(function () { window.print(); }, 120); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    else go();
  }

  /* ---------- public API ---------- */

  window.Reader = {
    surahs: surahs,
    pages: pages,
    ayahPage: ayahPage,
    arNum: arNum,
    gotoPage: gotoPage,
    gotoAyah: gotoAyah,
    printAll: printAll,
    get current() { return current; },
    setContinuous: function (v) {
      continuous = !!v;
      if (lastLoaded === 0) return;
      if (!continuous) {
        var secs = pagesEl.querySelectorAll('.page');
        for (var i = 0; i < secs.length; i++) {
          if (secs[i].getAttribute('data-page') !== String(current)) secs[i].remove();
        }
        firstLoaded = lastLoaded = current;
        var el = document.getElementById('page-' + current);
        if (el) window.scrollTo(0, 0);
      } else if (lastLoaded < current + 1) {
        appendPage(Math.min(604, current + 1));
      }
    },
    onPageChange: function (fn) { onPageChange = fn; }
  };
})();
