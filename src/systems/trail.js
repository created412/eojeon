// 소식을 좇는다 — 사람을 보내 알아보지만, 소식은 언제나 한 걸음 늦다.
//
// 선생님(2026-10-06): 「대원군을 청군이 납치해 가는 게임 장면도 만들어야 할 거 같아.」
// (앞 문장: 「역사적 사실에 근거해서」.)
//
// 예전에는 글 한 장이었다 — 「눈앞에서 · 청의 군사들이 아버지를 데리고 나간다」. 그런데
// 그것은 사실과 다르다. 대원군은 궁에서 끌려 나간 것이 아니라, **청군의 군영으로 청함을
// 받아 간 자리에서** 붙잡혀 가마에 실렸고, 남양 마산포에서 배로 톈진에 보내졌다. 임금은
// 그 자리에 없었다. 임금이 아는 것은 뒤늦게 닿는 소식뿐이다.
//
// 그래서 이 판은 「붙잡는 장면」을 임금의 눈앞에 세우지 않는다. 학생은 사람을 보내 알아본다.
// 보낸 사람이 닿을 때마다 가마는 이미 그다음 자리에 가 있다 — 2막의 장계가 가르친 것
// (소식은 언제나 며칠 늦게 온다)이 여기서는 아버지의 일로 돌아온다. 조작권 D 의 막이다:
// 아무 키도 듣지 않고, 할 수 있는 것은 알아보는 것뿐이다.
//
// ── 지어낸 것과 아닌 것 ───────────────────────────────────────────────────
//   교과서      청이 군대를 보내 흥선 대원군을 납치하고 임오군란을 진압했다(115쪽).
//   사전        답례 간 군영에서 붙잡았다 · 밤길로 남양 마산포 · 청의 배 · 톈진(한국민족문화대백과사전 「임오군란」).
//   재구성      임금이 사람을 보내 알아보는 모습. 화면이 그렇게 밝힌다.
//
// 이 파일은 셈만 한다. DOM 도 시계도 모른다.

export function initialTrail() {
  return { leg: 0, moving: false, reports: [], done: false }
}

export const legsOf = beat => beat?.legs ?? []
export const placeOf = (beat, id) => (beat?.places ?? []).find(p => p.id === id) ?? null
export const currentLeg = (beat, state) => (state.done ? null : legsOf(beat)[state.leg] ?? null)

/** 사람을 보낸다(또는 소식을 기다린다). 가는 동안에는 다시 보낼 수 없다. */
export function send(beat, state) {
  if (state.done || state.moving || !currentLeg(beat, state)) return state
  return { ...state, moving: true }
}

/** 보낸 사람이 닿았다 — 그 자리의 소식이 풀린다. */
export function arrive(beat, state) {
  if (!state.moving) return state
  const leg = legsOf(beat)[state.leg]
  const next = state.leg + 1
  return { ...state, moving: false, leg: next, reports: [...state.reports, leg.report], done: next >= legsOf(beat).length }
}

// 보낸 사람이 지금 서 있는 자리(0~1). 바다는 건너지 못한다 — to 가 없는 걸음에서는 그대로 선다.
export function riderAt(beat, state) {
  let at = (beat?.places ?? [])[0]?.at ?? 0
  for (const leg of legsOf(beat).slice(0, state.leg)) {
    const place = placeOf(beat, leg.to)
    if (place) at = place.at
  }
  return at
}

// 소식이 말해 준, 아버지가 실려 간 자리(0~1). 첫 소식 전에는 모른다(null).
export function cargoAt(beat, state) {
  if (state.leg === 0) return null
  return legsOf(beat)[state.leg - 1].cargoAt
}

// 소식을 들었을 때 아버지는 그보다 얼마나 앞서 있는가. **언제나 0보다 크다.**
export function lagOf(beat, state) {
  const cargo = cargoAt(beat, state)
  return cargo == null ? null : cargo - riderAt(beat, state)
}

// 바다 위인가 — 가마가 배로 바뀌는 자리.
export function atSea(beat, at) {
  const shore = (beat?.places ?? []).find(p => p.shore)
  return shore != null && at != null && at > shore.at
}

export const trailRecord = (beat, state) => ({ asked: state.reports.length, done: state.done })
