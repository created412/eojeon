import { describe, it, expect } from 'vitest'
import {
  initialTrail, legsOf, currentLeg, send, arrive, riderAt, cargoAt, lagOf, atSea, placeOf, trailRecord,
} from '../../src/systems/trail.js'
import { trailHtml } from '../../src/ui/trail.js'
import { ACTS, actById } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

// ── 아버지가 끌려간다 (2026-10-06) ─────────────────────────────────────────
//
// 선생님: 「대원군을 청군이 납치해 가는 게임 장면도 만들어야 할 거 같아.」 — 「역사적 사실에 근거해서.」
//
// 예전의 글 한 장은 「눈앞에서 청의 군사들이 아버지를 데리고 나간다」였다. 대원군은 궁에서
// 끌려 나간 것이 아니라 청군의 군영에 청함을 받아 간 자리에서 붙잡혔다. 임금은 거기 없었다.

const imo = beatsOf(actById('imo'))
const invitation = imo.find(b => b.id === 'imo-invitation')
const trail = imo.find(b => b.id === 'imo-abduction')

// 끝까지 걷는다.
function walk(beat) {
  const seen = []
  let s = initialTrail()
  while (!s.done) {
    s = arrive(beat, send(beat, s))
    seen.push({ rider: riderAt(beat, s), cargo: cargoAt(beat, s), lag: lagOf(beat, s) })
  }
  return { state: s, seen }
}

describe('차례 — 아버지가 걸어 나가고, 돌아오지 않는다', () => {
  const ids = imo.map(b => b.id)
  it('얼어붙은 회의 → 군영의 청함 → 소식 → 제물포의 차례다', () => {
    expect(ids.indexOf('imo-council')).toBe(ids.indexOf('imo-invitation') - 1)
    expect(ids.indexOf('imo-invitation')).toBe(ids.indexOf('imo-abduction') - 1)
    expect(ids.indexOf('imo-abduction')).toBe(ids.indexOf('imo-jemulpo') - 1)
  })

  it('아버지는 제 발로 궁을 나선다 — 끌려 나가는 모습을 임금 앞에 세우지 않는다', () => {
    expect(invitation.kind).toBe('audience')
    expect(invitation.depart).toBe('heungseon')
    expect(invitation.beside).toBe('heungseon')
    const said = JSON.stringify(invitation)
    expect(said).toContain('군영으로 청한다')
    expect(said).not.toContain('끌')
    expect(invitation.grade).toBe('staged')
    expect(invitation.origin).toContain('재구성')
  })

  it('1873년과 같은 그림이 되풀이된다 — 「아버지가 나간 문을 본다」', () => {
    const gyeyu = beatsOf(actById('chinjeong')).find(b => b.id === 'gyeyu-audience')
    expect(gyeyu.depart).toBe('heungseon')
    expect(invitation.exit.label).toBe(gyeyu.exit.label)
  })

  it('「눈앞에서」라고 적지 않는다', () => {
    const said = JSON.stringify(trail)
    expect(said).not.toContain('눈 앞')
    expect(said).not.toContain('눈앞')
    expect(said).not.toContain('데리고 나간다')
  })
})

