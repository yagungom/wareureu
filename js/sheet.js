// ChatGPT 스티커 시트 자동 자르기
//  - 투명 배경이면 그대로, 단색 배경(흰색·초록 등)이면 테두리에서부터 배경색을 지움
//  - 붙어 있는 덩어리(스티커)를 찾아 크기 순으로 n개 → 윗줄부터 왼쪽→오른쪽 순서로 정렬
//  - 덩어리를 n개 못 찾으면 3칸 × 2줄 격자로 나눠 자름
const MAX_SIDE = 2048;

function toCanvas(img) {
  const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
  cv.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0, cv.width, cv.height);
  return cv;
}

// 테두리 픽셀 대부분이 투명하면 이미 배경이 지워진 그림
function isTransparent(d, w, h) {
  let n = 0, t = 0;
  const step = Math.max(1, Math.floor((w + h) / 400));
  for (let x = 0; x < w; x += step) { n += 2; if (d[(x) * 4 + 3] < 16) t++; if (d[((h - 1) * w + x) * 4 + 3] < 16) t++; }
  for (let y = 0; y < h; y += step) { n += 2; if (d[(y * w) * 4 + 3] < 16) t++; if (d[(y * w + w - 1) * 4 + 3] < 16) t++; }
  return t / n > 0.6;
}

// 테두리 색의 중간값 = 배경색
function borderColor(d, w, h) {
  const rs = [], gs = [], bs = [];
  const push = (i) => { rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); };
  const step = Math.max(1, Math.floor((w + h) / 300));
  for (let x = 0; x < w; x += step) { push(x * 4); push(((h - 1) * w + x) * 4); }
  for (let y = 0; y < h; y += step) { push(y * w * 4); push((y * w + w - 1) * 4); }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

// 테두리에 닿아 있는 배경색 영역만 지움 (그림 안쪽의 같은 색은 남김)
function removeBackground(d, w, h, tol = 22) {
  const [br, bg, bb] = borderColor(d, w, h);
  const dist = (i) => Math.max(Math.abs(d[i] - br), Math.abs(d[i + 1] - bg), Math.abs(d[i + 2] - bb));
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  const seed = (p) => { if (!seen[p] && dist(p * 4) <= tol) { seen[p] = 1; stack[sp++] = p; } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (sp) {
    const p = stack[--sp]; d[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) seed(p - 1); if (x < w - 1) seed(p + 1);
    if (p >= w) seed(p - w); if (p < w * (h - 1)) seed(p + w);
  }
  // 가장자리 번짐 줄이기: 지운 곳 바로 옆의 배경 비슷한 색은 반투명으로
  for (let p = 0; p < w * h; p++) {
    if (seen[p]) continue;
    const x = p % w;
    const near = (x > 0 && seen[p - 1]) || (x < w - 1 && seen[p + 1]) || (p >= w && seen[p - w]) || (p < w * (h - 1) && seen[p + w]);
    if (!near) continue;
    const k = dist(p * 4) / (tol * 2.2);
    if (k < 1) d[p * 4 + 3] = Math.round(d[p * 4 + 3] * k);
  }
}

// 작은 해상도에서 덩어리 찾기 (주변 반짝이 같은 작은 조각은 가까운 덩어리에 합침)
function findBlobs(d, w, h) {
  const k = Math.min(1, 320 / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
  const m = new Uint8Array(sw * sh);
  const cell = 1 / k;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const x0 = Math.floor(x * cell), x1 = Math.min(w, Math.floor((x + 1) * cell) + 1);
      const y0 = Math.floor(y * cell), y1 = Math.min(h, Math.floor((y + 1) * cell) + 1);
      let on = 0;
      for (let yy = y0; yy < y1 && !on; yy += 2) for (let xx = x0; xx < x1; xx += 2) if (d[(yy * w + xx) * 4 + 3] > 60) { on = 1; break; }
      m[y * sw + x] = on;
    }
  }
  // 팽창: 가까운 조각 합치기
  const r = Math.max(1, Math.round(Math.max(sw, sh) * 0.012));
  const dm = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (!m[y * sw + x]) continue;
    for (let yy = Math.max(0, y - r); yy <= Math.min(sh - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(sw - 1, x + r); xx++) dm[yy * sw + xx] = 1;
  }
  const lab = new Int32Array(sw * sh);
  const blobs = [];
  const q = new Int32Array(sw * sh);
  for (let s = 0; s < sw * sh; s++) {
    if (!dm[s] || lab[s]) continue;
    const id = blobs.length + 1;
    let qh = 0, qt = 0; q[qt++] = s; lab[s] = id;
    let x0 = sw, y0 = sh, x1 = 0, y1 = 0, area = 0;
    while (qh < qt) {
      const p = q[qh++]; const x = p % sw, y = (p / sw) | 0;
      if (m[p]) area++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const n of [x > 0 ? p - 1 : -1, x < sw - 1 ? p + 1 : -1, y > 0 ? p - sw : -1, y < sh - 1 ? p + sw : -1]) {
        if (n >= 0 && dm[n] && !lab[n]) { lab[n] = id; q[qt++] = n; }
      }
    }
    blobs.push({ x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k, area });
  }
  const minArea = sw * sh * 0.004;
  return blobs.filter((b) => b.area >= minArea);
}

