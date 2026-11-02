// 스테이지 배경: 테마 25개 × 분위기 4가지(낮·노을·밤·무지개 축제) = 100 스테이지
// ChatGPT 로 만든 배경을 assets/bg/<테마>.png 로 넣으면 그 그림을 쓰고, 노을·밤·축제는 그 위에 색을 입혀 만듭니다.
// 분위기별 그림을 따로 넣고 싶으면 assets/bg/<테마>-<sunset|night|special>.png
import { TAU } from './util.js';
import { THEMES, themeForStage, STAGE_COUNT } from './themes.js';
import { EMOJI_FONT } from './sprites.js';

export { THEMES, themeForStage, STAGE_COUNT };

function rng(seed) {
  let t = seed >>> 0;
  return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
function vgrad(c, H, stops) {
  const g = c.createLinearGradient(0, 0, 0, H);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  return g;
}
function cloud(c, x, y, s, col = 'rgba(255,255,255,0.95)') {
  c.fillStyle = col; c.beginPath();
  for (const [dx, dy, r] of [[0, 0, 34], [36, -14, 42], [78, 0, 34], [38, 12, 34]]) { c.moveTo(x + dx * s + r * s, y + dy * s); c.arc(x + dx * s, y + dy * s, r * s, 0, TAU); }
  c.fill();
}
let noSun = false; // 밤 배경을 만들 때는 해를 그리지 않음 (달은 분위기 효과가 그림)
function sun(c, x, y, r) {
  if (noSun) return;
  const g = c.createRadialGradient(x, y, r * 0.2, x, y, r * 2.6);
  g.addColorStop(0, 'rgba(255,240,170,0.9)'); g.addColorStop(1, 'rgba(255,240,170,0)');
  c.fillStyle = g; c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
  c.fillStyle = '#ffd95a'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}
function hills(c, W, y, amp, col, seed, n = 4) {
  const r = rng(seed); c.fillStyle = col; c.beginPath(); c.moveTo(0, y);
  for (let i = 0; i <= n; i++) { const x = (i / n) * W; c.quadraticCurveTo(x - W / n / 2, y - amp * (0.5 + r()), x, y); }
  c.lineTo(W, 720); c.lineTo(0, 720); c.closePath(); c.fill();
}
function tree(c, x, y, s, col, trunk = '#8b5e3c') {
  c.fillStyle = trunk; c.fillRect(x - 8 * s, y - 40 * s, 16 * s, 44 * s);
  c.fillStyle = col; c.beginPath(); c.arc(x, y - 70 * s, 46 * s, 0, TAU); c.arc(x - 30 * s, y - 46 * s, 30 * s, 0, TAU); c.arc(x + 30 * s, y - 46 * s, 30 * s, 0, TAU); c.fill();
}
function pine(c, x, y, s, col, snow = false) {
  c.fillStyle = '#7a5230'; c.fillRect(x - 7 * s, y - 20 * s, 14 * s, 22 * s);
  for (let i = 0; i < 3; i++) {
    const w = (60 - i * 14) * s, top = y - (40 + i * 34) * s;
    c.fillStyle = col; c.beginPath(); c.moveTo(x - w, top + 44 * s); c.lineTo(x, top - 18 * s); c.lineTo(x + w, top + 44 * s); c.closePath(); c.fill();
    if (snow) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w * 0.45, top + 6 * s); c.lineTo(x, top - 18 * s); c.lineTo(x + w * 0.45, top + 6 * s); c.quadraticCurveTo(x, top + 14 * s, x - w * 0.45, top + 6 * s); c.fill(); }
  }
}

