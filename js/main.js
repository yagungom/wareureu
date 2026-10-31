// 와르르 캐치! — 화면 흐름 담당
import { CONFIG, DIFFICULTY } from './config.js';
import { $, $$, el, store, formatNum, choice } from './util.js';
import { STAGES, themeForStage, preloadStageImage } from './stages.js';
import { Engine } from './game.js';
import { Sound } from './audio.js';
import { CameraVision, TouchInput } from './vision.js';
import { validateName } from './nickname.js';
import { online, errorText } from './api.js';
import { addLocal, localBoard, normalizeOnline, clearLocal } from './ranking.js';
import { renderBoard } from './chart.js';
import { tryLoadCustomSprites, ALL_IDS } from './sprites.js';
import * as fs from './fullscreen.js';

const params = new URLSearchParams(location.search);
const canvas = $('#game');
const sound = new Sound();
const engine = new Engine(canvas, sound);

// ── 설정 ──
const DEFAULTS = { play: 'camera', facing: 'environment', difficulty: 'normal', mirror: true, sfx: true, bgm: true, quality: 'high', cameraId: '', debug: false };
const settings = { ...DEFAULTS, ...store.get('wc.settings.v1', {}) };
if (settings.mode) { settings.facing = settings.mode === 'phone' ? 'user' : 'environment'; delete settings.mode; } // 예전 설정 이전
const saveSettings = () => store.set('wc.settings.v1', settings);
const applySettings = () => {
  sound.sfxOn = settings.sfx; sound.bgmOn = settings.bgm;
  engine.debug = settings.debug || params.has('debug');
  if (vision) vision.mirror = settings.mirror;
};

let vision = null;          // CameraVision (재사용)
let touch = null;           // TouchInput
let team = '';
let currentStage = null;
let sessionPromise = null;
let lastResult = null;
let loadCancelled = false;
let wakeLock = null;

// ── 화면 전환 ──
function show(name) {
  $$('.screen').forEach((s) => s.classList.toggle('on', s.id === `scr-${name}`));
  document.body.dataset.screen = name;
}

// 지금 보이는 테마의 배경 이미지를 불러와 적용 / 다음 테마는 미리 받아두기
async function prepareStage(st) {
  if (!CONFIG.CUSTOM_BACKGROUNDS) return;
  const ok = await Promise.race([preloadStageImage(st), new Promise((r) => setTimeout(() => r(false), 1500))]);
  if (ok && engine.stage === st) engine.refreshBackground();
}
function preloadTheme(st) { if (CONFIG.CUSTOM_BACKGROUNDS) preloadStageImage(st); }

// ── 타이틀 ──
const teamInput = $('#team');
const teamErr = $('#team-err');
const recent = () => store.get('wc.teams.v1', []).filter((t) => typeof t === 'string' && validateName(t).ok).slice(0, 6);

function renderRecent() {
  const box = $('#recent'); box.replaceChildren();
  for (const t of recent()) {
    box.append(el('button', { type: 'button', class: `chip${t === teamInput.value ? ' on' : ''}`, text: t, onclick: () => { teamInput.value = t; teamErr.textContent = ''; renderRecent(); } }));
  }
}
function saveRecent(t) { store.set('wc.teams.v1', [t, ...recent().filter((x) => x !== t)].slice(0, 6)); }

