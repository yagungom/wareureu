// 카메라 + 사람 분리(크로마키) + 손 인식 + 터치 입력
// 개인정보: 카메라 영상은 이 기기의 메모리 안에서만 처리되고, 저장·전송되지 않습니다.
//
// 두 가지 모델을 같이 씁니다.
//  1) 자세 인식(Pose Landmarker): 멀리 있는 사람도 찾고, 사람마다 '손 위치'를 알려줌 → 잡기 판정은 손으로만
//  2) 셀피 분리(Selfie Segmentation): 사람 윤곽 마스크 (가까이 있을 때 특히 정확)
//  → 멀리 있는 사람은 셀피 마스크가 흐릿하게 나오므로, 자세 인식으로 찾은 사람 영역 안에서는 마스크를 강하게 하고
//    팔·다리·몸통 뼈대 실루엣을 덧칠해서 또렷하게 합성
import { CONFIG, QUALITY } from './config.js';
import { clamp } from './util.js';

let filesetPromise = null;
let segPromise = null;
const posePromises = {};

async function getFileset(onProgress) {
  if (!filesetPromise) {
    filesetPromise = (async () => {
      onProgress?.('사람 인식 엔진 불러오는 중… (처음 한 번만 조금 걸려요)');
      const mod = await import('../vendor/mediapipe/vision_bundle.mjs');
      const fileset = await mod.FilesetResolver.forVisionTasks(new URL(CONFIG.WASM_PATH, document.baseURI).href.replace(/\/$/, ''));
      return { mod, fileset };
    })();
    filesetPromise.catch(() => { filesetPromise = null; });
  }
  return filesetPromise;
}

async function withGpuFallback(create) {
  try { return { task: await create('GPU'), delegate: 'GPU' }; }
  catch (e) { console.warn('GPU 가속 불가, CPU로 전환', e); return { task: await create('CPU'), delegate: 'CPU' }; }
}

function loadSegmenter(onProgress) {
  if (!segPromise) {
    segPromise = (async () => {
      const { mod, fileset } = await getFileset(onProgress);
      const modelAssetPath = new URL(CONFIG.MODEL.path, document.baseURI).href;
      return withGpuFallback((delegate) => mod.ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate }, runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false,
      }));
    })();
    segPromise.catch(() => { segPromise = null; });
  }
  return segPromise;
}

function loadPose(kind, onProgress) {
  if (!posePromises[kind]) {
    posePromises[kind] = (async () => {
      const { mod, fileset } = await getFileset(onProgress);
      onProgress?.('손 인식 준비 중…');
      const modelAssetPath = new URL(CONFIG.POSE_MODELS[kind], document.baseURI).href;
      return withGpuFallback((delegate) => mod.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate }, runningMode: 'VIDEO',
        numPoses: CONFIG.MAX_PEOPLE, minPoseDetectionConfidence: 0.4, minPosePresenceConfidence: 0.4, minTrackingConfidence: 0.4,
        outputSegmentationMasks: false,
      }));
    })();
    posePromises[kind].catch(() => { delete posePromises[kind]; });
  }
  return posePromises[kind];
}

// 손바닥 근처 랜드마크 (BlazePose 33점): 손목, 새끼, 검지, 엄지
const HANDS = [[15, 17, 19, 21], [16, 18, 20, 22]];
const ARMS = [[11, 13], [13, 15], [12, 14], [14, 16]];
const LEGS = [[23, 25], [25, 27], [24, 26], [26, 28]];

function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + dx * t - px, y = ay + dy * t - py;
  return x * x + y * y;
}

