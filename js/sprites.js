// 오리지널 캐릭터 스프라이트 (모두 코드로 그림)
// 160x160 디자인 좌표계, 중심 (80,80), 반지름 약 60 기준.
// assets/characters/<id>.png 가 있으면 그 이미지를 대신 씁니다 (선택).
import { TAU } from './util.js';

const INK = '#3b2a35';
const SP = 160;
const PAD = 16;
const SCALE = 1.25; // 큰 TV 화면용으로 약간 크게 렌더
const SIZE = Math.round((SP + PAD * 2) * SCALE);

// ── 그리기 헬퍼 ──
function shape(c, fill, lw = 5, stroke = INK) {
  c.fillStyle = fill; c.fill();
  if (lw) { c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
}
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
function rrect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function line(c, pts, w, color = INK) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.lineWidth = w; c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function shine(c, x, y, rx, ry, rot = -0.5, a = 0.5) {
  c.save(); c.globalAlpha = a; c.fillStyle = '#fff'; ell(c, x, y, rx, ry, rot); c.fill(); c.restore();
}
function poly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }

// 귀여운 얼굴: 눈 2개(하이라이트) + 볼터치 + 입
function face(c, x, y, k = 1, o = {}) {
  const g = (o.gap ?? 15) * k, er = 5 * k, ink = o.ink || '#2a1b22';
  if (o.eyes !== false) {
    for (const s of [-1, 1]) {
      c.fillStyle = ink; ell(c, x + s * g, y, er * 0.92, er * 1.18); c.fill();
      c.fillStyle = '#fff'; circ(c, x + s * g - er * 0.3, y - er * 0.5, er * 0.4); c.fill();
    }
  }
  if (o.blush !== false) {
    c.fillStyle = o.blush || 'rgba(255,105,135,0.55)';
    for (const s of [-1, 1]) { ell(c, x + s * (g + 8 * k), y + 8 * k, 5.5 * k, 3.4 * k); c.fill(); }
  }
  const my = y + (o.mouthY ?? 8) * k;
  c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = ink; c.lineWidth = 2.6 * k;
  switch (o.mouth) {
    case 'none': break;
    case 'o': c.fillStyle = '#8c2f39'; ell(c, x, my + k, 3.4 * k, 4.2 * k); c.fill(); break;
    case 'w':
      c.beginPath(); c.arc(x - 3.2 * k, my, 3.2 * k, 0, Math.PI);
      c.moveTo(x + 6.4 * k, my); c.arc(x + 3.2 * k, my, 3.2 * k, 0, Math.PI); c.stroke(); break;
    case 'grin':
      c.fillStyle = '#8c2f39'; c.beginPath(); c.arc(x, my - 2 * k, 5.5 * k, 0, Math.PI); c.closePath(); c.fill(); c.stroke(); break;
    default:
      c.beginPath(); c.arc(x, my - 3 * k, 5 * k, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  }
}

// ── 과일 ──
const fruit = {
  apple(c) {
    c.beginPath(); c.moveTo(80, 48);
    c.bezierCurveTo(110, 28, 150, 52, 140, 96); c.bezierCurveTo(132, 132, 104, 146, 80, 136);
    c.bezierCurveTo(56, 146, 28, 132, 20, 96); c.bezierCurveTo(10, 52, 50, 28, 80, 48); c.closePath();
    shape(c, '#ff5d5d'); shine(c, 46, 74, 9, 16, 0.4);
    line(c, [80, 50, 79, 38, 86, 22], 6);
    c.beginPath(); c.moveTo(86, 36); c.quadraticCurveTo(104, 14, 126, 26); c.quadraticCurveTo(108, 46, 86, 36); c.closePath(); shape(c, '#6bcb77', 4);
    face(c, 80, 92, 1.15);
  },
  strawberry(c) {
    c.beginPath(); c.moveTo(80, 146);
    c.bezierCurveTo(40, 130, 16, 84, 30, 60); c.bezierCurveTo(40, 40, 64, 46, 80, 46);
    c.bezierCurveTo(96, 46, 120, 40, 130, 60); c.bezierCurveTo(144, 84, 120, 130, 80, 146); c.closePath();
    shape(c, '#ff4d6d'); shine(c, 48, 76, 7, 13, 0.5);
    c.fillStyle = '#ffe58a';
    for (const [x, y] of [[50, 66], [68, 60], [92, 60], [110, 66], [40, 92], [120, 92], [58, 118], [102, 118], [80, 132]]) { ell(c, x, y, 2.4, 3.6); c.fill(); }
    poly(c, [50, 50, 62, 30, 72, 44, 80, 24, 88, 44, 98, 30, 110, 50, 80, 58]); shape(c, '#52b788', 4);
    line(c, [80, 28, 80, 14], 5);
    face(c, 80, 90, 1.05);
  },
  watermelon(c) {
    const cy = 50;
    c.beginPath(); c.moveTo(146, cy); c.arc(80, cy, 66, 0, Math.PI); c.closePath(); shape(c, '#2d9d5a');
    c.beginPath(); c.moveTo(139, cy); c.arc(80, cy, 59, 0, Math.PI); c.closePath(); shape(c, '#c7f0cf', 0);
    c.beginPath(); c.moveTo(133, cy); c.arc(80, cy, 53, 0, Math.PI); c.closePath(); shape(c, '#ff5e78', 0);
    c.beginPath(); c.moveTo(146, cy); c.arc(80, cy, 66, 0, Math.PI); c.closePath(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    c.fillStyle = '#2b1d1d';
    for (const [x, y, r] of [[42, 64, 0.3], [118, 64, -0.3], [56, 92, 0.5], [104, 92, -0.5], [80, 100, 0]]) { ell(c, x, y, 2.6, 4.2, r); c.fill(); }
    face(c, 80, 70, 1.0);
  },
  banana(c) {
    c.beginPath(); c.moveTo(26, 52); c.quadraticCurveTo(80, 170, 138, 50); c.quadraticCurveTo(84, 96, 26, 52); c.closePath();
    shape(c, '#ffd93d');
    c.save(); c.globalAlpha = 0.5; c.beginPath(); c.moveTo(40, 66); c.quadraticCurveTo(80, 140, 124, 66); c.lineWidth = 5; c.strokeStyle = '#ffeea0'; c.stroke(); c.restore();
    c.fillStyle = '#7a5230'; ell(c, 27, 52, 5, 4, 0.5); c.fill(); ell(c, 137, 50, 5, 4, -0.5); c.fill();
    face(c, 82, 90, 0.85, { gap: 14 });
  },
  grape(c) {
    line(c, [80, 34, 84, 16], 6, '#7a5230');
    c.beginPath(); c.moveTo(84, 26); c.quadraticCurveTo(104, 8, 124, 22); c.quadraticCurveTo(104, 38, 84, 26); c.closePath(); shape(c, '#6bcb77', 4);
    for (const [x, y] of [[54, 56], [80, 50], [106, 56], [44, 82], [116, 82], [56, 110], [104, 110], [80, 132]]) {
      circ(c, x, y, 19); shape(c, '#9b5de5', 4); shine(c, x - 6, y - 7, 4, 6, 0.4, 0.45);
    }
    circ(c, 80, 92, 30); shape(c, '#a56cf0', 4); shine(c, 66, 78, 6, 9, 0.5);
    face(c, 80, 92, 0.95, { gap: 13 });
  },
  peach(c) {
    c.beginPath(); c.moveTo(80, 46);
    c.bezierCurveTo(100, 30, 146, 44, 140, 92); c.bezierCurveTo(134, 130, 104, 144, 80, 144);
    c.bezierCurveTo(56, 144, 26, 130, 20, 92); c.bezierCurveTo(14, 44, 60, 30, 80, 46); c.closePath();
    const g = c.createRadialGradient(60, 72, 8, 80, 92, 80); g.addColorStop(0, '#ffe0d1'); g.addColorStop(1, '#ff8fa3');
    shape(c, g);
    c.beginPath(); c.moveTo(80, 48); c.quadraticCurveTo(64, 82, 72, 116); c.lineWidth = 3; c.strokeStyle = 'rgba(190,70,95,0.45)'; c.stroke();
    ell(c, 66, 36, 16, 8, -0.6); shape(c, '#6bcb77', 4); ell(c, 96, 34, 16, 8, 0.5); shape(c, '#52b788', 4);
    face(c, 88, 96, 1.05);
  },
  pineapple(c) {
    for (const dx of [-28, -14, 0, 14, 28]) {
      poly(c, [80 - 9 + dx * 0.35, 58, 80 + dx, 6 + Math.abs(dx) * 0.5, 80 + 9 + dx * 0.35, 58]); shape(c, dx === 0 ? '#52b788' : '#40916c', 4);
    }
    ell(c, 80, 100, 46, 50); shape(c, '#ffc93c');
    c.save(); ell(c, 80, 100, 46, 50); c.clip();
    c.strokeStyle = 'rgba(190,120,20,0.45)'; c.lineWidth = 3;
    for (let i = -6; i <= 6; i++) {
      c.beginPath(); c.moveTo(80 + i * 18 - 60, 40); c.lineTo(80 + i * 18 + 60, 160); c.stroke();
      c.beginPath(); c.moveTo(80 + i * 18 + 60, 40); c.lineTo(80 + i * 18 - 60, 160); c.stroke();
    }
    c.restore();
    ell(c, 80, 100, 46, 50); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    shine(c, 56, 78, 7, 14, 0.4);
    face(c, 80, 102, 1.05);
  },
  tangerine(c) {
    circ(c, 80, 90, 54); shape(c, '#ffa62b');
    c.fillStyle = 'rgba(200,100,10,0.25)';
    for (const [x, y] of [[50, 70], [110, 70], [40, 104], [120, 104], [64, 128], [96, 128], [80, 52]]) { circ(c, x, y, 2.4); c.fill(); }
    shine(c, 52, 66, 9, 15, 0.6);
    line(c, [80, 38, 80, 30], 6, '#7a5230');
    c.beginPath(); c.moveTo(82, 34); c.quadraticCurveTo(100, 16, 120, 28); c.quadraticCurveTo(102, 44, 82, 34); c.closePath(); shape(c, '#52b788', 4);
    face(c, 80, 94, 1.12);
  },
};

// ── 바다 친구 ──
const sea = {
  fish(c) {
    c.beginPath(); c.moveTo(52, 46); c.quadraticCurveTo(76, 14, 98, 46); c.closePath(); shape(c, '#ff8c42', 4);
    poly(c, [108, 80, 150, 50, 142, 80, 150, 112]); shape(c, '#ff8c42', 4);
    ell(c, 70, 80, 56, 40); shape(c, '#ffb347');
    c.save(); ell(c, 70, 80, 56, 40); c.clip(); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(92, 30, 9, 100); c.restore();
    ell(c, 70, 80, 56, 40); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    ell(c, 94, 106, 13, 7, 0.5); shape(c, '#ff8c42', 4);
    face(c, 52, 78, 1.0, { gap: 13 });
    circ(c, 20, 44, 5); c.lineWidth = 3; c.strokeStyle = '#7fc8f8'; c.stroke();
    circ(c, 12, 28, 3.5); c.stroke();
  },
  octopus(c) {
    for (let i = 0; i < 6; i++) {
      const x = 36 + i * 17.6, d = i % 2 ? 10 : -10;
      c.beginPath(); c.moveTo(x, 92); c.quadraticCurveTo(x + d, 124, x - d * 0.4, 142);
      c.lineCap = 'round'; c.lineWidth = 21; c.strokeStyle = INK; c.stroke();
      c.lineWidth = 13; c.strokeStyle = '#ff70a6'; c.stroke();
    }
    c.beginPath(); c.moveTo(28, 100); c.bezierCurveTo(20, 40, 56, 18, 80, 18); c.bezierCurveTo(104, 18, 140, 40, 132, 100);
    c.quadraticCurveTo(80, 114, 28, 100); c.closePath(); shape(c, '#ff70a6');
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (const [x, y, r] of [[56, 40, 7], [102, 38, 5], [114, 60, 4]]) { circ(c, x, y, r); c.fill(); }
    face(c, 80, 74, 1.12);
  },
  whale(c) {
    ell(c, 128, 74, 11, 22, -0.5); shape(c, '#3a86e0', 4);
    ell(c, 132, 50, 18, 8, -0.7); shape(c, '#3a86e0', 4);
    ell(c, 148, 60, 16, 7, 0.9); shape(c, '#3a86e0', 4);
    ell(c, 74, 94, 60, 42); shape(c, '#4d96ff');
    c.save(); ell(c, 74, 94, 60, 42); c.clip(); c.fillStyle = '#d4e6ff'; ell(c, 70, 128, 56, 26); c.fill(); c.restore();
    ell(c, 74, 94, 60, 42); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    ell(c, 92, 118, 14, 7, 0.5); shape(c, '#3a86e0', 4);
    for (const [x, y] of [[66, 36], [54, 26], [80, 24]]) { c.beginPath(); c.arc(x, y, 6, 0, TAU); shape(c, '#9ad0ff', 3); }
    shine(c, 50, 70, 10, 6, -0.3);
    face(c, 56, 92, 1.05);
  },
  crab(c) {
    for (const s of [-1, 1]) {
      for (const dy of [0, 14, 28]) { line(c, [80 + s * 40, 96 + dy * 0.5, 80 + s * 66, 108 + dy], 9); line(c, [80 + s * 40, 96 + dy * 0.5, 80 + s * 66, 108 + dy], 4, '#ff7b7b'); }
      line(c, [80 + s * 36, 88, 80 + s * 52, 68], 10); line(c, [80 + s * 36, 88, 80 + s * 52, 68], 5, '#ff7b7b');
      ell(c, 80 + s * 56, 54, 17, 11, s * -0.8); shape(c, '#ff595e', 4);
      ell(c, 80 + s * 50, 70, 13, 8, s * 0.4); shape(c, '#ff595e', 4);
    }
    ell(c, 80, 98, 50, 34); shape(c, '#ff595e'); shine(c, 60, 84, 10, 6, -0.3);
    for (const s of [-1, 1]) {
      line(c, [80 + s * 14, 70, 80 + s * 18, 50], 5);
      circ(c, 80 + s * 18, 44, 11); shape(c, '#fff', 4);
      c.fillStyle = '#2a1b22'; circ(c, 80 + s * 18, 45, 5.5); c.fill();
      c.fillStyle = '#fff'; circ(c, 80 + s * 18 - 2, 43, 2); c.fill();
    }
    face(c, 80, 96, 1, { gap: 22, mouth: 'smile', mouthY: 4, eyes: false });
  },
  turtle(c) {
    for (const [x, y] of [[36, 126], [124, 126], [34, 92], [126, 92]]) { ell(c, x, y, 15, 11); shape(c, '#95d5b2', 4); }
    circ(c, 80, 50, 28); shape(c, '#95d5b2');
    ell(c, 80, 106, 54, 40); shape(c, '#52b788');
    c.strokeStyle = 'rgba(20,80,50,0.45)'; c.lineWidth = 3;
    c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.lineTo(80 + Math.cos(a) * 17, 106 + Math.sin(a) * 13); } c.closePath(); c.stroke();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; c.beginPath(); c.moveTo(80 + Math.cos(a) * 17, 106 + Math.sin(a) * 13); c.lineTo(80 + Math.cos(a) * 46, 106 + Math.sin(a) * 34); c.stroke(); }
    shine(c, 58, 86, 10, 6, -0.4);
    face(c, 80, 48, 0.95, { gap: 12 });
  },
  jellyfish(c) {
    for (let i = 0; i < 5; i++) {
      const x = 46 + i * 17;
      c.beginPath(); c.moveTo(x, 94); c.quadraticCurveTo(x - 9, 110, x, 122); c.quadraticCurveTo(x + 9, 134, x, 148);
      c.lineCap = 'round'; c.lineWidth = 10; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#d0a2ff'; c.stroke();
    }
    c.beginPath(); c.moveTo(22, 96); c.bezierCurveTo(22, 26, 138, 26, 138, 96);
    for (let i = 0; i < 4; i++) { const x0 = 138 - i * 29; c.quadraticCurveTo(x0 - 14.5, 110, x0 - 29, 96); }
    c.closePath();
    const g = c.createLinearGradient(0, 30, 0, 100); g.addColorStop(0, '#ecd4ff'); g.addColorStop(1, '#c77dff');
    shape(c, g); shine(c, 54, 52, 12, 7, -0.6);
    face(c, 80, 72, 1.05);
  },
};

