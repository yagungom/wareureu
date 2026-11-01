// 100 스테이지 = 테마 25개 × 분위기 4가지 (낮 → 노을 → 밤 → 특별)
//  스테이지 1~25: 25개 테마 '낮' · 26~50: '노을' · 51~75: '밤' · 76~100: '특별' · 101부터 다시 1번처럼 (무한)
//
// 아이템 그림 우선순위: ChatGPT 스티커 시트(assets/items/<key>.png) > 코드로 그린 캐릭터(draw) > 이모지(임시)
// items 순서 = 스티커 시트에서 왼쪽 위부터 오른쪽으로, 윗줄 → 아랫줄 순서 (3칸 × 2줄)

export const THEMES = [
  { key: 'beach', name: '햇살 해변', emoji: '🏖️', ambient: 'sparkle', key2: 0, items: [
    { name: '게', en: 'crab', emoji: '🦀', draw: 'crab' }, { name: '수박', en: 'watermelon slice', emoji: '🍉', draw: 'watermelon' },
    { name: '파인애플', en: 'pineapple', emoji: '🍍', draw: 'pineapple' }, { name: '조개', en: 'seashell', emoji: '🐚' },
    { name: '아이스크림', en: 'ice cream cone', emoji: '🍦' }, { name: '선글라스', en: 'sunglasses', emoji: '🕶️' }] },
  { key: 'sea', name: '바닷속 탐험', emoji: '🐠', ambient: 'bubbles', key2: 3, items: [
    { name: '물고기', en: 'fish', emoji: '🐟', draw: 'fish' }, { name: '문어', en: 'octopus', emoji: '🐙', draw: 'octopus' },
    { name: '고래', en: 'whale', emoji: '🐳', draw: 'whale' }, { name: '거북이', en: 'sea turtle', emoji: '🐢', draw: 'turtle' },
    { name: '해파리', en: 'jellyfish', emoji: '🪼', draw: 'jellyfish' }, { name: '복어', en: 'pufferfish', emoji: '🐡' }] },
  { key: 'farm', name: '꼬꼬 농장', emoji: '🐔', ambient: 'none', key2: 4, items: [
    { name: '병아리', en: 'baby chick', emoji: '🐤', draw: 'chick' }, { name: '돼지', en: 'pig', emoji: '🐷', draw: 'pig' },
    { name: '양', en: 'sheep', emoji: '🐑', draw: 'sheep' }, { name: '젖소', en: 'cow', emoji: '🐮' },
    { name: '말', en: 'pony', emoji: '🐴' }, { name: '닭', en: 'hen', emoji: '🐔' }] },
  { key: 'city', name: '반짝반짝 도시', emoji: '🏙️', ambient: 'none', key2: 5, items: [
    { name: '자동차', en: 'red car', emoji: '🚗', draw: 'car' }, { name: '택시', en: 'yellow taxi', emoji: '🚕', draw: 'taxi' },
    { name: '버스', en: 'bus', emoji: '🚌', draw: 'bus' }, { name: '소방차', en: 'fire truck', emoji: '🚒', draw: 'firetruck' },
    { name: '경찰차', en: 'police car', emoji: '🚓' }, { name: '구급차', en: 'ambulance', emoji: '🚑' }] },
  { key: 'orchard', name: '달콤 과수원', emoji: '🍎', ambient: 'petals', key2: 9, items: [
    { name: '사과', en: 'apple', emoji: '🍎', draw: 'apple' }, { name: '포도', en: 'grapes', emoji: '🍇', draw: 'grape' },
    { name: '복숭아', en: 'peach', emoji: '🍑', draw: 'peach' }, { name: '귤', en: 'tangerine', emoji: '🍊', draw: 'tangerine' },
    { name: '딸기', en: 'strawberry', emoji: '🍓', draw: 'strawberry' }, { name: '체리', en: 'cherries', emoji: '🍒' }] },
  { key: 'forest', name: '숲속 친구들', emoji: '🌲', ambient: 'leaves', key2: 2, items: [
    { name: '토끼', en: 'rabbit', emoji: '🐰', draw: 'rabbit' }, { name: '곰', en: 'bear', emoji: '🐻', draw: 'bear' },
    { name: '여우', en: 'fox', emoji: '🦊', draw: 'fox' }, { name: '다람쥐', en: 'squirrel', emoji: '🐿️' },
    { name: '부엉이', en: 'owl', emoji: '🦉' }, { name: '고슴도치', en: 'hedgehog', emoji: '🦔' }] },
  { key: 'bugs', name: '꽃밭 곤충', emoji: '🦋', ambient: 'petals', key2: 7, items: [
    { name: '나비', en: 'butterfly', emoji: '🦋' }, { name: '무당벌레', en: 'ladybug', emoji: '🐞' },
    { name: '꿀벌', en: 'honeybee', emoji: '🐝' }, { name: '달팽이', en: 'snail', emoji: '🐌' },
    { name: '개미', en: 'ant', emoji: '🐜' }, { name: '애벌레', en: 'caterpillar', emoji: '🐛' }] },
  { key: 'dessert', name: '디저트 왕국', emoji: '🍰', ambient: 'sparkle', key2: 1, items: [
    { name: '케이크', en: 'slice of cake', emoji: '🍰' }, { name: '도넛', en: 'donut', emoji: '🍩' },
    { name: '쿠키', en: 'cookie', emoji: '🍪' }, { name: '컵케이크', en: 'cupcake', emoji: '🧁' },
    { name: '사탕', en: 'wrapped candy', emoji: '🍬' }, { name: '막대사탕', en: 'lollipop', emoji: '🍭' }] },
  { key: 'dino', name: '공룡 마을', emoji: '🦕', ambient: 'leaves', key2: 10, items: [
    { name: '티라노', en: 'friendly T-rex', emoji: '🦖' }, { name: '목긴 공룡', en: 'long-neck dinosaur', emoji: '🦕' },
    { name: '공룡알', en: 'dinosaur egg', emoji: '🥚' }, { name: '화산', en: 'little volcano', emoji: '🌋' },
    { name: '발자국', en: 'dinosaur footprint', emoji: '🐾' }, { name: '뼈', en: 'dinosaur bone', emoji: '🦴' }] },
  { key: 'sky', name: '하늘 여행', emoji: '✈️', ambient: 'none', key2: 6, items: [
    { name: '비행기', en: 'airplane', emoji: '✈️', draw: 'airplane' }, { name: '열기구', en: 'hot air balloon', emoji: '🎈', draw: 'hotairballoon' },
    { name: '헬리콥터', en: 'helicopter', emoji: '🚁' }, { name: '새', en: 'little bird', emoji: '🐦' },
    { name: '구름', en: 'cloud', emoji: '☁️' }, { name: '무지개', en: 'rainbow', emoji: '🌈' }] },
  { key: 'jungle', name: '정글 탐험', emoji: '🐒', ambient: 'leaves', key2: 8, items: [
    { name: '원숭이', en: 'monkey', emoji: '🐒' }, { name: '사자', en: 'lion', emoji: '🦁' },
    { name: '코끼리', en: 'elephant', emoji: '🐘' }, { name: '기린', en: 'giraffe', emoji: '🦒' },
    { name: '앵무새', en: 'parrot', emoji: '🦜' }, { name: '바나나', en: 'banana', emoji: '🍌', draw: 'banana' }] },
  { key: 'veggie', name: '텃밭 채소', emoji: '🥕', ambient: 'none', key2: 11, items: [
    { name: '당근', en: 'carrot', emoji: '🥕' }, { name: '옥수수', en: 'corn', emoji: '🌽' },
    { name: '브로콜리', en: 'broccoli', emoji: '🥦' }, { name: '토마토', en: 'tomato', emoji: '🍅' },
    { name: '감자', en: 'potato', emoji: '🥔' }, { name: '오이', en: 'cucumber', emoji: '🥒' }] },
  { key: 'snow', name: '눈꽃 나라', emoji: '❄️', ambient: 'snow', key2: 10, items: [
    { name: '펭귄', en: 'penguin', emoji: '🐧', draw: 'penguin' }, { name: '북극곰', en: 'polar bear', emoji: '🐻', draw: 'polarbear' },
    { name: '북극여우', en: 'arctic fox', emoji: '🦊', draw: 'arcticfox' }, { name: '눈사람', en: 'snowman', emoji: '⛄' },
    { name: '눈꽃', en: 'snowflake', emoji: '❄️' }, { name: '썰매', en: 'sled', emoji: '🛷' }] },
  { key: 'toys', name: '장난감 방', emoji: '🧸', ambient: 'sparkle', key2: 0, items: [
    { name: '곰인형', en: 'teddy bear', emoji: '🧸' }, { name: '로봇', en: 'toy robot', emoji: '🤖' },
    { name: '요요', en: 'yo-yo', emoji: '🪀' }, { name: '연', en: 'kite', emoji: '🪁' },
    { name: '퍼즐', en: 'puzzle piece', emoji: '🧩' }, { name: '주사위', en: 'toy dice', emoji: '🎲' }] },
  { key: 'sports', name: '운동장', emoji: '⚽', ambient: 'none', key2: 5, items: [
    { name: '축구공', en: 'soccer ball', emoji: '⚽' }, { name: '농구공', en: 'basketball', emoji: '🏀' },
    { name: '야구공', en: 'baseball', emoji: '⚾' }, { name: '테니스공', en: 'tennis ball', emoji: '🎾' },
    { name: '셔틀콕', en: 'badminton shuttlecock', emoji: '🏸' }, { name: '트로피', en: 'gold trophy', emoji: '🏆' }] },
  { key: 'music', name: '음악 나라', emoji: '🎵', ambient: 'sparkle', key2: 7, items: [
    { name: '피아노', en: 'toy piano', emoji: '🎹' }, { name: '기타', en: 'guitar', emoji: '🎸' },
    { name: '북', en: 'drum', emoji: '🥁' }, { name: '트럼펫', en: 'trumpet', emoji: '🎺' },
    { name: '바이올린', en: 'violin', emoji: '🎻' }, { name: '음표', en: 'music note', emoji: '🎵' }] },
  { key: 'pets', name: '반려동물', emoji: '🐶', ambient: 'none', key2: 2, items: [
    { name: '강아지', en: 'puppy', emoji: '🐶' }, { name: '고양이', en: 'kitten', emoji: '🐱' },
    { name: '햄스터', en: 'hamster', emoji: '🐹' }, { name: '금붕어', en: 'goldfish', emoji: '🐠' },
    { name: '뼈다귀', en: 'dog bone treat', emoji: '🦴' }, { name: '털실', en: 'ball of yarn', emoji: '🧶' }] },
  { key: 'kitchen', name: '맛있는 주방', emoji: '🍳', ambient: 'none', key2: 4, items: [
    { name: '피자', en: 'pizza slice', emoji: '🍕' }, { name: '햄버거', en: 'hamburger', emoji: '🍔' },
    { name: '주먹밥', en: 'rice ball', emoji: '🍙' }, { name: '계란후라이', en: 'fried egg', emoji: '🍳' },
    { name: '우유', en: 'milk carton', emoji: '🥛' }, { name: '빵', en: 'bread loaf', emoji: '🍞' }] },
  { key: 'harbor', name: '항구 마을', emoji: '⚓', ambient: 'sparkle', key2: 3, items: [
    { name: '돛단배', en: 'sailboat', emoji: '⛵' }, { name: '보트', en: 'speedboat', emoji: '🚤' },
    { name: '큰 배', en: 'cruise ship', emoji: '🚢' }, { name: '닻', en: 'anchor', emoji: '⚓' },
    { name: '돌고래', en: 'dolphin', emoji: '🐬' }, { name: '물개', en: 'seal', emoji: '🦭' }] },
  { key: 'construction', name: '공사장', emoji: '🚜', ambient: 'none', key2: 9, items: [
    { name: '트랙터', en: 'tractor', emoji: '🚜' }, { name: '트럭', en: 'dump truck', emoji: '🚚' },
    { name: '크레인', en: 'crane', emoji: '🏗️' }, { name: '안전모', en: 'yellow hard hat', emoji: '⛑️' },
    { name: '망치', en: 'toy hammer', emoji: '🔨' }, { name: '벽돌', en: 'bricks', emoji: '🧱' }] },
  { key: 'garden', name: '꽃 정원', emoji: '🌷', ambient: 'petals', key2: 1, items: [
    { name: '해바라기', en: 'sunflower', emoji: '🌻' }, { name: '장미', en: 'rose', emoji: '🌹' },
    { name: '튤립', en: 'tulip', emoji: '🌷' }, { name: '벚꽃', en: 'cherry blossom', emoji: '🌸' },
    { name: '새싹', en: 'sprout', emoji: '🌱' }, { name: '네잎클로버', en: 'four-leaf clover', emoji: '🍀' }] },
  { key: 'park', name: '신나는 놀이공원', emoji: '🎡', ambient: 'confetti', key2: 6, items: [
    { name: '기차', en: 'toy train', emoji: '🚂', draw: 'train' }, { name: '회전목마', en: 'carousel horse', emoji: '🎠' },
    { name: '관람차', en: 'ferris wheel', emoji: '🎡' }, { name: '풍선', en: 'balloons', emoji: '🎈' },
    { name: '팝콘', en: 'popcorn', emoji: '🍿' }, { name: '입장권', en: 'ticket', emoji: '🎟️' }] },
  { key: 'castle', name: '동화 성', emoji: '🏰', ambient: 'sparkle', key2: 8, items: [
    { name: '왕관', en: 'crown', emoji: '👑' }, { name: '성', en: 'tiny castle', emoji: '🏰' },
    { name: '유니콘', en: 'unicorn', emoji: '🦄' }, { name: '아기 용', en: 'baby dragon', emoji: '🐉' },
    { name: '요술봉', en: 'magic wand', emoji: '🪄' }, { name: '보석', en: 'gem', emoji: '💎' }] },
  { key: 'party', name: '생일 파티', emoji: '🎂', ambient: 'confetti', key2: 11, items: [
    { name: '생일 케이크', en: 'birthday cake', emoji: '🎂' }, { name: '선물', en: 'gift box', emoji: '🎁' },
    { name: '폭죽', en: 'party popper', emoji: '🎉' }, { name: '리본', en: 'pink ribbon', emoji: '🎀' },
    { name: '초콜릿', en: 'chocolate bar', emoji: '🍫' }, { name: '주스', en: 'juice box', emoji: '🧃' }] },
  { key: 'space', name: '우주 여행', emoji: '🚀', ambient: 'twinkle', key2: 1, items: [
    { name: '로켓', en: 'rocket', emoji: '🚀', draw: 'rocket' }, { name: 'UFO', en: 'flying saucer', emoji: '🛸', draw: 'ufo' },
    { name: '별', en: 'star', emoji: '⭐', draw: 'star' }, { name: '행성', en: 'ringed planet', emoji: '🪐', draw: 'planet' },
    { name: '달', en: 'crescent moon', emoji: '🌙' }, { name: '별똥별', en: 'comet', emoji: '☄️' }] },
];

