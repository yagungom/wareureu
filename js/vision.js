// 카메라 + 사람 분리(세그멘테이션) + 터치 입력
// 개인정보: 카메라 영상은 이 기기의 메모리 안에서만 처리되고, 저장·전송되지 않습니다.
import { CONFIG, QUALITY } from './config.js';
import { clamp } from './util.js';

let tasksModule = null;
let segmenterPromise = null;

async function loadSegmenter(onProgress) {
  if (segmenterPromise) return segmenterPromise;
  segmenterPromise = (async () => {
    onProgress?.('사람 인식 엔진 불러오는 중… (처음 한 번만 조금 걸려요)');
    tasksModule = await import('../vendor/mediapipe/vision_bundle.mjs');
    const { FilesetResolver, ImageSegmenter } = tasksModule;
    const fileset = await FilesetResolver.forVisionTasks(new URL(CONFIG.WASM_PATH, document.baseURI).href.replace(/\/$/, ''));
    const modelUrl = new URL(CONFIG.MODEL.path, document.baseURI).href;
    const opts = (delegate) => ({
      baseOptions: { modelAssetPath: modelUrl, delegate },
      runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false,
    });
    let seg, delegate = 'GPU';
    try { seg = await ImageSegmenter.createFromOptions(fileset, opts('GPU')); }
    catch (e) { console.warn('GPU 가속 불가, CPU로 전환', e); delegate = 'CPU'; seg = await ImageSegmenter.createFromOptions(fileset, opts('CPU')); }
    return { seg, delegate };
  })();
  try { return await segmenterPromise; } catch (e) { segmenterPromise = null; throw e; }
}

export class CameraVision {
  constructor({ quality = 'high', mirror = true } = {}) {
    this.kind = 'camera';
    this.W = CONFIG.W; this.H = CONFIG.H;
    this.mirror = mirror;
    this.setQuality(quality);
    this.video = document.createElement('video');
    this.video.muted = true; this.video.playsInline = true; this.video.setAttribute('playsinline', '');
    this.person = document.createElement('canvas'); this.person.width = this.W; this.person.height = this.H;
    this.pctx = this.person.getContext('2d');
    this.stream = null; this.running = false; this.lastTs = -1;
    this.coverage = 0; this.colProfile = new Float32Array(32);
    this.segMs = 0; this.fps = 0; this._fpsT = performance.now(); this._fpsN = 0;
    this.hasFrame = false;
  }

  setQuality(q) {
    const p = QUALITY[q] || QUALITY.high;
    this.SW = p.segW; this.SH = p.segH;
    this.seg = document.createElement('canvas'); this.seg.width = this.SW; this.seg.height = this.SH;
    this.sctx = this.seg.getContext('2d', { willReadFrequently: false });
    this.maskCv = document.createElement('canvas'); this.maskCv.width = this.SW; this.maskCv.height = this.SH;
    this.mctx = this.maskCv.getContext('2d');
    this.maskImg = this.mctx.createImageData(this.SW, this.SH);
    const d = this.maskImg.data; for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = 0; }
    this.mask = new Float32Array(this.SW * this.SH);
  }

  async init(onProgress) {
    const { seg, delegate } = await loadSegmenter(onProgress);
    this.segmenter = seg; this.delegate = delegate;
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
    this.deviceId = track?.getSettings?.().deviceId || deviceId;
    this.facing = track?.getSettings?.().facingMode || facing;
    this.running = true; this.hasFrame = false;
    this._loop();
  }

  stopCamera() {
    this.running = false;
    if (this.stream) { this.stream.getTracks().forEach((t) => t.stop()); this.stream = null; }
    this.video.srcObject = null;
    this.coverage = 0; this.mask.fill(0); this.hasFrame = false;
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
    this.sctx.drawImage(this.person, 0, 0, SW, SH);

    const t0 = performance.now();
    let ts = t0; if (ts <= this.lastTs) ts = this.lastTs + 1; this.lastTs = ts;
    try {
      this.segmenter.segmentForVideo(this.seg, ts, (res) => {
        const masks = res.confidenceMasks;
        if (!masks?.length) return;
        const f = masks[0].getAsFloat32Array();
        this._updateMask(f, CONFIG.MODEL.kind === 'multiclass');
      });
    } catch (e) { console.warn('segment error', e); return; }
    this.segMs = this.segMs * 0.9 + (performance.now() - t0) * 0.1;

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

  _updateMask(f, invert) {
    const m = this.mask, d = this.maskImg.data, n = m.length;
    const cols = this.colProfile.fill(0), SW = this.SW, nc = cols.length;
    let cov = 0;
    for (let i = 0; i < n; i++) {
      let v = invert ? 1 - f[i] : f[i];
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

  // 원(x,y,r)이 사람과 닿았는지: 9개 지점 중 need 개 이상이 사람이면 닿은 것
  hitTest(x, y, r, need = 2, th = 0.55) {
    let hits = 0;
    if (this.sample(x, y) > th) hits++;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      if (this.sample(x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75) > th) { hits++; if (hits >= need) return true; }
    }
    return hits >= need;
  }

  get present() { return this.coverage > 0.012; }
  destroy() { this.stopCamera(); }
}

// 카메라 없이 손가락/마우스로 하는 모드 (미리보기·카메라 거부 시)
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
    this._down = (e) => { this.pointers.set(e.pointerId, { ...toLocal(e), t: performance.now() }); };
    this._move = (e) => { if (e.pointerType === 'mouse' || this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { ...toLocal(e), t: performance.now() }); };
    this._up = (e) => { if (e.pointerType !== 'mouse') this.pointers.delete(e.pointerId); };
    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }
  hitTest(x, y, r) {
    for (const p of this.pointers.values()) { const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy < (r + this.R * 0.6) ** 2) return true; }
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
