// 정족산성 — 기다렸다가 쏜다.
//
// 선생님(2026-10-06):
//   「강화에 양헌수가 정족산성 관련하여 장계를 순서대로 놓는 것보단 프랑스 애들을 물리치는
//    미니게임이 좋지 않을까 싶어. 관련 어전회의와 근거 대기 등도 없애고 합쳐서 미니게임 하나
//    만들어 보자. 역사적으로 의미 있는 미니게임으로 만들어 보자. 그 결과 프랑스가 외규장각
//    의궤를 훔쳐 가는 스토리로 이어지도록.」
//
// ── 무엇을 손으로 하게 하는가 ─────────────────────────────────────────────
//
// 양헌수의 장계는 한 줄이다 — 「정족산성에 들어가 지키다가 **저들이 오르기를 기다려
// 쳤더니**, 저들이 죽은 자를 끌고 물러갔습니다.」 이 판은 그 「기다려」를 손으로 한다.
//
//   · 프랑스군의 총은 포수들의 화승총보다 훨씬 멀리 간다. 멀리서 쏘면 닿지 않고, 숨은
//     자리만 드러난다.                                   → 닿기 전에 쏘면 포수가 다친다.
//   · 그래서 성문 가까이 오를 때까지 기다린다.            → 밝은 띠 안에서 쏘아야 물러난다.
//   · 화승총은 한 번 쏘면 다시 재는 데 오래 걸린다.       → 쏜 문은 한동안 못 쏜다.
//   · 그렇다고 마냥 기다리면 성문에 붙는다.               → 붙으면 포수가 다친다.
//
// 「기다리기만 하면 이기는 판」이 되지 않게 한다(게임 재제작 실패 패턴 — 압박이 기다리기를
// 보상하면 손이 놀게 된다). 기다림에는 끝이 있고(성문), 두 문에 번갈아 오며, 멈춰 서서
// 먼저 쏘게 꾀는 무리가 있다.
//
// ── 지어낸 것과 아닌 것 ───────────────────────────────────────────────────
//
//   기록·교과서  양헌수 부대가 정족산성에서 프랑스군을 공격해 이겼다(교과서 108쪽).
//               숨어 기다렸다가 쳤다(장계).
//   재구성       몇 무리가 어느 문으로 어떤 차례로 왔는지, 포수가 몇이 다쳤는지.
//               그래서 화면에 사람 수·거리의 숫자를 적지 않는다.
//
// 이 파일은 셈만 한다. DOM 도 시계도 모른다 — 지난 시간(ms)을 받아 다음 상태를 낸다.

export const LANES = [
  { id: 'east', name: '동문', key: 'W' },
  { id: 'south', name: '남문', key: 'S' },
]

// 길 위의 자리는 0(성문) ~ 1(산 아래)이다.
export const REACH = 0.34          // 화승총이 닿는 곳 — 이 안에 들어야 맞는다
export const RELOAD_MS = 2600      // 한 번 쏘고 다시 재는 시간
export const HURT_LIMIT = 3        // 포수가 이만큼 다치면 더 버티지 못한다
export const FEINT_AT = 0.46       // 멈춰 서서 꾀는 자리(닿는 곳 바로 밖)
export const FEINT_MS = 1300
export const EXPOSED_HOLD_MS = 1500 // 자리가 드러나면 저들은 그 자리에 서서 쏜다 — 저들의 총은 거기서도 닿는다

// 무리가 오는 차례. at 은 판이 시작된 뒤의 ms, speed 는 초당 가는 길의 몫.
//
// ⚠ 같은 문에 잇달아 오는 두 무리(동문 17.5초 · 20.9초)는 「앞 무리를 쏘고 다시 재는 동안
//   뒷 무리가 붙는」 일이 없게 벌려 두었다 — 앞 무리를 가장 늦게(성문 코앞에서) 쏘아도
//   뒷 무리가 붙기 전에 다시 잴 수 있다. 해낼 수 없는 판을 내지 않는다
//   (tests/systems/jeongjok.test.js 가 전수로 잰다).
export const WAVES = [
  { at: 1200, lane: 'east', speed: 0.15 },
  { at: 6500, lane: 'south', speed: 0.16 },
  { at: 10500, lane: 'east', speed: 0.17, feint: true },
  { at: 12500, lane: 'south', speed: 0.17 },
  { at: 17500, lane: 'east', speed: 0.19 },
  { at: 19000, lane: 'south', speed: 0.18, feint: true },
  { at: 20900, lane: 'east', speed: 0.19 },
  { at: 25500, lane: 'south', speed: 0.21 },
  { at: 26500, lane: 'east', speed: 0.21 },
]