// ── 동물 ──
function bearLike(c, col, muzzle, inner) {
  for (const s of [-1, 1]) { circ(c, 80 + s * 40, 52, 20); shape(c, col); circ(c, 80 + s * 40, 52, 10); shape(c, inner, 0); }
  circ(c, 80, 92, 52); shape(c, col); shine(c, 52, 64, 9, 13, 0.5, 0.35);
  ell(c, 80, 110, 23, 17); shape(c, muzzle, 3);
  c.fillStyle = '#2a1b22'; ell(c, 80, 103, 7.5, 5.5); c.fill();
  face(c, 80, 86, 1.1, { gap: 21, mouth: 'w', mouthY: 22 });
}
function foxLike(c, col, cheek, inner) {
  for (const s of [-1, 1]) {
    poly(c, [80 + s * 50, 66, 80 + s * 42, 16, 80 + s * 10, 46]); shape(c, col);
    poly(c, [80 + s * 42, 58, 80 + s * 40, 28, 80 + s * 20, 46]); shape(c, inner, 0);
  }
  const head = () => {
    c.beginPath(); c.moveTo(80, 140); c.bezierCurveTo(40, 136, 18, 104, 24, 74); c.quadraticCurveTo(28, 44, 80, 46);
    c.quadraticCurveTo(132, 44, 136, 74); c.bezierCurveTo(142, 104, 120, 136, 80, 140); c.closePath();
  };
  head(); shape(c, col, 0);
  c.save(); head(); c.clip();
  c.beginPath(); c.moveTo(16, 96); c.quadraticCurveTo(50, 90, 80, 124); c.quadraticCurveTo(110, 90, 144, 96); c.lineTo(144, 160); c.lineTo(16, 160); c.closePath();
  c.fillStyle = cheek; c.fill(); c.restore();
  head(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#2a1b22'; ell(c, 80, 122, 7, 5); c.fill();
  face(c, 80, 90, 1.05, { gap: 22, mouth: 'smile', mouthY: 40 });
}
const animal = {
  rabbit(c) {
    for (const s of [-1, 1]) {
      ell(c, 80 + s * 22, 40, 13, 34, s * 0.15); shape(c, '#fffafa');
      ell(c, 80 + s * 22, 42, 6, 24, s * 0.15); shape(c, '#ffb3c6', 0);
    }
    circ(c, 80, 96, 46); shape(c, '#fffafa'); shine(c, 56, 74, 8, 12, 0.5, 0.6);
    c.fillStyle = '#ff8fab'; ell(c, 80, 104, 5, 3.6); c.fill();
    face(c, 80, 96, 1.1, { gap: 17, mouth: 'w', mouthY: 12 });
  },
  bear(c) { bearLike(c, '#b5835a', '#ecd2b2', '#8a5a3b'); },
  polarbear(c) { bearLike(c, '#f4f7fb', '#ffffff', '#dfe7f2'); },
  fox(c) { foxLike(c, '#ff8c42', '#fff5eb', '#6b3f2a'); },
  arcticfox(c) { foxLike(c, '#e9eef7', '#ffffff', '#bcc8dc'); },
  pig(c) {
    for (const s of [-1, 1]) { poly(c, [80 + s * 46, 62, 80 + s * 42, 24, 80 + s * 12, 46]); shape(c, '#ff9ebb'); }
    circ(c, 80, 92, 52); shape(c, '#ffafcc'); shine(c, 52, 66, 9, 13, 0.5, 0.4);
    ell(c, 80, 110, 21, 14); shape(c, '#ff8fab', 4);
    c.fillStyle = '#b3446c'; ell(c, 73, 110, 3.2, 5); c.fill(); ell(c, 87, 110, 3.2, 5); c.fill();
    face(c, 80, 84, 1.05, { gap: 22, mouth: 'none' });
  },
  chick(c) {
    for (const [x, y, r] of [[72, 36, -0.4], [80, 32, 0], [88, 36, 0.4]]) { ell(c, x, y, 6, 13, r); shape(c, '#ffd43b', 4); }
    ell(c, 30, 100, 14, 22, 0.5); shape(c, '#ffd43b'); ell(c, 130, 100, 14, 22, -0.5); shape(c, '#ffd43b');
    circ(c, 80, 94, 52); shape(c, '#ffe066'); shine(c, 54, 68, 10, 14, 0.5, 0.5);
    poly(c, [69, 100, 91, 100, 80, 115]); shape(c, '#ff922b', 3);
    face(c, 80, 88, 1.1, { gap: 21, mouth: 'none' });
  },
  penguin(c) {
    ell(c, 30, 100, 12, 26, 0.35); shape(c, '#2b2d42'); ell(c, 130, 100, 12, 26, -0.35); shape(c, '#2b2d42');
    ell(c, 62, 148, 13, 6); shape(c, '#ffa94d', 4); ell(c, 98, 148, 13, 6); shape(c, '#ffa94d', 4);
    ell(c, 80, 90, 52, 60); shape(c, '#2b2d42');
    c.beginPath(); c.moveTo(80, 58); c.bezierCurveTo(60, 38, 28, 52, 36, 90); c.bezierCurveTo(42, 132, 118, 132, 124, 90); c.bezierCurveTo(132, 52, 100, 38, 80, 58); c.closePath();
    shape(c, '#fffdf7', 0);
    ell(c, 80, 94, 10, 6); shape(c, '#ffa94d', 3);
    face(c, 80, 80, 1.05, { gap: 20, mouth: 'none' });
    shine(c, 48, 50, 6, 10, 0.5, 0.3);
  },
  panda(c) {
    for (const s of [-1, 1]) { circ(c, 80 + s * 40, 50, 19); shape(c, '#2b2d42'); }
    circ(c, 80, 92, 52); shape(c, '#ffffff');
    for (const s of [-1, 1]) {
      ell(c, 80 + s * 22, 88, 15, 19, s * 0.6); c.fillStyle = '#2b2d42'; c.fill();
      c.fillStyle = '#fff'; circ(c, 80 + s * 21, 86, 6.5); c.fill();
      c.fillStyle = '#2a1b22'; circ(c, 80 + s * 21, 87, 4); c.fill();
      c.fillStyle = '#fff'; circ(c, 80 + s * 21 - 1.5, 85, 1.5); c.fill();
    }
    c.fillStyle = 'rgba(255,105,135,0.5)'; ell(c, 46, 112, 6, 4); c.fill(); ell(c, 114, 112, 6, 4); c.fill();
    c.fillStyle = '#2a1b22'; ell(c, 80, 106, 7, 5); c.fill();
    face(c, 80, 106, 1, { gap: 0, blush: false, mouth: 'w', mouthY: 7, eyes: false });
  },
  sheep(c) {
    ell(c, 26, 96, 17, 8, 0.4); shape(c, '#f2c6a0', 4); ell(c, 134, 96, 17, 8, -0.4); shape(c, '#f2c6a0', 4);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(c, 80 + Math.cos(a) * 44, 88 + Math.sin(a) * 44, 18); shape(c, '#fbfbfb', 4); }
    circ(c, 80, 88, 47); c.fillStyle = '#fbfbfb'; c.fill();
    ell(c, 80, 100, 30, 33); shape(c, '#ffe3c8', 4);
    for (const [x, y] of [[66, 64], [80, 58], [94, 64]]) { circ(c, x, y, 12); shape(c, '#fbfbfb', 4); }
    face(c, 80, 100, 0.95, { gap: 13 });
  },
};

