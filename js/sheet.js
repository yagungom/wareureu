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

// 줄인 해상도에서 덩어리 찾기 (r: 이만큼 부풀려서 가까운 조각끼리 합침)
function labelBlobs(d, w, h, r = 0, maxSide = 512, withMap = false) {
  const k = Math.min(1, maxSide / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
  const m = new Uint8Array(sw * sh);
  const cell = 1 / k;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const x0 = Math.floor(x * cell), x1 = Math.min(w, Math.floor((x + 1) * cell));
      const y0 = Math.floor(y * cell), y1 = Math.min(h, Math.floor((y + 1) * cell));
      let on = 0;
      for (let yy = y0; yy < y1 && !on; yy++) for (let xx = x0; xx < x1; xx++) if (d[(yy * w + xx) * 4 + 3] > 60) { on = 1; break; }
      m[y * sw + x] = on;
    }
  }
  let dm = m;
  if (r > 0) {
    dm = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      if (!m[y * sw + x]) continue;
      for (let yy = Math.max(0, y - r); yy <= Math.min(sh - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(sw - 1, x + r); xx++) dm[yy * sw + xx] = 1;
    }
  }
  const lab = new Int32Array(sw * sh), q = new Int32Array(sw * sh), blobs = [];
  for (let s0 = 0; s0 < sw * sh; s0++) {
    if (!dm[s0] || lab[s0]) continue;
    const id = blobs.length + 1;
    let qh = 0, qt = 0; q[qt++] = s0; lab[s0] = id;
    let x0 = sw, y0 = sh, x1 = 0, y1 = 0, area = 0;
    while (qh < qt) {
      const p = q[qh++], x = p % sw, y = (p / sw) | 0;
      if (m[p]) area++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && dm[p - 1] && !lab[p - 1]) { lab[p - 1] = id; q[qt++] = p - 1; }
      if (x < sw - 1 && dm[p + 1] && !lab[p + 1]) { lab[p + 1] = id; q[qt++] = p + 1; }
      if (y > 0 && dm[p - sw] && !lab[p - sw]) { lab[p - sw] = id; q[qt++] = p - sw; }
      if (y < sh - 1 && dm[p + sw] && !lab[p + sw]) { lab[p + sw] = id; q[qt++] = p + sw; }
    }
    blobs.push({ id, x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k, area: area / (sw * sh) });
  }
  return withMap ? { blobs, lab, sw, sh, k } : blobs;
}

// 큰 덩어리(스티커)만 남기고, 반짝이 같은 작은 조각은 가장 가까운 큰 덩어리에 합침
function findBlobs(d, w, h, r) {
  const all = labelBlobs(d, w, h, r, r === 0 ? 1024 : 512);
  const big = all.filter((b) => b.area >= 0.012), small = all.filter((b) => b.area < 0.012 && b.area >= 0.0003);
  for (const s of small) {
    const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
    let best = null, bd = Infinity;
    for (const b of big) {
      const dx = Math.max(b.x - cx, 0, cx - (b.x + b.w)), dy = Math.max(b.y - cy, 0, cy - (b.y + b.h));
      const dist = Math.hypot(dx, dy);
      if (dist < bd) { bd = dist; best = b; }
    }
    if (best && bd < Math.max(w, h) * 0.04) {
      const x0 = Math.min(best.x, s.x), y0 = Math.min(best.y, s.y);
      best.w = Math.max(best.x + best.w, s.x + s.w) - x0; best.h = Math.max(best.y + best.h, s.y + s.h) - y0; best.x = x0; best.y = y0;
    }
  }
  return big;
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

// 상자 안 알파 분포에서 가운데쯤 가장 비어 있는 세로줄(또는 가로줄)을 찾아 둘로 나눔
function splitBox(d, w, h, b, axis) {
  const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y));
  const x1 = Math.min(w, Math.ceil(b.x + b.w)), y1 = Math.min(h, Math.ceil(b.y + b.h));
  const len = axis === 'x' ? x1 - x0 : y1 - y0;
  if (len < 20) return null;
  const prof = new Float32Array(len);
  for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
    if (d[(y * w + x) * 4 + 3] > 60) prof[axis === 'x' ? x - x0 : y - y0]++;
  }
  let best = -1, bv = Infinity;
  for (let i = Math.floor(len * 0.3); i < Math.ceil(len * 0.7); i++) {
    const v = prof[i] + (prof[i - 1] || 0) + (prof[i + 1] || 0);
    if (v < bv) { bv = v; best = i; }
  }
  if (best < 0) return null;
  const a = { ...b }, c = { ...b };
  if (axis === 'x') { a.w = best; c.x = x0 + best; c.w = b.w - best; }
  else { a.h = best; c.y = y0 + best; c.h = b.h - best; }
  a.area = c.area = b.area / 2;
  return [a, c];
}