// 아이템 고유 id: '<테마>.<순서>' (예: beach.0 = 게)
for (const t of THEMES) t.items.forEach((it, i) => { it.id = `${t.key}.${i}`; it.theme = t.key; Object.freeze(it); });
export const ITEMS = new Map(THEMES.flatMap((t) => t.items.map((it) => [it.id, it])));

export const VARIATIONS = [
  { key: 'day', label: '낮', emoji: '☀️', ambient: null, keyShift: 0 },
  { key: 'sunset', label: '노을', emoji: '🌇', ambient: null, keyShift: 2 },
  { key: 'night', label: '밤', emoji: '🌙', ambient: 'twinkle', keyShift: -3 },
  { key: 'special', label: '무지개 축제', emoji: '🌈', ambient: 'confetti', keyShift: 5 },
];
// 눈·거품처럼 테마 자체의 효과는 유지하고, 효과가 약한 테마만 분위기 효과로 바꿈
const KEEP_AMBIENT = new Set(['snow', 'bubbles']);

export const STAGE_COUNT = THEMES.length * VARIATIONS.length; // 100

const stageCache = new Map();
// 스테이지 번호(1부터) → 테마+분위기. 101부터는 다시 1번 구성으로
export function themeForStage(n) {
  const idx = (Math.max(1, n) - 1) % STAGE_COUNT;
  if (stageCache.has(idx)) return stageCache.get(idx);
  const t = THEMES[idx % THEMES.length], v = VARIATIONS[Math.floor(idx / THEMES.length)];
  const st = Object.freeze({
    ...t, id: idx + 1, variation: v, vkey: v.key, bgKey: `${t.key}:${v.key}`,
    ambient: v.ambient && !KEEP_AMBIENT.has(t.ambient) && (v.key === 'special' || t.ambient === 'none' || t.ambient === 'sparkle') ? v.ambient : t.ambient,
    key2: (t.key2 + v.keyShift + 12) % 12,
    fullName: v.key === 'day' ? t.name : `${t.name} · ${v.label}`,
  });
  stageCache.set(idx, st);
  return st;
}

export const themeByKey = (key) => THEMES.find((t) => t.key === key) || THEMES[0];
