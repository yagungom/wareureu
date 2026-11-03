-- ════════════════════════════════════════════════════════════════
--  와르르 캐치! 온라인 랭킹 스키마 (Supabase)
--  사용법: Supabase 대시보드 → SQL Editor → 이 파일 전체 붙여넣기 → Run
--  여러 번 실행해도 안전합니다(idempotent).
--  ⚠️ 이 Supabase 프로젝트는 다른 게임(뻥! 승부차기·딱! 홈런)도 같이 씁니다.
--     private 스키마를 통째로 지우는(drop schema) 명령은 절대 실행하지 마세요 — 모든 게임 기록이 사라집니다.
--
--  랭킹: 통합 랭킹 × 방식(카메라/폰) × 난이도(일반/아기) × 기간(오늘/이번 주/이번 달, 한국시간)
--  (이전 버전을 실행했었다면 이 파일을 그대로 다시 실행하면 업데이트됩니다. 기록은 유지)
--
--  보안 설계
--   · 테이블은 모두 private 스키마 → REST API 로 직접 읽기/쓰기 불가
--   · RLS 켜고 정책 없음(이중 잠금) + anon/authenticated 권한 회수
--   · 브라우저는 함수 3개만 호출 가능: start_session / submit_score / get_leaderboard
--   · 점수는 서버가 발급한 1회용 세션으로만 등록, 서버 시계로 플레이 시간 검증
--   · 점수 공식·최대치 검증, 팀 이름 규칙·욕설 필터, IP 기준 요청 제한
--   · 개인정보: 이메일·로그인 없음. IP 는 '날짜별 솔트 해시'로만, 세션 표에 2일만 보관
-- ════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema private from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on schema private from authenticated'; end if;
end $$;

