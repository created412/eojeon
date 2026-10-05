import { describe, it, expect } from 'vitest'
import {
  LANES, REACH, RELOAD_MS, HURT_LIMIT, FEINT_AT, FEINT_MS, EXPOSED_HOLD_MS, WAVES,
  easeFor, createBattle, tick, fire, frontSquad, inReach, canFire, reloadRatio, totalSquads, resolved,
  battleResult, battleSummary, againReason, BATTLE_LINES, AGAIN_COPY,
} from '../../src/systems/jeongjok.js'
import { battleHtml, introHtml, resultHtml } from '../../src/ui/jeongjok.js'
import { againView } from '../../src/systems/minigame.js'
import { ACTS } from '../../src/data/acts.js'
import { describeDecision } from '../../src/main.js'

// ── 정족산성 — 기다렸다가 쏜다 (2026-10-06) ───────────────────────────────
//
// 선생님: 「프랑스 애들을 물리치는 미니게임이 좋지 않을까 싶어. … 역사적으로 의미 있는
// 미니게임으로 만들어 보자. 그 결과 프랑스가 외규장각 의궤를 훔쳐 가는 스토리로 이어지도록.」
//
// 여기서 재는 것:
//   · 장계의 한 줄(「저들이 오르기를 기다려 쳤더니」)이 규칙이 되어 있는가 — 일찍 쏘면 다치고,
//     닿는 곳에서 쏘면 물러나고, 마냥 기다리면 성문에 붙는다.
//   · 해낼 수 있는 판인가 — 가장 굼뜬 손으로도, 가장 늦게 쏘아도.
//   · 못 해내면 넘어가지 못하는가, 그리고 거듭할수록 거드는가.

const STEP = 16

// 판을 끝까지 돌린다. decide(state) 가 쏠 문의 목록을 돌려준다.
function play(decide, { tries = 1, maxMs = 90000 } = {}) {
  let state = createBattle({ tries })
  const log = []
  for (let t = 0; t < maxMs && !state.over; t += STEP) {
    const r = tick(state, STEP)
    state = r.state
    log.push(...r.events)
    for (const lane of decide(state) ?? []) {
      const f = fire(state, lane)
      state = f.state
      log.push(...f.events)
    }
  }
  return { state, log }
}

// 닿는 곳의 depth(0=띠에 막 들어섰을 때 ~ 1=성문 코앞)에서 쏘는 손.
const patient = depth => state => LANES.map(l => l.id).filter(lane => {
  const front = frontSquad(state, lane)
  return front && canFire(state, lane) && front.p <= REACH * (1 - depth)
})