export class CameraVision {
  constructor({ quality = 'high', mirror = true } = {}) {
    this.kind = 'camera';
    this.W = CONFIG.W; this.H = CONFIG.H;
    this.mirror = mirror;
    this.video = document.createElement('video');
    this.video.muted = true; this.video.playsInline = true; this.video.setAttribute('playsinline', '');
    this.person = document.createElement('canvas'); this.person.width = this.W; this.person.height = this.H;
    this.pctx = this.person.getContext('2d');
    this.stream = null; this.running = false; this.lastTs = -1; this.lastPoseTs = -1;
    this.coverage = 0; this.colProfile = new Float32Array(32);
    this.segMs = 0; this.poseMs = 0; this.fps = 0; this._fpsT = performance.now(); this._fpsN = 0;
    this.hasFrame = false;
    this.hands = []; this.people = 0; this.poseOk = false;
    this.setQuality(quality);
  }

  setQuality(q) {
    const p = QUALITY[q] || QUALITY.high;
    this.quality = QUALITY[q] ? q : 'high';
    this.SW = p.segW; this.SH = p.segH; this.PW = p.poseW; this.PH = p.poseH; this.poseKind = p.pose;
    this.seg = document.createElement('canvas'); this.seg.width = this.SW; this.seg.height = this.SH;
    this.sctx = this.seg.getContext('2d');
    this.poseCv = document.createElement('canvas'); this.poseCv.width = this.PW; this.poseCv.height = this.PH;
    this.poseCtx = this.poseCv.getContext('2d');
    this.maskCv = document.createElement('canvas'); this.maskCv.width = this.SW; this.maskCv.height = this.SH;
    this.mctx = this.maskCv.getContext('2d');
    this.maskImg = this.mctx.createImageData(this.SW, this.SH);
    const d = this.maskImg.data; for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 0; }
    this.mask = new Float32Array(this.SW * this.SH);
    // 분리 마스크 픽셀 → 자세 마스크 픽셀 위치표 (합치기용)
    // 자세 인식 결과를 그리는 작은 캔버스: R = 뼈대 실루엣, G = 사람 영역(박스)
    this.silCv = document.createElement('canvas'); this.silCv.width = this.SW; this.silCv.height = this.SH;
    this.silCtx = this.silCv.getContext('2d', { willReadFrequently: true });
    this.sil = null; this.poseFrame = 0; this.poseEvery = 1;
    this.poser = null; this.poseOk = false;
  }

  async init(onProgress) {
    const [seg, pose] = await Promise.all([
      loadSegmenter(onProgress),
      loadPose(this.poseKind, onProgress).catch((e) => { console.warn('자세 인식 불러오기 실패 → 몸 전체로 판정', e); return null; }),
    ]);
    this.segmenter = seg.task; this.delegate = seg.delegate;
    this.poser = pose?.task || null; this.poseOk = !!this.poser; this.poseDelegate = pose?.delegate || '-';
  }

  static async listCameras() {
    try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput'); } catch { return []; }
  }

  async startCamera({ deviceId = null, facing = 'user' } = {}) {
    this.stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('no-camera-api'), { name: 'NotSupportedError' });
    const video = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } };
    if (deviceId) video.deviceId = { exact: deviceId }; else video.facingMode = { ideal: facing };
    this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
    this.video.srcObject = this.stream;
    await this.video.play();
    const track = this.stream.getVideoTracks()[0];
    const st = track?.getSettings?.() || {};
    this.deviceId = st.deviceId || deviceId;
    this.facing = st.facingMode || facing;
    this.running = true; this.hasFrame = false;
    this._loop();
  }

  stopCamera() {
    this.running = false;
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    this.video.srcObject = null;
    this.coverage = 0; this.mask.fill(0); this.hasFrame = false; this.hands = []; this.people = 0;
  }

  _loop() {
    if (!this.running) return;
    const v = this.video;
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => { this._process(); this._loop(); });
    else requestAnimationFrame(() => { if (v.currentTime !== this._lastVT) { this._lastVT = v.currentTime; this._process(); } this._loop(); });
  }

  _process() {
    const v = this.video;
    if (!this.running || !v.videoWidth || !this.segmenter) return;
    const { W, H, SW, SH } = this;
    // 16:9 로 가운데 잘라내기(cover) + 거울 반전
    const vr = v.videoWidth / v.videoHeight, tr = W / H;
    let sx = 0, sy = 0, sw = v.videoWidth, sh = v.videoHeight;
    if (vr > tr) { sw = sh * tr; sx = (v.videoWidth - sw) / 2; } else { sh = sw / tr; sy = (v.videoHeight - sh) / 2; }
    const p = this.pctx;
    p.globalCompositeOperation = 'copy';
    p.save(); if (this.mirror) { p.translate(W, 0); p.scale(-1, 1); }
    p.drawImage(v, sx, sy, sw, sh, 0, 0, W, H);
    p.restore();
    p.globalCompositeOperation = 'source-over';

    // 1) 자세 인식: 손 위치 + 사람 영역 (느린 기기에서는 2~3프레임에 한 번)
    if (this.poser && (this.poseFrame++ % this.poseEvery === 0)) {
      const t0 = performance.now();
      this.poseCtx.drawImage(this.person, 0, 0, this.PW, this.PH);
      let ts = t0; if (ts <= this.lastPoseTs) ts = this.lastPoseTs + 1; this.lastPoseTs = ts;
      try {
        this.poser.detectForVideo(this.poseCv, ts, (res) => this._onPose(res));
      } catch (e) { console.warn('pose error', e); }
      this.poseMs = this.poseMs * 0.9 + (performance.now() - t0) * 0.1;
      this.poseEvery = this.poseMs > 45 ? 3 : this.poseMs > 26 ? 2 : 1;
    }

    // 2) 셀피 분리 + 합치기
    this.sctx.drawImage(this.person, 0, 0, SW, SH);
    const t1 = performance.now();
    let ts = t1; if (ts <= this.lastTs) ts = this.lastTs + 1; this.lastTs = ts;
    try {
      this.segmenter.segmentForVideo(this.seg, ts, (res) => {
        const masks = res.confidenceMasks;
        if (!masks?.length) return;
        this._updateMask(masks[0].getAsFloat32Array(), CONFIG.MODEL.kind === 'multiclass');
      });
    } catch (e) { console.warn('segment error', e); return; }
    this.segMs = this.segMs * 0.9 + (performance.now() - t1) * 0.1;

    // 사람만 남기기: 마스크 알파로 잘라냄
    this.mctx.putImageData(this.maskImg, 0, 0);
    p.globalCompositeOperation = 'destination-in';
    p.imageSmoothingEnabled = true; p.imageSmoothingQuality = 'high';
    p.drawImage(this.maskCv, 0, 0, W, H);
    p.globalCompositeOperation = 'source-over';
    this.hasFrame = true;

    this._fpsN++; const now = performance.now();
    if (now - this._fpsT > 1000) { this.fps = this._fpsN * 1000 / (now - this._fpsT); this._fpsN = 0; this._fpsT = now; }
  }

  _onPose(res) {
    const { W, H } = this;
    const lms = res.landmarks || [];
    const prev = this.hands, next = [];
    for (const lm of lms) {
      // 사람 크기(어깨 폭)에 맞춰 손 판정 크기 결정 → 멀리 있어도, 가까이 있어도 비슷하게 잡힘
      const shoulder = Math.hypot((lm[11].x - lm[12].x) * W, (lm[11].y - lm[12].y) * H);
      const hipToShoulder = Math.hypot((lm[11].x - lm[23].x) * W, (lm[11].y - lm[23].y) * H);
      const body = Math.max(shoulder, hipToShoulder * 0.7);
      const r = clamp(body * 0.42, 34, 110);
      for (const [w, pk, ix, th] of HANDS) {
        const vis = Math.max(lm[w].visibility ?? 1, lm[ix].visibility ?? 1);
        if (vis < 0.35) continue;
        const wx = lm[w].x * W, wy = lm[w].y * H;
        const kx = (lm[pk].x + lm[ix].x + lm[th].x) / 3 * W, ky = (lm[pk].y + lm[ix].y + lm[th].y) / 3 * H;
        // 손바닥 가운데: 손목에서 손가락 쪽으로 조금 더 나간 지점
        const x = wx + (kx - wx) * 1.25, y = wy + (ky - wy) * 1.25;
        next.push({ x, y, r, px: x, py: y });
      }
    }
    // 이전 프레임 손과 짝지어서 '휘두른 경로' 전체로 판정 (빠르게 쳐도 놓치지 않게)
    for (const h of next) {
      let best = null, bd = 260 * 260;
      for (const q of prev) { const d = (q.x - h.x) ** 2 + (q.y - h.y) ** 2; if (d < bd) { bd = d; best = q; } }
      if (best) { h.px = best.x; h.py = best.y; }
    }
    this.hands = next; this.people = lms.length;
    this._drawSilhouettes(lms);
  }

  // 사람 영역(G)과 뼈대 실루엣(R)을 작은 캔버스에 그려 둠 → 마스크 합칠 때 사용
  _drawSilhouettes(lms) {
    const c = this.silCtx, SW = this.SW, SH = this.SH;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, SW, SH);
    if (!lms.length) { this.sil = null; return; }
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round'; c.lineJoin = 'round';
    const P = (lm, i) => [lm[i].x * SW, lm[i].y * SH];
    const ok = (lm, i) => (lm[i].visibility ?? 1) > 0.3;
    for (const lm of lms) {
      const [lsx, lsy] = P(lm, 11), [rsx, rsy] = P(lm, 12);
      const shoulder = Math.hypot(lsx - rsx, lsy - rsy);
      const torso = Math.hypot(lsx - lm[23].x * SW, lsy - lm[23].y * SH);
      const b = Math.max(shoulder, torso * 0.7, 4);
      // 사람 영역 박스 (머리 위쪽 여유 포함)
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < 33; i++) { if (!ok(lm, i)) continue; const [x, y] = P(lm, i); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (x1 < x0) continue;
      const pad = b * 0.45;
      c.fillStyle = 'rgb(0,255,0)';
      c.fillRect(x0 - pad, y0 - b * 0.9, x1 - x0 + pad * 2, y1 - y0 + b * 0.9 + pad);
      // 뼈대 실루엣
      c.strokeStyle = 'rgb(255,0,0)'; c.fillStyle = 'rgb(255,0,0)';
      const limb = (pairs, w) => {
        c.lineWidth = w; c.beginPath();
        for (const [a, z] of pairs) { if (!ok(lm, a) || !ok(lm, z)) continue; const [ax, ay] = P(lm, a), [zx, zy] = P(lm, z); c.moveTo(ax, ay); c.lineTo(zx, zy); }
        c.stroke();
      };
      limb(ARMS, b * 0.2);
      limb(LEGS, b * 0.25);
      if (ok(lm, 11) && ok(lm, 12) && ok(lm, 23) && ok(lm, 24)) {
        c.beginPath(); for (const i of [11, 12, 24, 23]) { const [x, y] = P(lm, i); c.lineTo(x, y); } c.closePath(); c.fill();
        c.lineWidth = b * 0.12; c.stroke();
      }
      if (ok(lm, 0)) {
        const [nx, ny] = P(lm, 0);
        c.lineWidth = b * 0.28; c.beginPath(); c.moveTo((lsx + rsx) / 2, (lsy + rsy) / 2); c.lineTo(nx, ny); c.stroke();
        c.beginPath(); c.arc(nx, ny - b * 0.08, b * 0.27, 0, Math.PI * 2); c.fill();
      }
    }
    this.sil = c.getImageData(0, 0, SW, SH).data;
  }

  _updateMask(f, invert) {
    const m = this.mask, d = this.maskImg.data, n = m.length;
    const cols = this.colProfile.fill(0), SW = this.SW, nc = cols.length;
    const sil = this.sil;
    let cov = 0;
    for (let i = 0; i < n; i++) {
      let v = invert ? 1 - f[i] : f[i];
      if (sil) {
        const j = i * 4;
        if (sil[j + 1] > 0) v = Math.min(1, v * 2.2);            // 사람으로 확인된 영역: 흐릿한 마스크를 또렷하게
        const sv = sil[j] / 255 * 0.85; if (sv > v) v = sv;    // 뼈대 실루엣으로 빈 곳 채우기
      }
      v = m[i] * 0.3 + v * 0.7; // 깜빡임 줄이기
      m[i] = v;
      const a = clamp((v - 0.3) / 0.4, 0, 1);
      d[i * 4 + 3] = a * 255;
      if (v > 0.5) { cov++; cols[Math.floor((i % SW) / SW * nc)]++; }
    }
    this.coverage = cov / n;
    const colTotal = n / nc;
    for (let i = 0; i < nc; i++) cols[i] /= colTotal;
  }

  // 화면 좌표(1280x720) 지점의 "사람일 확률"
  sample(x, y) {
    const mx = Math.floor(x / this.W * this.SW), my = Math.floor(y / this.H * this.SH);
    if (mx < 0 || my < 0 || mx >= this.SW || my >= this.SH) return 0;
    return this.mask[my * this.SW + mx];
  }

  // 잡기 판정: 손으로만. (자세 인식을 못 불러온 경우에만 몸 전체로 대체)
  hitTest(x, y, r, need = 2, th = 0.55) {
    if (this.poseOk) {
      for (const h of this.hands) {
        const rr = r * 0.8 + h.r;
        if (segDist2(x, y, h.px, h.py, h.x, h.y) < rr * rr) return true;
      }
      return false;
    }
    let hits = 0;
    if (this.sample(x, y) > th) hits++;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      if (this.sample(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75) > th) { hits++; if (hits >= need) return true; }
    }
    return hits >= need;
  }

  get present() { return this.people > 0 || this.coverage > 0.012; }
  destroy() { this.stopCamera(); }
}

