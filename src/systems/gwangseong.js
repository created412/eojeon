// 광성보 — 닿지 않는 포.
//
// 선생님(2026-10-06), 광성보 장계 화면을 보고:
//   「이거도 좀 더 재미있는 게임으로 다시 만들어, 지금 애들은 그냥 광성보, 초지진 글자만 보고
//    맞춰서 넣을거 같아. 사료를 전혀 읽지 않을거 같다고」
//
// 예전에는 장계 두 통을 지도의 이름표에 맞춰 놓는 판이었다. 글자를 맞추면 끝났고, 읽을 까닭이
// 없었다. 이제는 **싸우고 나서 읽는다.** 교과서 109쪽이 실은 미군 장교의 글은 세 문장이다:
//
//   「조선군은 낡은 무기를 가지고 근대적인 미국 대포에 맞서 싸워 이기려 하였다.
//     그들은 제압당하기 전까지 결사적으로 싸웠고, 아무런 두려움 없이 진지에서 영웅적으로 전사했다.
//     가족과 국가를 위해 이보다 더 용감하게 싸운 국민은 찾아볼 수 없다.」 — 슐리, 『깃발 아래 45년』
//
// 이 판은 그 첫 문장을 손으로 한다. 판을 덮으면 그 글이 문서로 온다 — 방금 겪은 것을 글에서 찾는다.
//
// ── 무엇을 손으로 하게 하는가 ─────────────────────────────────────────────
//
// 다섯 해 전 정족산성(systems/jeongjok.js)에서 학생은 「기다렸다가 쏜다」로 이겼다. 여기서는
// **같은 손이 통하지 않는다.**
//
//   포격   저들의 배는 우리 포가 닿는 곳 밖에 서서 쏜다. 쏘아도 물에 떨어지고, 기다려도 저들은
//          들어오지 않는다. 성벽만 깎인다.
//   상륙   저들이 뭍에 오른다. 화승총이 닿는 띠 안에서 쏘면 한 무리는 물러난다 — 정족산성과 같다.
//          그러나 다시 재는 동안 다음 무리가 오고, 저들의 포는 그동안에도 성벽을 때린다.
//   끝     성벽이 뚫린다. 아무도 떠나지 않는다. 장수의 깃발(수자기)이 내려진다.
//
// ⚠ **이길 수 없는 판이다.** 잘하면 더 오래 버티고 더 많은 무리를 물리지만, 끝은 같다 — 기록이
//   그렇다. 그래서 이 판에는 「아직 — 다시」가 없다(다른 손으로 하는 판들과 다르다). 끝난 뒤의
//   글이 그것을 분명히 말한다: 솜씨가 모자라서가 아니다.
// ⚠ 압박이 「기다리기」를 보상하지 않게 한다(게임 재제작 실패 패턴). 포격에서는 기다려도
//   나아지는 것이 없고, 상륙에서는 기다리면 그대로 붙는다.
//
// ── 지어낸 것과 아닌 것 ───────────────────────────────────────────────────
//   교과서   어재연이 이끄는 조선군이 광성보에서 미군에 맞서 싸웠지만 패하였다. 그 뒤에도 조선
//            정부가 협상에 나서지 않자 미군은 물러났다(109쪽). 낡은 무기와 근대적 대포(슐리의 글).
//            미국 함대는 초지진 → 덕진진 → 광성보로 올라왔다(109쪽 지도). 수자기.
//   재구성   포를 몇 번 쏘았고 몇 무리가 어떤 차례로 올랐는지. 그래서 화면에 사람 수·거리의
//            숫자를 적지 않는다.
//
// 이 파일은 셈만 한다. DOM 도 시계도 모른다 — 지난 시간(ms)을 받아 다음 상태를 낸다.

// 자리는 0(성벽) ~ 1(바다 저편)이다.
export const CANNON_REACH = 0.44       // 우리 포가 닿는 곳
export const SHIP_AT = [0.74, 0.9]     // 저들의 배가 선 자리 — 언제나 그 밖이다
export const CANNON_RELOAD_MS = 2300
export const GUN_REACH = 0.3           // 화승총이 닿는 곳(상륙)
export const GUN_RELOAD_MS = 2600

export const WALL_MAX = 6              // 성벽의 마디
export const BOMBARD_MIN_MS = 9000     // 적어도 이만큼은 포격이 이어진다
export const BOMBARD_MAX_MS = 15500
export const BOMBARD_SHOTS = 3         // 포를 이만큼 쏘아 보면(다 물에 떨어진다) 다음으로 넘어갈 수 있다
// 포격 동안 날아오는 저들의 포탄(판이 시작된 뒤의 ms). 성벽 한 마디씩을 깎는다.
export const SHELLS = [1800, 4300, 6700, 9100, 11500, 13900]
export const BOMBARD_WALL_FLOOR = 3    // 포격으로는 여기까지만 깎인다 — 나머지는 상륙에서