describe('규칙 — 장계의 한 줄이 손에 잡힌다', () => {
  it('두 문이 있다 — 동문 · 남문', () => {
    expect(LANES.map(l => l.name)).toEqual(['동문', '남문'])
  })

  it('닿는 곳에 든 무리를 쏘면 물러난다', () => {
    let s = createBattle()
    while (!frontSquad(s, 'east') || !inReach(frontSquad(s, 'east'))) s = tick(s, STEP).state
    const r = fire(s, 'east')
    expect(r.events.map(e => e.type)).toEqual(['hit'])
    expect(r.state.repelled).toBe(1)
    expect(r.state.hurt).toBe(0)
    expect(frontSquad(r.state, 'east')).toBeNull()
  })

  it('닿기 전에 쏘면 총알이 닿지 않고 포수가 다친다 — 저들의 총은 거기서도 닿는다', () => {
    let s = createBattle()
    while (!frontSquad(s, 'east')) s = tick(s, STEP).state
    expect(inReach(frontSquad(s, 'east'))).toBe(false)
    const r = fire(s, 'east')
    expect(r.events.map(e => e.type)).toEqual(['early'])
    expect(r.state.hurt).toBe(1)
    expect(r.state.early).toBe(1)
    expect(r.state.repelled).toBe(0)
    // 무리는 그대로 길 위에 있고, 자리가 드러났다.
    expect(frontSquad(r.state, 'east').exposed).toBe(true)
  })

  it('한 번 쏘면 다시 재는 동안은 그 문에서 쏠 수 없다 — 문마다 따로 잰다', () => {
    let s = createBattle()
    s = fire(s, 'east').state
    expect(canFire(s, 'east')).toBe(false)
    expect(canFire(s, 'south')).toBe(true)
    expect(reloadRatio(s, 'east')).toBe(1)
    expect(fire(s, 'east').events.map(e => e.type)).toEqual(['notready'])
    const after = tick(s, RELOAD_MS)
    expect(canFire(after.state, 'east')).toBe(true)
    expect(after.events.some(e => e.type === 'ready' && e.lane === 'east')).toBe(true)
  })

  it('빈 길에 쏘면 다치지는 않지만 다시 재야 한다', () => {
    const r = fire(createBattle(), 'south')
    expect(r.events.map(e => e.type)).toEqual(['empty'])
    expect(r.state.hurt).toBe(0)
    expect(r.state.wasted).toBe(1)
    expect(canFire(r.state, 'south')).toBe(false)
  })

  it('마냥 기다리면 성문까지 붙는다 — 기다리기만 해서는 이기지 못한다', () => {
    const { state } = play(() => [])
    expect(state.over).toBe('lost')
    expect(state.breaches).toBe(HURT_LIMIT)
    expect(state.repelled).toBe(0)
    expect(againReason(state)).toContain('성문까지 붙었다')
  })

  it('보이는 대로 쏘면 버티지 못한다 — 일찍 쏜 것이 까닭으로 적힌다', () => {
    const eager = state => LANES.map(l => l.id).filter(lane => frontSquad(state, lane) && canFire(state, lane))
    const { state } = play(eager)
    expect(state.over).toBe('lost')
    expect(state.early).toBeGreaterThanOrEqual(2)
    expect(againReason(state)).toContain('닿는 곳에 들기 전에 쏘았다')
    expect(battleResult(state).cleared).toBe(false)
  })

  it('멈춰 서서 꾀는 무리가 있다 — 닿는 곳 바로 밖에서 선다', () => {
    expect(FEINT_AT).toBeGreaterThan(REACH)
    expect(WAVES.some(w => w.feint)).toBe(true)
    const { log } = play(patient(0.3))
    expect(log.some(e => e.type === 'feint')).toBe(true)
  })

  it('자리가 드러난 뒤에도 다시 잴 틈은 남는다 — 한 번의 조급함이 두 번 다치게 하지 않는다', () => {
    // 꾀는 무리가 멈춰 선 바로 그때 쏘아 버린 다음, 그 뒤로는 참을성 있게 쏜다.
    let s = createBattle()
    let fooled = false
    for (let t = 0; t < 90000 && !s.over; t += STEP) {
      const r = tick(s, STEP)
      s = r.state
      if (!fooled && r.events.some(e => e.type === 'feint')) {
        const lane = r.events.find(e => e.type === 'feint').lane
        s = fire(s, lane).state
        fooled = true
        continue
      }
      for (const lane of patient(0.2)(s)) s = fire(s, lane).state
    }
    expect(fooled).toBe(true)
    expect(s.over).toBe('won')
    expect(s.early).toBe(1)
    expect(s.breaches).toBe(0)
    expect(EXPOSED_HOLD_MS + (FEINT_AT / 0.21) * 1000).toBeGreaterThan(RELOAD_MS)
  })
})

describe('해낼 수 있는 판이다', () => {
  // 띠에 막 들어섰을 때부터 성문 코앞까지 — 어느 깊이에서 쏘아도 끝까지 물리칠 수 있다.
  it.each([0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9])('닿는 곳의 %s 깊이에서 쏘는 손으로 한 번도 다치지 않고 끝낸다', depth => {
    const { state } = play(patient(depth))
    expect(state.over).toBe('won')
    expect(state.repelled).toBe(totalSquads(state))
    expect(state.hurt).toBe(0)
  })

  it('반응이 0.3초 늦은 손도 끝낸다', () => {
    // 띠에 든 것을 본 뒤 0.3초가 지나서야 누른다.
    const seen = new Map()
    let clock = 0
    const slow = state => {
      clock += STEP
      const out = []
      for (const { id } of LANES) {
        const front = frontSquad(state, id)
        if (!front || !inReach(front)) continue
        if (!seen.has(front.id)) seen.set(front.id, clock)
        if (clock - seen.get(front.id) >= 300 && canFire(state, id)) out.push(id)
      }
      return out
    }
    const { state } = play(slow)
    expect(state.over).toBe('won')
    expect(state.hurt).toBe(0)
  })

  it('두 번까지는 다쳐도 끝까지 갈 수 있다', () => {
    let wasted = 0
    const sloppy = state => {
      if (wasted < 2 && frontSquad(state, 'east') && !inReach(frontSquad(state, 'east')) && canFire(state, 'east')) { wasted++; return ['east'] }
      return patient(0.3)(state)
    }
    const { state } = play(sloppy)
    expect(state.early).toBe(2)
    expect(state.over).toBe('won')
  })

  it('판은 한 분 안에 끝난다', () => {
    const { state } = play(patient(0.3))
    expect(state.t).toBeLessThan(45000)
    expect(resolved(state)).toBe(WAVES.length)
  })
})

