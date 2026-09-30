// 가마에 오르는 순간 — 1막에서 열두 살 명복이 임금이 되는 그 문턱이다.
//
// 선생님(2026-09-29) 지적 #18: 「탑승 이벤트」가 없다. 화면에는 「E — 가마에 오른다」고
// 적혀 있는데 누르면 그냥 다음 글 화면으로 넘어갔다. 대본이 말하는 일이 그림에서는
// 일어나지 않았다 — 이 게임이 반복해서 빠진 함정이다(render/yard-props.js 머리말).
//
// 이 파일은 **시간만 센다.** 임금과 가마와 교군이 어디 있는지는 main.js 가
// 이 값을 받아 그린다. 그래야 3D 없이 Node 에서 통째로 검사할 수 있다.
//
// 세 마디로 나눈다:
//   walk  임금이 가마 옆까지 걸어간다
//   enter 발을 걷고 안으로 든다 — 이때 임금이 보이지 않게 된다
//   carry 교군이 메고 대문을 나선다
//
// ⚠ 마디 길이를 비율(0..1)로 두는 까닭: 전체 시간은 대사 길이에 따라 늘어난다.
//   절대 ms 로 적어 두면 대사가 길어질 때 가마가 먼저 나가 버린다.
export const BOARD_SPANS = [
  { phase: 'walk', part: 0.34 },
  { phase: 'enter', part: 0.22 },
  { phase: 'carry', part: 0.44 },
]

export const BOARD_MS = 7200

// 가마가 나설 때 대문 쪽으로 더 나아가는 거리.
//
// ⚠ 너무 멀리 보내면 담장 **밖**으로 나가 버려, 사가 바깥의 아무것도 없는 땅에
//   가마가 떠 있는 그림이 된다(실제로 그렇게 찍혔다). 문간을 지나 멀어지는
//   것까지만 보여 주고 장면을 닫는다 — 떠났다는 것은 그것으로 충분히 읽힌다.
export const CARRY_BEYOND = 4.5

// 카메라가 가마 뒤로 얼마나 처져서 따라가는가. 0 이면 가마가 카메라에 겹쳐
// 화면에서 사라진다 — 떠나는 뒷모습을 보여 주려고 한 발 물린다.
export const CAMERA_TRAIL = 4.2

/**
 * u(0..1) 가 어느 마디의 어디쯤인가.
 * 돌려주는 것: { phase, k } — k 는 그 마디 안에서의 0..1.
 * 마디 경계에서는 **다음 마디의 0** 이 아니라 앞 마디의 1 로 끝나게 해,
 * 걷다가 멈추는 자리가 한 프레임 튀지 않게 한다.
 */
export function boardAt(u) {
  const t = Math.max(0, Math.min(1, u ?? 0))
  // 끝은 끝으로 딱 떨어뜨린다. 비율을 더해 나가면 0.34+0.22 의 부동소수 오차 때문에
  // 마지막 k 가 0.9999… 로 남아, 다 실려 간 가마가 한 뼘 덜 간 자리에서 멈춘다.
  if (t >= 1) return { phase: BOARD_SPANS[BOARD_SPANS.length - 1].phase, k: 1 }
  let acc = 0
  for (const [i, span] of BOARD_SPANS.entries()) {
    const end = acc + span.part
    if (t < end || i === BOARD_SPANS.length - 1) {
      const k = span.part === 0 ? 1 : Math.max(0, Math.min(1, (t - acc) / span.part))
      return { phase: span.phase, k }
    }
    acc = end
  }
  return { phase: 'carry', k: 1 }
}

// 임금이 보이는가. 발을 걷고 들어서는 동안 사라진다 — 가마는 안이 보이지 않는
// 물건이고, 그 안에 탄 사람이 화면에 남아 있으면 그림이 거짓말을 한다.
export function kingVisibleAt(u) {
  const { phase, k } = boardAt(u)
  if (phase === 'walk') return true
  if (phase === 'enter') return k < 0.55
  return false
}

// 메고 갈 때 가마가 살짝 들린다. 사람이 드는 물건이라 완전히 고르지 않게 —
// 들리고(0→1) 실려 가는 동안 조금 흔들린다.
export function carryLiftAt(u) {
  const { phase, k } = boardAt(u)
  if (phase !== 'carry') return 0
  const up = Math.min(1, k / 0.18)
  const sway = Math.sin(k * Math.PI * 9) * 0.035 * up
  return up * 0.34 + sway
}
