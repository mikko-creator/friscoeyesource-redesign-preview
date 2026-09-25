/* site.js — Eye Source. No dependencies.
   Motion is progressive: nothing here is required to read the page. Reveal styles only apply once
   this script adds .js-motion to <html>, and never when the visitor prefers reduced motion. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var motionOK = !reduce.matches;
  if (motionOK) doc.classList.add('js-motion');

  /* ---- announcement bar: a real dismiss (the source's "x" had no script behind it) ---- */
  var announce = document.querySelector('.announce');
  if (announce) {
    try { if (sessionStorage.getItem('es-announce') === 'closed') announce.hidden = true; } catch (e) {}
    var closeBtn = announce.querySelector('.announce__close');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      announce.hidden = true;
      try { sessionStorage.setItem('es-announce', 'closed'); } catch (e) {}
    });
  }

  /* ---- header state, scroll progress, back-to-top ---- */
  var header = document.querySelector('.site-header');
  var totop = document.querySelector('.totop');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || 0;
    var max = Math.max(1, doc.scrollHeight - window.innerHeight);
    doc.style.setProperty('--scroll', Math.min(1, y / max).toFixed(4));
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (totop) totop.classList.toggle('is-shown', y > window.innerHeight * 1.2);
    if (motionOK) parallax();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  if (totop) totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: motionOK ? 'smooth' : 'auto' }); var m = document.getElementById('main'); if (m) m.focus({ preventScroll: true }); });

  /* ---- reveals: IntersectionObserver; anything already on screen at load is revealed at once ---- */
  var reveals = [].slice.call(document.querySelectorAll('[data-reveal]'));
  [].forEach.call(document.querySelectorAll('[data-stagger]'), function (group) {
    [].forEach.call(group.querySelectorAll('[data-reveal]'), function (el, i) { el.style.setProperty('--i', String(i % 8)); });
  });
  /* Once an element's entrance has played, its reveal state is RELEASED (data-reveal removed): the
     reveal rule's `transform: none` otherwise outranked every hover lift and 3D tilt on the revealed
     cards (QA RM-2). */
  function reveal(el) {
    if (el.classList.contains('is-in')) return;
    el.classList.add('is-in');
    var i = parseFloat(el.style.getPropertyValue('--i')) || 0;
    setTimeout(function () { el.removeAttribute('data-reveal'); }, 1250 + i * 90);
  }
  if (motionOK && 'IntersectionObserver' in window) {
    var delivered = false;
    var io = new IntersectionObserver(function (entries) {
      delivered = true;
      entries.forEach(function (en) { if (en.isIntersecting) { reveal(en.target); io.unobserve(en.target); } });
    /* threshold 0, not a ratio: an element taller than ~12 viewports (the 13-select patient
       registration form on a phone) can never show 8% of itself at once, so a ratio threshold
       left it invisible until the fail-safe fired (QA RM-1) */
    }, { rootMargin: '0px', threshold: 0 });   /* no dead band at the viewport bottom (QA RM-1 residual) */
    reveals.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) reveal(el);
      else io.observe(el);
    });
    /* fail-safe ONLY for an observer that never delivers (a working one always delivers an initial
       entry per element): an unconditional 4s timer revealed every section off-screen, so nobody who
       scrolled after 4s ever saw a scroll animation (QA RM-3) */
    setTimeout(function () { if (!delivered) reveals.forEach(reveal); }, 4000);
    window.addEventListener('beforeprint', function () { reveals.forEach(reveal); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---- parallax: each [data-depth] layer moves by its distance from the viewport centre ---- */
  var layers = [];
  var arcs = [].slice.call(document.querySelectorAll('.arc-draw'));
  function measure() {
    layers = [].map.call(document.querySelectorAll('[data-depth]'), function (el) {
      var prev = el.style.translate; el.style.translate = 'none';
      var r = el.getBoundingClientRect();
      el.style.translate = prev;
      return { el: el, top: r.top + window.scrollY, h: r.height, d: parseFloat(el.getAttribute('data-depth')) || 0, rot: parseFloat(el.getAttribute('data-rot') || '0') };
    });
  }
  function parallax() {
    var vh = window.innerHeight, y = window.scrollY, scale = window.innerWidth < 700 ? 0.5 : 1;
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var centre = L.top + L.h / 2 - y - vh / 2;
      if (L.top - y > vh * 1.5 || L.top + L.h - y < -vh * 0.5) continue;
      var py = -centre * L.d * scale;
      L.el.style.setProperty('--py', py.toFixed(1));
      if (L.rot) L.el.style.setProperty('--pr', (centre / vh * L.rot).toFixed(2));
    }
    for (var j = 0; j < arcs.length; j++) {
      var r = arcs[j].getBoundingClientRect();
      var p = 1 - Math.min(1, Math.max(0, (r.top - vh * 0.15) / (vh * 0.75)));
      arcs[j].style.setProperty('--draw', p.toFixed(3));
    }
  }
  if (motionOK) {
    arcs.forEach(function (a) { a.style.setProperty('--draw', '0'); });
    measure();
    window.addEventListener('load', function () { measure(); onScroll(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); onScroll(); });
  }
  onScroll();

  /* ---- pointer: glass specular highlight and gentle 3D tilt (fine pointers only) ---- */
  if (finePointer.matches) {
    document.addEventListener('pointermove', function (e) {
      var g = e.target.closest && e.target.closest('.glass');
      if (g) {
        var r = g.getBoundingClientRect();
        g.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        g.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      }
    }, { passive: true });
    if (motionOK) [].forEach.call(document.querySelectorAll('[data-tilt]'), function (el) {
      var max = parseFloat(el.getAttribute('data-tilt')) || 6;
      el.addEventListener('pointermove', function (e) {
        if (el.hasAttribute('data-reveal')) return;   // no tilt until the entrance has been released (QA RR-7)
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('is-tilting');
        el.style.setProperty('--rx', (x * max).toFixed(2));
        el.style.setProperty('--ry', (-y * max).toFixed(2));
      });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0'); el.style.setProperty('--ry', '0');
      });
    });
  }

  /* ---- navigation: submenu toggles, mobile drawer ---- */
  [].forEach.call(document.querySelectorAll('.submenu-toggle'), function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.closest('li'); var open = !li.classList.contains('is-open');
      li.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    [].forEach.call(document.querySelectorAll('.has-children.is-open'), function (li) { li.classList.remove('is-open'); var b = li.querySelector('.submenu-toggle'); if (b) b.setAttribute('aria-expanded', 'false'); });
    closeDrawer();
  });
  var drawer = document.querySelector('.drawer');
  var opener = document.querySelector('.nav-toggle');
  var lastFocus = null;
  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    requestAnimationFrame(function () { drawer.classList.add('is-open'); });
    document.body.classList.add('drawer-open');
    if (opener) opener.setAttribute('aria-expanded', 'true');
    var first = drawer.querySelector('a, button'); if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    if (opener) opener.setAttribute('aria-expanded', 'false');
    setTimeout(function () { drawer.hidden = true; }, motionOK ? 500 : 0);
    if (lastFocus) lastFocus.focus();
  }
  if (opener) opener.addEventListener('click', openDrawer);
  if (drawer) {
    [].forEach.call(drawer.querySelectorAll('[data-close]'), function (el) { el.addEventListener('click', closeDrawer); });
    drawer.addEventListener('keydown', function (e) {  // keep Tab inside the open drawer
      if (e.key !== 'Tab') return;
      var f = drawer.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---- review deck ---- */
  [].forEach.call(document.querySelectorAll('.deck'), function (deck) {
    var cards = [].slice.call(deck.querySelectorAll('.deck__card'));
    var wrap = deck.closest('.reviews') || deck.parentNode;
    var count = wrap.querySelector('.deck__count');
    var live = wrap.querySelector('[aria-live]');
    var idx = 0, timer = null, userDriven = false;
    /* a long review is clamped to a few lines on the front card, with a toggle; every card takes the
       height of the tallest CLAMPED card. Sizing to the front card reflowed the page on every change
       (QA RM-4, RR-4); sizing to the longest full review left ~700px of blank glass under short ones on
       a phone (QA round 3 REG-2). */
    deck.classList.add('is-clamped');
    function setOpen(c, open) {
      var b = c.querySelector('.deck__more');
      c.classList.toggle('is-expanded', open);
      if (b) { b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Show less' : 'Read the full review'; }
    }
    function sizeDeck() {
      /* measure every card at its natural FRONT size, collapsed: lift the back cards' caps for one
         synchronous read (no paint in between) */
      deck.classList.add('is-measuring');
      /* clamp only where it saves more than two lines: a toggle that hides one line is noise */
      cards.forEach(function (c) {
        var q = c.querySelector('blockquote'), b = c.querySelector('.deck__more');
        if (!q || !b) return;
        c.classList.remove('is-fit', 'is-short');
        var cs = getComputedStyle(q), line = parseFloat(cs.lineHeight) || 26;
        var natural = q.scrollHeight;   // read BEFORE .is-fit, which lets the quote grow into the card
        var long = natural > q.clientHeight + 2 * line + 1;
        if (!long) c.classList.add('is-fit');
        /* a review of a few lines is set as a larger pull-quote, centred in the card */
        if (natural <= 4 * line + 1) c.classList.add('is-short');
        c.classList.toggle('is-long', long);
        b.hidden = !long;
      });
      var h = 0;
      /* offsetHeight = LAYOUT height; getBoundingClientRect() is the transformed box, and before its
         reveal the deck is tilted (rotateX), which under-measured every card */
      cards.forEach(function (c) { h = Math.max(h, c.offsetHeight); });
      deck.classList.remove('is-measuring');
      var pb = parseFloat(getComputedStyle(deck).paddingBottom) || 0;
      if (h) {
        deck.style.setProperty('--deck-card-h', Math.ceil(h) + 'px');
        deck.style.setProperty('--deck-h', Math.ceil(h + pb + 2) + 'px');
      }
    }
    sizeDeck();
    window.addEventListener('resize', sizeDeck, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeDeck);
    function render() {
      cards.forEach(function (c, i) {
        var pos = (i - idx + cards.length) % cards.length;
        c.setAttribute('data-pos', pos <= 3 ? String(pos) : (pos === cards.length - 1 ? '-1' : 'far'));
        c.setAttribute('aria-hidden', pos === 0 ? 'false' : 'true');
        c.inert = pos !== 0;
      });
      if (count) count.textContent = (idx + 1) + ' / ' + cards.length;
    }
    var prev = wrap.querySelector('[data-deck="prev"]'), next = wrap.querySelector('[data-deck="next"]');
    function scrollNow(d) { try { window.scrollBy({ top: d, left: 0, behavior: 'instant' }); } catch (e) { window.scrollBy(0, d); } }
    function headerBottom() { var h = document.querySelector('.site-header'); return h ? Math.max(0, h.getBoundingClientRect().bottom) : 0; }
    function onScreen(el) { var r = el.getBoundingClientRect(); return r.bottom > headerBottom() && r.top < window.innerHeight; }
    function go(step, byUser) {
      /* collapsing an expanded review shrinks the deck under a fixed scroll position (QA round 4
         R3-STACK-2). Keep the control the visitor used where it was - but only a control that is ON
         SCREEN: after a swipe, holding an off-screen Next dragged the new review out of view (QA round 5
         DECK-SWIPE-ANCHOR). The anchor is never inside the deck - its cards move. Then make sure the new
         review itself starts on screen, below the header. */
      var anchor = null, before = 0, collapsed = false;
      if (cards.some(function (c) { return c.classList.contains('is-expanded'); })) {
        collapsed = true;
        var a = document.activeElement;
        var cand = (a && a !== document.body && wrap.contains(a) && !deck.contains(a)) ? a : next;
        if (cand && onScreen(cand)) { anchor = cand; before = cand.getBoundingClientRect().top; }
        cards.forEach(function (c) { if (c.classList.contains('is-expanded')) setOpen(c, false); });
      }
      idx = (idx + step + cards.length) % cards.length; render();
      if (anchor) { var d = anchor.getBoundingClientRect().top - before; if (Math.abs(d) > 1) scrollNow(d); }
      if (collapsed) {
        /* the front card rests at the deck's top edge (its own transform is mid-transition, so read the deck) */
        var top = deck.getBoundingClientRect().top, hb = headerBottom();
        if (top < hb + 8 || top > window.innerHeight - 120) scrollNow(top - hb - 16);
      }
      /* announce only what the visitor asked for (an auto-advance every 6.5 s would talk over the page),
         cut at a word boundary */
      if (live && byUser) {
        var q = cards[idx].querySelector('blockquote'), t = (q ? q.textContent : cards[idx].innerText).replace(/\s+/g, ' ').trim();
        if (t.length > 200) t = t.slice(0, t.lastIndexOf(' ', 200)) + '…';
        live.textContent = 'Review ' + (idx + 1) + ' of ' + cards.length + ': ' + t;
      }
    }
    /* once the visitor drives the deck, it never auto-advances again (QA RR-5) */
    function takeOver() { userDriven = true; stop(); }
    cards.forEach(function (c) {
      var b = c.querySelector('.deck__more');
      /* "Show less" keeps its button where the visitor pressed it; the text above it shrinks (QA round 5:
         on a phone the button jumped 624px, off the top of the screen) */
      if (b) b.addEventListener('click', function () {
        takeOver();
        var open = !c.classList.contains('is-expanded'), before = b.getBoundingClientRect().top;
        setOpen(c, open);
        if (!open) { var d = b.getBoundingClientRect().top - before; if (Math.abs(d) > 1) scrollNow(d); }
      });
    });
    if (prev) prev.addEventListener('click', function () { takeOver(); go(-1, true); });
    if (next) next.addEventListener('click', function () { takeOver(); go(1, true); });
    /* swipe: the deck is `touch-action: pan-y` (CSS), so a horizontal finger drag reaches here instead of
       being cancelled by the browser's own panning; vertical scrolling is untouched */
    /* fingers and pens swipe; a mouse selects text (a horizontal selection drag became a swipe, QA round 6)
       and has the prev/next buttons. The start is cleared by ANY pointerup, so a press released outside
       the deck cannot turn a later drag into a swipe (QA round 6). */
    var sx = null;
    deck.addEventListener('pointerdown', function (e) { sx = e.pointerType === 'mouse' ? null : e.clientX; });
    deck.addEventListener('pointercancel', function () { sx = null; });
    deck.addEventListener('pointerup', function (e) { if (sx === null) return; var dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 40) { takeOver(); go(dx < 0 ? 1 : -1, true); } });
    window.addEventListener('pointerup', function () { sx = null; });
    /* auto-advance runs only while >= 40% of the deck is in view, and never under the visitor: not while
       a mouse or pen is over the reviews, not while keyboard focus is in them (an advance made the focused
       card inert and dropped focus to <body>, QA round 4 R3-FOCUS-1). It resumes when the pointer or focus
       leaves (QA round 5 DECK-AUTO-NO-RESUME). A touch tap is not hover: touch fires a compatibility
       mouseenter with no mouseleave, which stopped it for good (QA round 5 DECK-TOUCH-STICKY-HOVER). */
    var hovering = false, inView = false;
    function focusInside() { var a = document.activeElement; return !!(a && a !== document.body && wrap.contains(a)); }
    function start() {
      if (!motionOK || timer || userDriven || hovering || !inView || focusInside()) return;
      timer = setInterval(function () { if (hovering || !inView || focusInside()) { stop(); return; } go(1); }, 6500);
    }
    function stop() { clearInterval(timer); timer = null; }
    wrap.addEventListener('pointerenter', function (e) { if (e.pointerType === 'touch') return; hovering = true; stop(); });
    wrap.addEventListener('pointerleave', function (e) { if (e.pointerType === 'touch') return; hovering = false; start(); });
    wrap.addEventListener('focusin', stop);
    wrap.addEventListener('focusout', function () { setTimeout(start, 0); });
    render();
    if ('IntersectionObserver' in window) {
      /* isIntersecting stays true below the 0.4 threshold, so read the ratio - against exactly 0.4, the
         observer's own crossing test: a slow scroll-out reports the downward crossing at 0.398-0.3999, and a
         0.39 tolerance kept the deck "in view" at 15% (QA round 6). Extra thresholds keep the state fresh. */
      new IntersectionObserver(function (en) {
        en.forEach(function (x) { inView = x.isIntersecting && x.intersectionRatio >= 0.4; if (inView) start(); else stop(); });
      }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }).observe(deck);
    }
  });

  /* ---- hours: highlight today (display only; the hours themselves are static source copy) ---- */
  var today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
  [].forEach.call(document.querySelectorAll('.hours-list li[data-day]'), function (li) {
    if (li.getAttribute('data-day') === today) li.classList.add('is-today');
  });

  /* ---- forms: there is no backend in this static build; say so instead of failing silently ---- */
  [].forEach.call(document.querySelectorAll('form[data-needs-backend]'), function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form-offline');
      if (note) { note.hidden = false; note.setAttribute('tabindex', '-1'); note.focus(); }
    });
  });
})();