function renderMode() {
  $$('.seg-btn[data-play]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.play === settings.play)));
  $('#facing-row').hidden = settings.play !== 'camera';
  $$('.seg-btn[data-facing]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.facing === settings.facing)));
  $$('.seg-btn[data-diff]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.diff === settings.difficulty)));
}
$$('.seg-btn[data-play]').forEach((b) => b.addEventListener('click', () => { settings.play = b.dataset.play; saveSettings(); renderMode(); }));
$$('.seg-btn[data-facing]').forEach((b) => b.addEventListener('click', () => { settings.facing = b.dataset.facing; settings.cameraId = ''; saveSettings(); renderMode(); }));
$$('.seg-btn[data-diff]').forEach((b) => b.addEventListener('click', () => { settings.difficulty = b.dataset.diff; saveSettings(); renderMode(); }));

teamInput.addEventListener('input', () => { teamErr.textContent = ''; renderRecent(); });

function goTitle() {
  if (vision) vision.stopCamera(); // 카메라는 쓰지 않을 때 바로 끔
  engine.setInput(null); touch = null; engine.retryTarget = null;
  sound.stopBgm();
  releaseWake();
  const st = choice(STAGES); currentStage = st;
  engine.showTitle(st);
  prepareStage(st);
  teamInput.value = teamInput.value || recent()[0] || '';
  renderRecent(); renderMode();
  show('title');
}

$('#start-form').addEventListener('submit', (e) => { e.preventDefault(); startCameraGame(); });

// ── 전체화면 (OS·브라우저별 처리는 fullscreen.js) ──
const NS = 'http://www.w3.org/2000/svg';
function fsIcon(exit) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', exit ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5');
  p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '2.6');
  p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  svg.append(p); return svg;
}
function renderFsButtons() {
  const on = fs.isFullscreen();
  const hide = fs.isStandalone() && !on && (!fs.supported() || fs.platform.iOS); // 홈 화면 앱으로 이미 꽉 찬 상태
  const key = fs.keyHint();
  const label = on ? '창 모드' : '전체화면';
  for (const b of $$('[data-fs]')) {
    b.hidden = hide;
    b.replaceChildren(fsIcon(on));
    if (b.classList.contains('fs-title')) b.append(el('span', { class: 'fs-label', text: label }));
    b.title = key ? `${label} (${key})` : label;
    b.setAttribute('aria-label', label);
  }
}
function openFsGuide() {
  if (engine.state === 'play') { engine.pause(); sound.stopBgm(); }
  const g = fs.guide();
  fsGuideBack = engine.state === 'paused' ? 'pause' : (document.body.dataset.screen || 'title');
  $('#fsguide-title').textContent = g.title;
  $('#fsguide-note').textContent = g.note;
  $('#fsguide-steps').replaceChildren(...g.steps.map((t) => el('li', { text: t })));
  show('fsguide');
}
let fsGuideBack = 'title';
$('#fsguide-close').addEventListener('click', () => show(fsGuideBack));
// 시도해 보고 실제로 전체화면이 안 되면(아이폰 등) 안내를 띄움
$$('[data-fs]').forEach((b) => b.addEventListener('click', async () => {
  sound.unlock();
  if (fs.isFullscreen()) { await fs.exit(); return; }
  const ok = await fs.enter();
  if (!ok || !fs.isFullscreen()) {
    await new Promise((r) => setTimeout(r, 300));
    if (!fs.isFullscreen()) openFsGuide();
  }
}));
fs.onChange(renderFsButtons);
window.addEventListener('keydown', (e) => {
  if (e.key !== 'f' && e.key !== 'F') return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.ctrlKey || e.metaKey || e.altKey) return;
  if (fs.supported()) fs.toggle();
});
async function enterFullscreen() { if (fs.supported() && !fs.isFullscreen()) await fs.enter(); }
async function requestWake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener?.('release', () => { wakeLock = null; }); } } catch { /* noop */ }
}
function releaseWake() { try { wakeLock?.release(); } catch { /* noop */ } wakeLock = null; }

function readTeam() {
  const v = validateName(teamInput.value.trim() || '우리 가족');
  if (!v.ok) { teamErr.textContent = v.reason; teamInput.focus(); return null; }
  return v.name;
}

async function startCameraGame() {
  const t = readTeam(); if (!t) return;
  team = t; saveRecent(team);
  sound.unlock();
  enterFullscreen();
  requestWake();
  if (settings.play === 'touch' || params.has('touch') || CONFIG.FORCE_TOUCH) return startTouchGame();
  loadCancelled = false;
  show('loading'); $('#loading-text').textContent = '카메라 켜는 중… (권한을 허용해 주세요)';
  try {
    if (!vision) vision = new CameraVision({ quality: settings.quality, mirror: settings.mirror });
    vision.mirror = settings.mirror;
    try { await vision.startCamera({ deviceId: settings.cameraId || null, facing: settings.facing }); }
    catch (e) {
      if (!settings.cameraId || e?.name === 'NotAllowedError') throw e;
      settings.cameraId = ''; saveSettings(); // 저장된 카메라가 없어졌으면 앞/뒤 기준으로 다시
      await vision.startCamera({ facing: settings.facing });
    }
    if (loadCancelled) { vision.stopCamera(); return; }
    await vision.init((msg) => { $('#loading-text').textContent = msg; });
    if (loadCancelled) { vision.stopCamera(); return; }
    engine.setInput(vision);
    await enterLobby();
  } catch (e) {
    console.warn(e);
    if (vision) vision.stopCamera();
    showCamError(e);
  }
}