const PAINT = {
  beach(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#5ec8f5'], [0.45, '#bfeaff'], [0.52, '#fff6d6']]); c.fillRect(0, 0, W, H);
    sun(c, 1080, 110, 58);
    cloud(c, 140, 120, 1.1); cloud(c, 560, 80, 0.8); cloud(c, 820, 170, 0.6);
    c.fillStyle = vgrad(c, H, [[0.42, '#2bb3e8'], [0.62, '#1a8fd6']]); c.fillRect(0, 300, W, 160);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 4;
    for (let y = 330; y < 450; y += 34) { c.beginPath(); for (let x = -20; x < W + 40; x += 60) { c.moveTo(x, y); c.quadraticCurveTo(x + 15, y - 8, x + 30, y); } c.stroke(); }
    c.fillStyle = '#ffe3a3'; c.beginPath(); c.moveTo(0, 440); c.quadraticCurveTo(W / 2, 400, W, 450); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    c.fillStyle = '#fff1c9'; c.beginPath(); c.moveTo(0, 452); c.quadraticCurveTo(W / 2, 414, W, 462); c.lineTo(W, 478); c.quadraticCurveTo(W / 2, 430, 0, 470); c.fill();
    // 야자수
    c.strokeStyle = '#9c6b3f'; c.lineWidth = 22; c.lineCap = 'round';
    c.beginPath(); c.moveTo(120, 640); c.quadraticCurveTo(90, 420, 170, 270); c.stroke();
    c.fillStyle = '#2fa36b';
    for (const a of [-2.6, -2.0, -1.2, -0.5, 0.2]) { c.save(); c.translate(170, 270); c.rotate(a); c.beginPath(); c.ellipse(70, 0, 80, 20, 0, 0, TAU); c.fill(); c.restore(); }
    // 파라솔
    c.strokeStyle = '#6b4a2b'; c.lineWidth = 8; c.beginPath(); c.moveTo(1100, 640); c.lineTo(1120, 420); c.stroke();
    c.save(); c.translate(1120, 420); c.rotate(0.08);
    const cols = ['#ff6b6b', '#fff', '#ff6b6b', '#fff', '#ff6b6b'];
    for (let i = 0; i < 5; i++) { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(0, -8); c.arc(0, 0, 130, Math.PI + i * Math.PI / 5, Math.PI + (i + 1) * Math.PI / 5); c.closePath(); c.fill(); }
    c.restore();
  },
  sea(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#3fc1e8'], [0.5, '#1f7fc4'], [1, '#124a8c']]); c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.10)';
    for (const x of [160, 420, 700, 980, 1180]) { c.beginPath(); c.moveTo(x - 40, 0); c.lineTo(x + 40, 0); c.lineTo(x + 160, H); c.lineTo(x - 10, H); c.fill(); }
    c.fillStyle = '#e8cf91'; c.beginPath(); c.moveTo(0, 620); c.quadraticCurveTo(400, 580, 700, 620); c.quadraticCurveTo(1000, 650, W, 600); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    const r = rng(7);
    for (let i = 0; i < 14; i++) {
      const x = 30 + r() * (W - 60), h = 90 + r() * 140;
      c.strokeStyle = r() > 0.5 ? '#2fbf71' : '#1f9e5e'; c.lineWidth = 12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(x, 640); for (let y = 0; y < h; y += 30) c.quadraticCurveTo(x + (y % 60 ? 18 : -18), 640 - y - 15, x, 640 - y - 30); c.stroke();
    }
    c.fillStyle = '#8a8fb5'; for (const [x, y, rr] of [[260, 640, 50], [320, 650, 34], [960, 645, 56], [1020, 655, 30]]) { c.beginPath(); c.arc(x, y, rr, Math.PI, 0); c.fill(); }
    c.fillStyle = '#ff9eb5'; for (const x of [600, 640, 680]) { c.beginPath(); c.arc(x, 620, 16, 0, TAU); c.fill(); }
  },
  city(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#7ccfff'], [0.7, '#e3f6ff']]); c.fillRect(0, 0, W, H);
    sun(c, 180, 110, 50); cloud(c, 700, 90, 0.9); cloud(c, 1000, 150, 0.7);
    const r = rng(11), cols = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
    let x = -10;
    while (x < W) {
      const w = 90 + r() * 90, h = 220 + r() * 260, y = 590 - h;
      c.fillStyle = cols[Math.floor(r() * cols.length)]; c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(70,90,140,0.25)'; c.fillRect(x + w - 10, y, 10, h);
      c.fillStyle = 'rgba(255,255,255,0.75)';
      for (let wy = y + 20; wy < 570; wy += 38) for (let wx = x + 14; wx < x + w - 24; wx += 28) c.fillRect(wx, wy, 14, 20);
      x += w + 8;
    }
    c.fillStyle = '#5c677d'; c.fillRect(0, 590, W, H - 590);
    c.fillStyle = '#ffd166'; for (let lx = 20; lx < W; lx += 120) c.fillRect(lx, 650, 60, 10);
    c.fillStyle = '#9aa5b8'; c.fillRect(0, 580, W, 14);
  },
  forest(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#a8e6cf'], [0.6, '#e8fbe2']]); c.fillRect(0, 0, W, H);
    sun(c, 1100, 100, 46);
    hills(c, W, 420, 120, '#9bd88f', 3, 3);
    hills(c, W, 500, 90, '#6cc070', 5, 4);
    const r = rng(41);
    for (let i = 0; i < 9; i++) { const x = 40 + i * 150 + r() * 40; tree(c, x, 520 + r() * 20, 1.1 + r() * 0.5, r() > 0.5 ? '#3c9d5d' : '#4bb26c'); }
    c.fillStyle = '#58a957'; c.fillRect(0, 560, W, H - 560);
    for (const [x, y] of [[200, 620], [520, 650], [900, 630], [1150, 660]]) {
      c.fillStyle = '#fff3e0'; c.fillRect(x - 6, y - 16, 12, 18);
      c.fillStyle = '#ff6b6b'; c.beginPath(); c.arc(x, y - 16, 20, Math.PI, 0); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 7, y - 24, 4, 0, TAU); c.arc(x + 8, y - 22, 3, 0, TAU); c.fill();
    }
  },
  farm(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#8fd3ff'], [0.6, '#e9f8ff']]); c.fillRect(0, 0, W, H);
    sun(c, 160, 110, 52); cloud(c, 600, 100, 0.9); cloud(c, 960, 70, 0.7);
    hills(c, W, 430, 90, '#a5dc7a', 9, 3);
    // 헛간
    c.fillStyle = '#d64545'; c.fillRect(900, 290, 240, 200);
    c.fillStyle = '#b83232'; c.beginPath(); c.moveTo(880, 300); c.lineTo(1020, 200); c.lineTo(1160, 300); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.fillRect(985, 380, 70, 110); c.strokeStyle = '#fff'; c.lineWidth = 8;
    c.beginPath(); c.moveTo(985, 380); c.lineTo(1055, 490); c.moveTo(1055, 380); c.lineTo(985, 490); c.stroke();
    c.fillStyle = '#7cc45e'; c.fillRect(0, 480, W, H - 480);
    c.fillStyle = '#fff';
    for (let x = 0; x < W; x += 60) c.fillRect(x, 500, 12, 70);
    c.fillRect(0, 515, W, 10); c.fillRect(0, 545, W, 10);
    c.fillStyle = '#f2c94c'; c.beginPath(); c.ellipse(220, 500, 90, 60, 0, Math.PI, 0); c.fill();
  },
  orchard(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#ffd6e0'], [0.55, '#fff4e6']]); c.fillRect(0, 0, W, H);
    sun(c, 640, 90, 44);
    hills(c, W, 470, 70, '#b5e48c', 13, 3);
    const r = rng(17);
    for (let i = 0; i < 7; i++) {
      const x = 90 + i * 185, y = 520;
      tree(c, x, y, 1.4, '#52b788');
      for (let k = 0; k < 7; k++) { c.fillStyle = r() > 0.3 ? '#ff5d5d' : '#ffa62b'; c.beginPath(); c.arc(x + (r() - 0.5) * 110, y - 60 - r() * 90 * 1.2, 9, 0, TAU); c.fill(); }
    }
    c.fillStyle = '#99d98c'; c.fillRect(0, 540, W, H - 540);
    c.fillStyle = '#c68b59'; c.beginPath(); c.moveTo(560, 640); c.lineTo(720, 640); c.lineTo(700, 700); c.lineTo(580, 700); c.closePath(); c.fill();
    c.fillStyle = '#ff5d5d'; for (const x of [595, 630, 665, 700]) { c.beginPath(); c.arc(x - 8, 632, 16, 0, TAU); c.fill(); }
  },
  snow(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#a9def9'], [0.7, '#eef8ff']]); c.fillRect(0, 0, W, H);
    for (const [x, w, h] of [[200, 360, 300], [640, 420, 360], [1080, 380, 280]]) {
      c.fillStyle = '#c3d9f0'; c.beginPath(); c.moveTo(x - w / 2, 520); c.lineTo(x, 520 - h); c.lineTo(x + w / 2, 520); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w * 0.16, 520 - h * 0.68); c.lineTo(x, 520 - h); c.lineTo(x + w * 0.16, 520 - h * 0.68); c.lineTo(x + w * 0.06, 520 - h * 0.62); c.lineTo(x - w * 0.04, 520 - h * 0.7); c.closePath(); c.fill();
    }
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(0, 520); c.quadraticCurveTo(W / 2, 470, W, 520); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    for (const x of [80, 230, 1060, 1200]) pine(c, x, 600, 1.2, '#2d8a5f', true);
    c.fillStyle = '#f4fbff'; c.beginPath(); c.arc(860, 600, 80, Math.PI, 0); c.fill();
    c.strokeStyle = '#cfe3f3'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#8fb7d9'; c.beginPath(); c.arc(860, 600, 30, Math.PI, 0); c.fill();
  },
  space(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#0b0726'], [0.6, '#22134d'], [1, '#3a1d6e']]); c.fillRect(0, 0, W, H);
    for (const [x, y, rr, col] of [[300, 200, 260, 'rgba(155,93,229,0.25)'], [1000, 420, 300, 'rgba(0,187,249,0.18)'], [640, 640, 260, 'rgba(241,91,181,0.18)']]) {
      const g = c.createRadialGradient(x, y, 10, x, y, rr); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    const r = rng(99); c.fillStyle = '#fff';
    for (let i = 0; i < 220; i++) { c.globalAlpha = 0.3 + r() * 0.7; c.beginPath(); c.arc(r() * W, r() * H, r() * 1.8 + 0.4, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    c.fillStyle = '#ffb703'; c.beginPath(); c.arc(1110, 130, 60, 0, TAU); c.fill();
    c.strokeStyle = '#ffe8a3'; c.lineWidth = 8; c.beginPath(); c.ellipse(1110, 130, 100, 22, -0.3, 0, TAU); c.stroke();
    c.fillStyle = '#4cc9f0'; c.beginPath(); c.arc(150, 560, 90, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(120, 530, 30, 0, TAU); c.fill();
    c.fillStyle = '#d0d0e8'; c.beginPath(); c.arc(820, 90, 26, 0, TAU); c.fill();
  },
  park(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#ffb3c1'], [0.5, '#ffd6a5'], [0.8, '#fff1d0']]); c.fillRect(0, 0, W, H);
    // 대관람차
    const cx = 960, cy = 280, R = 210;
    c.strokeStyle = '#ffffff'; c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
    c.lineWidth = 4; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); c.stroke(); }
    const cabs = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b5de5', '#ff9f1c'];
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.fillStyle = cabs[i % 6]; c.beginPath(); c.roundRect(cx + Math.cos(a) * R - 20, cy + Math.sin(a) * R - 6, 40, 34, 10); c.fill(); }
    c.strokeStyle = '#ffffff'; c.lineWidth = 14; c.beginPath(); c.moveTo(cx - 120, 600); c.lineTo(cx, cy); c.lineTo(cx + 120, 600); c.stroke();
    // 회전목마 지붕
    c.fillStyle = '#ff6b6b'; c.beginPath(); c.moveTo(120, 380); c.lineTo(260, 260); c.lineTo(400, 380); c.closePath(); c.fill();
    c.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(120 + i * 46.6, 380, 23, 0, Math.PI); c.fill(); }
    c.fillStyle = '#ffd93d'; c.fillRect(140, 400, 240, 160);
    c.fillStyle = '#f7c59f'; c.fillRect(0, 560, W, H - 560);
    const r = rng(5);
    for (let i = 0; i < 6; i++) {
      const x = 480 + i * 60 + r() * 20, y = 120 + r() * 120; c.strokeStyle = 'rgba(80,60,60,0.6)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, y + 34); c.quadraticCurveTo(x - 10, y + 90, x + 6, y + 150); c.stroke();
      c.fillStyle = cabs[i % 6]; c.beginPath(); c.ellipse(x, y, 26, 32, 0, 0, TAU); c.fill();
    }
  },
};