// ── 탈것 ──
function carLike(c, col, opts = {}) {
  if (opts.taxi) { rrect(c, 66, 22, 28, 14, 5); shape(c, '#ffd166', 4); }
  rrect(c, 16, 72, 128, 44, 20); shape(c, col);
  c.beginPath(); c.moveTo(40, 74); c.lineTo(54, 42); c.quadraticCurveTo(56, 36, 63, 36); c.lineTo(104, 36);
  c.quadraticCurveTo(110, 36, 114, 42); c.lineTo(128, 74); c.closePath(); shape(c, col);
  poly(c, [52, 72, 62, 46, 102, 46, 116, 72]); shape(c, '#cdeffd', 3);
  shine(c, 40, 82, 14, 4, 0, 0.45);
  c.fillStyle = '#ffe066'; ell(c, 138, 92, 6, 8); c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
  c.fillStyle = '#ff6b6b'; rrect(c, 16, 84, 7, 12, 3); c.fill();
  for (const x of [46, 114]) { circ(c, x, 118, 17); shape(c, '#2b2d42'); circ(c, x, 118, 7); shape(c, '#c4cbd4', 3); }
  face(c, 86, 60, 0.85, { gap: 12 });
}
const vehicle = {
  car(c) { carLike(c, '#ef476f'); },
  taxi(c) { carLike(c, '#ffc43d', { taxi: true }); },
  bus(c) {
    rrect(c, 10, 34, 140, 84, 18); shape(c, '#06d6a0');
    for (const x of [22, 52, 82]) { rrect(c, x, 46, 24, 24, 6); shape(c, '#cdeffd', 3); }
    rrect(c, 114, 46, 28, 36, 6); shape(c, '#cdeffd', 3);
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(14, 84, 96, 6);
    c.fillStyle = '#ffe066'; circ(c, 143, 102, 5); c.fill(); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    for (const x of [42, 118]) { circ(c, x, 120, 16); shape(c, '#2b2d42'); circ(c, x, 120, 6); shape(c, '#c4cbd4', 3); }
    face(c, 64, 102, 0.95, { gap: 15 });
  },
  firetruck(c) {
    rrect(c, 10, 64, 140, 52, 12); shape(c, '#e63946');
    rrect(c, 102, 40, 48, 76, 12); shape(c, '#e63946');
    rrect(c, 110, 48, 32, 24, 7); shape(c, '#cdeffd', 3);
    rrect(c, 112, 30, 26, 10, 4); shape(c, '#4d96ff', 3); c.fillStyle = '#ff6b6b'; c.fillRect(125, 32, 11, 6);
    line(c, [16, 58, 96, 58], 4, '#adb5bd');
    for (let x = 22; x <= 90; x += 14) line(c, [x, 46, x, 58], 4, '#adb5bd');
    line(c, [16, 46, 96, 46], 4, '#adb5bd');
    c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(14, 96, 88, 5);
    for (const x of [40, 120]) { circ(c, x, 118, 17); shape(c, '#2b2d42'); circ(c, x, 118, 7); shape(c, '#c4cbd4', 3); }
    face(c, 58, 82, 1.0, { gap: 15 });
  },
  airplane(c) {
    poly(c, [18, 82, 26, 38, 46, 42, 54, 80]); shape(c, '#ff6b6b');
    poly(c, [72, 74, 98, 40, 110, 40, 102, 76]); shape(c, '#c9d8ef');
    c.beginPath(); c.moveTo(20, 80); c.quadraticCurveTo(20, 64, 40, 64); c.lineTo(118, 64); c.quadraticCurveTo(150, 66, 150, 86);
    c.quadraticCurveTo(150, 104, 118, 104); c.lineTo(40, 104); c.quadraticCurveTo(20, 104, 20, 90); c.closePath(); shape(c, '#f8f9ff');
    c.fillStyle = '#4d96ff'; c.fillRect(22, 93, 120, 6);
    for (const x of [46, 62, 78]) { circ(c, x, 78, 4.5); shape(c, '#9ad0ff', 2.5); }
    poly(c, [68, 92, 96, 132, 110, 132, 104, 92]); shape(c, '#dde7f7');
    face(c, 124, 80, 0.85, { gap: 10 });
  },
  hotairballoon(c) {
    line(c, [52, 100, 68, 124], 3); line(c, [108, 100, 92, 124], 3);
    rrect(c, 64, 120, 32, 24, 5); shape(c, '#c68b59', 4);
    line(c, [66, 132, 94, 132], 2, 'rgba(60,30,10,0.5)');
    const body = () => { c.beginPath(); c.moveTo(80, 112); c.bezierCurveTo(28, 92, 22, 18, 80, 16); c.bezierCurveTo(138, 18, 132, 92, 80, 112); c.closePath(); };
    body(); c.save(); c.clip();
    c.fillStyle = '#ff6b6b'; c.fillRect(0, 0, 160, 160);
    const cols = ['#ffd93d', '#6bcb77', '#4d96ff', '#ffffff'];
    [44, 31, 18, 6].forEach((rx, i) => { c.fillStyle = cols[i]; ell(c, 80, 62, rx, 62); c.fill(); });
    c.restore(); body(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    shine(c, 50, 42, 7, 14, 0.4, 0.5);
    c.fillStyle = 'rgba(255,255,255,0.85)'; rrect(c, 56, 48, 48, 30, 14); c.fill();
    face(c, 80, 60, 0.9, { gap: 12 });
  },
  train(c) {
    rrect(c, 26, 18, 28, 8, 3); shape(c, '#2b2d42', 3);
    rrect(c, 30, 22, 20, 28, 4); shape(c, '#2b2d42', 3);
    rrect(c, 16, 46, 92, 56, 20); shape(c, '#4361ee');
    rrect(c, 92, 30, 54, 72, 10); shape(c, '#ef476f');
    rrect(c, 104, 40, 30, 24, 6); shape(c, '#cdeffd', 3);
    rrect(c, 88, 24, 62, 10, 5); shape(c, '#2b2d42', 3);
    rrect(c, 12, 98, 138, 14, 6); shape(c, '#2b2d42', 3);
    for (const [x, r] of [[38, 15], [74, 15], [118, 19]]) { circ(c, x, 116, r); shape(c, '#ffd166'); circ(c, x, 116, r * 0.38); shape(c, '#2b2d42', 0); }
    shine(c, 40, 56, 14, 4, 0, 0.45);
    face(c, 58, 74, 1.0, { gap: 15 });
  },
  rocket(c) {
    c.beginPath(); c.moveTo(64, 122); c.quadraticCurveTo(80, 164, 96, 122); c.closePath(); shape(c, '#ffa94d', 3);
    c.beginPath(); c.moveTo(71, 122); c.quadraticCurveTo(80, 148, 89, 122); c.closePath(); shape(c, '#ffe066', 0);
    poly(c, [54, 92, 28, 130, 56, 122]); shape(c, '#ff6b6b'); poly(c, [106, 92, 132, 130, 104, 122]); shape(c, '#ff6b6b');
    const body = () => { c.beginPath(); c.moveTo(80, 10); c.bezierCurveTo(118, 36, 112, 96, 104, 124); c.lineTo(56, 124); c.bezierCurveTo(48, 96, 42, 36, 80, 10); c.closePath(); };
    body(); shape(c, '#f1f3ff', 0);
    c.save(); body(); c.clip(); c.fillStyle = '#ff6b6b'; c.fillRect(0, 0, 160, 36); c.fillStyle = '#dfe3f5'; c.fillRect(92, 0, 40, 160); c.restore();
    body(); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    circ(c, 80, 72, 21); shape(c, '#cdeffd', 6, '#8d99ae'); circ(c, 80, 72, 21); c.lineWidth = 3; c.strokeStyle = INK; c.stroke();
    face(c, 80, 70, 0.75, { gap: 9 });
  },
  ufo(c) {
    c.beginPath(); c.arc(80, 78, 34, Math.PI, 0); c.closePath(); shape(c, 'rgba(205,239,253,0.97)');
    shine(c, 64, 60, 6, 10, 0.5, 0.7);
    face(c, 80, 66, 0.8, { gap: 11 });
    ell(c, 80, 90, 70, 22); shape(c, '#9d8df1');
    ell(c, 80, 84, 52, 8); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
    for (const x of [30, 55, 80, 105, 130]) { circ(c, x, 94, 5.5); shape(c, '#ffd93d', 2.5); }
    ell(c, 80, 108, 28, 8); shape(c, '#7b6fd6', 4);
  },
  star(c) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 30 : 64; c.lineTo(80 + Math.cos(a) * r, 86 + Math.sin(a) * r); }
    c.closePath(); c.lineJoin = 'round';
    c.lineWidth = 18; c.strokeStyle = INK; c.stroke();
    c.lineWidth = 9; c.strokeStyle = '#ffd60a'; c.stroke(); c.fillStyle = '#ffd60a'; c.fill();
    shine(c, 64, 70, 6, 10, 0.5, 0.6);
    face(c, 80, 90, 1.0, { gap: 14 });
  },
  planet(c) {
    c.beginPath(); c.ellipse(80, 90, 74, 20, -0.25, 0, TAU); c.lineWidth = 14; c.strokeStyle = INK; c.stroke(); c.lineWidth = 8; c.strokeStyle = '#ffd166'; c.stroke();
    circ(c, 80, 84, 44); shape(c, '#ff9e6d');
    c.save(); circ(c, 80, 84, 44); c.clip(); c.fillStyle = 'rgba(255,220,190,0.55)'; ell(c, 80, 62, 60, 7, -0.25); c.fill(); ell(c, 80, 108, 60, 6, -0.25); c.fill(); c.restore();
    circ(c, 80, 84, 44); c.lineWidth = 5; c.strokeStyle = INK; c.stroke();
    c.beginPath(); c.ellipse(80, 90, 74, 20, -0.25, 0, Math.PI); c.lineWidth = 14; c.strokeStyle = INK; c.stroke(); c.lineWidth = 8; c.strokeStyle = '#ffd166'; c.stroke();
    face(c, 80, 78, 1.0, { gap: 14 });
  },
};