function startTouchGame() {
  if (vision) vision.stopCamera();
  touch = new TouchInput(canvas);
  engine.setInput(touch);
  sound.unlock();
  enterLobby();
}

function showCamError(e) {
  const name = e?.name || '';
  let title = '카메라를 켤 수 없어요', text = '';
  if (name === 'NotAllowedError' || name === 'SecurityError') { title = '카메라 권한이 필요해요'; text = '주소창 옆 자물쇠 → 권한 → 카메라 허용 후 다시 시도해 주세요. 영상은 이 기기 밖으로 나가지 않아요.'; }
  else if (name === 'NotFoundError' || name === 'OverconstrainedError') { text = '카메라를 찾지 못했어요. 설정에서 카메라를 "자동"으로 바꿔 보세요.'; settings.cameraId = ''; saveSettings(); }
  else if (name === 'NotReadableError') text = '다른 앱이 카메라를 쓰고 있어요. 그 앱을 닫고 다시 시도해 주세요.';
  else if (!window.isSecureContext) text = '카메라는 https 주소에서만 켜져요.';
  else text = '사람 인식 엔진을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
  $('#camerr-title').textContent = title; $('#camerr-text').textContent = text;
  show('camerr');
}

$('#btn-cancel-load').addEventListener('click', () => { loadCancelled = true; goTitle(); });
$('#btn-cam-retry').addEventListener('click', () => startCameraGame());
$('#btn-touch').addEventListener('click', () => startTouchGame());
$('#btn-cam-home').addEventListener('click', () => goTitle());

// ── 대기실 ──
async function enterLobby() {
  engine.setDifficulty(settings.difficulty);
  engine.enterLobby();
  currentStage = engine.stage;
  show('lobby');
  sound.stopBgm();
  prepareStage(currentStage);
  preloadTheme(themeForStage(2));
}
$('#btn-go').addEventListener('click', () => { sound.unlock(); toggleCamPicker(false); engine.startCountdown(); });
$('#btn-lobby-home').addEventListener('click', () => goTitle());
// ── 카메라 고르기 (전면·후면·광각 등 모든 카메라) ──
const FRONT_RE = /front|user|전면|facetime/i, BACK_RE = /back|rear|environment|후면/i;
function camName(c, i, all) {
  const l = c.label || '';
  for (const [re, name] of [[FRONT_RE, '🤳 전면'], [BACK_RE, '📷 후면']]) {
    if (re.test(l)) { const same = all.filter((x) => re.test(x.label || '')); return same.length > 1 ? `${name} ${same.indexOf(c) + 1}` : name; }
  }
  return l ? l.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)\s*$/i, '') : `카메라 ${i + 1}`;
}
async function renderCamPicker() {
  const list = $('#cam-list');
  const cams = (await CameraVision.listCameras()).filter((c) => c.deviceId);
  list.replaceChildren();
  if (!cams.length) { list.append(el('div', { class: 'cam-tip', text: '카메라 목록을 가져오지 못했어요' })); return; }
  cams.forEach((c, i) => {
    const on = c.deviceId === vision?.deviceId;
    list.append(el('button', {
      type: 'button', class: `cam-item${on ? ' on' : ''}`,
      onclick: () => switchCamera(c),
    }, el('span', { text: `${on ? '✔ ' : ''}${camName(c, i, cams)}` }), camName(c, i, cams) !== c.label ? el('small', { text: c.label || '' }) : null));
  });
}
async function switchCamera(c) {
  if (!vision || engine.input !== vision) return;
  try {
    await vision.startCamera({ deviceId: c.deviceId });
    settings.cameraId = c.deviceId;
    if (vision.facing === 'user' || FRONT_RE.test(c.label)) settings.facing = 'user';
    else if (vision.facing === 'environment' || BACK_RE.test(c.label)) settings.facing = 'environment';
    saveSettings();
  } catch (e) {
    console.warn(e);
    try { await vision.startCamera({ facing: settings.facing }); } catch { showCamError(e); return; }
  }
  renderCamPicker();
}
function toggleCamPicker(open) {
  const pk = $('#cam-picker'), btn = $('#btn-cam-switch');
  const show = open ?? pk.hidden;
  pk.hidden = !show; btn.setAttribute('aria-expanded', String(show));
  if (show) renderCamPicker();
}
$('#btn-cam-switch').addEventListener('click', () => toggleCamPicker());

