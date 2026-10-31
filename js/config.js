// ─────────────────────────────────────────────────────────────
//  와르르 캐치! 설정 파일 — 배포 전에 여기만 고치면 됩니다.
// ─────────────────────────────────────────────────────────────

export const CONFIG = Object.freeze({
  // 온라인 랭킹 (Supabase). 둘 다 비워두면 "우리 기기 기록"만 동작합니다.
  // 키는 Supabase > Project Settings > API Keys 의 publishable(anon) 키.
  // 이 키는 원래 브라우저에 공개되는 값이고, 보안은 서버 쪽 RLS·검증 함수가 담당합니다.
  // ⚠ service_role / secret 키는 절대 넣지 마세요.
  SUPABASE_URL: 'https://hofykldrsauhmwepehnf.supabase.co',
  SUPABASE_KEY: 'sb_publishable_JzCBAjrAhOgG9ZOqKhwz4Q_92R80GrW',

  // 사람 분리(크로마키) 모델. 이 폴더에 같이 들어 있어 외부 서버를 부르지 않습니다.
  //  kind: 'person'  → 마스크 값이 "사람일 확률" (기본 selfie 모델)
  //        'multiclass' → selfie_multiclass 모델 (0번 마스크가 배경)
  MODEL: { path: 'models/selfie_segmentation.tflite', kind: 'person' },
  // 자세(포즈) 인식: 멀리 있는 사람 인식 + 손 위치 (잡기 판정은 손으로만). 최대 인원
  POSE_MODELS: { full: 'models/pose_landmarker_full.task', lite: 'models/pose_landmarker_lite.task' },
  MAX_PEOPLE: 6,
  WASM_PATH: 'vendor/mediapipe/wasm',

  // 직접 만든 이미지 사용 여부
  //  배경: assets/bg/<스테이지키>.png|jpg|webp (없으면 코드로 그린 배경)
  //  캐릭터: assets/characters/<캐릭터id>.png — 넣은 뒤 true 로 바꾸세요
  CUSTOM_BACKGROUNDS: true,
  CUSTOM_CHARACTERS: false,

  // true 면 카메라 없이 손가락(터치)으로만 플레이 (미리보기용)
  FORCE_TOUCH: false,

  // 화면 기준 해상도 (16:9 고정)
  W: 1280,
  H: 720,
});

// 점수·진행 규칙 — supabase/schema.sql 의 submit_score 검증과 숫자가 같아야 합니다.
//  점수 = 잡은 점수 + 버틴 초 × 3 + 클리어 보너스(클리어한 스테이지 번호 × 100 의 합)
export const RULES = Object.freeze({
  LIVES: 5,                 // 한 게임 최대 생명
  CATCH_BASE: 10,           // 캐릭터 1개 기본 점수
  COMBO_MAX_STEPS: 10,      // 콤보 1당 +1점, 최대 +10 (캐릭터 1개 최대 20점)
  COMBO_WINDOW_MS: 2500,    // 이 시간 안에 또 잡으면 콤보 유지, 지나면 사라짐
  TIME_POINTS_PER_SEC: 3,   // 버틴 시간 1초당 점수
  STAGE_SEC: 100,           // 스테이지 1개 길이 (초)
  LEVEL_SEC: 20,            // 이 시간마다 레벨(속도) +1 → 스테이지 N 은 Lv.N ~ Lv.N+4
  CLEAR_BONUS: 100,         // 스테이지 N 클리어 시 N × 100 점
  REST_SEC: 3,              // 스테이지 사이 휴식
  NO_BOMB_FIRST_SEC: 5,     // 게임 시작 후 몇 초간은 폭탄 없음 (아이들 적응용)
  BOMB_GRACE_MS: 700,       // 폭탄 연속 피격 보호 시간
  ABSENT_PAUSE_MS: 4000,    // 화면에 사람이 없으면 이 시간 뒤 자동 일시정지
});

// 난이도: 레벨이 오를수록 빨라지고 자주 떨어지며 폭탄이 늘어남 (상한 있음)
export const DIFFICULTY = Object.freeze({
  normal: { label: '일반', speed: 1.0, speedCap: 3.0, interval: 1.0, bomb: 1.0, bombCap: 0.38, heart: 0.025, radius: 0 },
  baby: { label: '아기 모드', speed: 0.68, speedCap: 1.9, interval: 1.15, bomb: 0.5, bombCap: 0.2, heart: 0.05, radius: 8 },
});

// 화질 프리셋: 사람 분리 입력 크기 + 자세 인식 입력 크기·모델
export const QUALITY = Object.freeze({
  best: { segW: 384, segH: 216, poseW: 640, poseH: 360, pose: 'full', label: '최고' },
  high: { segW: 384, segH: 216, poseW: 512, poseH: 288, pose: 'lite', label: '고화질' },
  normal: { segW: 288, segH: 162, poseW: 448, poseH: 252, pose: 'lite', label: '표준' },
  low: { segW: 224, segH: 126, poseW: 384, poseH: 216, pose: 'lite', label: '절전' },
});