// 조각에서 가장 큰 덩어리만 남기고 나머지(옆 스티커가 넘어온 부분)는 지움
//  테두리끼리 살짝 닿아 이어진 경우도 끊기게: 조금 깎아서(침식) 덩어리를 찾고, 다시 키워서(팽창) 원래 모양만큼 남김
function morph(m, sw, sh, r, grow) {
  // 정사각형 창의 최소(침식)/최대(팽창)를 가로 → 세로 두 번에 나눠 계산 (빠름)
  const tmp = new Uint8Array(sw * sh), out = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    let cnt = 0; const row = y * sw;
    for (let x = -r; x < sw; x++) {
      const add = x + r, sub = x - r - 1;
      if (add < sw && m[row + add]) cnt++;
      if (sub >= 0 && m[row + sub]) cnt--;
      if (x >= 0) { const span = Math.min(sw - 1, x + r) - Math.max(0, x - r) + 1; tmp[row + x] = grow ? (cnt > 0 ? 1 : 0) : (cnt === (2 * r + 1) ? 1 : 0); if (!grow && span < 2 * r + 1) tmp[row + x] = 0; }
    }
  }
  for (let x = 0; x < sw; x++) {
    let cnt = 0;
    for (let y = -r; y < sh; y++) {
      const add = y + r, sub = y - r - 1;
      if (add < sh && tmp[add * sw + x]) cnt++;
      if (sub >= 0 && tmp[sub * sw + x]) cnt--;
      if (y >= 0) { const span = Math.min(sh - 1, y + r) - Math.max(0, y - r) + 1; out[y * sw + x] = grow ? (cnt > 0 ? 1 : 0) : (cnt === (2 * r + 1) ? 1 : 0); if (!grow && span < 2 * r + 1) out[y * sw + x] = 0; }
    }
  }
  return out;
}

