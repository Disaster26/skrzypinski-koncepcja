/* Konfigurator balustrady - scena 3D (three.js r165).
   Model parametryczny: schody proste, schody kręcone (gięcie po łuku), taras.
   Render tylko przy zmianie lub ruchu kamery. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TLO = '#e8e5e0';

/* ---------- materialy metalu ---------- */
const METAL = {
  'mos-pol': { c: '#e6bd6c', r: 0.12, cc: 0.6, ccr: 0.06, an: 0, tex: null },
  'mos-pat': { c: '#8a6334', r: 0.34, cc: 0.35, ccr: 0.3, an: 0, tex: 'pat' },
  'mos-mat': { c: '#d2ad68', r: 0.4, cc: 0.25, ccr: 0.55, an: 0, tex: null },
  'st-pol': { c: '#eceef0', r: 0.05, cc: 0, ccr: 0, an: 0, tex: null },
  'st-szcz': { c: '#c6c9cc', r: 0.36, cc: 0, ccr: 0, an: 0.55, tex: 'szcz' }
};

/* ---------- pomocnicze krzywe ---------- */
class Krzywa extends THREE.Curve {
  constructor(fn) { super(); this.fn = fn; this.arcLengthDivisions = 320; }
  getPoint(t, o = new THREE.Vector3()) { return this.fn(Math.min(1, Math.max(0, t)), o); }
}
const przesun = (k, dy) => new Krzywa((t, o) => { k.getPoint(t, o); o.y += dy; return o; });
function sciezka(segs) {
  const L = segs.reduce((a, s) => a + s.len, 0);
  return new Krzywa((t, o) => {
    let d = t * L;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (d <= s.len || i === segs.length - 1) return s.f(Math.min(1, d / s.len), o);
      d -= s.len;
    }
  });
}
const odcinek = (a, b) => ({ len: a.distanceTo(b), f: (s, o) => o.lerpVectors(a, b, s) });
function bezier(a, c, b) { const q = new THREE.QuadraticBezierCurve3(a, c, b); return { len: q.getLength(), f: (s, o) => q.getPoint(s, o) }; }
const lukXZ = (cx, cz, r, a0, a1, y) => ({ len: Math.abs(a1 - a0) * r, f: (s, o) => { const a = a0 + (a1 - a0) * s; return o.set(cx + r * Math.cos(a), y, cz + r * Math.sin(a)); } });
function miekko(u, U, w) { if (u <= U - w) return u; if (u >= U + w) return U; const d = u - (U - w); return u - d * d / (4 * w); }

/* ---------- tekstury z canvas ---------- */
function canvasTex(w, h, rys, srgb) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  rys(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let ziarno = 12345;
const los = () => { ziarno = (ziarno * 16807) % 2147483647; return ziarno / 2147483647; };
function dab(ctx, w, h, baza) {
  ctx.fillStyle = baza; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { // szerokie pasma przyrostow
    const y = los() * h, a = 0.05 + los() * 0.09, g = 4 + los() * 16;
    ctx.fillStyle = los() < 0.5 ? `rgba(120,70,30,${a})` : `rgba(255,225,180,${a})`;
    ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x / 140 + i) * 3);
    ctx.lineTo(w, y + g); for (let x = w; x >= 0; x -= 32) ctx.lineTo(x, y + g + Math.sin(x / 150 + i) * 3);
    ctx.fill();
  }
  for (let i = 0; i < 260; i++) { // drobne slojki
    const y = los() * h;
    ctx.strokeStyle = `rgba(${90 + los() * 30},${50 + los() * 20},${20 + los() * 15},${0.08 + los() * 0.15})`;
    ctx.lineWidth = 0.6 + los() * 1.4;
    ctx.beginPath();
    const f = los() * 6, amp = 1 + los() * 3;
    for (let x = 0; x <= w; x += 16) { const yy = y + Math.sin(x / 90 + f) * amp; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
    ctx.stroke();
  }
  for (let i = 0; i < 18; i++) { // promienie rdzeniowe debu
    ctx.fillStyle = `rgba(255,230,190,${0.06 + los() * 0.08})`;
    ctx.fillRect(los() * w, los() * h, 6 + los() * 26, 1.2);
  }
}

