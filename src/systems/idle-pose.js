// 서 있는 사람의 숨 — 「가만히 있음」을 「살아 있음」으로 바꾸는 값들.
//
// 선생님(2026-09-26): 「게임 캐릭터들이 누구는 움직이고 누구는 움직이지 않아.
// **전부 움직이고 있어야해.**」
//
// 그 말이 가리킨 것은 서성임(systems/palace-life.js)이 아니었다. 서성임은 이미
// 있었다 — 다만 **낮에만** 있었다. 알현에서 아뢰는 신하, 행렬에서 곁을 걷다 멈춘
// 사람, 정문의 수문장, 그리고 어좌 앞에 선 임금 자신은 완전히 굳어 있었다.
// 화면의 절반이 사람이고 절반이 인형이었으니, 선생님 눈에는 그것이 가장 먼저 보였다.
//
// 자리를 옮겨서 고칠 문제가 아니다. 알현·행렬은 매 프레임 신하의 자리를 직접 몬다
// (render/scene.js placeNpc). 거기에 걸음을 더하면 두 손이 한 사람을 잡아당긴다.
// 그래서 여기서 내는 것은 **자세뿐이다** — 자리는 한 뼘도 건드리지 않는다.
// 그래야 어느 국면에서든 안심하고 돌릴 수 있다.
//
// 이 파일은 DOM 도 three.js 도 모른다. 시각과 씨앗을 받아 뼈를 얼마나 돌릴지
// 라디안으로만 내놓는다 — 실제로 뼈를 돌리는 일은 render/glb-person.js 가 한다.
// 그래서 시험이 브라우저 없이 이 값들을 붙들 수 있다.
//
// ⚠ **Math.random() 을 쓰지 않는다.** 사람마다 박자가 달라야 하지만(같은 박자로
// 스물이 함께 숨쉬면 사람이 아니라 합창단이다), 그 다름은 이름에서 나와야 한다:
// 학생이 새로 고쳐도 같은 궁을 보고, 시험은 같은 시각에 같은 답을 받는다.

const TAU = Math.PI * 2

// 네 가지 결. 주기를 서로 나누어 떨어지지 않게 둔 까닭은, 나누어 떨어지면 몇 초마다
// 네 움직임이 한꺼번에 극점을 지나 「툭」 하는 박자가 생기기 때문이다.
export const IDLE = {
  // 숨 — 0.24Hz. 분당 14회쯤이니 평온하게 선 사람의 호흡이다. 선생님이 주신
  // 범위(0.2~0.28Hz) 가운데를 잡았다.
  breathHz: 0.24,
  breathSpine: 0.016,   // 허리가 펴지고 굽는 폭(rad, 약 0.9°) — 눈에 겨우 보일 만큼
  breathScale: 0.006,   // 가슴이 부푸는 배율(0.6%)
  breathNod: 0.03,      // 숨에 따라 고개가 아주 조금 끄덕인다

  // 늘어뜨린 팔 — 숨보다 느리다(0.13Hz, 7.7초에 한 번). 팔은 몸을 따라 흔들리는
  // 것이라 스스로 박자를 가지지 않는다: 느려야 「매달려 있다」로 읽힌다.
  armHz: 0.13,
  armSwing: 0.045,      // rad, 약 2.6° — 걸음의 팔(0.5rad)의 열 분의 일이다

  // 무게를 옮긴다 — 18초에 한 번. 오래 한 발에 기대 있다가 천천히 옮겨 간다.
  // 이 하나가 「서 있는 사람」과 「세워 둔 사람」을 가른다.
  shiftHz: 0.055,
  shiftLeg: 0.05,       // 기댄 발이 앞으로 조금 나간다
  shiftLean: 0.028,     // 몸이 기댄 쪽으로 조금 기운다

  // 고개 — 24초에 한 번, 그것도 한 번에 다 돌아보고 돌아온다. 늘 돌아가 있으면
  // 두리번거리는 사람이 되고, 궁에서 그것은 불안이다.
  lookHz: 0.041,
  lookYaw: 0.19,        // rad, 약 11°
}

function frac(v) { return v - Math.floor(v) }