// ── 코드로 그린 임시 배경 (새 테마) : 하늘 + 땅 + 소품 ──
function emojiAt(c, e, x, y, size, alpha = 1) {
  c.save(); c.globalAlpha = alpha; c.font = `${size}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom';
  c.fillText(e, x, y); c.restore();
}
function flower(c, x, y, s, col) {
  c.strokeStyle = '#3f9a4a'; c.lineWidth = 5 * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 46 * s); c.stroke();
  c.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.arc(x + Math.cos(a) * 12 * s, y - 46 * s + Math.sin(a) * 12 * s, 9 * s, 0, TAU); c.fill(); }
  c.fillStyle = '#ffd93d'; c.beginPath(); c.arc(x, y - 46 * s, 7 * s, 0, TAU); c.fill();
}
function stripes(c, W, y0, y1, a, b, w) { c.fillStyle = a; c.fillRect(0, y0, W, y1 - y0); c.fillStyle = b; for (let x = 0; x < W; x += w * 2) c.fillRect(x, y0, w, y1 - y0); }
function dots(c, W, y0, y1, col, step, r) { c.fillStyle = col; for (let y = y0 + step / 2, k = 0; y < y1; y += step, k++) for (let x = (k % 2) * step / 2; x < W + step; x += step) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); } }
function floor(c, W, H, y, a, b) { c.fillStyle = a; c.fillRect(0, y, W, H - y); c.strokeStyle = b; c.lineWidth = 3; for (let x = 0; x < W; x += 110) { c.beginPath(); c.moveTo(x, y); c.lineTo(x - 60, H); c.stroke(); } c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, y, W, 10); }
function bunting(c, W, y, cols) {
  c.strokeStyle = '#7a5a6a'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W / 2, y + 60, W, y); c.stroke();
  for (let i = 0; i < 16; i++) { const t = (i + 0.5) / 16, x = t * W, yy = y + 4 * t * (1 - t) * 60; c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(x - 26, yy); c.lineTo(x + 26, yy); c.lineTo(x, yy + 50); c.closePath(); c.fill(); }
}
function rainbowArc(c, x, y, R, a = 1) {
  c.save(); c.globalAlpha = a; c.lineWidth = R * 0.08;
  ['#ff6b6b', '#ffa94d', '#ffd93d', '#6bcb77', '#4d96ff', '#9b5de5'].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(x, y, R - i * R * 0.08, Math.PI, 0); c.stroke(); });
  c.restore();
}
function sceneBase(c, W, H, sky, ground, gy) {
  c.fillStyle = vgrad(c, H, sky); c.fillRect(0, 0, W, H);
  if (ground) { c.fillStyle = Array.isArray(ground) ? vgrad(c, H, ground) : ground; c.fillRect(0, gy, W, H - gy); }
}

Object.assign(PAINT, {
  bugs(c, W, H) {
    sceneBase(c, W, H, [[0, '#9ad8ff'], [0.6, '#e6f7ff']]);
    sun(c, 1100, 100, 48); cloud(c, 200, 110, 0.9); cloud(c, 620, 70, 0.7);
    hills(c, W, 470, 80, '#a8e07a', 3, 3); c.fillStyle = '#8fd16a'; c.fillRect(0, 540, W, H - 540);
    const r = rng(31), cols = ['#ff8fab', '#ffd166', '#c77dff', '#ff6b6b', '#ffffff'];
    for (let i = 0; i < 26; i++) flower(c, r() * W, 560 + r() * 150, 0.8 + r() * 0.7, cols[i % cols.length]);
    emojiAt(c, '🍄', 140, 600, 120); emojiAt(c, '🌼', 1130, 610, 110);
  },
  dessert(c, W, H) {
    sceneBase(c, W, H, [[0, '#ffc8dd'], [0.6, '#fbe7ff']]);
    cloud(c, 160, 110, 1, '#fff'); cloud(c, 900, 80, 0.8, '#ffe5ec');
    for (const [x, h, a, b] of [[160, 300, '#ff8fab', '#fff'], [1120, 260, '#9bf6ff', '#fff']]) { c.save(); c.translate(x, 600 - h); for (let y = 0; y < h; y += 30) { c.fillStyle = (y / 30) % 2 ? a : b; c.fillRect(-14, y, 28, 30); } c.restore(); }
    c.fillStyle = '#fff1e6'; c.beginPath(); c.moveTo(0, 560); for (let x = 0; x <= W; x += 80) c.quadraticCurveTo(x + 40, 610, x + 80, 560); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    c.fillStyle = '#c9a27e'; c.fillRect(0, 640, W, H - 640);
    emojiAt(c, '🍮', 380, 600, 130); emojiAt(c, '🧇', 820, 610, 120); emojiAt(c, '🥞', 620, 650, 100, 0.9);
  },
  dino(c, W, H) {
    sceneBase(c, W, H, [[0, '#ffd29d'], [0.6, '#fff1d6']]);
    c.fillStyle = '#8d6e63'; c.beginPath(); c.moveTo(780, 520); c.lineTo(960, 210); c.lineTo(1030, 210); c.lineTo(1220, 520); c.closePath(); c.fill();
    c.fillStyle = '#ff7043'; c.beginPath(); c.moveTo(960, 210); c.quadraticCurveTo(995, 260, 1030, 210); c.lineTo(1015, 300); c.lineTo(975, 280); c.closePath(); c.fill();
    c.fillStyle = 'rgba(120,110,110,0.45)'; for (const [x, y, rr] of [[995, 170, 30], [1030, 120, 40], [1080, 70, 50]]) { c.beginPath(); c.arc(x, y, rr, 0, TAU); c.fill(); }
    hills(c, W, 500, 70, '#9ccc65', 21, 3); c.fillStyle = '#8bc34a'; c.fillRect(0, 560, W, H - 560);
    emojiAt(c, '🌴', 120, 600, 220); emojiAt(c, '🌴', 560, 590, 170); emojiAt(c, '🌿', 360, 650, 110); emojiAt(c, '🪨', 760, 660, 100);
  },
  sky(c, W, H) {
    sceneBase(c, W, H, [[0, '#4facfe'], [0.7, '#b8e8ff'], [1, '#e9f8ff']]);
    sun(c, 1110, 110, 52); rainbowArc(c, 300, 520, 300, 0.55);
    for (const [x, y, s] of [[80, 160, 1], [520, 110, 0.8], [760, 230, 1.1], [980, 330, 0.7], [300, 300, 0.6]]) cloud(c, x, y, s);
    c.fillStyle = '#ffffff'; for (let x = -40; x < W + 80; x += 110) { c.beginPath(); c.arc(x, 650, 90, 0, TAU); c.fill(); }
    c.fillStyle = 'rgba(200,225,255,0.7)'; for (let x = 15; x < W + 80; x += 110) { c.beginPath(); c.arc(x, 700, 60, 0, TAU); c.fill(); }
  },
  jungle(c, W, H) {
    sceneBase(c, W, H, [[0, '#a8e6a1'], [0.6, '#5fbf6a'], [1, '#2f8f4e']]);
    const r = rng(41);
    for (let i = 0; i < 22; i++) { c.save(); c.translate(r() * W, r() * 300); c.rotate(r() * TAU); c.fillStyle = r() > 0.5 ? '#2e8b57' : '#3fa96a'; c.beginPath(); c.ellipse(0, 0, 120, 40, 0, 0, TAU); c.fill(); c.restore(); }
    c.strokeStyle = '#5b8c3a'; c.lineWidth = 8; for (const x of [260, 520, 900, 1100]) { c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 40, 200, x - 10, 360); c.stroke(); }
    c.fillStyle = '#6d8b3a'; c.fillRect(0, 590, W, H - 590);
    emojiAt(c, '🌴', 120, 620, 240); emojiAt(c, '🌴', 1160, 620, 220); emojiAt(c, '🌿', 420, 660, 120); emojiAt(c, '🪵', 820, 670, 110);
  },
  veggie(c, W, H) {
    sceneBase(c, W, H, [[0, '#8fd3ff'], [0.6, '#e9f8ff']]);
    sun(c, 160, 100, 50); cloud(c, 620, 90, 0.9); cloud(c, 1000, 140, 0.7);
    hills(c, W, 430, 70, '#b7e4a0', 51, 3);
    c.fillStyle = '#a0704a'; c.fillRect(0, 470, W, H - 470);
    for (let y = 500; y < H; y += 56) { c.fillStyle = '#7d5435'; c.beginPath(); c.ellipse(W / 2, y + 20, W * 0.7, 14, 0, 0, TAU); c.fill();
      c.fillStyle = '#4caf50'; for (let x = 40 + (y % 112 ? 30 : 0); x < W; x += 90) { c.beginPath(); c.ellipse(x - 8, y + 8, 8, 16, -0.5, 0, TAU); c.ellipse(x + 8, y + 8, 8, 16, 0.5, 0, TAU); c.fill(); } }
    emojiAt(c, '🌾', 1150, 500, 150); emojiAt(c, '🧺', 140, 520, 110);
  },
  toys(c, W, H) {
    stripes(c, W, 0, 560, '#fff3c4', '#ffe7a0', 60);
    c.fillStyle = '#8ecae6'; c.fillRect(470, 90, 340, 260); c.fillStyle = '#fff'; c.fillRect(470, 210, 340, 14); c.fillRect(633, 90, 14, 260);
    c.strokeStyle = '#fff'; c.lineWidth = 16; c.strokeRect(470, 90, 340, 260); cloud(c, 520, 160, 0.5);
    floor(c, W, H, 560, '#d4a373', '#bc8a5f');
    c.fillStyle = '#ff8fab'; c.beginPath(); c.ellipse(640, 650, 360, 50, 0, 0, TAU); c.fill();
    emojiAt(c, '📚', 160, 560, 130); emojiAt(c, '🖍️', 1100, 560, 110); emojiAt(c, '🎨', 960, 560, 100);
  },
  sports(c, W, H) {
    sceneBase(c, W, H, [[0, '#74c0fc'], [0.5, '#d0ebff']]);
    cloud(c, 200, 90, 0.8); cloud(c, 900, 120, 0.9);
    c.fillStyle = '#adb5bd'; c.fillRect(0, 300, W, 140); c.fillStyle = '#868e96'; for (let y = 310; y < 440; y += 26) c.fillRect(0, y, W, 4);
    const r = rng(61), cols = ['#ff6b6b', '#ffd93d', '#4dabf7', '#69db7c', '#f783ac'];
    for (let i = 0; i < 70; i++) { c.fillStyle = cols[i % 5]; c.beginPath(); c.arc(r() * W, 320 + r() * 110, 9, 0, TAU); c.fill(); }
    c.fillStyle = '#51cf66'; c.fillRect(0, 440, W, H - 440);
    c.fillStyle = '#40c057'; for (let x = 0; x < W; x += 160) c.fillRect(x, 440, 80, H - 440);
    c.strokeStyle = '#fff'; c.lineWidth = 8; c.beginPath(); c.moveTo(W / 2, 440); c.lineTo(W / 2, H); c.stroke(); c.beginPath(); c.ellipse(W / 2, 600, 160, 60, 0, 0, TAU); c.stroke();
    emojiAt(c, '🥅', 150, 560, 160); emojiAt(c, '🥅', 1130, 560, 160);
  },
  music(c, W, H) {
    sceneBase(c, W, H, [[0, '#3c1361'], [1, '#6a1b9a']]);
    for (const [x, col] of [[300, 'rgba(255,230,120,0.22)'], [980, 'rgba(120,220,255,0.22)']]) { c.fillStyle = col; c.beginPath(); c.moveTo(x - 30, 0); c.lineTo(x + 30, 0); c.lineTo(x + 240, 600); c.lineTo(x - 240, 600); c.closePath(); c.fill(); }
    for (const sx of [0, 1]) { c.fillStyle = '#c1121f'; c.beginPath(); const x = sx ? W : 0, d = sx ? -1 : 1; c.moveTo(x, 0); c.lineTo(x + d * 230, 0); c.quadraticCurveTo(x + d * 120, 300, x + d * 170, 600); c.lineTo(x, 600); c.fill();
      c.strokeStyle = '#9d0208'; c.lineWidth = 6; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x + d * k * 45, 0); c.quadraticCurveTo(x + d * k * 25, 300, x + d * k * 35, 600); c.stroke(); } }
    c.fillStyle = '#c1121f'; c.fillRect(0, 0, W, 50); dots(c, W, 0, 50, '#ffd166', 50, 8);
    floor(c, W, H, 590, '#b5835a', '#94643f');
    emojiAt(c, '🎤', 640, 590, 120);
  },
  pets(c, W, H) {
    c.fillStyle = '#d7f0ff'; c.fillRect(0, 0, W, 560); dots(c, W, 0, 560, 'rgba(255,255,255,0.7)', 90, 12);
    c.fillStyle = '#fff'; c.fillRect(840, 90, 300, 240); c.fillStyle = '#a5d8ff'; c.fillRect(856, 106, 268, 208); sun(c, 1060, 160, 30); c.fillStyle = '#fff'; c.fillRect(984, 90, 12, 240);
    floor(c, W, H, 560, '#e9c46a', '#d4a94f');
    c.fillStyle = '#f4a261'; c.beginPath(); c.ellipse(640, 660, 300, 40, 0, 0, TAU); c.fill();
    emojiAt(c, '🛋️', 300, 580, 220); emojiAt(c, '🪴', 760, 570, 130); emojiAt(c, '🏠', 1100, 640, 120);
  },
  kitchen(c, W, H) {
    c.fillStyle = '#f1faee'; c.fillRect(0, 0, W, 500);
    c.strokeStyle = '#cfe3e9'; c.lineWidth = 3; for (let x = 0; x < W; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 500); c.stroke(); } for (let y = 0; y < 500; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    c.fillStyle = '#a8dadc'; c.fillRect(80, 80, 300, 150); c.fillRect(900, 80, 300, 150); c.fillStyle = '#457b9d'; c.fillRect(220, 140, 20, 40); c.fillRect(1040, 140, 20, 40);
    c.fillStyle = '#e9c46a'; c.fillRect(0, 500, W, 40); c.fillStyle = '#c8935a'; c.fillRect(0, 540, W, H - 540);
    c.fillStyle = '#b07d4a'; for (let x = 40; x < W; x += 220) c.fillRect(x, 570, 180, 130); c.fillStyle = '#e9c46a'; for (let x = 120; x < W; x += 220) c.fillRect(x, 620, 20, 8);
    emojiAt(c, '🫖', 260, 505, 120); emojiAt(c, '🍲', 640, 505, 130); emojiAt(c, '🧂', 1000, 505, 90);
  },
  harbor(c, W, H) {
    sceneBase(c, W, H, [[0, '#89c2ff'], [0.5, '#e3f2ff']]);
    sun(c, 980, 120, 48); cloud(c, 160, 100, 0.8); cloud(c, 620, 80, 0.6);
    hills(c, W, 330, 60, '#b8d8a8', 71, 3);
    c.fillStyle = vgrad(c, H, [[0.45, '#3a9bdc'], [0.8, '#1d6fa5']]); c.fillRect(0, 330, W, 290);
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 4; for (let y = 360; y < 600; y += 40) { c.beginPath(); for (let x = (y % 80) ? 0 : 30; x < W; x += 90) { c.moveTo(x, y); c.quadraticCurveTo(x + 15, y - 8, x + 30, y); } c.stroke(); }
    // 등대
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(1080, 340); c.lineTo(1110, 140); c.lineTo(1150, 140); c.lineTo(1180, 340); c.closePath(); c.fill();
    c.fillStyle = '#e63946'; for (const y of [180, 260]) c.fillRect(1090, y, 80, 34); c.fillStyle = '#ffd166'; c.fillRect(1108, 110, 44, 30); c.fillStyle = '#e63946'; c.beginPath(); c.moveTo(1100, 110); c.lineTo(1130, 84); c.lineTo(1160, 110); c.fill();
    c.fillStyle = '#a47148'; c.fillRect(0, 610, W, H - 610); c.strokeStyle = '#7f5539'; c.lineWidth = 3; for (let x = 0; x < W; x += 70) { c.beginPath(); c.moveTo(x, 610); c.lineTo(x, H); c.stroke(); }
    emojiAt(c, '🛟', 200, 640, 100); emojiAt(c, '🏘️', 400, 350, 120);
  },
  construction(c, W, H) {
    sceneBase(c, W, H, [[0, '#9bd0ff'], [0.6, '#eaf6ff']]);
    sun(c, 160, 100, 46); cloud(c, 700, 90, 0.8);
    c.fillStyle = '#c9ccd1'; c.fillRect(780, 180, 280, 380); c.fillStyle = '#8d939c'; for (let y = 200; y < 560; y += 60) for (let x = 800; x < 1040; x += 60) c.fillRect(x, y, 36, 36);
    c.strokeStyle = '#f4a300'; c.lineWidth = 6; for (let y = 180; y < 560; y += 60) { c.beginPath(); c.moveTo(780, y); c.lineTo(1060, y); c.stroke(); }
    c.fillStyle = '#c68b59'; c.fillRect(0, 560, W, H - 560); c.fillStyle = '#b07848'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc((i * 97) % W, 600 + (i * 53) % 110, 8, 0, TAU); c.fill(); }
    stripes(c, W, 548, 566, '#ffd166', '#333', 40);
    for (const x of [120, 300, 1180]) { c.fillStyle = '#ff7b00'; c.beginPath(); c.moveTo(x - 30, 640); c.lineTo(x, 560); c.lineTo(x + 30, 640); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(x - 19, 600, 38, 12); }
    emojiAt(c, '🚧', 520, 560, 130);
  },
  garden(c, W, H) {
    sceneBase(c, W, H, [[0, '#b5e3ff'], [0.6, '#f0fbff']]);
    cloud(c, 240, 100, 0.9); cloud(c, 820, 80, 0.7); sun(c, 1120, 100, 44);
    c.fillStyle = '#4c9a5b'; for (let x = -40; x < W + 80; x += 100) { c.beginPath(); c.arc(x, 470, 80, 0, TAU); c.fill(); }
    c.fillStyle = '#7cc47f'; c.fillRect(0, 500, W, H - 500);
    c.fillStyle = '#fff'; for (let x = 10; x < W; x += 50) { c.beginPath(); c.moveTo(x, 470); c.lineTo(x + 14, 450); c.lineTo(x + 28, 470); c.lineTo(x + 28, 560); c.lineTo(x, 560); c.fill(); } c.fillRect(0, 490, W, 12); c.fillRect(0, 530, W, 12);
    c.fillStyle = '#e9d8a6'; c.beginPath(); c.moveTo(560, H); c.quadraticCurveTo(640, 600, 600, 560); c.lineTo(680, 560); c.quadraticCurveTo(700, 600, 760, H); c.fill();
    emojiAt(c, '⛲', 1050, 640, 160); emojiAt(c, '🏡', 220, 470, 150);
  },
  castle(c, W, H) {
    sceneBase(c, W, H, [[0, '#cdb4db'], [0.5, '#ffc8dd'], [1, '#ffe5ec']]);
    rainbowArc(c, 640, 560, 520, 0.4);
    const r = rng(81); c.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { c.globalAlpha = 0.4 + r() * 0.6; this_star(c, r() * W, r() * 280, 3 + r() * 5); } c.globalAlpha = 1;
    // 성 실루엣
    c.fillStyle = '#f8edeb';
    c.fillRect(470, 300, 340, 260); for (const [x, w, h] of [[440, 90, 330], [750, 90, 330], [595, 90, 400]]) { c.fillRect(x, 560 - h, w, h); c.fillStyle = '#b388eb'; c.beginPath(); c.moveTo(x - 12, 560 - h); c.lineTo(x + w / 2, 560 - h - 90); c.lineTo(x + w + 12, 560 - h); c.closePath(); c.fill(); c.fillStyle = '#f8edeb'; }
    c.fillStyle = "#d8b4e2"; c.beginPath(); c.arc(640, 560, 50, Math.PI, 0); c.fill();
    hills(c, W, 560, 50, '#b8e0b0', 83, 3); c.fillStyle = '#a7d7a0'; c.fillRect(0, 600, W, H - 600);
    emojiAt(c, '🍄', 180, 650, 110); emojiAt(c, '🌳', 1120, 620, 180);
  },
  party(c, W, H) {
    c.fillStyle = '#fff0f6'; c.fillRect(0, 0, W, 560); dots(c, W, 0, 560, '#ffd6e7', 70, 14);
    bunting(c, W, 30, ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff']);
    floor(c, W, H, 560, '#ffd6a5', '#f4b67a');
    c.fillStyle = '#ffffff'; c.fillRect(300, 470, 680, 30); c.fillStyle = '#ff8fab'; c.beginPath(); c.moveTo(300, 500); for (let x = 300; x <= 980; x += 40) c.quadraticCurveTo(x + 20, 540, x + 40, 500); c.lineTo(980, 500); c.fill();
    c.fillStyle = '#c9a27e'; c.fillRect(330, 540, 20, 120); c.fillRect(930, 540, 20, 120);
    emojiAt(c, '🪅', 180, 400, 150); emojiAt(c, '🎊', 1100, 400, 130);
  },
});
function this_star(c, x, y, r) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? r * 0.4 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }

// ── 분위기 입히기: 낮 그림 하나로 노을·밤·축제 버전 만들기 ──
function applyVariation(c, W, H, vkey, seed, key) {
  if (vkey === 'day') return;
  const r = rng(seed);
  c.save();
  if (vkey === 'sunset') {
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = vgrad(c, H, [[0, '#ff9a76'], [0.45, '#ffc493'], [1, '#ffe2c6']]); c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'screen';
    const g = c.createRadialGradient(W * 0.5, H * 0.62, 10, W * 0.5, H * 0.62, W * 0.55);
    g.addColorStop(0, 'rgba(255,170,90,0.55)'); g.addColorStop(1, 'rgba(255,120,80,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  } else if (vkey === 'night') {
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = vgrad(c, H, [[0, '#2b2f77'], [0.6, '#4a4f9c'], [1, '#6a6fb8']]); c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'screen';
    c.fillStyle = 'rgba(40,40,90,0.25)'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#fff';
    for (let i = 0; i < 90; i++) { c.globalAlpha = 0.35 + r() * 0.6; c.beginPath(); c.arc(r() * W, r() * H * 0.45, 0.8 + r() * 1.8, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    const mx = W * 0.82, my = H * 0.16, mr = H * 0.07;
    if (key !== 'space' && key !== 'sea') { // 우주·바닷속에는 달을 띄우지 않음
    const g = c.createRadialGradient(mx, my, mr, mx, my, mr * 3.2); g.addColorStop(0, 'rgba(255,250,220,0.45)'); g.addColorStop(1, 'rgba(255,250,220,0)');
    c.fillStyle = g; c.fillRect(mx - mr * 4, my - mr * 4, mr * 8, mr * 8);
    c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
    c.fillStyle = 'rgba(43,47,119,0.9)'; c.beginPath(); c.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.85, 0, TAU); c.fill();
    }
  } else if (vkey === 'special') {
    c.globalCompositeOperation = 'soft-light';
    const g = c.createLinearGradient(0, 0, W, H);
    ['#ff6b6b', '#ffa94d', '#ffd93d', '#6bcb77', '#4d96ff', '#9b5de5'].forEach((col, i) => g.addColorStop(i / 5, col));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    rainbowArc(c, W * 0.5, H * 1.02, H * 0.8, 0.18);
    bunting(c, W, 0, ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff']);
    c.fillStyle = '#fff';
    for (let i = 0; i < 26; i++) { c.globalAlpha = 0.5 + r() * 0.5; this_star(c, r() * W, 70 + r() * H * 0.5, 4 + r() * 7); }
  }
  c.restore();
}

// ── 배경 캐시 (메모리 아끼려고 최근 4장만) ──
const MAX_BG = 4;
const bgCache = new Map();
export function clearBackgroundCache() { bgCache.clear(); }
// 배경도 지워졌는지 확인 (배경은 전부 불투명이라 가운데 점이 투명하면 지워진 것)
export function backgroundLost(cv) {
  try { return cv.getContext('2d').getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data[3] === 0; } catch { return true; }
}
const imgCache = new Map(); // 파일 이름 → Promise<Image|null> (최근 6개)
const MAX_IMG = 6;

function coverDraw(c, img, W, H) {
  const k = Math.max(W / img.width, H / img.height);
  const w = img.width * k, h = img.height * k;
  c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}
// 이미 받아 둔 이미지만 즉시 돌려줌 (없으면 null)
function readyImg(name) { const p = imgCache.get(name); return p && p.done ? p.img : null; }

export function getBackground(stage, W, H) {
  const t = stage, vkey = t.vkey || 'day';
  const own = readyImg(`${t.key}-${vkey}`); // 분위기별 그림이 따로 있으면 그대로
  const base = own ? null : readyImg(t.key);
  const src = own ? 'own' : base ? 'img' : 'code';
  const cacheKey = `${t.key}:${vkey}:${W}x${H}:${src}`;
  let cv = bgCache.get(cacheKey);
  if (cv) { bgCache.delete(cacheKey); bgCache.set(cacheKey, cv); return cv; }
  cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  if (own) coverDraw(c, own, W, H);
  else {
    if (base) coverDraw(c, base, W, H);
    else {
      // 코드 배경은 1280×720 으로 그려 두고, 화면비가 다르면 꽉 차게 확대해 가운데를 씀 (늘어나지 않게)
      const k = Math.max(W / 1280, H / 720);
      noSun = vkey === 'night';
      c.save(); c.translate((W - 1280 * k) / 2, (H - 720 * k) / 2); c.scale(k, k);
      (PAINT[t.key] || PAINT.beach)(c, 1280, 720);
      c.restore(); noSun = false;
    }
    applyVariation(c, W, H, vkey, (t.id || 1) * 7919, t.key);
  }
  bgCache.set(cacheKey, cv);
  while (bgCache.size > MAX_BG) bgCache.delete(bgCache.keys().next().value);
  return cv;
}

function loadImg(name, exts) {
  if (imgCache.has(name)) { const p = imgCache.get(name); imgCache.delete(name); imgCache.set(name, p); return p; }
  const p = new Promise((resolve) => {
    const tryNext = (i) => {
      if (i >= exts.length) { p.done = true; p.img = null; return resolve(null); }
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { p.done = true; p.img = img; resolve(img); };
      img.onerror = () => tryNext(i + 1);
      img.src = `assets/bg/${name}.${exts[i]}`;
    };
    tryNext(0);
  });
  imgCache.set(name, p);
  while (imgCache.size > MAX_IMG) imgCache.delete(imgCache.keys().next().value);
  return p;
}

// assets/bg/<테마>-<분위기>.png → assets/bg/<테마>.png|jpg|webp 순서로 찾아봄 (있을 때만 사용)
export async function preloadStageImage(stage) {
  const vkey = stage.vkey || 'day';
  if (vkey !== 'day' && await loadImg(`${stage.key}-${vkey}`, ['png'])) return true;
  return !!(await loadImg(stage.key, ['webp', 'png', 'jpg']));
}