describe('거듭할수록 거든다', () => {
  it('첫 두 판은 그대로다', () => {
    expect(easeFor(1)).toEqual({ feints: true, cue: false, speed: 1, hurtLimit: HURT_LIMIT })
    expect(easeFor(2)).toEqual(easeFor(1))
  })
  it('셋째 판부터 꾀는 무리가 없고 「지금」이 뜬다', () => {
    const e = easeFor(3)
    expect(e.feints).toBe(false)
    expect(e.cue).toBe(true)
    expect(createBattle({ tries: 3 }).waves.some(w => w.feint)).toBe(false)
  })
  it('넷째 판부터 저들의 걸음이 느려지고 포수가 더 버틴다', () => {
    const e = easeFor(4)
    expect(e.speed).toBeLessThan(1)
    expect(e.hurtLimit).toBeGreaterThan(HURT_LIMIT)
    const slow = createBattle({ tries: 4 }).waves[0].speed
    expect(slow).toBeLessThan(WAVES[0].speed)
  })
  it('어느 판이든 참을성 있는 손은 끝낸다', () => {
    for (const tries of [1, 2, 3, 4, 7]) expect(play(patient(0.4), { tries }).state.over, `${tries}판`).toBe('won')
  })
  it('「아직」 화면이 그 판의 까닭과 거드는 말을 싣는다', () => {
    const lost = play(() => []).state
    const view = againView({ tries: 3, reason: battleResult(lost).reason, hint: AGAIN_COPY.hint, strong: AGAIN_COPY.strong })
    expect(view.lines[0]).toContain('성문까지 붙었다')
    expect(view.lines).toContain(AGAIN_COPY.hint)
    expect(view.lines).toContain(AGAIN_COPY.strong)
  })
})

describe('기록', () => {
  it('한 번도 먼저 쏘지 않은 판은 그렇게 적힌다', () => {
    const { state } = play(patient(0.3))
    const r = battleResult(state)
    expect(r.cleared).toBe(true)
    expect(r.summary).toBe('정족산성 — 첫 판에 프랑스군을 물리쳤다 · 한 번도 먼저 쏘지 않고 끝까지 기다렸다')
  })
  it('몇 판 만에 해냈는지와 먼저 쏜 횟수가 남는다', () => {
    const s = { ...play(patient(0.3)).state, early: 2, breaches: 1 }
    expect(battleSummary(s, 3)).toBe('정족산성 — 3판 만에 프랑스군을 물리쳤다 · 닿기 전에 쏜 것 2번 · 성문까지 붙은 것 1번')
  })
  it('「내 기록」이 그 한 줄을 물음과 함께 돌려준다', () => {
    const d = describeDecision(ACTS[1], { actIndex: 1, choiceId: 'defend:tries2', reason: '정족산성 — 2판 만에 프랑스군을 물리쳤다' })
    expect(d.question).toContain('정족산성')
    expect(d.text).toContain('2판 만에')
  })
})

describe('화면', () => {
  const beat = ACTS[1].beats.find(b => b.kind === 'defend')
  const html = battleHtml(beat, createBattle())

  it('길이 둘이고, 문마다 닿는 곳의 띠가 있다', () => {
    expect((html.match(/class="lane"/g) ?? []).length).toBe(2)
    expect((html.match(/화승총이 닿는 곳/g) ?? []).length).toBe(2)
    expect(html).toContain(`--reach:${REACH}`)
  })

  it('사람 수 · 거리의 숫자를 적지 않는다 — 몇 무리가 어느 문으로 왔는지는 재구성이다', () => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(beat.origin, '')
    expect(text).not.toMatch(/[0-9]+ *(명|보|걸음|미터|m\b)/)
    expect(html).toContain('재구성')
  })

  it('첫 장이 무엇을 하는 판인지와, 임금이 거기 없다는 것을 말한다', () => {
    const intro = introHtml(beat, 1)
    expect(intro).toContain('밤에 몰래 바다를 건너')
    expect(intro).toContain('기다렸다가 쏜다')
    expect(intro).toContain('한양을 떠날 수 없다')
    expect(intro).toContain('<figure>')        // 프랑스 함대 그림(재구성)
  })

  it('다시 하는 판의 첫 장은 짧다 — 규칙만 남고, 셋째 판부터 거드는 줄이 붙는다', () => {
    const again = introHtml(beat, 2)
    expect(again).toContain('다시 — 정족산성')
    expect(again).not.toContain('밤에 몰래 바다를 건너')
    expect(again).toContain('기다렸다가 쏜다')
    expect(again).not.toContain('지금 —')
    expect(introHtml(beat, 3)).toContain('지금 —')
  })

  it('끝 장이 장계의 한 줄 · 교과서의 문장 · 「그러나」를 차례로 보여 준다', () => {
    const end = resultHtml(beat)
    const order = [beat.quote, '실 제 로 는', '외규장각 도서 등을 약탈하였다', beat.bridge, beat.nextLabel].map(s => end.indexOf(s))
    expect(order.every(i => i >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('깎는 말을 쓰지 않는다', () => {
    const said = [...Object.values(BATTLE_LINES), ...Object.values(AGAIN_COPY), againReason(createBattle()),
      ...beat.intro, ...beat.rules, beat.note, beat.bridge].join(' ')
    for (const word of ['정답', '오답', '실패', '틀렸', '점수', '패배', '졌다']) expect(said.includes(word), word).toBe(false)
  })
})