// 이름에서 32비트 하나 — systems/palace-life.js 의 hashId 와 같은 FNV-1a 다.
// 같은 방식을 쓰는 까닭은, 어느 날 두 곳의 씨앗을 맞춰 보고 싶어질 수 있기 때문이다.
export function hashKey(key) {
  const s = String(key ?? '')
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function unit(h, i) {
  let x = (h ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0
  x ^= x << 13; x >>>= 0
  x ^= x >>> 17
  x ^= x << 5; x >>>= 0
  return x / 4294967296
}

/**
 * 사람 하나의 박자. 위상 네 개(0~1)와 고개를 어느 쪽으로 돌리는지.
 * 한 번만 만들어 들고 있는다 — 매 프레임 만들 것이 아니다.
 */
export function idleSeed(key) {
  const h = hashKey(key)
  return {
    breath: unit(h, 1),
    arm: unit(h, 2),
    shift: unit(h, 3),
    look: unit(h, 4),
    lookDir: unit(h, 5) < 0.5 ? -1 : 1,
  }
}

// 씨앗이 없는 사람(이름을 못 받은 몸)도 숨은 쉬어야 한다 — 다만 모두 같은 박자다.
export const NO_SEED = { breath: 0, arm: 0, shift: 0, look: 0, lookDir: 1 }

// 무게를 옮기는 곡선. 삼각파를 smoothstep 으로 누르면 양끝(한 발에 기댄 상태)에
// 오래 머물고 옮겨 가는 동안만 빠르다 — 사람이 실제로 그렇게 선다.
// u 0 → -1, u 0.5 → +1.
export function shiftCurve(u) {
  const tri = u < 0.5 ? u * 2 : 2 - u * 2
  const s = tri * tri * (3 - 2 * tri)
  return s * 2 - 1
}

// 「이따가 한 번」의 곡선. 한 바퀴의 절반 남짓은 0 이고, 정해진 구간에서만 0 → 1 → 0
// 으로 다녀온다. 양끝의 기울기가 0 이라 고개가 움직이기 시작하는 순간이 안 튄다.
export function occasional(u) {
  const a = 0.55, b = 0.95
  if (u < a || u > b) return 0
  const p = Math.sin(((u - a) / (b - a)) * Math.PI)
  return p * p
}

/**
 * 한 프레임의 자세. out 을 주면 거기에 쓴다 — 태블릿에서 돌아가는 게임이라
 * 프레임마다 객체를 새로 만들지 않는다(사람 열둘 × 60프레임 = 초당 720개).
 *
 * 내놓는 값은 모두 **뼈를 얼마나 돌릴지(rad)** 이고, scaleY 하나만 배율이다.
 * 자리는 없다 — 자리를 내놓지 않는 것이 이 모듈의 약속이다(머리말 참고).
 */
export function idlePose(tMs, seed, out = {}) {
  const t = tMs / 1000
  const s = seed ?? NO_SEED
  const breath = Math.sin(TAU * (IDLE.breathHz * t + s.breath))
  // 두 팔은 같은 쪽으로 흔들리되 박자가 조금 어긋난다. 걸음처럼 반대로 흔들면
  // 서 있는데도 걷는 것처럼 보이고, 완전히 같으면 인형의 두 팔이 된다.
  const armL = Math.sin(TAU * (IDLE.armHz * t + s.arm))
  const armR = Math.sin(TAU * (IDLE.armHz * t + s.arm + 0.31))
  const shift = shiftCurve(frac(IDLE.shiftHz * t + s.shift))
  const look = occasional(frac(IDLE.lookHz * t + s.look)) * s.lookDir

  out.breath = breath
  out.scaleY = 1 + breath * IDLE.breathScale
  out.spine = breath * IDLE.breathSpine
  out.lean = shift * IDLE.shiftLean
  out.armL = armL * IDLE.armSwing
  out.armR = armR * IDLE.armSwing * 0.85
  out.legL = shift * IDLE.shiftLeg
  out.legR = -shift * IDLE.shiftLeg
  out.headYaw = look * IDLE.lookYaw
  out.headNod = breath * IDLE.breathNod
  return out
}
