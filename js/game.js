// 게임 엔진: 낙하·충돌·점수·생명·연출·HUD
import { CONFIG, RULES, DIFFICULTY } from './config.js';
import { TAU, clamp, rand, choice, easeOutBack, formatNum } from './util.js';
import { getSprite, spriteDrawSize, BOMB_SPARK } from './sprites.js';
import { getBackground, themeForStage } from './stages.js';

const FONT = 'system-ui, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';
const INK = '#2b2140';

export class Engine {
  constructor(canvas, sound) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.W = CONFIG.W; this.H = CONFIG.H;
    this.sound = sound;
    this.input = null; this.stage = null; this.bg = null; this.prevBg = null; this.fade = 1;
    this.difficulty = 'normal';
    this.state = 'title';
    this.items = []; this.parts = []; this.texts = []; this.booms = []; this.ambient = [];
    this.retryTarget = null; this.retryProg = 0;
    this.cb = {};
    this.debug = false;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
    this.reset();
  }

  on(name, fn) { this.cb[name] = fn; }
  emit(name, ...a) { try { this.cb[name]?.(...a); } catch (e) { console.error(e); } }

  reset() {
    this.items.length = 0; this.parts.length = 0; this.texts.length = 0; this.booms.length = 0;
    this.lives = RULES.LIVES; this.catches = 0; this.catchPoints = 0; this.combo = 0; this.bestCombo = 0;
    this.lastCatchAt = -1e9; this.lastBombAt = -1e9;
    this.t = 0; this.spawnIn = 0.8; this.level = 1; this.shake = 0;
    this.stageNum = 1; this.stageT = 0; this.rest = 0; this.cleared = 0; this.clearBonus = 0; this._switched = false;
    this.absentMs = 0; this.absent = false; this.backMs = 0;
    this.lastSpawnX = -999; this.banner = null; this.countT = 0; this.startProg = 0;
  }

  get score() { return this.catchPoints + Math.floor(this.t) * RULES.TIME_POINTS_PER_SEC + this.clearBonus; }
  get diff() { return DIFFICULTY[this.difficulty] || DIFFICULTY.normal; }
  setDifficulty(d) { this.difficulty = DIFFICULTY[d] ? d : 'normal'; }
  levelFor(stageNum, stageT) { return stageNum + Math.min(4, Math.floor(stageT / RULES.LEVEL_SEC)); }

  setInput(input) { if (this.input && this.input !== input) this.input.destroy?.(); this.input = input; }

  setStage(stage, fade = false) {
    if (fade && this.bg) { this.prevBg = this.bg; this.fade = 0; } else { this.prevBg = null; this.fade = 1; }
    this.stage = stage;
    this.bg = getBackground(stage, this.W, this.H);
    this.ambient.length = 0;
  }
  refreshBackground() { if (this.stage) this.bg = getBackground(this.stage, this.W, this.H); }

  showTitle(stage) { this.setStage(stage); this.reset(); this.state = 'title'; this.spawnIn = 0.2; }
  enterLobby() { this.setStage(themeForStage(1)); this.reset(); this.state = 'lobby'; this.emit('state', 'lobby'); }

  startCountdown() {
    if (this.state !== 'lobby') return;
    this.reset(); this.state = 'countdown'; this.countT = 3.999; this._lastBeep = 4;
    this.emit('countdown'); this.emit('state', 'countdown');
  }
  pause() { if (this.state === 'play') { this.state = 'paused'; this.emit('state', 'paused'); } }
  resume() { if (this.state === 'paused') { this.state = 'play'; this._last = performance.now(); this.emit('state', 'play'); } }
  toLobby() { this.enterLobby(); }

  // ── 메인 루프 ──
  _frame = (now) => {
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    try { this.update(dt, now); this.render(now); } catch (e) { console.error(e); }
    this._raf = requestAnimationFrame(this._frame);
  };

  update(dt, now) {
    this._updateAmbient(dt);
    this._updateFx(dt);
    if (this.fade < 1) { this.fade = Math.min(1, this.fade + dt / 0.8); if (this.fade >= 1) this.prevBg = null; }
    const inp = this.input;
    switch (this.state) {
      case 'title':
        this._spawnLoop(dt, true);
        this._moveItems(dt, false);
        break;
      case 'lobby': {
        const B = this.lobbyBubble();
        const hit = inp && inp.hitTest(B.x, B.y, B.r * 0.85, 2);
        const prev = this.startProg;
        this.startProg = clamp(this.startProg + (hit ? dt / 0.9 : -dt / 0.6), 0, 1);
        if (hit && Math.floor(this.startProg * 6) !== Math.floor(prev * 6)) this.sound.tick();
        if (this.startProg >= 1) { this.sound.beep(true); this._burst(B.x, B.y, 24, ['#ffd93d', '#ff6b6b', '#4d96ff', '#6bcb77']); this.startCountdown(); }
        break;
      }
      case 'countdown': {
        this.countT -= dt;
        const n = Math.ceil(this.countT);
        if (n !== this._lastBeep && n > 0) { this._lastBeep = n; this.sound.beep(false); }
        if (this.countT <= 0) {
          this.state = 'play'; this.sound.beep(true);
          this.banner = { text: '스테이지 1 시작!', sub: `${this.stage.emoji} ${this.stage.name}`, t: 0, max: 1.4 };
          this.emit('state', 'play'); this.emit('stageStart', 1, this.stage);
        }
        break;
      }
      case 'play': this._updatePlay(dt, now); break;
      case 'over': {
        const T = this.retryTarget;
        if (T && inp) {
          const hit = inp.kind === 'camera' && inp.hitTest(T.x, T.y, T.r * 0.85, 2);
          this.retryProg = clamp(this.retryProg + (hit ? dt / 1.1 : -dt / 0.6), 0, 1);
          this.emit('retryProgress', this.retryProg);
          if (this.retryProg >= 1) { this.retryProg = 0; this.retryTarget = null; this.emit('retry'); }
        }
        break;
      }
      default: break;
    }
    if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.max) this.banner = null; }
  }

  _updatePlay(dt, now) {
    const inp = this.input;
    // 스테이지 사이 휴식: 아무것도 안 떨어지고 시간도 안 감
    if (this.rest > 0) {
      this.rest -= dt;
      if (!this._switched && this.rest <= RULES.REST_SEC * 0.5) this._switchStage();
      if (this.rest <= 0) { this.rest = 0; this.spawnIn = 0.5; }
      this._moveItems(dt, false, now);
      return;
    }
    // 화면에 사람이 없으면 잠시 멈춤 (가만히 시간점수만 쌓는 것 방지)
    if (inp?.kind === 'camera') {
      if (!inp.present) { this.absentMs += dt * 1000; this.backMs = 0; }
      else { this.backMs += dt * 1000; if (this.backMs > 600) this.absentMs = 0; }
      if (!this.absent && this.absentMs > RULES.ABSENT_PAUSE_MS) { this.absent = true; this.emit('absent', true); }
      if (this.absent && this.backMs > 800) { this.absent = false; this.absentMs = 0; this.banner = { text: '다시 시작!', t: 0, max: 0.9 }; this.emit('absent', false); }
      if (this.absent) return;
    }

    this.t += dt; this.stageT += dt;
    if (this.stageT >= RULES.STAGE_SEC) { this._stageClear(); return; }

    const prevLevel = this.level;
    this.level = this.levelFor(this.stageNum, this.stageT);
    if (this.level > prevLevel) { this.banner = { text: `속도 UP! Lv.${this.level}`, t: 0, max: 1.4 }; this.sound.levelUp(); this.emit('level', this.level); }
    if (now - this.lastCatchAt > RULES.COMBO_WINDOW_MS) this.combo = 0;

    this._spawnLoop(dt, false);
    this._moveItems(dt, true, now);
  }

  // 스테이지 클리어: 남은 물체 정리 → 보너스 → 3초 휴식
  _stageClear() {
    this.cleared++;
    this.t = this.cleared * RULES.STAGE_SEC; // 경계에 정확히 맞춤 (서버 검증과 일치)
    this.stageT = RULES.STAGE_SEC;
    const bonus = this.stageNum * RULES.CLEAR_BONUS;
    this.clearBonus += bonus;
    for (const it of this.items) {
      if (it.state !== 'fall') continue;
      it.state = 'caught'; it.st = 0;
      this._burst(it.x, it.y, 6, it.kind === 'bomb' ? ['#c9c9d6', '#ffffff'] : ['#ffd93d', '#ffffff']);
    }
    this.combo = 0;
    this.rest = RULES.REST_SEC; this._switched = false;
    this.banner = { text: `스테이지 ${this.stageNum} 클리어!`, sub: `보너스 +${formatNum(bonus)}`, t: 0, max: RULES.REST_SEC * 0.5 };
    this._burst(this.W / 2, this.H * 0.4, 40, ['#ffd93d', '#ff6b6b', '#4d96ff', '#6bcb77', '#9b5de5']);
    this.sound.fanfare();
    this.emit('stageClear', this.stageNum, bonus);
  }

  _switchStage() {
    this._switched = true;
    this.stageNum++; this.stageT = 0;
    this.level = this.levelFor(this.stageNum, 0);
    this.setStage(themeForStage(this.stageNum), true);
    this.banner = { text: `스테이지 ${this.stageNum}`, sub: `${this.stage.emoji} ${this.stage.name} · Lv.${this.level}`, t: 0, max: RULES.REST_SEC * 0.5 + 0.4 };
    this.emit('stageStart', this.stageNum, this.stage);
  }

  // 난이도 곡선: 레벨(스테이지 N → Lv.N~N+4)이 오를수록 빨라지고 자주 떨어지며 폭탄이 늘어남
  speedMul() { const d = this.diff; return Math.min((1 + (this.level - 1) * 0.12) * d.speed, d.speedCap); }
  spawnInterval() { return Math.max(0.38, 1.25 / (1 + (this.level - 1) * 0.14)) * this.diff.interval; }
  bombChance() {
    const d = this.diff, noBomb = RULES.NO_BOMB_FIRST_SEC * (this.difficulty === 'baby' ? 2 : 1);
    if (this.t < noBomb) return 0;
    return Math.min((0.12 + (this.level - 1) * 0.022) * d.bomb, d.bombCap);
  }

  _spawnLoop(dt, demo) {
    this.spawnIn -= dt;
    if (this.spawnIn > 0) return;
    const interval = demo ? 0.9 : this.spawnInterval();
    this.spawnIn = interval * rand(0.7, 1.3);
    this._spawn(demo);
  }

  _spawn(demo) {
    const st = this.stage; if (!st) return;
    let kind = 'char';
    if (!demo) {
      const r = Math.random();
      if (r < this.bombChance()) kind = 'bomb';
      else if (this.lives < RULES.LIVES && r < this.bombChance() + this.diff.heart) kind = 'heart';
    } else if (Math.random() < 0.15) kind = 'bomb';
    const r = (kind === 'bomb' ? 54 : kind === 'heart' ? 50 : rand(54, 64)) + (demo ? 0 : this.diff.radius);
    // 사람이 있는 쪽으로 더 자주 떨어지게 (구석에 숨어서 피하기 방지)
    let x;
    const inp = this.input;
    if (!demo && inp?.kind === 'camera' && inp.coverage > 0.01 && Math.random() < 0.55) {
      const prof = inp.colProfile; let sum = 0; for (const v of prof) sum += v;
      let pick = Math.random() * sum, i = 0;
      for (; i < prof.length - 1; i++) { pick -= prof[i]; if (pick <= 0) break; }
      x = (i + Math.random()) / prof.length * this.W;
    } else x = rand(r + 30, this.W - r - 30);
    if (Math.abs(x - this.lastSpawnX) < 110) x = (x + this.W / 2) % this.W;
    x = clamp(x, r + 20, this.W - r - 20);
    this.lastSpawnX = x;
    const sprite = kind === 'char' ? choice(st.chars) : kind;
    this.items.push({
      kind, sprite, x, y: -r - 10, r,
      vy: 165 * rand(0.85, 1.15), rot: rand(-0.3, 0.3), vr: rand(-0.8, 0.8),
      swayA: rand(10, 30), swayF: rand(1, 2.2), ph: rand(0, TAU), x0: x, age: 0,
      state: 'fall', st: 0,
    });
  }

  _moveItems(dt, collide, now = performance.now()) {
    const mul = collide ? this.speedMul() : 0.9;
    const inp = this.input;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      if (it.state !== 'fall') { it.st += dt; if (it.st > 0.28) this.items.splice(i, 1); continue; }
      it.y += it.vy * mul * dt;
      it.x = it.x0 + Math.sin(it.age * it.swayF + it.ph) * it.swayA;
      it.rot += it.vr * dt;
      if (it.y - it.r > this.H + 10) { this.items.splice(i, 1); continue; }
      if (!collide || !inp || it.y < it.r * 0.3) continue;
      const need = it.kind === 'bomb' ? 3 : 2;
      if (inp.hitTest(it.x, it.y, it.r, need)) this._hit(it, now);
    }
  }

  _hit(it, now) {
    if (it.kind === 'char') {
      this.combo = now - this.lastCatchAt <= RULES.COMBO_WINDOW_MS ? this.combo + 1 : 1;
      this.lastCatchAt = now;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const pts = RULES.CATCH_BASE + Math.min(this.combo - 1, RULES.COMBO_MAX_STEPS);
      this.catches++; this.catchPoints += pts;
      it.state = 'caught'; it.st = 0;
      this._burst(it.x, it.y, 14, ['#ffd93d', '#ffffff', '#ff8fab', '#7ae7c7']);
      this.texts.push({ x: it.x, y: it.y - it.r, text: `+${pts}`, life: 0, max: 0.9, size: 44, color: '#fff' });
      if (this.combo >= 3) this.texts.push({ x: it.x, y: it.y - it.r - 46, text: `콤보 ${this.combo}!`, life: 0, max: 0.9, size: 30, color: '#ffd93d' });
      this.sound.catch(this.combo);
    } else if (it.kind === 'heart') {
      it.state = 'caught'; it.st = 0;
      if (this.lives < RULES.LIVES) this.lives++;
      this._burst(it.x, it.y, 16, ['#ff4d6d', '#ffb3c6', '#ffffff']);
      this.texts.push({ x: it.x, y: it.y - it.r, text: '생명 +1', life: 0, max: 1, size: 40, color: '#ff8fab' });
      this.sound.heart();
    } else {
      it.state = 'boom'; it.st = 0;
      this.booms.push({ x: it.x, y: it.y, t: 0 });
      this._smoke(it.x, it.y);
      this.shake = 0.35; this.combo = 0;
      this.sound.boom();
      if (now - this.lastBombAt > RULES.BOMB_GRACE_MS) {
        this.lastBombAt = now;
        this.lives--;
        this.emit('lifeLost', this.lives);
        if (this.lives <= 0) this._gameOver();
      }
    }
  }

  _gameOver() {
    this.state = 'over';
    this.retryProg = 0;
    const res = {
      score: this.score, catches: this.catches, catchPoints: this.catchPoints,
      survivalMs: Math.floor(this.t * 1000 + 1e-6), bestCombo: this.bestCombo, input: this.input?.kind || 'touch',
      difficulty: this.difficulty, reachedStage: this.stageNum, cleared: this.cleared, clearBonus: this.clearBonus,
      themeKey: this.stage.key,
    };
    this.sound.over();
    setTimeout(() => this.emit('gameOver', res), 1100);
    this.emit('state', 'over');
  }

  lobbyBubble() { return { x: this.W / 2, y: 230, r: 92 }; }

  // ── 연출 ──
  _burst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(160, 420);
      this.parts.push({ type: Math.random() < 0.5 ? 'star' : 'dot', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0, max: rand(0.5, 0.8), size: rand(8, 16), color: choice(colors), rot: rand(0, TAU), vr: rand(-6, 6), g: 500 });
    }
  }
  _smoke(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = rand(0, TAU), s = rand(40, 140);
      this.parts.push({ type: 'smoke', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: rand(0.6, 1.0), size: rand(22, 40), color: '#6b6b80', g: -40 });
    }
  }
  _updateFx(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i]; p.life += dt;
      if (p.life > p.max) { this.parts.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life += dt; t.y -= 70 * dt; if (t.life > t.max) this.texts.splice(i, 1); }
    for (let i = this.booms.length - 1; i >= 0; i--) { const b = this.booms[i]; b.t += dt; if (b.t > 0.55) this.booms.splice(i, 1); }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
  }

  _updateAmbient(dt) {
    const type = this.stage?.ambient; if (!type || type === 'none') return;
    const A = this.ambient, W = this.W, H = this.H;
    const target = type === 'twinkle' ? 26 : type === 'sparkle' ? 14 : 30;
    while (A.length < target) {
      const p = { x: rand(0, W), y: rand(0, H), s: rand(4, 10), ph: rand(0, TAU), v: rand(20, 60), c: choice(['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b5de5', '#ffffff']) };
      if (type === 'bubbles') { p.y = H + rand(0, H); p.v = rand(40, 90); }
      if (type === 'snow' || type === 'leaves' || type === 'petals' || type === 'confetti') { p.y = rand(-H, 0); }
      if (type === 'twinkle') { p.y = rand(0, H * 0.55); }
      A.push(p);
    }
    for (const p of A) {
      p.ph += dt * 2;
      if (type === 'bubbles') { p.y -= p.v * dt; p.x += Math.sin(p.ph) * 0.4; if (p.y < -20) { p.y = H + 20; p.x = rand(0, W); } }
      else if (type === 'snow' || type === 'leaves' || type === 'petals' || type === 'confetti') { p.y += p.v * dt; p.x += Math.sin(p.ph) * 0.6; if (p.y > H + 20) { p.y = -20; p.x = rand(0, W); } }
    }
  }

  // ── 그리기 ──
  render(now) {
    const c = this.ctx, W = this.W, H = this.H;
    c.save();
    if (this.shake > 0) c.translate(rand(-1, 1) * this.shake * 26, rand(-1, 1) * this.shake * 26);
    if (this.prevBg && this.fade < 1) { c.drawImage(this.prevBg, 0, 0, W, H); c.globalAlpha = this.fade; }
    if (this.bg) c.drawImage(this.bg, 0, 0, W, H); else { c.fillStyle = '#1b1640'; c.fillRect(0, 0, W, H); }
    c.globalAlpha = 1;
    this._drawAmbient(c, now);

    const inp = this.input;
    const showPerson = this.state !== 'title' && inp?.kind === 'camera' && inp.hasFrame;
    if (showPerson) c.drawImage(inp.person, 0, 0, W, H);
    if (showPerson && inp.poseOk) this._drawHands(c, now);

    for (const it of this.items) this._drawItem(c, it, now);
    this._drawFx(c);
    if (inp?.kind === 'touch' && this.state !== 'title') this._drawTouch(c, now);
    c.restore();

    if (this.state === 'lobby') this._drawLobby(c, now);
    else if (this.state === 'countdown') this._drawCountdown(c);
    if (this.state === 'play' || this.state === 'paused' || this.state === 'countdown' || this.state === 'over') this._drawHud(c, now);
    if (this.state === 'play' && this.absent) this._drawAbsent(c);
    if (this.banner) this._drawBanner(c);
    if (this.debug && inp?.kind === 'camera') {
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(W / 2 - 230, 100, 460, 26);
      c.fillStyle = '#fff'; c.font = `600 16px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(`cam ${inp.fps.toFixed(0)}fps · 분리 ${inp.segMs.toFixed(0)}ms · 자세 ${inp.poseMs.toFixed(0)}ms · ${inp.delegate} · ${inp.people}명 손${inp.hands.length}`, W / 2, 113);
    }
  }

  _drawItem(c, it, now) {
    const spr = getSprite(it.sprite);
    let d = spriteDrawSize(it.r), alpha = 1;
    if (it.state === 'caught') { const k = it.st / 0.28; d *= 1 + k * 0.6; alpha = 1 - k; }
    if (it.state === 'boom') return;
    c.save(); c.globalAlpha = alpha; c.translate(it.x, it.y); c.rotate(it.rot);
    if (it.kind === 'bomb') {
      const pulse = 0.5 + 0.5 * Math.sin(now / 90);
      c.fillStyle = `rgba(255,70,70,${0.18 + pulse * 0.18})`; c.beginPath(); c.arc(0, 0, it.r * 1.15, 0, TAU); c.fill();
    }
    c.drawImage(spr, -d / 2, -d / 2, d, d);
    if (it.kind === 'bomb') {
      const k = it.r / 60, sx = (BOMB_SPARK.x - 80) * k, sy = (BOMB_SPARK.y - 80) * k;
      c.translate(sx, sy); c.rotate(now / 80);
      const s = 12 + 5 * Math.sin(now / 50);
      c.fillStyle = '#ffd93d'; this._star(c, 0, 0, s * 1.4, s * 0.5, 8); c.fill();
      c.fillStyle = '#ff6b3d'; this._star(c, 0, 0, s * 0.8, s * 0.35, 8); c.fill();
    }
    c.restore();
  }

  _star(c, x, y, R, r, n = 5) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath();
  }

  _drawFx(c) {
    for (const p of this.parts) {
      const k = 1 - p.life / p.max;
      c.globalAlpha = p.type === 'smoke' ? k * 0.55 : k;
      c.fillStyle = p.color;
      if (p.type === 'star') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); this._star(c, 0, 0, p.size, p.size * 0.45); c.fill(); c.restore(); }
      else { c.beginPath(); c.arc(p.x, p.y, p.type === 'smoke' ? p.size * (1.4 - k * 0.4) : p.size * 0.5, 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    for (const b of this.booms) {
      const k = b.t / 0.55, s = easeOutBack(Math.min(1, k * 2.2));
      c.save(); c.translate(b.x, b.y); c.scale(s, s); c.globalAlpha = 1 - Math.max(0, (k - 0.6) / 0.4);
      c.fillStyle = '#ffd93d'; this._star(c, 0, 0, 110, 62, 11); c.fill();
      c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
      c.fillStyle = '#ff6b3d'; this._star(c, 0, 0, 70, 40, 9); c.fill();
      c.fillStyle = '#fff'; c.font = `900 52px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 8; c.strokeStyle = INK; c.strokeText('펑!', 0, 2); c.fillText('펑!', 0, 2);
      c.restore();
    }
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const t of this.texts) {
      c.globalAlpha = 1 - Math.max(0, (t.life / t.max - 0.6) / 0.4);
      c.font = `900 ${t.size}px ${FONT}`; c.lineWidth = 8; c.strokeStyle = INK; c.lineJoin = 'round';
      c.strokeText(t.text, t.x, t.y); c.fillStyle = t.color; c.fillText(t.text, t.x, t.y);
    }
    c.globalAlpha = 1;
  }

  _drawAmbient(c, now) {
    const type = this.stage?.ambient; if (!type || type === 'none') return;
    for (const p of this.ambient) {
      if (type === 'bubbles') { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, p.s, 0, TAU); c.stroke(); }
      else if (type === 'snow') { c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(p.x, p.y, p.s * 0.6, 0, TAU); c.fill(); }
      else if (type === 'twinkle' || type === 'sparkle') {
        const a = 0.5 + 0.5 * Math.sin(p.ph * 1.6); c.globalAlpha = a * (type === 'sparkle' ? 0.8 : 1);
        c.fillStyle = type === 'sparkle' ? '#fffbe0' : '#fff'; this._star(c, p.x, p.y, p.s * 0.9, p.s * 0.25, 4); c.fill(); c.globalAlpha = 1;
      } else if (type === 'leaves' || type === 'petals') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.ph); c.fillStyle = type === 'leaves' ? 'rgba(90,170,80,0.8)' : 'rgba(255,170,190,0.85)';
        c.beginPath(); c.ellipse(0, 0, p.s, p.s * 0.5, 0, 0, TAU); c.fill(); c.restore();
      } else if (type === 'confetti') {
        c.save(); c.translate(p.x, p.y); c.rotate(p.ph); c.fillStyle = p.c; c.globalAlpha = 0.85; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore();
      }
    }
  }

  // 인식된 손 표시: 아이들이 '내 손'이 어디인지 보이게 (잡기는 손으로만)
  _drawHands(c, now) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    for (const h of this.input.hands) {
      c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.arc(h.x, h.y, h.r, 0, TAU); c.fill();
      c.lineWidth = 4 + pulse * 2; c.strokeStyle = 'rgba(255,217,61,0.9)'; c.stroke();
      c.save(); c.translate(h.x, h.y); c.rotate(now / 600);
      c.fillStyle = '#ffd93d'; this._star(c, 0, 0, 14, 6); c.fill();
      c.restore();
    }
  }

  _drawTouch(c, now) {
    for (const p of this.input.active) {
      if (!p.up && now - p.t > 1500) continue;
      const R = this.input.R;
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(p.x, p.y, R, 0, TAU); c.fill();
      c.lineWidth = 5; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.stroke();
      c.fillStyle = '#ffd93d'; this._star(c, p.x, p.y, 18, 8); c.fill();
    }
  }

  _panel(c, x, y, w, h, r = 22, fill = 'rgba(255,255,255,0.92)') {
    c.fillStyle = 'rgba(30,20,60,0.35)'; c.beginPath(); c.roundRect(x, y + 5, w, h, r); c.fill();
    c.fillStyle = fill; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill();
    c.lineWidth = 4; c.strokeStyle = INK; c.stroke();
  }

  _text(c, s, x, y, size, color = INK, align = 'center', weight = 900, outline = null) {
    c.font = `${weight} ${size}px ${FONT}`; c.textAlign = align; c.textBaseline = 'middle';
    if (outline) { c.lineJoin = 'round'; c.lineWidth = Math.max(4, size / 7); c.strokeStyle = outline; c.strokeText(s, x, y); }
    c.fillStyle = color; c.fillText(s, x, y);
  }

  _drawHud(c, now) {
    const W = this.W;
    // 점수
    this._panel(c, 20, 18, 270, 92);
    this._text(c, '점수', 44, 46, 22, '#7a6b8f', 'left', 800);
    this._text(c, formatNum(this.score), 44, 82, 44, INK, 'left');
    if (this.combo >= 2 && this.state === 'play') this._text(c, `콤보 x${this.combo}`, 276, 46, 22, '#ff6b6b', 'right', 900);
    // 생명
    const hw = 64 * RULES.LIVES + 30;
    this._panel(c, W - hw - 20, 18, hw, 72);
    for (let i = 0; i < RULES.LIVES; i++) {
      const x = W - hw - 20 + 46 + i * 64, y = 54, on = i < this.lives;
      const s = on && i === this.lives - 1 && this.lives <= 2 ? 1 + 0.08 * Math.sin(now / 120) : 1;
      this._heart(c, x, y, 24 * s, on ? '#ff4d6d' : 'rgba(120,110,140,0.35)');
    }
    // 스테이지·남은 시간·레벨
    const cx = W / 2, pw = 380;
    this._panel(c, cx - pw / 2, 18, pw, 84);
    const baby = this.difficulty === 'baby' ? '🍼 ' : '';
    this._text(c, `${baby}${this.stage?.emoji || ''} 스테이지 ${this.stageNum}`, cx, 44, 28);
    const remainSec = Math.max(0, Math.ceil(RULES.STAGE_SEC - this.stageT));
    this._text(c, `남은 ${remainSec}초 · Lv.${this.level}`, cx, 74, 20, remainSec <= 10 && this.rest <= 0 ? '#e8505a' : '#7a6b8f', 'center', 800);
    const k = clamp(this.stageT / RULES.STAGE_SEC, 0, 1);
    c.fillStyle = '#ece4f7'; c.beginPath(); c.roundRect(cx - pw / 2 + 18, 88, pw - 36, 6, 3); c.fill();
    c.fillStyle = k > 0.8 ? '#ff6b6b' : '#3ecfb2'; c.beginPath(); c.roundRect(cx - pw / 2 + 18, 88, (pw - 36) * k, 6, 3); c.fill();
  }

  _heart(c, x, y, s, color) {
    c.save(); c.translate(x, y); c.scale(s / 24, s / 24);
    c.beginPath(); c.moveTo(0, 20); c.bezierCurveTo(-30, 0, -22, -24, 0, -10); c.bezierCurveTo(22, -24, 30, 0, 0, 20); c.closePath();
    c.fillStyle = color; c.fill(); c.lineWidth = 3.5; c.strokeStyle = INK; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.ellipse(-9, -8, 4, 6, -0.6, 0, TAU); c.fill();
    c.restore();
  }

  _drawLobby(c, now) {
    const W = this.W, H = this.H, st = this.stage, inp = this.input;
    this._panel(c, W / 2 - 280, 24, 560, 84, 42);
    this._text(c, `${this.difficulty === 'baby' ? '🍼 ' : ''}${st.emoji} 스테이지 1 · ${st.name}`, W / 2, 66, 36);
    const B = this.lobbyBubble();
    const bob = Math.sin(now / 400) * 8;
    c.save(); c.translate(B.x, B.y + bob);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(0, 0, B.r + 14, 0, TAU); c.fill();
    const g = c.createRadialGradient(-30, -30, 10, 0, 0, B.r);
    g.addColorStop(0, '#fff7c2'); g.addColorStop(1, '#ffc93c');
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, B.r, 0, TAU); c.fill();
    c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
    if (this.startProg > 0) {
      c.lineWidth = 16; c.strokeStyle = '#ff6b6b'; c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, B.r + 2, -Math.PI / 2, -Math.PI / 2 + TAU * this.startProg); c.stroke();
    }
    this._text(c, inp?.kind === 'camera' ? '손으로' : '눌러서', 0, -18, 30);
    this._text(c, '시작!', 0, 22, 44, '#ff4d6d');
    c.restore();
    let msg;
    if (inp?.kind === 'camera') {
      if (!inp.present) msg = '카메라에 몸이 다 보이게 2~3걸음 뒤로 서 주세요';
      else if (inp.poseOk && !inp.hands.length) msg = `${inp.people}명 인식! 손이 보이게 팔을 들어 주세요`;
      else msg = inp.poseOk ? `${inp.people}명 인식! 손을 들어 노란 풍선을 터치하면 시작` : '준비 완료! 노란 풍선을 손으로 터치하면 시작해요';
    }
    else msg = '풍선을 눌러서 시작! (터치 모드)';
    const tw = Math.min(W - 80, msg.length * 30 + 80);
    this._panel(c, W / 2 - tw / 2, H - 104, tw, 72, 36, 'rgba(255,255,255,0.94)');
    this._text(c, msg, W / 2, H - 68, 30);
  }

  _drawCountdown(c) {
    const n = Math.ceil(this.countT), f = this.countT - Math.floor(this.countT);
    const s = 1 + (1 - f) * 0.15 + easeOutBack(Math.min(1, (1 - f) * 3)) * 0.2;
    c.save(); c.translate(this.W / 2, this.H / 2); c.scale(s, s);
    this._text(c, String(n), 0, 0, 220, '#ffd93d', 'center', 900, INK);
    c.restore();
    this._text(c, '준비~', this.W / 2, this.H / 2 + 150, 46, '#fff', 'center', 900, INK);
  }

  _drawBanner(c) {
    const b = this.banner, k = b.t / b.max;
    const s = easeOutBack(Math.min(1, k * 4)), a = 1 - Math.max(0, (k - 0.7) / 0.3);
    c.save(); c.globalAlpha = a; c.translate(this.W / 2, this.H * 0.4); c.scale(s, s);
    this._text(c, b.text, 0, 0, 88, '#ffd93d', 'center', 900, INK);
    if (b.sub) this._text(c, b.sub, 0, 82, 44, '#ffffff', 'center', 900, INK);
    c.restore();
  }

  _drawAbsent(c) {
    c.fillStyle = 'rgba(20,10,50,0.45)'; c.fillRect(0, 0, this.W, this.H);
    this._panel(c, this.W / 2 - 340, this.H / 2 - 80, 680, 160, 40);
    this._text(c, '사람이 안 보여요!', this.W / 2, this.H / 2 - 28, 48, '#ff4d6d');
    this._text(c, '화면 안으로 들어오면 이어서 해요', this.W / 2, this.H / 2 + 32, 32);
  }
}
