// 미니메트로식 랭킹 화면: 점수 분포 막대그래프(우리 팀 위치 표시) + TOP 10 표
import { el, formatNum, formatTime } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v)); return n; };

export function renderBoard(root, board, { myScore = null, myTeam = null, scopeLabel = '' } = {}) {
  root.replaceChildren();
  if (!board || board.total === 0) {
    root.append(el('div', { class: 'board-empty' },
      el('div', { class: 'big', text: '🏁' }),
      el('div', { text: '아직 기록이 없어요' }),
      el('div', { class: 'sub', text: '첫 기록의 주인공이 되어 보세요!' })));
    return;
  }

  // 요약
  const head = el('div', { class: 'board-head' });
  if (myScore != null && board.my_rank) {
    const pct = Math.max(1, Math.ceil(board.my_rank / board.total * 100));
    head.append(
      board.my_rank === 1
        ? el('div', { class: 'pct first' }, el('b', { text: '🏆 1등!' }))
        : pct <= 50
          ? el('div', { class: 'pct' }, el('span', { class: 'pct-label', text: '상위' }), el('b', { text: `${pct}%` }))
          : el('div', { class: 'pct first' }, el('b', { text: `${formatNum(board.my_rank)}등` })),
      el('div', { class: 'rank-line', text: `${scopeLabel} ${formatNum(board.total)}팀 중 ${formatNum(board.my_rank)}등` }),
    );
  } else {
    head.append(el('div', { class: 'rank-line', text: `${scopeLabel} 기록 ${formatNum(board.total)}개 · 최고 ${formatNum(board.max)}점` }));
  }
  root.append(head);

  const body = el('div', { class: 'board-body' });
  body.append(histogram(board, myScore), table(board, myTeam, myScore));
  root.append(body);
}

function histogram(board, myScore) {
  const wrap = el('div', { class: 'hist card-inner' });
  wrap.append(el('div', { class: 'card-title', text: '점수 분포' }));
  const W = 640, H = 230, L = 16, R = 624, T = 34, B = 188;
  const step = board.step;
  const counts = new Map(board.bins.map((x) => [x.b, x.c]));
  const maxB = Math.max(Math.floor(Math.max(board.max, myScore || 0) / step), 7);
  const n = maxB + 1;
  const maxC = Math.max(1, ...board.bins.map((x) => x.c));
  const bw = (R - L) / n;
  const myBin = myScore == null ? -1 : Math.floor(myScore / step);

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'hist-svg', role: 'img', 'aria-label': '점수 분포 막대그래프' });
  // 격자(아주 연하게)
  for (const f of [0.5, 1]) svg.append(svgEl('line', { x1: L, x2: R, y1: B - (B - T) * f, y2: B - (B - T) * f, class: 'grid' }));
  const tip = el('div', { class: 'tip', hidden: true });

  for (let b = 0; b < n; b++) {
    const c = counts.get(b) || 0;
    const x = L + b * bw + 1, w = Math.max(2, bw - 2);
    const h = c ? Math.max(4, (c / maxC) * (B - T)) : 0;
    const mine = b === myBin;
    if (h) {
      const r = Math.min(4, w / 2), y = B - h;
      const d = `M${x},${B} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${B} Z`;
      svg.append(svgEl('path', { d, class: mine ? 'bar mine' : 'bar' }));
    }
    const hit = svgEl('rect', { x: L + b * bw, y: T - 10, width: bw, height: B - T + 10, class: 'hit' });
    const show = () => {
      tip.textContent = `${formatNum(b * step)}~${formatNum((b + 1) * step - 1)}점 · ${c}팀`;
      tip.hidden = false;
      tip.style.left = `${((L + b * bw + bw / 2) / W) * 100}%`;
    };
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('pointerdown', show);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; });
    svg.append(hit);
  }
  svg.append(svgEl('line', { x1: L, x2: R, y1: B, y2: B, class: 'axis' }));

  // x축 눈금 (최대 6개)
  const every = Math.ceil(n / 6);
  for (let b = 0; b <= n; b += every) {
    const tx = L + b * bw;
    const t = svgEl('text', { x: tx, y: B + 24, class: 'tick', 'text-anchor': b === 0 ? 'start' : tx > R - 30 ? 'end' : 'middle' });
    t.textContent = formatNum(b * step);
    svg.append(t);
  }

  // 우리 팀 위치 표시
  if (myScore != null) {
    const mx = L + (myScore / step) * bw;
    svg.append(svgEl('line', { x1: mx, x2: mx, y1: T - 4, y2: B, class: 'marker' }));
    const g = svgEl('g', { transform: `translate(${Math.min(R - 46, Math.max(L + 46, mx))},${T - 16})` });
    g.append(svgEl('rect', { x: -46, y: -14, width: 92, height: 28, rx: 14, class: 'marker-pill' }));
    const t = svgEl('text', { x: 0, y: 5, 'text-anchor': 'middle', class: 'marker-text' }); t.textContent = '우리 팀';
    g.append(t); svg.append(g);
  }
  wrap.append(el('div', { class: 'hist-box' }, svg, tip));
  return wrap;
}

function table(board, myTeam, myScore) {
  const wrap = el('div', { class: 'top card-inner' });
  wrap.append(el('div', { class: 'card-title', text: 'TOP 10' }));
  const tb = el('table', { class: 'top-table' });
  tb.append(el('thead', {}, el('tr', {}, el('th', { text: '순위' }), el('th', { text: '팀' }), el('th', { text: '점수' }), el('th', { text: '스테이지' }), el('th', { text: '시간' }))));
  const body = el('tbody');
  const medal = ['🥇', '🥈', '🥉'];
  let markedMine = false;
  for (const r of board.top) {
    const mine = !markedMine && myTeam && r.team === myTeam && (myScore == null || r.score === myScore);
    if (mine) markedMine = true;
    body.append(el('tr', { class: mine ? 'mine' : '' },
      el('td', { class: 'rk', text: medal[r.rank - 1] || String(r.rank) }),
      el('td', { class: 'tm', text: r.team }),
      el('td', { class: 'sc', text: formatNum(r.score) }),
      el('td', { class: 'stg', text: `${r.reached_stage || 1}` }),
      el('td', { class: 'dt', text: formatTime(r.survival_ms || 0) }),
    ));
  }
  tb.append(body);
  wrap.append(tb);
  return wrap;
}