-- ── 비밀 솔트 (IP 해시용, 외부 노출 없음) ──
create table if not exists private.app_secret (
  id   int primary key default 1 check (id = 1),
  salt text not null
);
insert into private.app_secret (id, salt)
values (1, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

-- ── 금지어 (팀 이름) — 소문자·공백/기호 제거 후 부분일치로 검사 ──
create table if not exists private.banned_words (word text primary key);
insert into private.banned_words (word) values
  ('시발'),('씨발'),('씨빨'),('시빨'),('씨바'),('ㅅㅂ'),('ㅆㅂ'),('ㅅ1ㅂ'),('병신'),('븅신'),('빙신'),('ㅂㅅ'),('개새'),('개색'),('개세'),('새끼'),('섀끼'),('ㅅㄲ'),
  ('좆'),('존나'),('졸라'),('ㅈㄴ'),('지랄'),('ㅈㄹ'),('미친'),('ㅁㅊ'),('엠창'),('니애미'),('느금'),('염병'),('썅'),('쌍년'),('창녀'),('걸레'),('보지'),('자지'),('섹스'),('야동'),
  ('일베'),('메갈'),('한남'),('김치녀'),('틀딱'),('장애인새'),('찐따'),('애미'),('애비'),
  ('fuck'),('shit'),('bitch'),('sex'),('porn'),('dick'),('pussy'),('nigger'),('nigga'),('slut'),('whore'),
  ('admin'),('관리자'),('운영자'),('운영진')
on conflict do nothing;

-- ── 게임 세션 (1판 = 1세션, 1회만 점수 등록) ──
create table if not exists private.game_sessions (
  id           uuid primary key default gen_random_uuid(),
  mode         text not null check (mode in ('normal', 'baby')),
  input        text not null default 'camera' check (input in ('camera', 'touch')),
  team_name    text not null,
  ip_hash      text not null,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz
);
create index if not exists game_sessions_ip_time_idx on private.game_sessions (ip_hash, started_at desc);
create index if not exists game_sessions_time_idx on private.game_sessions (started_at);

-- ── 점수 ──
create table if not exists private.scores (
  id            bigint generated always as identity primary key,
  mode          text not null check (mode in ('normal', 'baby')),
  input         text not null default 'camera' check (input in ('camera', 'touch')),
  team_name     text not null check (char_length(team_name) between 2 and 12),
  score         int not null check (score between 0 and 100000000),
  catches       int not null check (catches >= 0),
  survival_ms   int not null check (survival_ms between 0 and 86400000),
  reached_stage int not null check (reached_stage between 1 and 9999),
  created_at    timestamptz not null default now(),
  hidden        boolean not null default false     -- 관리자가 부적절한 기록을 숨길 때
);
-- 이전 버전 테이블에 '방식(input)' 열 추가 (이미 있으면 건너뜀)
alter table private.game_sessions add column if not exists input text not null default 'camera';
alter table private.scores        add column if not exists input text not null default 'camera';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'game_sessions_input_ck') then
    alter table private.game_sessions add constraint game_sessions_input_ck check (input in ('camera', 'touch'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'scores_input_ck') then
    alter table private.scores add constraint scores_input_ck check (input in ('camera', 'touch'));
  end if;
end $$;
drop index if exists private.scores_mode_time_idx;
drop index if exists private.scores_mode_score_idx;
alter table private.scores add column if not exists misses int not null default 0;  -- 놓친 친구 수
create index if not exists scores_mode_input_time_idx  on private.scores (mode, input, created_at desc);
create index if not exists scores_mode_input_score_idx on private.scores (mode, input, score desc);

alter table private.app_secret    enable row level security;
alter table private.banned_words  enable row level security;
alter table private.game_sessions enable row level security;
alter table private.scores        enable row level security;
revoke all on all tables in schema private from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on all tables in schema private from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on all tables in schema private from authenticated'; end if;
end $$;

-- ════════════════ 내부 함수 ════════════════

-- 막대그래프 구간 폭 (js/util.js niceStep 과 같은 규칙)
create or replace function private.nice_step(raw numeric)
returns int language plpgsql immutable set search_path = '' as $$
declare p numeric; f numeric; m numeric;
begin
  if raw is null or raw <= 1 then return 1; end if;
  p := power(10::numeric, floor(log(10::numeric, raw)));
  f := raw / p;
  m := case when f <= 1 then 1 when f <= 2 then 2 when f <= 2.5 then 2.5 when f <= 5 then 5 else 10 end;
  return ceil(m * p)::int;
end $$;

-- 요청 IP → 날짜별 솔트 해시 (원본 IP 는 저장하지 않음)
create or replace function private.client_ip_hash()
returns text language plpgsql stable security definer set search_path = '' as $$
declare h json; ip text; s text;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then h := null;
  end;
  ip := coalesce(
    nullif(h ->> 'cf-connecting-ip', ''),
    nullif(btrim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''),
    nullif(h ->> 'x-real-ip', ''),
    'unknown');
  select a.salt into s from private.app_secret a where a.id = 1;
  return encode(extensions.digest(ip || '|' || to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD') || '|' || s, 'sha256'), 'hex');
end $$;

-- 팀 이름 검사 (js/nickname.js 와 같은 규칙). 통과하면 정규화된 이름을 돌려줌
create or replace function private.check_team(p text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare n text; k text;
begin
  n := btrim(regexp_replace(normalize(coalesce(p, ''), NFC), '\s+', ' ', 'g'));
  if char_length(n) < 2 or char_length(n) > 12 then raise exception 'bad_name_length' using errcode = '22023'; end if;
  if n !~ '^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 _♥★-]+$' then raise exception 'bad_name_chars' using errcode = '22023'; end if;
  k := lower(regexp_replace(n, '[^가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]', '', 'g'));
  if k ~ '[0-9]{7,}' then raise exception 'bad_name_digits' using errcode = '22023'; end if;
  if exists (select 1 from private.banned_words w where position(w.word in k) > 0) then
    raise exception 'banned_name' using errcode = '22023';
  end if;
  return n;
end $$;

-- 한국시간 기준 기간 시작 (주간은 월요일 시작)
create or replace function private.period_from(p_period text)
returns timestamptz language plpgsql stable set search_path = '' as $$
begin
  if p_period not in ('day', 'week', 'month') then raise exception 'bad_period' using errcode = '22023'; end if;
  return date_trunc(p_period, now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
end $$;

-- ════════════════ 공개 함수 (브라우저가 호출) ════════════════

-- 1) 게임 시작: 1회용 세션 발급
drop function if exists public.start_session(text, text);
create or replace function public.start_session(p_mode text, p_team text, p_input text default 'camera')
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare v_hash text; v_team text; v_id uuid; v_cnt int;
begin
  if p_mode is null or p_mode not in ('normal', 'baby') then raise exception 'bad_mode' using errcode = '22023'; end if;
  if p_input is null or p_input not in ('camera', 'touch') then raise exception 'bad_mode' using errcode = '22023'; end if;
  v_team := private.check_team(p_team);
  v_hash := private.client_ip_hash();

  select count(*) into v_cnt from private.game_sessions
   where ip_hash = v_hash and started_at > now() - interval '1 minute';
  if v_cnt >= 12 then raise exception 'rate_limited' using errcode = 'P0001'; end if;
  select count(*) into v_cnt from private.game_sessions
   where ip_hash = v_hash and started_at > now() - interval '1 hour';
  if v_cnt >= 240 then raise exception 'rate_limited' using errcode = 'P0001'; end if;

  insert into private.game_sessions (mode, input, team_name, ip_hash) values (p_mode, p_input, v_team, v_hash)
  returning id into v_id;

  -- 오래된 세션 정리 (IP 해시 보관 최소화)
  if random() < 0.05 then
    delete from private.game_sessions where started_at < now() - interval '2 days';
  end if;
  return v_id;
end $$;

-- 2) 점수 등록: 세션당 1회, 서버 시계·점수 공식으로 검증 (js/config.js RULES 와 동일)
--    스테이지 = 100초. 클리어 수 c = 버틴ms / 100000 (게임은 사망으로만 끝나므로)
--    점수 = 잡은점수(캐릭터당 10~20) − 놓친 감점 + 버틴초 × 3 + 100 × (1+2+…+c)
--    놓친 감점: 1마리당 최대 일반 10 / 아기 5 (그때 점수보다 많이 깎지 않아서 0~최대 사이)
drop function if exists public.submit_score(uuid, int, int, int, int);
drop function if exists public.submit_score(uuid, int, int, int, int, int);
create or replace function public.submit_score(
  p_session uuid, p_score int, p_catches int, p_catch_points int, p_survival_ms int,
  p_misses int default 0, p_miss_points int default 0)
returns json language plpgsql volatile security definer set search_path = '' as $$
declare
  s record; v_elapsed_ms bigint; v_cleared bigint; v_expected bigint; v_miss_pts bigint; v_rank int; v_total int; v_from timestamptz;
begin
  -- 세션 소모 (실패해도 다시 쓸 수 없음 → 숫자 바꿔가며 재시도 불가)
  update private.game_sessions
     set submitted_at = now()
   where id = p_session and submitted_at is null and started_at > now() - interval '24 hours'
  returning mode, input, team_name, started_at into s;
  if not found then return json_build_object('ok', false, 'reason', 'invalid_session'); end if;

  if p_score is null or p_catches is null or p_catch_points is null or p_survival_ms is null or p_misses is null or p_miss_points is null then
    return json_build_object('ok', false, 'reason', 'implausible');
  end if;

  v_elapsed_ms := floor(extract(epoch from (now() - s.started_at)) * 1000)::bigint;
  v_cleared := p_survival_ms / 100000;
  v_miss_pts := p_misses::bigint * (case when s.mode = 'baby' then 5 else 10 end);  -- 감점 최대치
  v_expected := greatest(0, p_catch_points::bigint - p_miss_points + (p_survival_ms / 1000)::bigint * 3 + 100 * v_cleared * (v_cleared + 1) / 2);
  if p_survival_ms < 1000 or p_survival_ms > v_elapsed_ms + 3000                 -- 실제 흐른 시간보다 오래 버틸 수 없음
     or p_catches < 0 or p_catches > floor(p_survival_ms / 1000.0 * 3) + 5        -- 초당 3개 이상 못 잡음
     or p_catch_points < p_catches * 10 or p_catch_points > p_catches * 20        -- 캐릭터당 10~20점
     or p_misses < 0 or p_misses > floor(p_survival_ms / 1000.0 * 4) + 10         -- 초당 4개 이상 놓칠 수 없음
     or p_miss_points < 0 or p_miss_points > v_miss_pts                             -- 1마리당 최대 감점
     or p_score::bigint <> v_expected                                              -- 점수 공식
     or p_score > 100000000 then
    return json_build_object('ok', false, 'reason', 'implausible');
  end if;

  insert into private.scores (mode, input, team_name, score, catches, survival_ms, reached_stage, misses)
  values (s.mode, s.input, s.team_name, p_score, p_catches, p_survival_ms, (v_cleared + 1)::int, p_misses);

  v_from := private.period_from('day');
  select count(*) filter (where sc.score > p_score) + 1, count(*)
    into v_rank, v_total
    from private.scores sc
   where sc.mode = s.mode and sc.input = s.input and sc.created_at >= v_from and not sc.hidden;

  return json_build_object('ok', true, 'day_rank', v_rank, 'day_total', v_total, 'reached_stage', v_cleared + 1);
end $$;

-- 3) 랭킹: 모드 × 기간(day/week/month) → TOP10 + 점수 분포 + 내 순위
drop function if exists public.get_leaderboard(text, text, int);
create or replace function public.get_leaderboard(p_mode text, p_period text, p_score int default null, p_input text default 'camera')
returns json language plpgsql stable security definer set search_path = '' as $$
declare v_from timestamptz; v_total int; v_max int; v_step int; v_top json; v_bins json; v_rank int;
begin
  if p_mode is null or p_mode not in ('normal', 'baby') then raise exception 'bad_mode' using errcode = '22023'; end if;
  if p_input is null or p_input not in ('camera', 'touch') then raise exception 'bad_mode' using errcode = '22023'; end if;
  v_from := private.period_from(p_period);

  select count(*), coalesce(max(sc.score), 0) into v_total, v_max
    from private.scores sc where sc.mode = p_mode and sc.input = p_input and sc.created_at >= v_from and not sc.hidden;

  v_step := greatest(private.nice_step(greatest(v_max, 1) / 16.0), 10);

  -- 순위 = 나보다 높은 기록 수 + 1 (같은 점수는 공동 순위, '내 순위'와 같은 기준). 같은 순위끼리는 먼저 한 기록이 위
  select coalesce(json_agg(t order by t.rank, t.at), '[]'::json) into v_top from (
    select rank() over (order by sc.score desc) as rank,
           sc.team_name as team, sc.score, sc.catches, sc.survival_ms, sc.reached_stage, sc.created_at as at
      from private.scores sc
     where sc.mode = p_mode and sc.input = p_input and sc.created_at >= v_from and not sc.hidden
     order by sc.score desc, sc.created_at asc
     limit 10) t;

  select coalesce(json_agg(json_build_object('b', x.b, 'c', x.c) order by x.b), '[]'::json) into v_bins from (
    select (sc.score / v_step) as b, count(*) as c
      from private.scores sc
     where sc.mode = p_mode and sc.input = p_input and sc.created_at >= v_from and not sc.hidden
     group by 1) x;

  if p_score is not null then
    select count(*) + 1 into v_rank from private.scores sc
     where sc.mode = p_mode and sc.input = p_input and sc.created_at >= v_from and not sc.hidden and sc.score > p_score;
  end if;

  return json_build_object('total', v_total, 'step', v_step, 'max', v_max, 'top', v_top, 'bins', v_bins, 'my_rank', v_rank);
end $$;

-- ── 실행 권한: 공개 함수 3개만 ──
revoke all on function public.start_session(text, text, text) from public;
revoke all on function public.submit_score(uuid, int, int, int, int, int, int) from public;
revoke all on function public.get_leaderboard(text, text, int, text) from public;
revoke all on all functions in schema private from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.start_session(text, text, text) to anon';
    execute 'grant execute on function public.submit_score(uuid, int, int, int, int, int, int) to anon';
    execute 'grant execute on function public.get_leaderboard(text, text, int, text) to anon';
    execute 'revoke all on all functions in schema private from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.start_session(text, text, text) to authenticated';
    execute 'grant execute on function public.submit_score(uuid, int, int, int, int, int, int) to authenticated';
    execute 'grant execute on function public.get_leaderboard(text, text, int, text) to authenticated';
    execute 'revoke all on all functions in schema private from authenticated';
  end if;
end $$;

-- ════════════════ 오래된 세션 자동 삭제 (예약 작업) ════════════════
--  화면 안내 '도배 방지용 IP는 2일만 보관'을 지키는 장치. 매시간 2일 지난 세션(IP 해시 포함)을 지웁니다.
--  (방문자가 없어도 실행됨. 세션을 만들 때 가끔 지우는 기존 정리는 보조로 그대로 둠)
--  pg_cron(예약 작업 확장)을 켜고 등록합니다. 같은 이름으로 다시 실행하면 덮어써서 중복되지 않아요.
--  pg_cron 을 켤 수 없으면 알림만 남기고 넘어갑니다(나머지 설치에는 영향 없음).
--  확인:  select jobname, schedule, active from cron.job;
--  실행 기록:  select jobid, status, start_time from cron.job_run_details order by start_time desc limit 10;
do $$ begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron 을 켜지 못했어요: %', sqlerrm;
  end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('wareureu-session-cleanup', '7 * * * *',
      $job$delete from private.game_sessions where started_at < now() - interval '2 days'$job$);
  else
    raise notice '세션 자동 삭제를 등록하지 못했어요 — Database → Extensions 에서 pg_cron 을 켠 뒤 이 파일을 다시 실행하세요';
  end if;
end $$;

-- ════════════════ 관리자용 (SQL Editor 에서 직접 실행) ════════════════
-- 최근 기록 보기:
--   select id, mode, input, team_name, score, reached_stage, created_at from private.scores order by created_at desc limit 50;
-- 부적절한 팀 이름 숨기기:
--   update private.scores set hidden = true where team_name = '문제되는이름';
-- 금지어 추가:
--   insert into private.banned_words(word) values ('추가할단어') on conflict do nothing;
-- 13개월 지난 기록 정리:
--   delete from private.scores where created_at < now() - interval '13 months';
