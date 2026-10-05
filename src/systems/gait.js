// 걸음의 완급 — 사람이 걷는 것처럼 보이게 하는 세 가지 셈.
//
// 선생님(2026-10-06): 「자연스러운 게임 움직임까지 바꿔.」
//
// 임금의 걸음이 부자연스러운 까닭을 재어 보니 넷이었다.
//
//   ① 눌렀다 하면 첫 프레임부터 최고 속도였고, 뗐다 하면 그 자리에 박혔다. 사람은
//      발을 떼며 속도가 붙고 멈출 때 한 걸음 더 디딘다 — 그것이 없으면 밀려 다니는
//      말(駒)로 보인다. 방향도 여덟 갈래로 꺾였다(자판은 여덟 방향뿐이다).
//   ② 걸음은 1/60초 고정 스텝으로 쌓이는데 화면은 제 박자(60·90·120·144Hz)로 그린다.
//      한 프레임에 스텝이 0번일 때도 2번일 때도 있어, 임금만 60Hz 로 뚝뚝 끊겨 움직이고
//      카메라는 부드럽게 따라가니 임금이 화면 안에서 떨었다. 「걷는 중」 판정도 프레임마다
//      켜졌다 꺼졌다 해서 팔 흔드는 폭이 출렁였다.
//   ③ 행렬에서 곁을 걷는 사람이 「한 프레임에 0.18m」씩 다가갔다 — 144Hz 기계에서는
//      초당 26m 로 튀고, 30Hz 로 떨어진 교실 태블릿에서는 초당 5m 라 임금을 못 따라왔다.
//   ④ 걸음의 박자(발을 딛는 빠르기)가 실제로 나아가는 속도와 따로 놀았다. 막 떼는
//      걸음도, 멈추는 걸음도 같은 박자로 발을 굴렀다.
//
// 이 파일은 그 셈만 한다. DOM 도 three.js 도 모른다 — main.js·render/scene.js 가 값을
// 받아 쓴다. 판정(벽·방·조작권)은 여전히 systems/movement.js 의 step() 하나가 한다.

// ── ① 눌린 방향을 따라가는 걸음 ────────────────────────────────────────────
//
// 시간 상수(ms). 붙는 쪽이 떼는 쪽보다 조금 길다 — 발을 떼는 데는 힘이 들고,
// 멈추는 것은 금방이다. 값이 크면 얼음 위를 걷는 것처럼 미끄러진다(200 을 넘기면
// 문 앞에서 서려다 문지방을 넘는다). 값이 작으면 고친 보람이 없다.
export const GAIT_RISE_MS = 130
export const GAIT_FALL_MS = 95
// 이보다 느리면 선 것으로 본다 — 지수 감쇠는 0 에 영영 닿지 않는다.
export const GAIT_REST = 0.06

/**
 * 지금의 걸음(cur)을 눌린 방향(want)으로 조금 옮긴다. 둘 다 { x, z } 이고 길이는 0~1 이다.
 * step() 은 축의 길이만큼 걸으므로, 이 값을 그대로 먹이면 속도가 따라 붙는다.
 *
 * 벡터째로 옮긴다 — 앞으로 가다 옆을 누르면 비스듬히 휘어 돌고, 뒤를 누르면
 * 속도가 죽었다가 반대로 붙는다. 방향과 빠르기를 따로 다루면 그 둘이 어긋난다.
 */
export function easeAxis(cur, want, dtMs) {
  const cx = cur?.x ?? 0, cz = cur?.z ?? 0
  const wx = want?.x ?? 0, wz = want?.z ?? 0
  const pressing = wx !== 0 || wz !== 0
  const tau = pressing ? GAIT_RISE_MS : GAIT_FALL_MS
  const k = 1 - Math.exp(-Math.max(0, dtMs) / tau)
  let x = cx + (wx - cx) * k
  let z = cz + (wz - cz) * k
  if (!pressing && Math.hypot(x, z) < GAIT_REST) return REST
  // 다 왔으면 딱 맞춘다 — 0.9997 로 영영 걷지 않게.
  if (pressing && Math.hypot(wx - x, wz - z) < 0.004) { x = wx; z = wz }
  return { x, z }
}

const REST = Object.freeze({ x: 0, z: 0 })
export const restAxis = () => REST