// ── 폭탄 / 하트 ──
function bombBody(c) {
  c.beginPath(); c.moveTo(108, 42); c.quadraticCurveTo(124, 16, 142, 22); c.lineCap = 'round';
  c.lineWidth = 9; c.strokeStyle = INK; c.stroke(); c.lineWidth = 5; c.strokeStyle = '#d9b382'; c.stroke();
  c.save(); c.translate(104, 48); c.rotate(0.65); rrect(c, -14, -11, 28, 22, 5); shape(c, '#8d99ae'); c.restore();
  circ(c, 76, 94, 52); shape(c, '#2f3150');
  shine(c, 52, 70, 11, 18, 0.6, 0.35);
  // 장난꾸러기 표정
  for (const s of [-1, 1]) {
    ell(c, 76 + s * 17, 92, 9, 11); shape(c, '#fff', 0);
    c.fillStyle = '#1b1b2f'; circ(c, 76 + s * 17 + s * -1.5, 94, 5); c.fill();
    c.fillStyle = '#fff'; circ(c, 76 + s * 17 - 2, 91.5, 1.8); c.fill();
    line(c, [76 + s * 28, 74, 76 + s * 8, 82], 5, '#fff');
  }
  c.fillStyle = 'rgba(255,90,90,0.6)'; ell(c, 44, 110, 7, 4); c.fill(); ell(c, 108, 110, 7, 4); c.fill();
  c.beginPath(); c.moveTo(62, 112); c.quadraticCurveTo(76, 124, 90, 112); c.lineWidth = 4; c.strokeStyle = '#fff'; c.lineCap = 'round'; c.stroke();
}
function heart(c) {
  c.beginPath(); c.moveTo(80, 142); c.bezierCurveTo(14, 100, 18, 38, 56, 38); c.bezierCurveTo(70, 38, 80, 50, 80, 60);
  c.bezierCurveTo(80, 50, 90, 38, 104, 38); c.bezierCurveTo(142, 38, 146, 100, 80, 142); c.closePath();
  shape(c, '#ff4d6d'); shine(c, 50, 62, 9, 14, 0.6, 0.6);
  face(c, 80, 86, 1.0, { gap: 15 });
}