// 윗줄부터, 같은 줄은 왼쪽부터
function readingOrder(boxes) {
  const s = [...boxes].sort((a, b) => (a.y + a.h / 2) - (b.y + b.h / 2));
  const medH = [...s].sort((a, b) => a.h - b.h)[s.length >> 1]?.h || 1;
  const rows = [];
  for (const b of s) {
    const cy = b.y + b.h / 2;
    const row = rows[rows.length - 1];
    if (row && cy - row.cy < medH * 0.5) row.items.push(b); else rows.push({ cy, items: [b] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.x - b.x));
}

// 상자 안에서 실제 그림이 있는 영역만 남기기
function trimBox(d, w, h, b) {
  let x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y));
  let x1 = Math.min(w - 1, Math.ceil(b.x + b.w)), y1 = Math.min(h - 1, Math.ceil(b.y + b.h));
  let tx0 = x1, ty0 = y1, tx1 = x0, ty1 = y0, any = false;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (d[(y * w + x) * 4 + 3] > 24) { any = true; if (x < tx0) tx0 = x; if (x > tx1) tx1 = x; if (y < ty0) ty0 = y; if (y > ty1) ty1 = y; }
  }
  if (!any) return null;
  return { x: tx0, y: ty0, w: tx1 - tx0 + 1, h: ty1 - ty0 + 1 };
}

export function sliceSheet(img, n = 6, cols = 3, rows = 2) {
  const cv = toCanvas(img);
  const w = cv.width, h = cv.height;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const id = c.getImageData(0, 0, w, h);
  const d = id.data;
  if (!isTransparent(d, w, h)) { removeBackground(d, w, h); c.putImageData(id, 0, 0); }

  if (h > w * 1.15 && cols > rows) [cols, rows] = [rows, cols]; // 세로로 긴 그림이면 2칸 × 3줄
  const blobs = findBlobs(d, w, h).sort((a, b) => b.area - a.area);
  let boxes = blobs.slice(0, n);
  let mode = 'blobs';
  // 덩어리가 n개이고 크기가 고르면 그대로, 붙어버렸거나 조각났으면 격자로
  const ok = boxes.length === n && boxes[0].area / boxes[n - 1].area < 8
    && boxes.every((b) => b.w < w / cols * 1.35 && b.h < h / rows * 1.35);
  if (ok) {
    boxes = readingOrder(boxes);
  } else {
    mode = 'grid';
    boxes = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) boxes.push({ x: q * w / cols, y: r * h / rows, w: w / cols, h: h / rows });
    boxes = boxes.slice(0, n);
  }
  const out = boxes.map((b) => {
    const t = trimBox(d, w, h, b); if (!t) return null;
    const piece = document.createElement('canvas'); piece.width = t.w; piece.height = t.h;
    piece.getContext('2d').drawImage(cv, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
    return piece;
  });
  return { pieces: out, mode, blobs: blobs.length };
}