// ── ② 고정 스텝과 화면 사이를 잇는다 ────────────────────────────────────────
//
// 스텝이 놓은 자리 둘(바로 앞 스텝·이번 스텝) 사이를, 누적기에 남은 시간만큼 섞어
// 그린다. 한 스텝(16.7ms)만큼 늦게 보이지만 눈에는 그것이 안 보이고 끊김은 보인다.
//
// 임금의 자리(pos)는 장면들이 직접 옮기기도 한다 — 알현이 어좌 앞에 세우고, 행렬이
// 길 위에 놓고, 궁을 옮기면 시작 자리에 놓는다. 그것을 「섞어 둔 자리」로 덮어쓰면
// 임금이 엉뚱한 데로 끌려간다. 그래서 **남이 옮겼는지를 매번 확인한다** — 내가 놓아
// 둔 값과 다르면 남이 옮긴 것이고, 그때는 섞지 않고 그 자리를 그대로 받는다.
export function createStepBlend() {
  let prev = null     // 바로 앞 스텝의 자리
  let cur = null      // 이번 스텝의 자리(진짜 자리)
  let drawn = null    // 화면에 그리려고 pos 에 넣어 둔 자리

  const same = (a, b) => !!a && !!b && a.x === b.x && a.z === b.z
  const adopt = pos => { cur = { x: pos.x, z: pos.z }; prev = cur; drawn = null }

  return {
    /** 스텝을 돌리기 전에. 화면용 자리를 진짜 자리로 되돌린다. */
    begin(pos) {
      if (drawn && same(pos, drawn) && cur) { pos.x = cur.x; pos.z = cur.z; return }
      adopt(pos)   // 처음이거나, 지난 프레임 뒤에 누가 옮겼다
    },
    /** 고정 스텝 하나를 돌린 **뒤에**. before 는 그 스텝을 돌리기 전의 자리다. */
    stepped(before, pos) {
      prev = { x: before.x, z: before.z }
      cur = { x: pos.x, z: pos.z }
    },
    /**
     * 그리기 직전에. alpha 는 누적기에 남은 몫(0~1) — 걷는 국면이 아니면 1 을 준다.
     * 이 프레임에 누가 pos 를 직접 옮겼으면(행렬·가마) 그 자리를 그대로 둔다.
     */
    end(pos, alpha) {
      if (!cur || !same(pos, cur)) { adopt(pos); return pos }
      const a = Math.max(0, Math.min(1, alpha))
      drawn = { x: prev.x + (cur.x - prev.x) * a, z: prev.z + (cur.z - prev.z) * a }
      pos.x = drawn.x; pos.z = drawn.z
      return pos
    },
    /** 지금 진짜 자리(시험·디버그용). */
    actual() { return cur ? { ...cur } : null },
  }
}

// ── ③ 곁을 걷는 사람이 따라붙는 걸음 ────────────────────────────────────────
//
// 프레임이 아니라 **시간**으로 잰다. 가까우면 천천히, 멀면 빨리 — 다만 사람이 낼 수
// 있는 빠르기를 넘지 않는다. 그래서 대열에 들 때 스르르 다가와 서고, 임금이 서면
// 반 걸음 더 디디고 선다.
export const FOLLOW_MAX_SPEED = 13     // m/s — 임금의 걸음(9)보다 넉넉히 빠르다
export const FOLLOW_TAU_MS = 110       // 남은 거리를 좁히는 시간 상수
export const FOLLOW_SNAP = 0.02        // 이만큼 남으면 그 자리에 선다

/**
 * 지금 자리(at)에서 목표(to)로 dtMs 동안 다가간 자리.
 * 돌려주는 것: { x, z, moved } — moved 는 이번에 실제로 옮긴 거리(m).
 */
export function followStep(at, to, dtMs) {
  const dx = to.x - at.x, dz = to.z - at.z
  const d = Math.hypot(dx, dz)
  if (d <= FOLLOW_SNAP) return { x: to.x, z: to.z, moved: d }
  const dt = Math.max(0, Math.min(100, dtMs))   // 탭을 떠났다 돌아와도 한 번에 날아가지 않는다
  const want = d * (1 - Math.exp(-dt / FOLLOW_TAU_MS))
  const go = Math.min(d, want, FOLLOW_MAX_SPEED * dt / 1000)
  return { x: at.x + (dx / d) * go, z: at.z + (dz / d) * go, moved: go }
}

// ── ④ 걸음의 박자 ───────────────────────────────────────────────────────────
//
// 나아가는 빠르기에 맞춰 발을 구른다. 기준 속도(임금의 걸음)에서 1 이고, 막 떼는
// 걸음과 멈추는 걸음에서는 느려진다. 너무 느려지면 슬로모션이 되므로 바닥을 둔다.
export const PACE_MIN = 0.45
export const PACE_MAX = 1.2
// 이보다 느리면 걷는 것이 아니라 서 있는 것이다(m/s). 프레임 수가 아니라 속도로 잰다 —
// 예전에는 「한 프레임에 3mm」로 쟀고, 그 문턱이 주사율에 따라 달랐다.
export const WALKING_SPEED = 0.6

/** speed(m/s)로 걷는 사람의 걸음 박자 배율. ref 는 평소 걸음의 속도다. */
export function paceFor(speed, ref) {
  if (!(speed > 0) || !(ref > 0)) return PACE_MIN
  return Math.max(PACE_MIN, Math.min(PACE_MAX, speed / ref))
}