// ── 게임 진행 ──
const tempoFor = (lv) => 104 + Math.min(lv, 14) * 5;
engine.on('countdown', () => {
  toggleCamPicker(false);
  show('play');
  sessionPromise = null;
  if (online.enabled && engine.input?.kind === 'camera') {
    sessionPromise = online.startSession(engine.difficulty, team).then((id) => ({ id }), (err) => ({ err }));
  }
});
engine.on('stageStart', (n, theme) => {
  currentStage = theme;
  prepareStage(theme);
  preloadTheme(themeForStage(n + 1));
  sound.startBgm(theme.key2, tempoFor(engine.level));
});
engine.on('stageClear', () => sound.stopBgm());
engine.on('level', (lv) => sound.setTempo(tempoFor(lv)));
engine.on('gameOver', (res) => { sound.stopBgm(); showResult(res); });
engine.on('retry', () => retry());
const bubble = $('#retry-bubble');
engine.on('retryProgress', (p) => bubble.style.setProperty('--p', String(p)));

$('#btn-pause').addEventListener('click', () => { engine.pause(); sound.stopBgm(); show('pause'); });
$('#btn-resume').addEventListener('click', () => { engine.resume(); sound.startBgm(engine.stage.key2, tempoFor(engine.level)); show('play'); });
$('#btn-quit').addEventListener('click', () => { sound.stopBgm(); goTitle(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (engine.state === 'play') { engine.pause(); sound.stopBgm(); show('pause'); } }
  else if (engine.input) requestWake();
});

// ── 결과 ──
const resState = { period: 'day', scope: 'local' };
const diffLabel = (d) => (d === 'baby' ? '🍼 아기 모드' : '🙂 일반');

async function showResult(res) {
  lastResult = { ...res, team };
  addLocal({ team, mode: res.difficulty, score: res.score, catches: res.catches, catchPoints: res.catchPoints, survivalMs: res.survivalMs, reachedStage: res.reachedStage, input: res.input });
  const st = themeForStage(res.reachedStage);
  $('#res-team').textContent = team;
  $('#res-stage').textContent = `${st.emoji} 스테이지 ${res.reachedStage}까지 · ${diffLabel(res.difficulty)}`;
  $('#res-score').textContent = formatNum(res.score);
  $('#res-catch').textContent = `${res.catches}마리 (+${formatNum(res.catchPoints)})`;
  $('#res-time').textContent = `${Math.floor(res.survivalMs / 1000)}초 (+${formatNum(Math.floor(res.survivalMs / 1000) * 3)})`;
  $('#res-bonus').textContent = res.cleared ? `${res.cleared}개 (+${formatNum(res.clearBonus)})` : '-';
  $('#res-combo').textContent = res.bestCombo >= 2 ? `${res.bestCombo}연속` : '-';
  const note = $('#res-online'); note.className = 'res-online'; note.textContent = '';
  resState.scope = online.enabled && res.input === 'camera' ? 'online' : 'local';
  resState.period = 'day';
  show('result');
  sound.fanfare();
  setupRetryBubble(res.input);

  if (res.input !== 'camera') note.textContent = '📱 폰 모드 기록은 이 기기에만 저장돼요 (폰 모드 랭킹에 표시)';
  else if (!online.enabled) note.textContent = '💾 이 기기에 저장했어요 (온라인 랭킹은 설정 후 켜져요)';
  else {
    note.textContent = '🌐 온라인 랭킹에 등록하는 중…';
    try {
      const s = await sessionPromise;
      if (!s || s.err) throw s?.err || new Error('offline');
      const r = await online.submit(s.id, res);
      if (r?.ok) { note.textContent = `🎉 온라인 등록 완료! 오늘 ${formatNum(r.day_total)}팀 중 ${formatNum(r.day_rank)}등`; note.classList.add('good'); }
      else note.textContent = `💾 이 기기에만 저장했어요 · ${errorText(r?.reason)}`;
    } catch (e) {
      note.textContent = `💾 이 기기에만 저장했어요 · ${errorText(e?.code || e?.message)}`;
    }
  }
  renderResultBoard();
}

