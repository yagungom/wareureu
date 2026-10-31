// 스테이지 테마 10종: 이름, 테마 캐릭터, 임시 배경(코드), 분위기 효과
// ChatGPT 로 만든 배경을 assets/bg/<key>.png (또는 .jpg/.webp) 로 넣으면 자동으로 그 이미지를 씁니다.
import { TAU } from './util.js';

export const STAGES = [
  { id: 1, key: 'beach', name: '햇살 해변', emoji: '🏖️', chars: ['watermelon', 'pineapple', 'crab', 'banana', 'tangerine'], ambient: 'sparkle', key2: 0 },
  { id: 2, key: 'sea', name: '바닷속 탐험', emoji: '🐠', chars: ['fish', 'octopus', 'whale', 'turtle', 'jellyfish'], ambient: 'bubbles', key2: 3 },
  { id: 3, key: 'city', name: '반짝반짝 도시', emoji: '🏙️', chars: ['car', 'taxi', 'bus', 'firetruck'], ambient: 'none', key2: 5 },
  { id: 4, key: 'night', name: '별빛 야경', emoji: '🌃', chars: ['airplane', 'hotairballoon', 'star', 'taxi'], ambient: 'twinkle', key2: 7 },
  { id: 5, key: 'forest', name: '숲속 친구들', emoji: '🌲', chars: ['rabbit', 'bear', 'fox', 'panda'], ambient: 'leaves', key2: 2 },
  { id: 6, key: 'farm', name: '꼬꼬 농장', emoji: '🐔', chars: ['chick', 'pig', 'sheep', 'strawberry'], ambient: 'none', key2: 4 },
  { id: 7, key: 'orchard', name: '달콤 과수원', emoji: '🍎', chars: ['apple', 'grape', 'peach', 'tangerine', 'strawberry'], ambient: 'petals', key2: 9 },
  { id: 8, key: 'snow', name: '눈꽃 나라', emoji: '❄️', chars: ['penguin', 'polarbear', 'arcticfox', 'rabbit'], ambient: 'snow', key2: 10 },
  { id: 9, key: 'space', name: '우주 여행', emoji: '🚀', chars: ['rocket', 'ufo', 'star', 'planet'], ambient: 'twinkle', key2: 1 },
  { id: 10, key: 'park', name: '신나는 놀이공원', emoji: '🎡', chars: ['train', 'hotairballoon', 'banana', 'panda', 'chick'], ambient: 'confetti', key2: 6 },
];

export const stageById = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
// 진행 순서는 고정: 1 해변 → 2 바닷속 → … → 10 놀이공원 → 11 다시 해변 (무한)
export const themeForStage = (n) => STAGES[(Math.max(1, n) - 1) % STAGES.length];

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
function sun(c, x, y, r) {
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
  night(c, W, H) {
    c.fillStyle = vgrad(c, H, [[0, '#1b1446'], [0.6, '#4b2a7b'], [1, '#7b3f8f']]); c.fillRect(0, 0, W, H);
    const r = rng(23); c.fillStyle = '#fff';
    for (let i = 0; i < 120; i++) { c.globalAlpha = 0.4 + r() * 0.6; c.beginPath(); c.arc(r() * W, r() * 360, r() * 2 + 0.5, 0, TAU); c.fill(); }
    c.globalAlpha = 1;
    c.fillStyle = '#fff6c9'; c.beginPath(); c.arc(1050, 120, 52, 0, TAU); c.fill();
    c.fillStyle = '#2a1b5c'; c.beginPath(); c.arc(1074, 104, 46, 0, TAU); c.fill();
    let x = -10;
    while (x < W) {
      const w = 80 + r() * 100, h = 200 + r() * 300, y = 600 - h;
      c.fillStyle = r() > 0.5 ? '#251a4e' : '#2f2160'; c.fillRect(x, y, w, h);
      for (let wy = y + 18; wy < 580; wy += 34) for (let wx = x + 12; wx < x + w - 20; wx += 26) {
        c.fillStyle = r() > 0.45 ? 'rgba(255,214,102,0.9)' : 'rgba(120,110,180,0.5)'; c.fillRect(wx, wy, 12, 18);
      }
      x += w + 6;
    }
    c.fillStyle = '#1a1238'; c.fillRect(0, 600, W, H - 600);
    c.fillStyle = 'rgba(255,214,102,0.35)'; for (let lx = 40; lx < W; lx += 160) { c.beginPath(); c.arc(lx, 640, 30, 0, TAU); c.fill(); }
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

// 배경 캐시: 사용자 이미지 > 코드 배경
const bgCache = new Map();
export function clearBackgroundCache() { bgCache.clear(); }
// 배경도 지워졌는지 확인 (배경은 전부 불투명이라 가운데 점이 투명하면 지워진 것)
export function backgroundLost(cv) {
  try { return cv.getContext('2d').getImageData(cv.width >> 1, cv.height >> 1, 1, 1).data[3] === 0; } catch { return true; }
}
const imgCache = new Map();

function coverDraw(c, img, W, H) {
  const k = Math.max(W / img.width, H / img.height);
  const w = img.width * k, h = img.height * k;
  c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

export function getBackground(stage, W, H) {
  const keyName = `${stage.key}:${W}x${H}`;
  const img = imgCache.get(stage.key);
  const cacheKey = img ? `${keyName}:img` : keyName;
  let cv = bgCache.get(cacheKey);
  if (cv) return cv;
  cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  if (img) coverDraw(c, img, W, H);
  else { c.save(); c.scale(W / 1280, H / 720); PAINT[stage.key](c, 1280, 720); c.restore(); }
  bgCache.set(cacheKey, cv);
  return cv;
}

// assets/bg/<key>.png|jpg|webp 를 차례로 시도 (있을 때만 사용)
export function preloadStageImage(stage) {
  if (imgCache.has(stage.key)) return Promise.resolve(true);
  const exts = ['png', 'jpg', 'webp'];
  return new Promise((resolve) => {
    const tryNext = (i) => {
      if (i >= exts.length) return resolve(false);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { imgCache.set(stage.key, img); resolve(true); };
      img.onerror = () => tryNext(i + 1);
      img.src = `assets/bg/${stage.key}.${exts[i]}`;
    };
    tryNext(0);
  });
}
