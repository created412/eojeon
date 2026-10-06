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
// 가마가 나가는 길 — **문간 한가운데**를 지난다.
//
// 선생님(2026-10-06, 녹화를 보고): 「가마가 기둥을 뚫고 간다든지, 모시고 가는 와중에 갑자기
// 순간적으로 이동한다든지 … 자연스럽지 않은 움직임과 가마 행렬이 있어.」
// 예전에는 가마가 선 자리(대문 **옆**, 문간 정통을 막지 않으려고 비껴 대 둔 자리)에서
// 곧장 남쪽으로 직진했다 — 그 선은 대문의 오른쪽 기둥 위를 지난다(render/palace.js 의
// 기둥은 칸의 경계에 서고, 가운데 칸만 비어 있다). 그래서 기둥을 뚫고 나갔다.
// 이제 먼저 문간 앞 한가운데로 옮겨 서고, 거기서 문을 지나 나간다.
//   spec   가마가 선 자리 { x, z }
//   gate   대문 방 { x, z, d }  — x 가 문간의 가운데다
//   beyond 문을 지나 더 나아가는 거리(CARRY_BEYOND)
export function carryPathFor(spec, gate, beyond = CARRY_BEYOND) {
  if (!gate) return [{ x: spec.x, z: spec.z }, { x: spec.x, z: spec.z + beyond }]
  const dir = Math.sign(gate.z - spec.z) || 1            // 문이 가마의 어느 쪽인가(운현궁은 +z)
  const approach = { x: gate.x, z: gate.z - dir * ((gate.d ?? 4) / 2 + 1.0) }   // 문간 바로 앞, 가운데
  const through = { x: gate.x, z: gate.z }
  const out = { x: gate.x, z: gate.z + dir * beyond }
  return [{ x: spec.x, z: spec.z }, approach, through, out]
}

// 카메라가 보는 자리 — 가마 뒤로 한 발 처져서 따라간다. 메기 시작하는 순간 **튀지 않는다**:
// 가마 옆에 서 있던 자리(beside)에서 가마 뒤(gama - trail)로 처음 한 토막(BLEND) 동안 미끄러진다.
// 예전에는 carry 의 첫 프레임에 곧바로 가마 뒤로 옮겨 화면이 한 번에 4m 를 뛰었다.
export const CAMERA_BLEND = 0.3
export function cameraAnchorAt(beside, gama, dir, k, trail = CAMERA_TRAIL) {
  const len = Math.max(0.001, Math.hypot(dir.x, dir.z))
  const behind = { x: gama.x - (dir.x / len) * trail, z: gama.z - (dir.z / len) * trail }
  const t = Math.max(0, Math.min(1, k / CAMERA_BLEND))
  const e = t * t * (3 - 2 * t)
  return { x: beside.x + (behind.x - beside.x) * e, z: beside.z + (behind.z - beside.z) * e }
}

export function carryLiftAt(u) {
  const { phase, k } = boardAt(u)
  if (phase !== 'carry') return 0
  const up = Math.min(1, k / 0.18)
  const sway = Math.sin(k * Math.PI * 9) * 0.035 * up
  return up * 0.34 + sway
}