// 폰 모드: 카메라 없이 손가락(또는 마우스)으로 터치
export class TouchInput {
  constructor(canvas) {
    this.kind = 'touch';
    this.W = CONFIG.W; this.H = CONFIG.H; this.canvas = canvas;
    this.pointers = new Map(); this.R = 64;
    this.coverage = 0; this.colProfile = new Float32Array(32);
    const toLocal = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * this.W, y: (e.clientY - r.top) / r.height * this.H };
    };
    this._down = (e) => { const q = toLocal(e), now = performance.now(); this.pointers.set(e.pointerId, { ...q, px: q.x, py: q.y, t: now, mt: now, up: 0 }); };
    this._move = (e) => {
      const p = this.pointers.get(e.pointerId);
      if (e.pointerType !== 'mouse' && (!p || p.up)) return;
      const q = toLocal(e), now = performance.now();
      this.pointers.set(e.pointerId, { ...q, px: p ? p.x : q.x, py: p ? p.y : q.y, t: now, mt: now, up: 0 });
    };
    // 손가락을 뗀 뒤에도 잠깐(0.16초) 판정을 유지 → 아주 짧게 '톡' 쳐도 인식
    this._up = (e) => { const p = this.pointers.get(e.pointerId); if (p && e.pointerType !== 'mouse') p.up = performance.now(); };
    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }
  get active() {
    const now = performance.now(), out = [];
    for (const [id, p] of this.pointers) {
      if (p.up && now - p.up > 160) { this.pointers.delete(id); continue; }
      out.push(p);
    }
    return out;
  }
  hitTest(x, y, r) {
    const now = performance.now(), rr = (r + this.R * 0.6) ** 2;
    for (const p of this.active) {
      const swept = now - p.mt < 60; // 방금 움직였으면 지나간 경로까지
      if ((swept ? segDist2(x, y, p.px, p.py, p.x, p.y) : (p.x - x) ** 2 + (p.y - y) ** 2) < rr) return true;
    }
    return false;
  }
  get present() { return true; }
  destroy() {
    this.canvas.removeEventListener('pointerdown', this._down);
    this.canvas.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
  }
}