function setupRetryBubble(mode) {
  bubble.classList.toggle('touch-mode', mode !== 'camera');
  $('#scr-result').classList.toggle('cam', mode === 'camera');
  bubble.style.setProperty('--p', '0');
  engine.retryTarget = null;
  if (mode !== 'camera') return;
  requestAnimationFrame(() => {
    const cr = canvas.getBoundingClientRect(), br = bubble.getBoundingClientRect();
    const k = CONFIG.W / cr.width;
    engine.retryTarget = { x: (br.left + br.width / 2 - cr.left) * k, y: (br.top + br.height / 2 - cr.top) * k, r: br.width / 2 * k };
  });
}
bubble.addEventListener('click', () => retry());

function renderResultBoard() {
  const r = lastResult; if (!r) return;
  makeTabs($('#res-period'), PERIODS, resState.period, (v) => { resState.period = v; renderResultBoard(); });
  makeTabs($('#res-scope'), scopes(r.input), resState.scope, (v) => { resState.scope = v; renderResultBoard(); });
  loadBoard($('#res-board'), { scope: resState.scope, mode: r.difficulty, input: r.input, period: resState.period, myScore: r.score, myTeam: r.team });
}

function retry() {
  engine.retryTarget = null;
  if (engine.input) enterLobby(); else goTitle();
}
$('#btn-retry').addEventListener('click', () => retry());
$('#btn-home').addEventListener('click', () => goTitle());

// ── 랭킹 ──
const PERIODS = [{ value: 'day', label: '오늘' }, { value: 'week', label: '이번 주' }, { value: 'month', label: '이번 달' }];
// 온라인 랭킹은 카메라 모드만 (폰 모드는 이 기기 기록만)
const scopes = (input = 'camera') => [
  { value: 'online', label: input === 'touch' ? '🌐 전체 (카메라 모드만)' : online.enabled ? '🌐 전체' : '🌐 전체 (준비 중)', disabled: input === 'touch' || !online.enabled },
  { value: 'local', label: '🏠 우리 기기' },
];
const INPUTS = [{ value: 'camera', label: '📺 카메라' }, { value: 'touch', label: '📱 폰' }];

function makeTabs(box, items, current, onChange) {
  box.replaceChildren();
  box.setAttribute('role', 'tablist');
  for (const it of items) {
    box.append(el('button', {
      type: 'button', class: 'tab', role: 'tab', 'aria-selected': String(it.value === current), disabled: it.disabled || null, text: it.label,
      onclick: () => { if (!it.disabled && it.value !== current) onChange(it.value); },
    }));
  }
}

let boardToken = 0;
async function loadBoard(box, { scope, mode, input = 'camera', period, myScore = null, myTeam = null }) {
  const token = ++boardToken;
  box.replaceChildren(el('div', { class: 'board-note', text: '불러오는 중…' }));
  let board;
  if (scope === 'online') {
    try { board = normalizeOnline(await online.board(mode, period, myScore)); }
    catch (e) { if (token === boardToken) box.replaceChildren(el('div', { class: 'board-note', text: errorText(e?.code || e?.message) })); return; }
  } else board = localBoard(mode, period, myScore, input);
  if (token !== boardToken) return;
  const tags = [input === 'touch' ? '폰 모드' : null, mode === 'baby' ? '아기 모드' : null].filter(Boolean);
  renderBoard(box, board, { myScore, myTeam, scopeLabel: `${scope === 'online' ? '전체' : '우리 기기'}${tags.length ? `(${tags.join('·')})` : ''}` });
}