// 거듭할수록 거든다(systems/minigame.js 와 같은 뜻 — 벌이 아니라 도움이 쌓인다).
//   셋째 판부터  꾀는 무리가 없고, 닿는 곳에 들면 「지금」이 뜬다.
//   넷째 판부터  저들의 걸음이 느려지고, 포수가 더 버틴다.
export function easeFor(tries = 1) {
  return {
    feints: tries < 3,
    cue: tries >= 3,
    speed: tries >= 4 ? 0.82 : 1,
    hurtLimit: tries >= 4 ? HURT_LIMIT + 2 : HURT_LIMIT,
  }
}

export function createBattle({ tries = 1, waves = WAVES } = {}) {
  const ease = easeFor(tries)
  return {
    t: 0,
    tries,
    ease,
    waves: waves.map((w, i) => ({ ...w, id: `q${i}`, speed: w.speed * ease.speed, feint: !!w.feint && ease.feints })),
    next: 0,
    squads: [],                       // { id, lane, p, speed, feint, held, pause, exposed }
    reload: { east: 0, south: 0 },    // 다시 재는 데 남은 ms
    hurt: 0,
    repelled: 0,
    early: 0,                         // 닿기 전에 쏜 횟수
    breaches: 0,                      // 성문까지 붙은 횟수
    wasted: 0,                        // 빈 길에 쏜 횟수
    over: null,                       // 'won' | 'lost'
  }
}

export const inReach = squad => squad.p <= REACH
export const totalSquads = state => state.waves.length
export const resolved = state => state.repelled + state.breaches
export const reloadRatio = (state, lane) => Math.max(0, Math.min(1, state.reload[lane] / RELOAD_MS))
export const canFire = (state, lane) => !state.over && state.reload[lane] <= 0

// 그 문으로 오는 무리 가운데 성문에 가장 가까운 것.
export function frontSquad(state, lane) {
  let front = null
  for (const s of state.squads) if (s.lane === lane && (!front || s.p < front.p)) front = s
  return front
}

function finish(state, events) {
  if (state.over) return state
  if (state.hurt >= state.ease.hurtLimit) {
    events.push({ type: 'lost' })
    return { ...state, over: 'lost' }
  }
  if (state.next >= state.waves.length && state.squads.length === 0) {
    events.push({ type: 'won' })
    return { ...state, over: 'won' }
  }
  return state
}

/** 시간이 흐른다. 돌려주는 것: { state, events } */
export function tick(state, dtMs) {
  if (state.over || !(dtMs > 0)) return { state, events: [] }
  const events = []
  const t = state.t + dtMs
  let { next, hurt, breaches } = state
  const squads = []

  // 길 위의 무리가 오른다.
  for (const s of state.squads) {
    let { p, held, pause } = s
    let left = dtMs
    if (pause > 0) { const stand = Math.min(pause, left); pause -= stand; left -= stand }
    if (left > 0 && s.feint && held < FEINT_MS) {
      const reachIn = Math.max(0, (p - FEINT_AT) / s.speed * 1000)   // 멈출 자리까지 남은 시간
      if (reachIn >= left) { p -= s.speed * left / 1000; left = 0 } else {
        p = Math.min(p, FEINT_AT); left -= reachIn
        const hold = Math.min(left, FEINT_MS - held)
        if (held === 0 && hold > 0) events.push({ type: 'feint', lane: s.lane, id: s.id })
        held += hold; left -= hold
      }
    }
    if (left > 0) p -= s.speed * left / 1000
    if (p <= 0) {
      hurt++; breaches++
      events.push({ type: 'breach', lane: s.lane, id: s.id })
      continue
    }
    squads.push({ ...s, p, held, pause })
  }

  // 새 무리가 산 아래에 나타난다.
  while (next < state.waves.length && state.waves[next].at <= t) {
    const w = state.waves[next++]
    squads.push({ id: w.id, lane: w.lane, p: 1, speed: w.speed, feint: w.feint, held: 0, pause: 0, exposed: false })
    events.push({ type: 'spawn', lane: w.lane, id: w.id })
  }

  // 다시 잰다.
  const reload = {}
  for (const lane of Object.keys(state.reload)) {
    const before = state.reload[lane]
    reload[lane] = Math.max(0, before - dtMs)
    if (before > 0 && reload[lane] === 0) events.push({ type: 'ready', lane })
  }

  return { state: finish({ ...state, t, next, squads, reload, hurt, breaches }, events), events }
}