/* ---------- otoczenie odbic: studio z softboxami ---------- */
function studio() {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(20, 48, 24), pos = geo.attributes.position, kol = [];
  const gora = new THREE.Color(1.0, 0.985, 0.96), hor = new THREE.Color(0.6, 0.57, 0.52), dol = new THREE.Color(0.2, 0.18, 0.16), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 20;
    if (y > 0) c.copy(hor).lerp(gora, Math.pow(y, 0.7)); else c.copy(hor).lerp(dol, Math.pow(-y, 0.45));
    kol.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(kol, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
  const box = (w, h, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(i, i * 0.97, i * 0.91), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  box(11, 7, -9, 8, 9, 6);      // glowny softbox z lewej z przodu
  box(2.2, 15, 13, 4, -1, 7);   // pionowy pas z prawej
  box(16, 2.4, 0, 12, -9, 4.5); // pas u gory z tylu
  box(3, 11, -13, 3, -7, 3);    // pas z lewej z tylu
  box(9, 9, 0, 18, 0, 2.2);     // sufit
  return s;
}

/* ---------- start ---------- */
export function start(box, form) {
  const tel = matchMedia('(max-width: 760px)').matches;
  const ruchOk = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) { box.classList.add('bez-gl'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const cv = renderer.domElement;
  cv.className = 'scena-gl';
  cv.setAttribute('aria-hidden', 'true');
  box.appendChild(cv);
  cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); box.classList.remove('gl'); box.classList.add('bez-gl'); });

  const scene = new THREE.Scene();
  const tlo = new THREE.Color(TLO);
  scene.background = tlo;
  scene.fog = new THREE.Fog(tlo, 12, 30);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(studio(), 0.015).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(28, 1.6, 0.1, 80);
  const controls = new OrbitControls(camera, cv);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.55;
  cv.style.touchAction = 'pan-y'; // pionowy ruch palcem przewija strone, poziomy obraca

  const slonce = new THREE.DirectionalLight('#fff1df', 2.6);
  slonce.castShadow = true;
  slonce.shadow.mapSize.set(tel ? 1024 : 2048, tel ? 1024 : 2048);
  slonce.shadow.bias = -0.0004;
  slonce.shadow.normalBias = 0.02;
  scene.add(slonce, slonce.target);
  scene.add(new THREE.HemisphereLight('#fbf8f3', '#b9ab98', 0.55));
  const wypelnienie = new THREE.DirectionalLight('#f4f6fa', 0.9);
  wypelnienie.position.set(4, 3, 8); scene.add(wypelnienie);

  /* materialy */
  const maxAn = renderer.capabilities.getMaxAnisotropy();
  const texDab = canvasTex(1024, 256, (c, w, h) => dab(c, w, h, '#c29a72'), true); texDab.anisotropy = maxAn;
  const texDabE = texDab.clone(); texDabE.repeat.set(0.9, 3.4); texDabE.needsUpdate = true;
  const texPoch = canvasTex(1024, 128, (c, w, h) => dab(c, w, h, '#9a6a40'), true); texPoch.anisotropy = maxAn;
  const texSzcz = canvasTex(512, 64, (c, w, h) => {
    c.fillStyle = 'rgb(205,205,205)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { const v = 150 + los() * 105 | 0; c.fillStyle = `rgba(${v},${v},${v},0.55)`; c.fillRect(los() * w, los() * h, 40 + los() * 380, 0.6 + los() * 0.8); }
  }, false);
  texSzcz.repeat.set(10, 1); texSzcz.anisotropy = maxAn;
  const texPat = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#f2ebe0'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const r = 4 + los() * 26; c.fillStyle = `rgba(${los() < 0.5 ? '70,48,24' : '255,236,200'},${0.05 + los() * 0.1})`; c.beginPath(); c.ellipse(los() * w, los() * h, r * 2.4, r * 0.6, 0, 0, 7); c.fill(); }
  }, true);
  texPat.repeat.set(6, 1);
  const texKafel = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#e4ddd1'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const v = 222 + los() * 14 | 0; c.fillStyle = `rgb(${v},${v - 6},${v - 15})`; c.fillRect(i * 256 + 2, j * 256 + 2, 252, 252);
      for (let k = 0; k < 120; k++) { c.fillStyle = `rgba(150,135,115,${los() * 0.08})`; c.fillRect(i * 256 + los() * 252, j * 256 + los() * 252, 2 + los() * 5, 2 + los() * 5); }
    }
  }, true);
  texKafel.repeat.set(1 / 1.2, 1 / 1.2); texKafel.anisotropy = maxAn;

  const mMetal = new THREE.MeshPhysicalMaterial({ metalness: 1, color: '#e6bd6c', roughness: 0.12, envMapIntensity: 2.4 });
  mMetal.anisotropyRotation = 0;
  const mDab = new THREE.MeshPhysicalMaterial({ map: texDab, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 });
  const mDabE = mDab.clone(); mDabE.map = texDabE;
  const mPoch = new THREE.MeshPhysicalMaterial({ map: texPoch, roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 });
  const mTynk = new THREE.MeshStandardMaterial({ color: '#f4f2ee', roughness: 0.94, envMapIntensity: 0.8 });
  const mSciana = new THREE.MeshStandardMaterial({ color: '#f4f1ec', roughness: 0.96, envMapIntensity: 1.1 });
  const mPodloga = new THREE.MeshStandardMaterial({ color: '#ddd7ce', roughness: 0.88, envMapIntensity: 0.8 });
  const mKafel = new THREE.MeshStandardMaterial({ map: texKafel, roughness: 0.82 });
  const mRama = new THREE.MeshStandardMaterial({ color: '#4a4744', roughness: 0.45, metalness: 0.2 });
  const mOkno = new THREE.MeshStandardMaterial({ color: '#cfd6d6', roughness: 0.04, metalness: 0.35, envMapIntensity: 1.3 });
  const mSzklo = new THREE.MeshPhysicalMaterial({
    color: '#f6faf8', metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.3, ior: 1.52,
    attenuationColor: '#cfe5dc', attenuationDistance: 1.6, side: THREE.DoubleSide, specularIntensity: 1, envMapIntensity: 2.2
  });
  const mKrawedz = new THREE.MeshStandardMaterial({ color: '#9cc4b5', roughness: 0.15, transparent: true, opacity: 0.75, envMapIntensity: 1.5 });

  /* geometrie pomocnicze */
  const segM = tel ? 28 : 40;
  function tuba(k, r, rad) {
    const L = k.getLength();
    return new THREE.TubeGeometry(k, Math.max(6, Math.min(tel ? 220 : 320, Math.ceil(L * segM))), r, rad, false);
  }
  function walec(x, y0, z, h, r, rad = 14) {
    const g = new THREE.CylinderGeometry(r, r, h, rad, 1, false);
    g.translate(x, y0 + h / 2, z); return g;
  }
  function kula(x, y, z, r) { const g = new THREE.SphereGeometry(r, 20, 14); g.translate(x, y, z); return g; }
  function prost(sx, sy, sz, x, y, z, ry = 0) { const g = new THREE.BoxGeometry(sx, sy, sz); if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
  function wstega(kd, kg, u0, u1, n) {
    const pos = [], uv = [], idx = [], a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const u = u0 + (u1 - u0) * i / n;
      kd.getPointAt(u, a); kg.getPointAt(u, b);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z); uv.push(i / n, 0, i / n, 1);
      if (i < n) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  function siatka(geos, mat, cien = true, odb = true) {
    const g = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    const m = new THREE.Mesh(g, mat); m.castShadow = cien; m.receiveShadow = odb; return m;
  }

  /* ---------- otoczenie i linia balustrady dla kazdego rodzaju ---------- */
  function budujProsta() {
    const g = new THREE.Group(), n = 11, rise = 0.18, run = 0.28, W = 1.0, x0 = -1.75;
    const tynk = [], dab = [];
    for (let i = 1; i < n; i++) {
      const xa = x0 + (i - 1) * run;
      tynk.push(prost(run, i * rise - 0.04, W, xa + run / 2, (i * rise - 0.04) / 2, -W / 2));
      dab.push(prost(W + 0.025, 0.04, run + 0.03, xa + run / 2 - 0.015, i * rise - 0.02, -W / 2 + 0.0125, Math.PI / 2));
    }
    const xl = x0 + (n - 1) * run, dlL = 1.5;
    tynk.push(prost(dlL, n * rise - 0.04, W, xl + dlL / 2, (n * rise - 0.04) / 2, -W / 2));
    dab.push(prost(W + 0.025, 0.04, dlL + 0.03, xl + dlL / 2 - 0.015, n * rise - 0.02, -W / 2 + 0.0125, Math.PI / 2));
    // listwa przypodlogowa / policzek przy scianie
    g.add(siatka(tynk, mTynk), siatka(dab, mDab));
    const zb = 0.065 - 0.1, yl = (x) => rise + (x - x0) * rise / run;
    const xa = x0 + 0.45 * run, A = new THREE.Vector3(xa, yl(xa), zb);
    const C = new THREE.Vector3(xl, n * rise, zb);
    const dir = new THREE.Vector3(run, rise, 0).normalize();
    const P1 = C.clone().addScaledVector(dir, -0.34), P2 = C.clone().add(new THREE.Vector3(0.34, 0, 0));
    const E = new THREE.Vector3(xl + dlL - 0.2, n * rise, zb);
    const baza = sciezka([odcinek(A, P1), bezier(P1, C, P2), odcinek(P2, E)]);
    const podloga = (p) => Math.min(n, Math.max(1, Math.floor((p.x - x0) / run) + 1)) * rise;
    const sciany = new THREE.Group();
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), mSciana); sc.position.set(0, 6, -W); sc.receiveShadow = true;
    sciany.add(sc);
    return { g, sciany, baza, H: 0.9, podloga, krok: 1.25, kier: new THREE.Vector3(-0.42, 0.2, 1), zoom: 1, podstawa: 0 };
  }

  // wycinek pierscienia (w rzucie) od kata t0 do t1, wyciagniety w gore od y0 o h
  function wycinek(r0, r1, t0, t1, y0, h, k) {
    const sh = new THREE.Shape();
    for (let j = 0; j <= k; j++) { const t = t0 + (t1 - t0) * j / k; const x = r1 * Math.cos(t), y = -r1 * Math.sin(t); j ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    for (let j = k; j >= 0; j--) { const t = t0 + (t1 - t0) * j / k; sh.lineTo(r0 * Math.cos(t), -r0 * Math.sin(t)); }
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 2 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    return g;
  }
  function budujLuk() {
    const g = new THREE.Group(), n = 14, rise = 0.175, dT = 0.2, Ri = 1.2, Ro = 2.25, ts = 2.98;
    const tynk = [], dab = [];
    for (let i = 1; i < n; i++) {
      const t0 = ts - (i - 1) * dT, t1 = ts - i * dT;
      tynk.push(wycinek(Ri, Ro, t0, t1 - 0.002, 0, i * rise - 0.04, 6));
      dab.push(wycinek(Ri, Ro + 0.025, t0 + 0.03 / Ro, t1, i * rise - 0.04, 0.04, 6));
    }
    const U = (n - 1) * dT, dlS = 1.0, top = n * rise, tl = ts - U;
    tynk.push(wycinek(Ri, Ro, tl, tl - dlS, 0, top - 0.04, 16));
    dab.push(wycinek(Ri, Ro + 0.025, tl + 0.03 / Ro, tl - dlS, top - 0.04, 0.04, 16));
    g.add(siatka(tynk, mTynk), siatka(dab, mDabE));
    const rdzen = new THREE.Mesh(new THREE.CylinderGeometry(Ri, Ri, 7, 64, 1, true), mSciana);
    rdzen.position.y = 3.5; rdzen.castShadow = rdzen.receiveShadow = true;
    const rb = Ro - 0.07, kk = rise / dT, u0 = 0.45 * dT, uK = U + 0.8;
    const baza = new Krzywa((t, o) => {
      const u = u0 + (uK - u0) * t, th = ts - u;
      return o.set(rb * Math.cos(th), rise + kk * miekko(u, U, 0.24), rb * Math.sin(th));
    });
    const podloga = (p) => {
      const th = Math.atan2(p.z, p.x); let u = ts - th; while (u < -1) u += Math.PI * 2;
      return Math.min(n, Math.max(1, Math.floor(u / dT) + 1)) * rise;
    };
    const sciany = new THREE.Group();
    sciany.add(rdzen);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), mSciana); sc.position.set(0, 6, -2.6); sc.receiveShadow = true;
    sciany.add(sc);
    return { g, sciany, baza, H: 0.9, podloga, krok: 1.3, kier: new THREE.Vector3(0.05, 0.26, 1), zoom: 1, podstawa: 0.6 };
  }

  function budujTaras() {
    const g = new THREE.Group(), hP = 0.2, zF = 0.9, xR = 1.55, rN = 0.62, zW = -2.2;
    const sh = new THREE.Shape();
    sh.moveTo(-7, -zW); sh.lineTo(xR, -zW); sh.lineTo(xR, -zF + rN);
    sh.absarc(xR - rN, -zF + rN, rN, 0, -Math.PI / 2, true);
    sh.lineTo(-7, -zF); sh.closePath();
    const pl = new THREE.ExtrudeGeometry(sh, { depth: hP, bevelEnabled: false, curveSegments: 20 });
    pl.rotateX(-Math.PI / 2);
    const plM = new THREE.Mesh(pl, [mKafel, mTynk]); plM.castShadow = plM.receiveShadow = true; g.add(plM);
    const sciany = new THREE.Group();
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), mSciana); sc.position.set(0, 6, zW); sc.receiveShadow = true;
    sciany.add(sc);
    // drzwi tarasowe
    const rama = [], dx0 = -2.1, dx1 = -0.3, dh = 2.45, y0 = hP;
    rama.push(prost(dx1 - dx0, 0.06, 0.08, (dx0 + dx1) / 2, y0 + dh, zW + 0.04));
    rama.push(prost(dx1 - dx0, 0.05, 0.08, (dx0 + dx1) / 2, y0 + 0.025, zW + 0.04));
    [dx0, (dx0 + dx1) / 2, dx1].forEach((x) => rama.push(prost(0.06, dh, 0.08, x, y0 + dh / 2, zW + 0.04)));
    const okno = new THREE.Mesh(new THREE.PlaneGeometry(dx1 - dx0, dh), mOkno); okno.position.set((dx0 + dx1) / 2, y0 + dh / 2, zW + 0.02);
    sciany.add(siatka(rama, mRama), okno);
    const rb = rN - 0.075, zb = zF - 0.075, xb = xR - 0.075, y = hP;
    const baza = sciezka([
      odcinek(new THREE.Vector3(-2.6, y, zb), new THREE.Vector3(xR - rN, y, zb)),
      lukXZ(xR - rN, zF - rN, rb, Math.PI / 2, 0, y),
      odcinek(new THREE.Vector3(xb, y, zF - rN), new THREE.Vector3(xb, y, zW + 0.25))
    ]);
    return { g, sciany, baza, H: 1.02, podloga: () => hP, krok: 1.3, kier: new THREE.Vector3(0.75, 0.24, 1), zoom: 1, podstawa: 0 };
  }

  /* ---------- balustrada ---------- */
  function budujBalustrade(sp, wyp, poch) {
    const grp = new THREE.Group(), { baza, H } = sp, L = baza.getLength();
    const metal = [], szklo = [], krawedz = [];
    const P = new THREE.Vector3(), T = new THREE.Vector3();
    // slupki co ok. sp.krok
    const ns = Math.max(2, Math.round(L / sp.krok));
    const us = []; for (let i = 0; i <= ns; i++) us.push(i / ns);
    const rP = poch === 'drewno' ? 0.027 : 0.021;
    us.forEach((u, i) => {
      baza.getPointAt(u, P);
      const y0 = sp.podloga(P), newel = i === 0 || i === ns, y1 = P.y + H + (newel ? 0.075 : -rP * 0.5);
      metal.push(walec(P.x, y0, P.z, y1 - y0, 0.021));
      metal.push(walec(P.x, y0, P.z, 0.012, 0.045, 24));
      if (newel) { metal.push(kula(P.x, y1 + 0.03, P.z, 0.036)); metal.push(walec(P.x, y1 - 0.008, P.z, 0.012, 0.027, 20)); }
    });
    // pochwyt
    const rail = przesun(baza, H);
    if (poch === 'drewno') {
      const geo = tuba(rail, rP, 16);
      const t = texPoch.clone(); t.repeat.set(Math.max(2, L * 1.2), 1); t.needsUpdate = true;
      const m = mPoch.clone(); m.map = t;
      const mesh = new THREE.Mesh(geo, m); mesh.castShadow = mesh.receiveShadow = true; grp.add(mesh);
      grp.userData.dispose = () => { t.dispose(); m.dispose(); };
    } else metal.push(tuba(rail, rP, 16));
    // wypelnienie
    const dol = 0.11;
    if (wyp === 'prety') {
      const ile = 6, krok = (H - 0.14 - dol) / (ile - 1);
      for (let i = 0; i < ile; i++) metal.push(tuba(przesun(baza, dol + i * krok), 0.008, 10));
    } else if (wyp === 'tralki') {
      metal.push(tuba(przesun(baza, dol), 0.01, 10));
      const nt = Math.floor(L / 0.118);
      for (let i = 1; i < nt; i++) {
        const u = i / nt;
        if (us.some((s) => Math.abs(s - u) * L < 0.07)) continue;
        baza.getPointAt(u, P);
        metal.push(walec(P.x, P.y + dol, P.z, H - dol - rP * 0.6, 0.0075, 10));
      }
    } else {
      const gl = przesun(baza, H - 0.12), dl = przesun(baza, 0.1), od = 0.055 / L;
      for (let i = 0; i < ns; i++) {
        const ua = us[i] + od, ub = us[i + 1] - od;
        szklo.push(wstega(dl, gl, ua, ub, Math.max(2, Math.ceil((ub - ua) * L * 14))));
        [gl, dl].forEach((k) => krawedz.push(tuba(new Krzywa((t, o) => k.getPointAt(ua + (ub - ua) * t, o)), 0.005, 6)));
        [ua, ub].forEach((u) => { baza.getPointAt(u, P); krawedz.push(walec(P.x, P.y + 0.1, P.z, H - 0.22, 0.005, 6)); });
        [[ua + 0.004 / L, 1], [ub - 0.004 / L, -1]].forEach(([u]) => {
          baza.getPointAt(u, P); baza.getTangentAt(u, T);
          const ry = Math.atan2(-T.z, T.x);
          [0.28, H - 0.3].forEach((h) => metal.push(prost(0.05, 0.055, 0.03, P.x, P.y + h, P.z, ry)));
        });
      }
    }
    grp.add(siatka(metal, mMetal));
    if (szklo.length) { grp.add(siatka(szklo, mSzklo, false, false), siatka(krawedz, mKrawedz, false, false)); }
    return grp;
  }

  /* ---------- stan, przebudowa, kamera ---------- */
  const swiat = new THREE.Group(); scene.add(swiat);
  const podl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), mPodloga);
  podl.rotation.x = -Math.PI / 2; podl.receiveShadow = true; scene.add(podl);
  let sp = null, bal = null, typAkt = null, presetAz = 0, presetPol = 1.3;
  const cel = new THREE.Vector3(), kula0 = new THREE.Sphere();

  function wybor() {
    const fd = new FormData(form);
    return { mat: fd.get('mat') || 'mos-pat', typ: fd.get('typ') || 'luk', wyp: fd.get('wyp') || 'prety', poch: fd.get('poch') || 'metal' };
  }
  function zwolnij(o) {
    o.traverse((x) => { if (x.isMesh) { x.geometry.dispose(); } });
    if (o.userData.dispose) o.userData.dispose();
    o.children.forEach((c) => c.userData.dispose && c.userData.dispose());
  }
  function przebuduj(s, nowyTyp) {
    if (nowyTyp) {
      while (swiat.children.length) { const c = swiat.children[0]; swiat.remove(c); zwolnij(c); }
      sp = s.typ === 'prosta' ? budujProsta() : s.typ === 'taras' ? budujTaras() : budujLuk();
      swiat.add(sp.g, sp.sciany);
      bal = null;
    }
    if (bal) { sp.g.remove(bal); zwolnij(bal); }
    bal = budujBalustrade(sp, s.wyp, s.poch);
    sp.g.add(bal);
    if (nowyTyp) dopasujKamere(true);
  }
  const UP = new THREE.Vector3(0, 1, 0);
  function dopasujKamere(reset) {
    const b = new THREE.Box3().setFromObject(bal);
    b.expandByPoint(new THREE.Vector3(b.min.x, sp.podstawa, b.max.z));
    b.clone().expandByScalar(0.8).getBoundingSphere(kula0);
    let dir;
    if (reset) {
      dir = sp.kier.clone().normalize();
      b.getCenter(cel); cel.y += sp.dy || 0;
      controls.target.copy(cel);
      presetAz = Math.atan2(dir.x, dir.z); presetPol = Math.acos(dir.y);
      controls.minAzimuthAngle = presetAz - 0.8; controls.maxAzimuthAngle = presetAz + 0.8;
      controls.minPolarAngle = 0.95; controls.maxPolarAngle = 1.5;
    } else dir = camera.position.clone().sub(controls.target).normalize();
    // odleglosc, przy ktorej wszystkie narozniki balustrady mieszcza sie w kadrze
    const f = dir.clone().negate(), r = new THREE.Vector3().crossVectors(f, UP).normalize(), u = new THREE.Vector3().crossVectors(r, f);
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 0.9, th = tv * camera.aspect;
    let dist = 0; const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).sub(controls.target);
      const z = v.dot(dir);
      dist = Math.max(dist, z + Math.abs(v.dot(r)) / th, z + Math.abs(v.dot(u)) / tv);
    }
    dist *= sp.zoom;
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.minDistance = controls.maxDistance = dist;
    scene.fog.near = dist * 1.3; scene.fog.far = dist * 3.4;
    const sd = new THREE.Vector3(-0.75, 0.95, 0.42).normalize();
    slonce.target.position.copy(kula0.center);
    slonce.position.copy(kula0.center).addScaledVector(sd, 12);
    const rs = kula0.radius * 1.1, sc = slonce.shadow.camera;
    sc.left = -rs; sc.right = rs; sc.top = rs; sc.bottom = -rs; sc.near = 12 - kula0.radius * 2.2; sc.far = 12 + kula0.radius * 2.5;
    sc.updateProjectionMatrix();
    controls.update();
  }

  /* material metalu z plynnym przejsciem */
  let anim = null;
  function ustawMetal(k, odRazu) {
    const d = METAL[k];
    const map = d.tex === 'szcz' ? texSzcz : null, cmap = d.tex === 'pat' ? texPat : null;
    if (mMetal.roughnessMap !== map || mMetal.map !== cmap) { mMetal.roughnessMap = map; mMetal.map = cmap; mMetal.needsUpdate = true; }
    const z = { c: mMetal.color.clone(), r: mMetal.roughness, cc: mMetal.clearcoat, ccr: mMetal.clearcoatRoughness, an: mMetal.anisotropy };
    const na = { c: new THREE.Color(d.c), r: d.r, cc: d.cc, ccr: d.ccr, an: d.an };
    if ((z.cc > 0) !== (na.cc > 0) || (z.an > 0) !== (na.an > 0)) mMetal.needsUpdate = true;
    if (odRazu) { anim = null; zastosuj(z, na, 1); return; }
    anim = { t0: performance.now(), z, na };
    budz();
  }
  function zastosuj(z, na, e) {
    mMetal.color.lerpColors(z.c, na.c, e);
    mMetal.roughness = z.r + (na.r - z.r) * e;
    mMetal.clearcoat = z.cc + (na.cc - z.cc) * e;
    mMetal.clearcoatRoughness = z.ccr + (na.ccr - z.ccr) * e;
    mMetal.anisotropy = z.an + (na.an - z.an) * e;
  }

  /* petla renderowania na zadanie */
  let biegnie = false, doKiedy = 0, ostatnia = 0, autorot = false, autoOd = 0, kierRot = 1, widac = true, bezczynnosc = null, ruszono = false;
  function budz(ms = 0) {
    doKiedy = Math.max(doKiedy, performance.now() + ms);
    if (!biegnie) { biegnie = true; ostatnia = performance.now(); requestAnimationFrame(klatka); }
  }
  const tmp = new THREE.Vector3();
  function klatka(now) {
    const dt = Math.min(0.05, (now - ostatnia) / 1000); ostatnia = now;
    if (anim) {
      const t = Math.min(1, (now - anim.t0) / 480), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      zastosuj(anim.z, anim.na, e);
      if (t >= 1) anim = null;
    }
    const auto = autorot && widac && !document.hidden && ruchOk && now - autoOd < 60000;
    if (auto) {
      const rozp = Math.min(1, (now - autoOd) / 2500);
      tmp.copy(camera.position).sub(controls.target);
      const az = Math.atan2(tmp.x, tmp.z);
      if (az > presetAz + 0.42) kierRot = -1; else if (az < presetAz - 0.42) kierRot = 1;
      tmp.applyAxisAngle(THREE.Object3D.DEFAULT_UP, 0.07 * rozp * kierRot * dt);
      camera.position.copy(controls.target).add(tmp);
    }
    const ruch = controls.update();
    renderer.render(scene, camera);
    if (anim || ruch || auto || now < doKiedy) requestAnimationFrame(klatka); else biegnie = false;
  }
  function planujAuto() {
    clearTimeout(bezczynnosc); autorot = false;
    bezczynnosc = setTimeout(() => { autorot = true; autoOd = performance.now(); budz(); }, 4500);
  }
  controls.addEventListener('change', () => budz());
  controls.addEventListener('start', () => {
    clearTimeout(bezczynnosc); autorot = false; budz(400);
    if (!ruszono) { ruszono = true; box.classList.add('ruszono'); }
  });
  controls.addEventListener('end', () => { budz(1200); planujAuto(); });

  function rozmiar() {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (sp) dopasujKamere(false);
    budz();
  }
  new ResizeObserver(rozmiar).observe(box);
  new IntersectionObserver((en) => { widac = en[0].isIntersecting; if (widac && autorot) budz(); }).observe(box);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && autorot) budz(); });

  /* reakcja na formularz */
  let stan = wybor(), przejscie = null, czekaTyp = false;
  function zmiana() {
    const s = wybor();
    const ksztalt = s.typ !== stan.typ || s.wyp !== stan.wyp || s.poch !== stan.poch;
    if (s.typ !== stan.typ) czekaTyp = true;
    if (s.mat !== stan.mat) ustawMetal(s.mat, false);
    stan = s;
    if (!ksztalt) return;
    cv.classList.add('zmiana');
    clearTimeout(przejscie);
    przejscie = setTimeout(() => {
      przebuduj(stan, czekaTyp); czekaTyp = false;
      budz(60);
      requestAnimationFrame(() => requestAnimationFrame(() => cv.classList.remove('zmiana')));
      planujAuto();
    }, 190);
  }
  form.addEventListener('change', (e) => { if (e.target.name && /^(mat|typ|wyp|poch)$/.test(e.target.name)) zmiana(); });

  ustawMetal(stan.mat, true);
  przebuduj(stan, true);
  rozmiar();
  renderer.render(scene, camera);
  box.classList.add('gl');
  planujAuto();
  window.__scena3d = { renderer, scene, camera, controls, info: () => renderer.info.render };
}