const MODES = Object.entries(DIFFICULTY).map(([value, d]) => ({ value, label: value === 'baby' ? `🍼 ${d.label}` : `🙂 ${d.label}` }));
const rankState = { input: 'camera', mode: 'normal', period: 'day', scope: 'local', from: 'title' };
function openRanking(from) {
  rankState.from = from;
  rankState.input = lastResult?.input || settings.play;
  rankState.mode = lastResult?.difficulty || settings.difficulty;
  rankState.scope = online.enabled && rankState.input === 'camera' ? 'online' : 'local';
  show('ranking');
  renderRanking();
}
function renderRanking() {
  if (rankState.input === 'touch') rankState.scope = 'local';
  makeTabs($('#rank-input'), INPUTS, rankState.input, (v) => { rankState.input = v; if (v === 'camera' && online.enabled) rankState.scope = 'online'; renderRanking(); });
  makeTabs($('#rank-mode'), MODES, rankState.mode, (v) => { rankState.mode = v; renderRanking(); });
  makeTabs($('#rank-period'), PERIODS, rankState.period, (v) => { rankState.period = v; renderRanking(); });
  makeTabs($('#rank-scope'), scopes(rankState.input), rankState.scope, (v) => { rankState.scope = v; renderRanking(); });
  const mine = lastResult && lastResult.difficulty === rankState.mode && lastResult.input === rankState.input ? lastResult : null;
  loadBoard($('#rank-board'), { scope: rankState.scope, mode: rankState.mode, input: rankState.input, period: rankState.period, myScore: mine?.score ?? null, myTeam: mine?.team || team || null });
}
$('#btn-rank').addEventListener('click', () => openRanking('title'));
$('#rank-back').addEventListener('click', () => { if (rankState.from === 'result') show('result'); else show('title'); });

// ── 하는 법 / 설정 ──
$('#btn-help').addEventListener('click', () => show('help'));
$('#help-back').addEventListener('click', () => show('title'));

async function openSettings() {
  $('#set-mirror').checked = settings.mirror;
  $('#set-sfx').checked = settings.sfx;
  $('#set-bgm').checked = settings.bgm;
  $('#set-quality').value = settings.quality;
  $('#set-debug').checked = settings.debug;
  $('#set-online').textContent = online.enabled ? '켜짐 ✅' : '꺼짐 (config.js 설정 필요)';
  const sel = $('#set-camera');
  sel.replaceChildren(el('option', { value: '', text: settings.facing === 'user' ? '자동 (전면)' : '자동 (후면)' }));
  const cams = (await CameraVision.listCameras()).filter((c) => c.deviceId);
  if (!cams.some((c) => c.label)) sel.append(el('option', { value: '', disabled: true, text: '카메라를 한 번 켜면 목록이 보여요' }));
  else cams.forEach((c, i) => sel.append(el('option', { value: c.deviceId, text: camName(c, i, cams) })));
  sel.value = cams.some((c) => c.deviceId === settings.cameraId) ? settings.cameraId : '';
  show('settings');
}
$('#btn-settings').addEventListener('click', openSettings);
$('#settings-back').addEventListener('click', () => show('title'));
$('#set-camera').addEventListener('change', (e) => { settings.cameraId = e.target.value; saveSettings(); });
$('#set-mirror').addEventListener('change', (e) => { settings.mirror = e.target.checked; saveSettings(); applySettings(); });
$('#set-sfx').addEventListener('change', (e) => { settings.sfx = e.target.checked; saveSettings(); applySettings(); });
$('#set-bgm').addEventListener('change', (e) => { settings.bgm = e.target.checked; saveSettings(); applySettings(); });
$('#set-debug').addEventListener('change', (e) => { settings.debug = e.target.checked; saveSettings(); applySettings(); });
$('#set-quality').addEventListener('change', (e) => {
  settings.quality = e.target.value; saveSettings();
  if (vision) { vision.stopCamera(); vision.setQuality(settings.quality); }
});

let confirmFn = null;
function confirmDialog(text, fn, back) {
  $('#confirm-text').textContent = text; confirmFn = () => { fn(); show(back); };
  $('#confirm-no').onclick = () => show(back);
  show('confirm');
}
$('#confirm-yes').addEventListener('click', () => confirmFn?.());
$('#btn-clear').addEventListener('click', () => confirmDialog('이 기기 기록을 모두 지울까요?', () => clearLocal(), 'settings'));

// ── 세로 화면 안내 ──
const portrait = window.matchMedia('(orientation: portrait)');
let rotateDismissed = false;
function checkRotate() { $('#rotate-hint').hidden = !(portrait.matches && !rotateDismissed); }
portrait.addEventListener?.('change', checkRotate);
$('#rotate-dismiss').addEventListener('click', () => { rotateDismissed = true; checkRotate(); });

// ── 시작 ──
applySettings();
renderFsButtons();
if (CONFIG.CUSTOM_CHARACTERS) tryLoadCustomSprites(ALL_IDS);
goTitle();
checkRotate();

if (params.has('test')) window.__wc = { engine, settings, online, get vision() { return vision; }, startTouchGame, show };
