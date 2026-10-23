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

  /* ---------- rysunek giecia ---------- */
  var rys = $('.rysunek');
  if ('IntersectionObserver' in window && rys) {
    var ioR = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { rys.classList.add('widac'); ioR.disconnect(); } });
    }, { threshold: 0.25 });
    ioR.observe(rys);
  } else if (rys) rys.classList.add('widac');

  /* ---------- dolny pasek na telefonie ---------- */
  var mob = $('#mob'), heroCta = $('.hero-cta'), dobierz = $('#dobierz');
  var zaCta = false, wDobierz = false;
  function pasek() {
    var w = zaCta && !wDobierz;
    mob.classList.toggle('widac', w);
    mob.setAttribute('aria-hidden', String(!w));
    $$('a', mob).forEach(function (a) { a.tabIndex = w ? 0 : -1; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      en.forEach(function (x) { zaCta = !x.isIntersecting && x.boundingClientRect.top < 0; });
      pasek();
    }).observe(heroCta);
    new IntersectionObserver(function (en) {
      en.forEach(function (x) { wDobierz = x.isIntersecting; });
      pasek();
    }, { rootMargin: '-30% 0px -30% 0px' }).observe(dobierz);
  }

  /* ---------- konfigurator ---------- */
  var MAT = {
    'mos-pol': { n: 'Mosiądz polerowany', c: ['#4a350c', '#a47a26', '#e3c064', '#fff3c8', '#d4ac4c'], blysk: 1 },
    'mos-pat': { n: 'Mosiądz patynowany', c: ['#2a1f12', '#5b4427', '#8f7348', '#c4a878', '#7d6442'], blysk: 0 },
    'mos-mat': { n: 'Mosiądz matowy', c: ['#76602f', '#a48a52', '#c3ab78', '#d6c398', '#b79d66'], blysk: 0 },
    'st-pol': { n: 'Stal nierdzewna polerowana', c: ['#3d4146', '#8e949a', '#dfe3e7', '#ffffff', '#c2c7cc'], blysk: 1 },
    'st-szcz': { n: 'Stal nierdzewna szczotkowana', c: ['#62666b', '#959a9f', '#bcc0c4', '#d0d3d6', '#a9adb1'], blysk: 0 }
  };
  var DREWNO = ['#3a2312', '#6e4325', '#9a6337', '#c48c5a', '#80512c'];
  var TYP = { prosta: 'schodowa prosta', luk: 'schodowa gięta po łuku', taras: 'tarasowa lub balkonowa' };
  var WYP = { prety: 'pręty wzdłużne', tralki: 'tralki pionowe', szklo: 'szkło bezpieczne' };
  var NS = 'http://www.w3.org/2000/svg';
  var svg = $('#scenaSvg');
  var f = function (n) { return Math.round(n * 10) / 10; };

  function sciezka(p) {
    var d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
    for (var i = 1; i < p.length; i++) d += 'L' + f(p[i][0]) + ' ' + f(p[i][1]);
    return d;
  }
  function rura(d, w, c, pion) {
    var L = [[c[0], w, 0, 1], [c[1], w * 0.8, 0, 1], [c[2], w * 0.56, -0.13, 1], [c[3], w * 0.26, -0.22, 0.95], [c[4], w * 0.14, 0.3, 0.55]];
    var s = '<g fill="none" stroke-linecap="round" stroke-linejoin="round">';
    L.forEach(function (l) {
      var o = f(l[2] * w), t = o ? ' transform="translate(' + (pion ? o + ' 0' : '0 ' + o) + ')"' : '';
      s += '<path d="' + d + '" stroke="' + l[0] + '" stroke-width="' + f(l[1]) + '" opacity="' + l[3] + '"' + t + '/>';
    });
    return s + '</g>';
  }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

  // linia podstawy balustrady: punkty [x, y, h] (h = wysokosc balustrady w px w tym miejscu)
  function geom(typ) {
    var g = { tlo: '', schody: '', baza: [], slupki: [] };
    var i, s, x, y;
    if (typ === 'prosta') {
      var n = 11, x0 = 150, y0 = 452, x1 = 590, y1 = 172, run = (x1 - x0) / n, rise = (y0 - y1) / n;
      g.tlo = '<rect x="0" y="0" width="800" height="452" fill="url(#gSciana)"/><rect x="0" y="452" width="800" height="48" fill="#ddd5c7"/>';
      var st = '<path d="M' + (x0 + 40) + ' 452L' + (x1 + 30) + ' ' + (y1 + 30) + 'H800V452Z" fill="#000" opacity=".035"/>';
      var bok = 'M' + x0 + ' ' + y0;
      for (i = 0; i < n; i++) bok += 'V' + f(y0 - (i + 1) * rise) + 'H' + f(x0 + (i + 1) * run);
      bok += 'H800V' + (y1 + 26) + 'H' + (x1 + 16) + 'L' + (x0 + 74) + ' ' + y0 + 'Z';
      st += '<path d="' + bok + '" fill="#dcd1bf" stroke="#bcac93" stroke-width="1.2"/>';
      // policzek wzdłuż biegu
      st += '<path d="M' + (x0 + 74) + ' ' + y0 + 'L' + (x1 + 16) + ' ' + (y1 + 26) + 'L' + (x1 + 4) + ' ' + (y1 + 14) + 'L' + (x0 + 44) + ' ' + y0 + 'Z" fill="#c8b89e"/>';
      for (i = 0; i < n; i++) {
        var tx0 = x0 + i * run, ty = y0 - (i + 1) * rise;
        st += '<path d="M' + f(tx0) + ' ' + f(ty) + 'h' + f(run + 3) + 'v5h' + f(-run - 3) + 'Z" fill="#bfae93"/>';
        st += '<path d="M' + f(tx0) + ' ' + f(ty + 0.5) + 'h' + f(run + 3) + '" stroke="#f7f3ec" stroke-width="1.6"/>';
      }
      st += '<path d="M' + x1 + ' ' + y1 + 'H800v6H' + x1 + 'Z" fill="#bfae93"/><path d="M' + x1 + ' ' + (y1 + 0.5) + 'H800" stroke="#f7f3ec" stroke-width="1.6"/>';
      g.schody = st;
      // podstawa: wzdłuż nosków, potem łuk na spocznik
      var A = [x0 + run * 0.5, y0 - rise], C = [x1, y1], E = [760, y1], r = 46;
      var dl = Math.hypot(C[0] - A[0], C[1] - A[1]);
      var P1 = lerp(C, A, r / dl), P2 = [C[0] + r, C[1]];
      for (s = 0; s <= 1; s += 0.02) g.baza.push(lerp(A, P1, s));
      for (s = 0.05; s <= 1; s += 0.05) {
        var u = 1 - s;
        g.baza.push([u * u * P1[0] + 2 * u * s * C[0] + s * s * P2[0], u * u * P1[1] + 2 * u * s * C[1] + s * s * P2[1]]);
      }
      for (s = 0.05; s <= 1.001; s += 0.05) g.baza.push(lerp(P2, E, s));
      g.baza = g.baza.map(function (p) { return [p[0], p[1], 150]; });
      g.slupki = [0, 22, 44, 66, g.baza.length - 1];
      g.zawijas = true;
    } else if (typ === 'luk') {
      var m = 12, cx = 400, R = 330, Ri = 150, rs = 290 / m, sag = 66, a0 = 0.12, a1 = 0.86;
      var ang = function (t) { return Math.PI * (a0 + (a1 - a0) * t); };
      var ox = function (t) { return cx - R * Math.cos(ang(t)); };
      var ix = function (t) { return cx - Ri * Math.cos(ang(t)); };
      var ws = function (t) { return Math.sin(ang(t)); };
      var top0 = function (i) { return 452 - (i + 1) * rs; };
      g.tlo = '<rect x="0" y="0" width="800" height="452" fill="url(#gSciana)"/><rect x="0" y="452" width="800" height="48" fill="#ddd5c7"/>';
      var yTop = top0(m - 1) + sag * ws(1) - 58;
      g.tlo += '<path d="M' + f(ix(1) - 10) + ' ' + f(yTop) + 'H800V' + f(yTop + 26) + 'H' + f(ix(1) - 10) + 'Z" fill="#e1d8c9" stroke="#c4b6a0"/><path d="M' + f(ix(1) - 10) + ' ' + f(yTop + .5) + 'H800" stroke="#f7f3ec" stroke-width="1.6"/>';
      var st = '';
      for (i = m - 1; i >= 0; i--) {
        var a = i / m, b = (i + 1) / m, mid = (a + b) / 2;
        var yo = top0(i) + sag * ws(mid), yi = yo - 58 - 10 * ws(mid);
        var oA = [ox(a), yo], oB = [ox(b), yo], iA = [ix(a), yi], iB = [ix(b), yi];
        st += '<path d="M' + f(oA[0]) + ' ' + f(oA[1]) + 'L' + f(oB[0]) + ' ' + f(oB[1]) + 'L' + f(iB[0]) + ' ' + f(iB[1]) + 'L' + f(iA[0]) + ' ' + f(iA[1]) + 'Z" fill="#efe8dc" stroke="#bcac93" stroke-width="1"/>';
        st += '<path d="M' + f(oA[0]) + ' ' + f(yo) + 'L' + f(oB[0]) + ' ' + f(yo) + 'V' + f(yo + 6) + 'H' + f(oA[0]) + 'Z" fill="#cbbca5"/>';
        st += '<path d="M' + f(iA[0]) + ' ' + f(yi) + 'L' + f(oA[0]) + ' ' + f(yo) + 'V' + f(yo + rs) + 'L' + f(iA[0]) + ' ' + f(yi + rs) + 'Z" fill="#d8ccb8" stroke="#bcac93" stroke-width="1"/>';
      }
      var pol = 'M' + f(ox(0)) + ' ' + f(top0(0) + sag * ws(0) + 6);
      for (s = 0; s <= 1.0001; s += 0.04) pol += 'L' + f(ox(s)) + ' ' + f(452 - rs - 290 * s * (m - 1) / m + sag * ws(s) + 6);
      for (s = 1; s >= -0.0001; s -= 0.04) pol += 'L' + f(ox(s)) + ' ' + f(Math.min(452, 452 - rs - 290 * s * (m - 1) / m + sag * ws(s) + 40));
      g.schody = '<path d="M' + f(ox(0) + 30) + ' 452 L' + f(ox(1)) + ' ' + f(yTop + 40) + 'H800V452Z" fill="#000" opacity=".03"/>' + st + '<path d="' + pol + 'Z" fill="#c8b89e" stroke="#b09f84" stroke-width="1"/>';
      for (s = 0.0; s <= 1.0001; s += 0.0125) g.baza.push([ox(s), 452 - rs - 290 * s * (m - 1) / m + sag * ws(s) + 2, 150 * (0.86 + 0.18 * ws(s))]);
      var L = g.baza.length;
      g.slupki = [1, Math.round(L * 0.27), Math.round(L * 0.52), Math.round(L * 0.77), L - 2];
    } else {
      g.tlo = '<rect x="0" y="0" width="800" height="400" fill="url(#gSciana)"/>' +
        '<rect x="214" y="96" width="150" height="262" fill="#dfe5e3" stroke="#bfb4a2" stroke-width="3"/><path d="M289 96V358" stroke="#bfb4a2" stroke-width="3"/>' +
        '<rect x="452" y="112" width="128" height="150" fill="#dfe5e3" stroke="#bfb4a2" stroke-width="3"/><path d="M516 112V262M452 187H580" stroke="#bfb4a2" stroke-width="2"/>' +
        '<path d="M60 360H600A150 52 0 0 0 750 308V300H800V500H0V360Z" fill="#e6dfd2"/>' +
        '<path d="M56 404H600A156 70 0 0 0 756 334V420A156 70 0 0 1 600 428H56Z" fill="#d6ccbb" stroke="#c2b5a1" stroke-width="1"/>' +
        '<path d="M56 404H600A156 70 0 0 0 756 334" fill="none" stroke="#f6f2ea" stroke-width="2"/>' +
        '<rect x="0" y="470" width="800" height="30" fill="#f6f2ea" opacity=".6"/>';
      for (x = 76; x <= 600; x += 7) g.baza.push([x, 396, 164]);
      for (s = 0.04; s <= 1.0001; s += 0.04) g.baza.push([600 + 142 * Math.sin(Math.PI / 2 * s), 396 - 64 * (1 - Math.cos(Math.PI / 2 * s)), 164 * (1 - 0.2 * s)]);
      var K = g.baza.length;
      g.slupki = [0, 25, 50, 75, K - 13, K - 1];
    }
    return g;
  }

  function rysuj() {
    var fd = new FormData($('#konf'));
    var mk = fd.get('mat'), typ = fd.get('typ'), wyp = fd.get('wyp'), poch = fd.get('poch');
    var M = MAT[mk], c = M.c, g = geom(typ), B = g.baza;
    var na = function (p, t) { return [p[0], p[1] - p[2] * t]; };
    var poch2 = poch === 'drewno';
    var out = '<defs><linearGradient id="gSciana" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe7"/><stop offset="1" stop-color="#ebe4d8"/></linearGradient>' +
      '<filter id="cien" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="5" dy="7" stdDeviation="4" flood-color="#3a2e22" flood-opacity=".16"/></filter>' +
      '<linearGradient id="gSzklo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d7e6e7" stop-opacity=".55"/><stop offset=".5" stop-color="#c3d7d9" stop-opacity=".35"/><stop offset="1" stop-color="#b4cbce" stop-opacity=".5"/></linearGradient></defs>';
    out += g.tlo + g.schody + '<g class="rama" filter="url(#cien)">';
    var i, j, s0 = g.slupki[0], sN = g.slupki[g.slupki.length - 1];
    var odc = B.slice(s0, sN + 1);
    var szer = typ === 'luk' ? 1 : 1;
    // wypelnienie
    if (wyp === 'szklo') {
      for (j = 0; j < g.slupki.length - 1; j++) {
        var a = g.slupki[j], b = g.slupki[j + 1], seg = B.slice(a, b + 1);
        var gora = seg.map(function (p) { return na(p, 0.84); }), dol = seg.map(function (p) { return na(p, 0.1); }).reverse();
        var wsk = seg.length;
        var pg = gora.slice(1, wsk - 1).concat(dol.slice(1, wsk - 1));
        if (pg.length > 2) {
          var gs = sciezka(gora.slice(1, wsk - 1)), ds = sciezka(dol.slice(1, wsk - 1));
          out += '<path d="' + sciezka(pg) + 'Z" fill="url(#gSzklo)" stroke="#9fb5b8" stroke-width="1.2"/>';
          var q = Math.floor(wsk * 0.3), p1 = na(seg[q], 0.72), p2 = na(seg[Math.min(wsk - 2, q + 3)], 0.3);
          out += '<path d="M' + f(p1[0]) + ' ' + f(p1[1]) + 'L' + f(p2[0]) + ' ' + f(p2[1]) + '" stroke="#fff" stroke-width="6" opacity=".35" stroke-linecap="round"/>';
          [0.22, 0.72].forEach(function (t) {
            [seg[1], seg[wsk - 2]].forEach(function (p) {
              var k = na(p, t);
              out += '<rect x="' + f(k[0] - 4) + '" y="' + f(k[1] - 6) + '" width="8" height="12" rx="2" fill="' + c[1] + '" stroke="' + c[0] + '" stroke-width="1"/>';
            });
          });
        }
      }
    } else if (wyp === 'prety') {
      var fr = typ === 'taras' ? [0.16, 0.32, 0.48, 0.64] : [0.14, 0.32, 0.5, 0.68];
      fr.forEach(function (t) { out += rura(sciezka(odc.map(function (p) { return na(p, t); })), 5, c, false); });
    } else {
      out += rura(sciezka(odc.map(function (p) { return na(p, 0.1); })), 5, c, false);
      var krok = typ === 'taras' ? 3 : 2;
      for (i = s0 + 1; i < sN; i += krok) {
        if (g.slupki.indexOf(i) > -1) continue;
        var p0 = na(B[i], 0.1), pk = na(B[i], 0.95);
        out += rura('M' + f(p0[0]) + ' ' + f(p0[1]) + 'L' + f(pk[0]) + ' ' + f(pk[1]), 3.6, c, true);
      }
    }
    // slupki
    g.slupki.forEach(function (k) {
      var p = B[k], d0 = [p[0], p[1]], d1 = na(p, 1);
      out += '<ellipse cx="' + f(d0[0]) + '" cy="' + f(d0[1] + 1) + '" rx="10" ry="3.4" fill="' + c[1] + '" stroke="' + c[0] + '" stroke-width="1"/>';
      out += rura('M' + f(d0[0]) + ' ' + f(d0[1]) + 'L' + f(d1[0]) + ' ' + f(d1[1] + 4), 8, c, true);
    });
    // pochwyt
    var rail = B.map(function (p) { return na(p, 1); });
    var rd = sciezka(rail);
    if (g.zawijas) {
      var r0 = rail[0];
      rd = 'M' + f(r0[0] + 10) + ' ' + f(r0[1] + 44) + 'C' + f(r0[0] - 22) + ' ' + f(r0[1] + 40) + ' ' + f(r0[0] - 30) + ' ' + f(r0[1] + 8) + ' ' + f(r0[0]) + ' ' + f(r0[1]) + rd.replace(/^M[^L]*/, '');
    }
    out += poch2 ? rura(rd, 15, DREWNO, false) : rura(rd, 11, c, false);
    if (M.blysk && !poch2) {
      [0.2, 0.47, 0.8].forEach(function (t) {
        var p = rail[Math.round((rail.length - 1) * t)];
        out += '<ellipse cx="' + f(p[0]) + '" cy="' + f(p[1] - 2) + '" rx="9" ry="1.6" fill="#fff" opacity=".85"/>';
      });
    }
    out += '</g>';
    svg.innerHTML = out;
    var opis = M.n + ', ' + TYP[typ] + ', ' + WYP[wyp] + (poch2 ? ', pochwyt drewniany' : '');
    $('#scenaOpis').textContent = opis;
    tekst(M.n, typ, wyp, poch2);
  }

  var plik = null;
  function tekst(mn, typ, wyp, poch2) {
    var dl = $('#dl').value.trim().replace('.', ','), pi = $('#pietro').value, mi = $('#miasto').value.trim(), im = $('#imie').value.trim();
    var t = 'Dzień dobry,\nproszę o wycenę balustrady.\n\n' +
      'Wykończenie: ' + mn + '\n' +
      'Rodzaj: ' + TYP[typ] + '\n' +
      'Wypełnienie: ' + WYP[wyp] + '\n' +
      'Pochwyt: ' + (poch2 ? 'drewniany' : 'z tego samego metalu') + '\n' +
      (dl ? 'Długość: ok. ' + dl + ' mb\n' : '') +
      (pi ? 'Gdzie: ' + pi + '\n' : '') +
      (mi ? 'Miejscowość: ' + mi + '\n' : '') +
      (plik ? 'Zdjęcie schodów: w załączniku\n' : '') +
      '\nProszę o kontakt.' + (im ? '\n' + im : '');
    $('#tresc').textContent = t;
    var temat = 'Zapytanie o balustradę: ' + mn.toLowerCase() + (mi ? ', ' + mi : '');
    $('#mailBtn').href = 'mailto:biuro@balustrady-skrzypinski.pl?subject=' + encodeURIComponent(temat) + '&body=' + encodeURIComponent(t);
    $('#smsBtn').href = 'sms:+48600458425?&body=' + encodeURIComponent(t);
  }

  var konf = $('#konf');
  konf.addEventListener('change', rysuj);
  konf.addEventListener('input', function (e) { if (e.target.matches('input[type=text],input[type=number]')) rysuj(); });
  konf.addEventListener('submit', function (e) { e.preventDefault(); });

  var foto = $('#foto'), podgl = $('#fotoPodglad'), share = $('#wyslijZFoto');
  foto.addEventListener('change', function () {
    plik = foto.files && foto.files[0] ? foto.files[0] : null;
    if (plik) {
      podgl.src = URL.createObjectURL(plik); podgl.hidden = false;
      $('#fotoNap').textContent = 'Zmień zdjęcie';
      var moze = navigator.canShare && navigator.canShare({ files: [plik] });
      share.hidden = !moze;
      $('#fotoUw').hidden = !!moze;
    } else { podgl.hidden = true; share.hidden = true; $('#fotoUw').hidden = true; }
    rysuj();
  });
  share.addEventListener('click', function () {
    if (!plik) return;
    navigator.share({ files: [plik], title: 'Zapytanie o balustradę', text: $('#tresc').textContent }).catch(function () {});
  });
  rysuj();

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