// 상륙. at 은 상륙이 시작된 뒤의 ms, speed 는 초당 가는 길의 몫.
// ⚠ 무리는 다시 재는 시간(2.6초)보다 촘촘히 온다 — 쏘는 족족 맞혀도 뒤가 밀린다.
export const LANDING_WAVES = [
  { at: 700, speed: 0.19 }, { at: 2500, speed: 0.2 }, { at: 4200, speed: 0.2 }, { at: 5800, speed: 0.21 },
  { at: 7300, speed: 0.22 }, { at: 8700, speed: 0.22 }, { at: 10000, speed: 0.23 }, { at: 11200, speed: 0.24 },
  { at: 12300, speed: 0.24 }, { at: 13300, speed: 0.25 }, { at: 14200, speed: 0.26 }, { at: 15000, speed: 0.27 },
  { at: 15700, speed: 0.28 }, { at: 16300, speed: 0.3 },
]
export const HOWITZER_EVERY_MS = 3400  // 뭍에 올린 저들의 포 — 상륙 동안에도 성벽을 때린다
export const BREACH_LIMIT = 3          // 이만큼 성벽에 붙으면 뚫린다
export const LAST_MS = 5200            // 뚫린 뒤, 깃발이 내려지기까지

export function createStand() {
  return {
    stage: 'bombard',        // 'bombard' → 'landing' → 'last' → 'over'
    t: 0,                    // 판 전체의 시간
    stageT: 0,               // 지금 걸음에 들어선 뒤의 시간
    wall: WALL_MAX,
    cannonReload: 0,
    gunReload: 0,
    cannonShots: 0,          // 쏜 포 — 닿은 것은 없다
    nextShell: 0,
    squads: [],              // { id, p, speed }
    nextWave: 0,
    nextHowitzer: HOWITZER_EVERY_MS,
    repelled: 0,
    breaches: 0,
    wasted: 0,               // 닿기 전에, 또는 빈 뭍에 쏜 화승총
    heldMs: 0,               // 상륙을 버틴 시간
  }
}

export const isOver = state => state.stage === 'over'
export const cannonRatio = state => Math.max(0, Math.min(1, state.cannonReload / CANNON_RELOAD_MS))
export const gunRatio = state => Math.max(0, Math.min(1, state.gunReload / GUN_RELOAD_MS))
export const inGunReach = squad => squad.p <= GUN_REACH
export function frontSquad(state) {
  let front = null
  for (const s of state.squads) if (!front || s.p < front.p) front = s
  return front
}
// 지금 [쏴라]가 무엇을 쏘는가 — 포격에서는 포, 상륙에서는 화승총.
export const weaponOf = state => (state.stage === 'bombard' ? 'cannon' : state.stage === 'landing' ? 'gun' : null)

function enter(state, stage, events) {
  events.push({ type: 'stage', stage })
  return { ...state, stage, stageT: 0 }
}

/** 시간이 흐른다. 돌려주는 것: { state, events } */
export function tick(state, dtMs) {
  if (isOver(state) || !(dtMs > 0)) return { state, events: [] }
  const events = []
  let s = { ...state, t: state.t + dtMs, stageT: state.stageT + dtMs,
    cannonReload: Math.max(0, state.cannonReload - dtMs), gunReload: Math.max(0, state.gunReload - dtMs) }
  if (state.cannonReload > 0 && s.cannonReload === 0 && s.stage === 'bombard') events.push({ type: 'ready', weapon: 'cannon' })
  if (state.gunReload > 0 && s.gunReload === 0 && s.stage === 'landing') events.push({ type: 'ready', weapon: 'gun' })

  if (s.stage === 'bombard') {
    // 저들의 포탄이 온다. 우리가 쏘든 말든 온다.
    while (s.nextShell < SHELLS.length && SHELLS[s.nextShell] <= s.stageT) {
      const wall = Math.max(BOMBARD_WALL_FLOOR, s.wall - 1)
      events.push({ type: 'shell', from: SHIP_AT[s.nextShell % SHIP_AT.length], broke: wall < s.wall })
      s = { ...s, wall, nextShell: s.nextShell + 1 }
    }
    const tried = s.cannonShots >= BOMBARD_SHOTS && s.stageT >= BOMBARD_MIN_MS
    if (tried || s.stageT >= BOMBARD_MAX_MS) s = enter(s, 'landing', events)
    return { state: s, events }
  }

  if (s.stage === 'landing') {
    let { breaches, wall } = s
    const squads = []
    for (const q of s.squads) {
      const p = q.p - q.speed * dtMs / 1000
      if (p <= 0) { breaches++; wall = Math.max(1, wall - 1); events.push({ type: 'breach', id: q.id }); continue }
      squads.push({ ...q, p })
    }
    let { nextWave, nextHowitzer } = s
    while (nextWave < LANDING_WAVES.length && LANDING_WAVES[nextWave].at <= s.stageT) {
      const w = LANDING_WAVES[nextWave]
      squads.push({ id: `m${nextWave}`, p: 1, speed: w.speed })
      events.push({ type: 'spawn', id: `m${nextWave}` })
      nextWave++
    }
    while (nextHowitzer <= s.stageT) {
      const before = wall
      wall = Math.max(1, wall - 1)
      events.push({ type: 'shell', from: 0.62, broke: wall < before, howitzer: true })
      nextHowitzer += HOWITZER_EVERY_MS
    }
    s = { ...s, squads, breaches, wall, nextWave, nextHowitzer, heldMs: s.stageT }
    if (breaches >= BREACH_LIMIT) {
      events.push({ type: 'fallen' })
      s = enter({ ...s, wall: 0 }, 'last', events)
    }
    return { state: s, events }
  }

  // 'last' — 손댈 것이 없다. 깃발이 내려진다.
  if (s.stageT >= LAST_MS) {
    events.push({ type: 'over' })
    s = { ...s, stage: 'over' }
  }
  return { state: s, events }
}