// 테두리끼리 붙은 스티커 떼어 내기: 모양을 조금씩 깎아 n개로 갈라지면, 그 씨앗에서 원래 모양 안으로 다시 넓혀 칸을 나눔
function separate(d, w, h, n) {
  const k = Math.min(1, 512 / Math.max(w, h)), sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
  const m = new Uint8Array(sw * sh);
  for (let y = 0; y < h; y++) { const row = Math.min(sh - 1, Math.floor(y * k)) * sw; for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 60) m[row + Math.min(sw - 1, Math.floor(x * k))] = 1; }
  const N = sw * sh, lab = new Int32Array(N), q = new Int32Array(N);
  for (const e of [2, 3, 4, 6, 8]) {
    const er = morph(m, sw, sh, e, false);
    lab.fill(0); const comps = []; let idc = 0;
    for (let s0 = 0; s0 < N; s0++) {
      if (!er[s0] || lab[s0]) continue;
      idc++; let qh = 0, qt = 0; q[qt++] = s0; lab[s0] = idc;
      while (qh < qt) { const p = q[qh++], x = p % sw; for (const nb of [x > 0 ? p - 1 : -1, x < sw - 1 ? p + 1 : -1, p - sw, p + sw]) if (nb >= 0 && nb < N && er[nb] && !lab[nb]) { lab[nb] = idc; q[qt++] = nb; } }
      comps.push({ id: idc, n: qt });
    }
    const big = comps.filter((c) => c.n >= N * 0.004).sort((a, b) => b.n - a.n);
    if (big.length < n) continue;
    const keep = new Map(big.slice(0, n).map((c, i) => [c.id, i + 1]));
    const own = new Int32Array(N); let qh = 0, qt = 0;
    for (let i = 0; i < N; i++) { const o = keep.get(lab[i]); if (o) { own[i] = o; q[qt++] = i; } }
    while (qh < qt) { const p = q[qh++], x = p % sw; for (const nb of [x > 0 ? p - 1 : -1, x < sw - 1 ? p + 1 : -1, p - sw, p + sw]) if (nb >= 0 && nb < N && m[nb] && !own[nb]) { own[nb] = own[p]; q[qt++] = nb; } }
    const boxes = [];
    for (let i = 1; i <= n; i++) boxes.push({ x0: sw, y0: sh, x1: -1, y1: -1, own: i });
    for (let i = 0; i < N; i++) { const o = own[i]; if (!o) continue; const b = boxes[o - 1], x = i % sw, y = (i / sw) | 0; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; }
    return { own, sw, sh, k, boxes: boxes.map((b) => ({ x: b.x0 / k, y: b.y0 / k, w: (b.x1 - b.x0 + 1) / k, h: (b.y1 - b.y0 + 1) / k, own: b.own, area: 1 })) };
  }
  return null;
}

function keepMain(piece) {
  const w = piece.width, h = piece.height, c = piece.getContext('2d', { willReadFrequently: true });
  const id = c.getImageData(0, 0, w, h), d = id.data;
  const k = Math.min(1, 300 / Math.max(w, h)), sw = Math.max(1, Math.round(w * k)), sh = Math.max(1, Math.round(h * k));
  const m = new Uint8Array(sw * sh);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 60) m[Math.min(sh - 1, Math.floor(y * k)) * sw + Math.min(sw - 1, Math.floor(x * k))] = 1;
  const er = morph(m, sw, sh, 3, false);
  // 깎은 모양에서 가장 큰 덩어리
  const lab = new Int32Array(sw * sh), q = new Int32Array(sw * sh); let bestId = 0, bestN = 0, idc = 0;
  for (let s0 = 0; s0 < sw * sh; s0++) {
    if (!er[s0] || lab[s0]) continue;
    idc++; let qh = 0, qt = 0, n = 0; q[qt++] = s0; lab[s0] = idc;
    while (qh < qt) {
      const p = q[qh++], x = p % sw; n++;
      for (const nb of [x > 0 ? p - 1 : -1, x < sw - 1 ? p + 1 : -1, p - sw, p + sw]) if (nb >= 0 && nb < sw * sh && er[nb] && !lab[nb]) { lab[nb] = idc; q[qt++] = nb; }
    }
    if (n > bestN) { bestN = n; bestId = idc; }
  }
  if (!bestId) return piece;
  const main = new Uint8Array(sw * sh); for (let i = 0; i < sw * sh; i++) main[i] = lab[i] === bestId ? 1 : 0;
  const keep = morph(main, sw, sh, 5, true);
  let cleared = 0;
  for (let y = 0; y < h; y++) {
    const row = Math.min(sh - 1, Math.floor(y * k)) * sw;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4 + 3;
      if (d[i] && !keep[row + Math.min(sw - 1, Math.floor(x * k))]) { d[i] = 0; cleared++; }
    }
  }
  if (!cleared) return piece;
  c.putImageData(id, 0, 0);
  const t = trimBox(d, w, h, { x: 0, y: 0, w, h }); if (!t) return piece;
  const out = document.createElement('canvas'); out.width = t.w; out.height = t.h;
  out.getContext('2d').drawImage(piece, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
  return out;
}