export const DRAW = { ...fruit, ...sea, ...animal, ...vehicle, bomb: bombBody, heart };

// 폭탄 심지 끝 위치(디자인 좌표) — 불꽃은 매 프레임 애니메이션
export const BOMB_SPARK = { x: 142, y: 22 };

// ── 캐시 + 스티커 테두리 ──
const cache = new Map();
const custom = new Map();

function render(id) {
  const base = document.createElement('canvas');
  base.width = base.height = SIZE;
  const c = base.getContext('2d');
  c.scale(SCALE, SCALE); c.translate(PAD, PAD);
  (DRAW[id] || DRAW.apple)(c);

  // 흰색 스티커 테두리 + 그림자 (배경 위에서 잘 보이게)
  const out = document.createElement('canvas');
  out.width = out.height = SIZE;
  const o = out.getContext('2d');
  const w = 6 * SCALE;
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; o.drawImage(base, Math.cos(a) * w, Math.sin(a) * w); }
  o.globalCompositeOperation = 'source-in'; o.fillStyle = '#ffffff'; o.fillRect(0, 0, SIZE, SIZE);
  o.globalCompositeOperation = 'source-over'; o.drawImage(base, 0, 0);

  const fin = document.createElement('canvas');
  fin.width = fin.height = SIZE;
  const f = fin.getContext('2d');
  f.shadowColor = 'rgba(20,10,40,0.35)'; f.shadowBlur = 10; f.shadowOffsetY = 6;
  f.drawImage(out, 0, 0);
  return fin;
}

export function getSprite(id) {
  if (custom.has(id)) return custom.get(id);
  let s = cache.get(id);
  if (!s) { s = render(id); cache.set(id, s); }
  return s;
}

// 스프라이트 반지름 60(디자인) → 화면 반지름 r 일 때 그릴 크기
export function spriteDrawSize(r) { return SIZE / SCALE * (r / 60); }

// 사용자 PNG 교체: assets/characters/<id>.png (투명 배경 권장). 있을 때만 사용
export function tryLoadCustomSprites(ids) {
  for (const id of ids) {
    if (custom.has(id)) continue;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
      const c = cv.getContext('2d');
      const inner = SIZE * (120 / (SP + PAD * 2));
      const k = Math.min(inner / img.width, inner / img.height);
      const w = img.width * k, h = img.height * k;
      c.shadowColor = 'rgba(20,10,40,0.35)'; c.shadowBlur = 10; c.shadowOffsetY = 6;
      c.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
      custom.set(id, cv);
    };
    img.onerror = () => {};
    img.src = `assets/characters/${id}.png`;
  }
}

export const ALL_IDS = Object.keys(DRAW);