/** [쏴라]. 포격에서는 포를, 상륙에서는 화승총을 쏜다. 돌려주는 것: { state, events } */
export function fire(state) {
  const weapon = weaponOf(state)
  if (!weapon) return { state, events: [] }
  if (weapon === 'cannon') {
    if (state.cannonReload > 0) return { state, events: [{ type: 'notready', weapon }] }
    // 닿지 않는다. 언제 쏘든, 몇 번을 쏘든.
    return { state: { ...state, cannonReload: CANNON_RELOAD_MS, cannonShots: state.cannonShots + 1 },
      events: [{ type: 'short', at: CANNON_REACH }] }
  }
  if (state.gunReload > 0) return { state, events: [{ type: 'notready', weapon }] }
  const front = frontSquad(state)
  if (!front || !inGunReach(front)) {
    return { state: { ...state, gunReload: GUN_RELOAD_MS, wasted: state.wasted + 1 },
      events: [{ type: front ? 'early' : 'empty', id: front?.id ?? null }] }
  }
  return { state: { ...state, gunReload: GUN_RELOAD_MS, squads: state.squads.filter(q => q.id !== front.id), repelled: state.repelled + 1 },
    events: [{ type: 'hit', id: front.id }] }
}

// ── 화면에 띄우는 한 줄들 ─────────────────────────────────────────────────
export const STAND_LINES = {
  bombard: '저들의 배가 해협에 섰다. 포를 쏜다.',
  short: '닿지 않는다. 포탄이 물에 떨어진다.',
  shortAgain: '또 닿지 않는다. 저들의 배는 우리 포가 닿는 곳 밖에 서 있다.',
  shell: '저들의 포탄이 성벽을 때린다.',
  idle: '기다려도 저들은 닿는 곳 안으로 들어오지 않는다.',
  landing: '저들이 뭍에 올랐다. 화승총이 닿는 띠 안에 들 때까지 기다렸다가 쏜다.',
  hit: '한 무리가 물러난다. 그러나 뒤가 이어진다.',
  early: '너무 일렀다. 다시 재는 동안 저들이 오른다.',
  empty: '빈 뭍에 쏘았다.',
  notready: '아직 재는 중이다.',
  breach: '성벽에 붙었다.',
  howitzer: '뭍에 올린 저들의 포가 성벽을 때린다.',
  fallen: '성벽이 뚫렸다. 아무도 성벽을 떠나지 않는다.',
  flag: '장수의 깃발, 수자기(帥字旗)가 내려진다.',
}

// 기록에 남길 한 줄 — 학생이 그 싸움을 어떻게 치렀는가. 매기지 않는다: 끝은 누구에게나 같다.
export function standSummary(state) {
  const parts = [
    state.cannonShots ? `포를 ${state.cannonShots}번 쏘았으나 한 번도 닿지 않았다` : '포를 쏘지 않고 기다렸으나 저들은 닿는 곳에 들어오지 않았다',
    state.repelled ? `뭍에 오른 무리를 ${state.repelled}번 물렸다` : '뭍에 오른 무리를 물리지 못했다',
    '성은 무너졌다',
  ]
  return `광성보 — ${parts.join(' · ')}`
}

export function standResult(state) {
  return {
    fallen: true,
    stats: { cannonShots: state.cannonShots, cannonHits: 0, repelled: state.repelled, breaches: state.breaches, wasted: state.wasted, heldMs: Math.round(state.heldMs) },
    summary: standSummary(state),
  }
}