describe('소식은 언제나 한 걸음 늦다', () => {
  it('세 번 알아본다', () => {
    expect(legsOf(trail)).toHaveLength(3)
    expect(currentLeg(trail, initialTrail()).label).toBe('사람을 보내 알아본다')
  })

  it('첫 소식 전에는 아버지가 어디 있는지 모른다', () => {
    expect(cargoAt(trail, initialTrail())).toBeNull()
    expect(lagOf(trail, initialTrail())).toBeNull()
  })

  it('보낸 사람이 닿을 때마다 가마는 이미 그 앞에 있다 — 한 번도 따라잡지 못한다', () => {
    const { seen } = walk(trail)
    for (const [i, step] of seen.entries()) expect(step.lag, `${i + 1}번째 소식`).toBeGreaterThan(0.1)
    // 가마는 뒤로 가지 않는다.
    const cargo = seen.map(s => s.cargo)
    expect([...cargo].sort((a, b) => a - b)).toEqual(cargo)
    expect(cargo.at(-1)).toBe(1)
  })

  it('보낸 사람은 바다를 건너지 못한다 — 마지막 소식은 기다릴 수밖에 없다', () => {
    const { seen } = walk(trail)
    const shore = trail.places.find(p => p.shore)
    expect(seen.at(-1).rider).toBe(shore.at)
    expect(seen.at(-2).rider).toBe(shore.at)
    expect(legsOf(trail).at(-1).to).toBeNull()
    expect(legsOf(trail).at(-1).label).toBe('소식을 기다린다')
  })

  it('뭍에서는 가마, 바다에서는 배다', () => {
    const { seen } = walk(trail)
    expect(seen.map(s => atSea(trail, s.cargo))).toEqual([false, true, true])
  })

  it('가는 동안에는 다시 보낼 수 없고, 닿아야 소식이 풀린다', () => {
    let s = send(trail, initialTrail())
    expect(s.moving).toBe(true)
    expect(send(trail, s)).toBe(s)
    expect(s.reports).toHaveLength(0)
    s = arrive(trail, s)
    expect(s.moving).toBe(false)
    expect(s.reports).toEqual([legsOf(trail)[0].report])
    // 보내지 않았는데 닿을 수는 없다.
    expect(arrive(trail, s)).toBe(s)
  })

  it('끝나면 더 보낼 것이 없다', () => {
    const { state } = walk(trail)
    expect(state.done).toBe(true)
    expect(currentLeg(trail, state)).toBeNull()
    expect(send(trail, state)).toBe(state)
    expect(trailRecord(trail, state)).toEqual({ asked: 3, done: true })
  })
})

describe('적힌 것', () => {
  it('길은 한양 → 청군 군영 → 남양 마산포 → 톈진이다', () => {
    expect(trail.places.map(p => p.name)).toEqual(['한양', '청군 군영', '남양 마산포', '톈진'])
    expect(placeOf(trail, 'namyang').shore).toBe(true)
  })

  it('붙잡힌 자리는 군영이다', () => {
    const first = legsOf(trail)[0].report.join(' ')
    expect(first).toContain('군영에 아버지는 없었다')
    expect(first).toContain('가마에 태우고')
  })

  it('「실제로는」은 교과서의 문장이다 — 납치와, 그 뒤 청의 간섭', () => {
    expect(trail.actual).toContain('민씨 세력의 요청을 받은 청은 군대를 보내 흥선 대원군을 납치하고')
    expect(trail.actual).toContain('내정과 외교에 간섭하였다')
    expect(trail.actualOrigin).toContain('『고등 한국사1』')
  })

  it('임금이 사람을 보내는 모습은 재구성이라고 밝힌다', () => {
    expect(trail.grade).toBe('staged')
    expect(trail.origin).toContain('재구성')
    expect(trail.mapNote).toContain('줄여 그렸습니다')
  })

  it('걸을 수 없는 막이다 — 그 한 줄이 있다', () => {
    expect(trail.control).toBe('D')
    expect(trail.still).toContain('아무 키도 듣지 않는다')
  })

  it('사람 수를 적지 않는다', () => {
    expect(JSON.stringify(trail)).not.toMatch(/[0-9]+ *명/)
  })
})

describe('화면', () => {
  const html = trailHtml(trail)
  it('자리 넷과 표 둘(보낸 사람 · 아버지)이 한 줄 위에 있다', () => {
    expect((html.match(/class="place"/g) ?? []).length).toBe(4)
    expect(html).toContain('보낸 사람')
    expect(html).toContain('class="mark cargo unknown"')   // 첫 소식 전에는 보이지 않는다
  })
  it('「실제로는」은 처음에 숨는다', () => {
    expect(html).toContain('class="actual" hidden')
  })
  it('소식의 글은 처음 화면에 미리 실려 있지 않다', () => {
    for (const leg of legsOf(trail)) for (const line of leg.report) expect(html).not.toContain(line)
  })
  it('다섯 막 어디에도 이 종류는 여기 하나다', () => {
    expect(ACTS.flatMap(a => beatsOf(a)).filter(b => b.kind === 'trail').map(b => b.id)).toEqual(['imo-abduction'])
  })
})