/** 그 문의 포수들에게 쏘라고 한다. 돌려주는 것: { state, events } */
export function fire(state, lane) {
  if (state.over || !(lane in state.reload)) return { state, events: [] }
  if (state.reload[lane] > 0) return { state, events: [{ type: 'notready', lane }] }
  const events = []
  const reload = { ...state.reload, [lane]: RELOAD_MS }
  const front = frontSquad(state, lane)

  if (!front) {
    events.push({ type: 'empty', lane })
    return { state: { ...state, reload, wasted: state.wasted + 1 }, events }
  }
  if (!inReach(front)) {
    // 닿지 않는다. 숨은 자리가 드러나고, 저들은 선 자리에서 쏜다 — 저들의 총은 여기까지 닿는다.
    // 그동안 저들은 오르지 않는다(EXPOSED_HOLD_MS): 다시 잴 틈은 남는다. 한 번의 조급함이
    // 곧바로 「성문까지 붙음」으로 이어져 두 번 다치는 일은 없게 한다.
    events.push({ type: 'early', lane, id: front.id })
    const squads = state.squads.map(s => (s.id === front.id ? { ...s, exposed: true, held: FEINT_MS, pause: EXPOSED_HOLD_MS } : s))
    return { state: finish({ ...state, reload, squads, early: state.early + 1, hurt: state.hurt + 1 }, events), events }
  }
  events.push({ type: 'hit', lane, id: front.id })
  const squads = state.squads.filter(s => s.id !== front.id)
  return { state: finish({ ...state, reload, squads, repelled: state.repelled + 1 }, events), events }
}

// ── 판이 끝난 뒤 ───────────────────────────────────────────────────────────

export const BATTLE_LINES = {
  hit: '「쏴라!」 — 저들이 흩어져 물러난다.',
  early: '너무 일렀다. 총알은 닿지 못했고, 포수들이 숨은 자리가 드러났다.',
  breach: '저들이 성문까지 붙었다. 포수가 다쳤다.',
  empty: '빈 길에 쏘았다. 다시 재는 동안은 쏠 수 없다.',
  notready: '아직 재는 중이다.',
  feint: '저들이 멈춰 섰다. 닿는 곳 바로 밖이다 — 먼저 쏘게 꾀는 것이다.',
  cue: '지금 —',
}

// 「아직」 화면에 실을 까닭 — 무엇 때문에 버티지 못했는가를 그 판의 말로 적는다.
export function againReason(state) {
  return state.early >= state.breaches
    ? '저들이 닿는 곳에 들기 전에 쏘았다. 멀리서 쏘면 포수들이 숨은 자리만 드러난다.'
    : '저들이 성문까지 붙었다. 밝은 띠 안에 들어서면 미루지 말고 쏘아야 한다.'
}

export const AGAIN_COPY = {
  hint: '저들이 밝은 띠 안으로 들어설 때까지 기다렸다가, 들어서면 곧바로 쏘십시오.',
  strong: '화승총은 한 번 쏘면 다시 재는 동안 쏠 수 없습니다. 빈 길에 쏘지 말고, 멈춰 선 무리에 속지 마십시오.',
}

// 기록에 남길 한 줄 — 학생이 그 밤을 어떻게 치렀는가.
export function battleSummary(state, tries = state.tries) {
  const parts = [`${tries === 1 ? '첫 판에' : `${tries}판 만에`} 프랑스군을 물리쳤다`]
  if (state.early) parts.push(`닿기 전에 쏜 것 ${state.early}번`)
  if (state.breaches) parts.push(`성문까지 붙은 것 ${state.breaches}번`)
  if (!state.early && !state.breaches) parts.push('한 번도 먼저 쏘지 않고 끝까지 기다렸다')
  return `정족산성 — ${parts.join(' · ')}`
}

export function battleResult(state, tries = state.tries) {
  const stats = { early: state.early, breaches: state.breaches, wasted: state.wasted, repelled: state.repelled }
  if (state.over === 'won') return { cleared: true, stats, summary: battleSummary(state, tries) }
  return { cleared: false, stats, reason: againReason(state) }
}
