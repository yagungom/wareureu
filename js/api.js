// 온라인 랭킹 API (Supabase RPC 3개만 호출, 테이블 직접 접근 없음)
import { CONFIG } from './config.js';

function validUrl(u) {
  try { const x = new URL(u); return x.protocol === 'https:' && !x.username && !x.password; } catch { return false; }
}

export const online = {
  get enabled() { return validUrl(CONFIG.SUPABASE_URL) && typeof CONFIG.SUPABASE_KEY === 'string' && CONFIG.SUPABASE_KEY.length > 20; },

  async rpc(fn, body, timeoutMs = 7000) {
    if (!this.enabled) throw new Error('offline');
    const key = CONFIG.SUPABASE_KEY;
    const headers = { 'Content-Type': 'application/json', apikey: key };
    // 예전 형식(anon JWT) 키만 Authorization 헤더에 넣음. 새 publishable 키는 apikey 헤더만 사용
    if (!key.startsWith('sb_')) headers.Authorization = `Bearer ${key}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${CONFIG.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal,
        credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', mode: 'cors',
      });
      const text = await res.text();
      let data = null; try { data = text ? JSON.parse(text) : null; } catch { /* noop */ }
      if (!res.ok) {
        const msg = (data && (data.message || data.hint)) || `http_${res.status}`;
        throw Object.assign(new Error(msg), { code: msg, status: res.status });
      }
      return data;
    } finally { clearTimeout(timer); }
  },

  // 서버 SQL 이 아직 이전 버전이면(함수 없음 404) 카메라 모드는 예전 방식으로 한 번 더 시도
  async withLegacy(fn, body, input) {
    try { return await this.rpc(fn, { ...body, p_input: input }); }
    catch (e) { if (e?.status === 404 && input === 'camera') return this.rpc(fn, body); throw Object.assign(e, { code: e?.status === 404 ? 'server_update' : e?.code }); }
  },
  startSession(mode, team, input = 'camera') { return this.withLegacy('start_session', { p_mode: mode, p_team: team }, input); },
  // 놓친 수(p_misses)를 함께 보냄. 서버 SQL 이 이전 버전(404)이면 놓친 게 없을 때만 예전 방식으로 다시 시도
  async submit(sessionId, r) {
    const body = { p_session: sessionId, p_score: r.score, p_catches: r.catches, p_catch_points: r.catchPoints, p_survival_ms: r.survivalMs };
    try { return await this.rpc('submit_score', { ...body, p_misses: r.misses || 0, p_miss_points: r.missPoints || 0 }); }
    catch (e) {
      if (e?.status !== 404) throw e;
      if (!r.missPoints) return this.rpc('submit_score', body);
      throw Object.assign(e, { code: 'server_update' });
    }
  },
  board(mode, period, myScore = null, input = 'camera') {
    return this.withLegacy('get_leaderboard', { p_mode: mode, p_period: period, p_score: myScore }, input);
  },
};

export function errorText(code) {
  const map = {
    bad_mode: '난이도 정보가 올바르지 않아요',
    server_update: '랭킹 서버 업데이트가 필요해요 (schema.sql 다시 실행)',
    rate_limited: '잠시 후 다시 시도해 주세요 (요청이 너무 많아요)',
    banned_name: '이 팀 이름은 온라인 랭킹에 쓸 수 없어요',
    bad_name_length: '팀 이름 길이를 확인해 주세요',
    bad_name_chars: '팀 이름에 쓸 수 없는 글자가 있어요',
    bad_name_digits: '팀 이름에 숫자가 너무 길어요',
    invalid_session: '기록 등록 시간이 지났어요',
    implausible: '기록을 확인할 수 없어 온라인 등록을 건너뛰었어요',
    offline: '온라인 랭킹이 아직 설정되지 않았어요',
  };
  return map[code] || '온라인 연결이 원활하지 않아요';
}