export function sliceSheet(img, n = 6, cols = 3, rows = 2) {
  const cv = toCanvas(img);
  const w = cv.width, h = cv.height;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const id = c.getImageData(0, 0, w, h);
  const d = id.data;
  if (!isTransparent(d, w, h)) { removeBackground(d, w, h); c.putImageData(id, 0, 0); }

  if (h > w * 1.15 && cols > rows) [cols, rows] = [rows, cols]; // 세로로 긴 그림이면 2칸 × 3줄
  // 덩어리가 n개이고 크기가 고르면 그대로 (가까이 붙은 스티커도 떨어지게 부풀리기 없이 먼저 시도)
  const good = (bs) => bs.length >= n && (() => {
    const top = [...bs].sort((a, b) => b.area - a.area).slice(0, n);
    return top[0].area / top[n - 1].area < 8 && top.every((b) => b.w < w / cols * 1.35 && b.h < h / rows * 1.35) ? top : null;
  })();
  let boxes = null, mode = 'blobs', found = 0;
  for (const r of [0, 2]) {
    const bs = findBlobs(d, w, h, r); found = Math.max(found, bs.length);
    const top = good(bs);
    if (top) { boxes = readingOrder(top); break; }
  }
  // 스티커끼리 테두리가 닿아 한 덩어리가 된 경우 ①: 깎아서 떼어 낸 뒤 원래 모양대로 칸 나누기
  let sep = null;
  if (!boxes) {
    sep = separate(d, w, h, n);
    if (sep && sep.boxes.every((b) => b.w < w / cols * 1.35 && b.h < h / rows * 1.35)) { boxes = readingOrder(sep.boxes); mode = 'separate'; }
    else sep = null;
  }
  // ②: 덩어리를 가장 비어 있는 줄(골짜기)에서 둘로 나눔
  if (!boxes) {
    const bs = findBlobs(d, w, h, 0);
    for (let guard = 0; bs.length < n && guard < n; guard++) {
      const cw = w / cols, ch = h / rows;
      const cand = bs.filter((b) => b.w > cw * 1.3 || b.h > ch * 1.3).sort((a, b) => Math.max(b.w / cw, b.h / ch) - Math.max(a.w / cw, a.h / ch))[0];
      if (!cand) break;
      const parts = splitBox(d, w, h, cand, cand.w / cw >= cand.h / ch ? 'x' : 'y');
      if (!parts) break;
      bs.splice(bs.indexOf(cand), 1, ...parts);
    }
    const top = good(bs);
    if (top) { boxes = readingOrder(top); mode = 'split'; }
  }
  if (!boxes) {
    // 격자로 나누고, 칸마다 가장 큰 덩어리만 남김 (옆 스티커가 살짝 넘어온 조각 제거)
    mode = 'grid';
    boxes = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) boxes.push({ x: q * w / cols, y: r * h / rows, w: w / cols, h: h / rows, cell: true });
    boxes = boxes.slice(0, n);
  }
  const out = boxes.map((b) => {
    const t = trimBox(d, w, h, b); if (!t) return null;
    let piece = document.createElement('canvas'); piece.width = t.w; piece.height = t.h;
    const pc = piece.getContext('2d', { willReadFrequently: !!b.own });
    pc.drawImage(cv, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
    if (b.own && sep) {
      // 이 스티커 칸에 속한 픽셀만 남김
      const pid = pc.getImageData(0, 0, t.w, t.h), pd = pid.data;
      for (let y = 0; y < t.h; y++) {
        const row = Math.min(sep.sh - 1, Math.floor((t.y + y) * sep.k)) * sep.sw;
        for (let x = 0; x < t.w; x++) { const o = sep.own[row + Math.min(sep.sw - 1, Math.floor((t.x + x) * sep.k))]; if (o !== b.own) pd[(y * t.w + x) * 4 + 3] = 0; }
      }
      pc.putImageData(pid, 0, 0);
    }
    piece = keepMain(piece); // 옆 스티커가 살짝 넘어온 조각 지우기
    return piece;
  });
  return { pieces: out, mode, blobs: found };
}
