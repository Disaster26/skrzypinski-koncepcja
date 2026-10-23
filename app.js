(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- naglowek i menu ---------- */
  var top = $('#top'), ham = $('.ham'), panel = $('#panel');
  function onScroll() { top.classList.toggle('przew', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function zamknij() { panel.hidden = true; ham.setAttribute('aria-expanded', 'false'); ham.setAttribute('aria-label', 'Otwórz menu'); }
  ham.addEventListener('click', function () {
    var otw = panel.hidden;
    panel.hidden = !otw;
    ham.setAttribute('aria-expanded', String(otw));
    ham.setAttribute('aria-label', otw ? 'Zamknij menu' : 'Otwórz menu');
  });
  $$('#panel a').forEach(function (a) { a.addEventListener('click', zamknij); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) zamknij(); });
  window.addEventListener('resize', function () { if (innerWidth > 1024) zamknij(); });

  /* ---------- dolny pasek na telefonie ---------- */
  var mob = $('#mob'), heroCta = $('.hero-cta');
  var zaCta = false;
  function pasek() {
    var w = zaCta;
    mob.classList.toggle('widac', w);
    mob.setAttribute('aria-hidden', String(!w));
    $$('a', mob).forEach(function (a) { a.tabIndex = w ? 0 : -1; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      en.forEach(function (x) { zaCta = !x.isIntersecting && x.boundingClientRect.top < 0; });
      pasek();
    }).observe(heroCta);
  }

  /* ---------- galeria ---------- */
  var G = [
    ['luk', 'mos', 617, 500, 'Pochwyt gięty wokół kolumny, mosiądz patynowany'],
    ['b-mos-1', 'mos', 584, 500, 'Balustrada antresoli, mosiądz patynowany'],
    ['b-st-1', 'st', 637, 500, 'Schody kręcone z balustradą ze stali nierdzewnej matowej'],
    ['k-4', 'k', 668, 500, 'Karnisz gięty nad oknem, mosiądz patynowany'],
    ['b-mos-14', 'mos', 747, 500, 'Pręty gięte wzdłuż schodów kręconych, mosiądz patynowany'],
    ['b-st-3', 'st', 500, 747, 'Pręty ze stali nierdzewnej gięte po łuku schodów'],
    ['b-mos-10', 'mos', 747, 500, 'Pochwyt zakończony łukiem, mosiądz polerowany'],
    ['k-5', 'k', 640, 500, 'Karnisz podwójny gięty po łuku, mosiądz patynowany'],
    ['b-mos-3', 'mos', 668, 500, 'Słupek z prętami giętymi spiralnie, mosiądz patynowany'],
    ['b-st-6', 'st', 624, 500, 'Balustrada tarasowa, stal nierdzewna polerowana'],
    ['b-mos-6', 'mos', 561, 500, 'Balustrada wokół otworu schodów, mosiądz patynowany'],
    ['k-8', 'k', 631, 500, 'Karnisze w sali restauracyjnej, mosiądz patynowany'],
    ['b-mos-9', 'mos', 614, 500, 'Schody z kamienia z balustradą z mosiądzu polerowanego'],
    ['b-st-5', 'st', 474, 500, 'Schody w salonie samochodowym, stal nierdzewna polerowana'],
    ['b-mos-13', 'mos', 766, 500, 'Balustrada okrągłego otworu z tralkami, mosiądz patynowany'],
    ['b-cu-1', 'mos', 635, 500, 'Balustrada z miedzi patynowanej'],
    ['k-9', 'k', 668, 500, 'Karnisz gięty w wykuszu, stal nierdzewna matowa'],
    ['b-mos-11', 'mos', 634, 500, 'Balustrada gięta przy schodach zabiegowych, mosiądz polerowany'],
    ['b-st-2', 'st', 747, 500, 'Schody drewniane z balustradą ze stali nierdzewnej matowej'],
    ['b-mos-7', 'mos', 751, 500, 'Balustrada antresoli z falującymi prętami, mosiądz patynowany'],
    ['k-10', 'k', 668, 500, 'Karnisz gięty nad oknem łukowym, mosiądz patynowany'],
    ['b-st-7', 'st', 639, 500, 'Poręcze przy schodach zewnętrznych, stal nierdzewna polerowana'],
    ['b-mos-8', 'mos', 453, 500, 'Pręty gięte spiralnie przy słupku, mosiądz polerowany'],
    ['b-mos-4', 'mos', 754, 500, 'Balustrada gięta po łuku antresoli, mosiądz patynowany'],
    ['b-st-4', 'st', 500, 747, 'Słupek z prętami giętymi spiralnie, stal nierdzewna matowa'],
    ['k-11', 'k', 638, 500, 'Karnisz podwójny, stal nierdzewna polerowana'],
    ['b-mos-5', 'mos', 747, 500, 'Schody kręcone z balustradą z mosiądzu patynowanego'],
    ['b-st-10', 'st', 750, 500, 'Stal nierdzewna z detalami z mosiądzu, połysk'],
    ['b-mos-16', 'mos', 389, 500, 'Balustrada schodów spiralnych, mosiądz polerowany'],
    ['k-12', 'k', 668, 500, 'Karnisz gięty nad oknem łukowym, mosiądz patynowany'],
    ['b-st-9', 'st', 580, 500, 'Szkło bezpieczne w klatce schodowej, stal nierdzewna polerowana'],
    ['b-cu-2', 'mos', 747, 500, 'Balustrada z miedzi polerowanej w holu'],
    ['b-st-12', 'st', 747, 500, 'Szkło bezpieczne i drewniany pochwyt, stal nierdzewna matowa'],
    ['k-2', 'k', 668, 500, 'Karnisz gięty nad półokrągłym oknem, mosiądz patynowany'],
    ['p-2', 'mos', 747, 500, 'Pochwyt przyścienny, mosiądz'],
    ['b-mos-12', 'mos', 469, 500, 'Tralki pionowe na schodach kręconych, mosiądz polerowany'],
    ['p-3', 'mos', 732, 500, 'Pochwyt gięty przy schodach, mosiądz patynowany'],
    ['k-3', 'k', 633, 500, 'Karnisz podwójny gięty, mosiądz polerowany']
  ];
  var gal = $('#galeria');
  gal.innerHTML = G.map(function (x) {
    return '<button class="zoom" type="button" data-f="' + x[1] + '" data-src="img/' + x[0] + '.jpg" data-cap="' + x[4] + '">' +
      '<img src="img/' + x[0] + '.jpg" width="' + x[2] + '" height="' + x[3] + '" loading="lazy" alt="' + x[4] + '"></button>';
  }).join('');
  $$('.filtry button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.filtry button').forEach(function (o) { o.setAttribute('aria-selected', String(o === b)); });
      var fl = b.dataset.f;
      $$('#galeria .zoom').forEach(function (z) { z.hidden = !(fl === 'all' || z.dataset.f === fl); });
    });
  });

  /* ---------- lightbox ---------- */
  var lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap'), lista = [], idx = 0, ostatni = null;
  function pokaz(i) {
    idx = (i + lista.length) % lista.length;
    var z = lista[idx];
    lbImg.src = z.dataset.src; lbImg.alt = z.dataset.cap; lbCap.textContent = z.dataset.cap;
    var multi = lista.length > 1;
    $('.lb-p').hidden = !multi; $('.lb-n').hidden = !multi;
  }
  document.addEventListener('click', function (e) {
    var z = e.target.closest('.zoom');
    if (!z) return;
    ostatni = z;
    lista = z.closest('#galeria') ? $$('#galeria .zoom').filter(function (o) { return !o.hidden; }) : $$('.zoom').filter(function (o) { return !o.closest('#galeria'); });
    pokaz(lista.indexOf(z));
    lb.hidden = false; document.body.style.overflow = 'hidden';
    $('.lb-x').focus();
  });
  function zamknijLb() { lb.hidden = true; document.body.style.overflow = ''; if (ostatni) ostatni.focus({ preventScroll: true }); }
  $('.lb-x').addEventListener('click', zamknijLb);
  $('.lb-p').addEventListener('click', function () { pokaz(idx - 1); });
  $('.lb-n').addEventListener('click', function () { pokaz(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) zamknijLb(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') zamknijLb();
    if (e.key === 'ArrowLeft') pokaz(idx - 1);
    if (e.key === 'ArrowRight') pokaz(idx + 1);
  });
  var tx = null;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50 && lista.length > 1) pokaz(idx + (dx < 0 ? 1 : -1));
  });

  /* ---------- mapa ---------- */
  var mapaEl = $('#mapa'), mapaOk = false;
  function mapa() {
    if (mapaOk || !window.L) return;
    mapaOk = true;
    var tel = innerWidth < 760;
    var m = L.map(mapaEl, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, zoomControl: true }).setView([52.3755, 16.72], tel ? 9 : 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    var ik = L.divIcon({ className: '', html: '<div class="znacznik"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
    L.marker([52.348037, 16.59552], { icon: ik, keyboard: false }).addTo(m)
      .bindPopup('<b>Balustrady Skrzypiński</b><br>Skrzynki, ul. Leśna 2<br>62-060 Stęszew').openPopup();
  }
  if ('IntersectionObserver' in window) {
    var ioM = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (x.isIntersecting) {
          if (window.L) { mapa(); ioM.disconnect(); }
          else window.addEventListener('load', mapa, { once: true });
        }
      });
    }, { rootMargin: '400px 0px' });
    ioM.observe(mapaEl);
  } else window.addEventListener('load', mapa);
})();
