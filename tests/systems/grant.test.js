import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyGrant, beatsOf, grantedIdsOf } from '../../src/systems/scenario.js'
import { createState } from '../../src/core/state.js'
import { ACTS } from '../../src/data/acts.js'
import { PALACES } from '../../src/data/palaces.js'
import { SOURCES } from '../../src/data/sources.js'
import { everRead } from '../../src/systems/loss-log.js'
import { bodyOf } from '../helpers/body-of.js'

// [Task 11 리뷰 C1] 4막의 제물포 조약 제4관과 「속방」 두 장이 게임 안에서 얻을 길이
// 없었다. 둘 다 kind:'note' 인데 main.js 는 playBrush()·playOuting() 안에서만 카드를
// 줬고, 어느 궁의 pickups 에도 없었기 때문이다. 시험은 초록불이었다 — dryRun() 이
// 종류를 안 가리고 줬고, 나머지 시험은 데이터에 필드가 있는지만 봤다.
//
// 규칙을 scenario.js 의 applyGrant() 한 자리로 옮겨 main.js 와 branch.js 가 같은
// 함수를 부르게 했다. 이 파일은 그 한 자리를 세 방향에서 붙든다.

describe('applyGrant — 카드를 쥐여 주는 규칙은 비트 종류에 달려 있지 않다', () => {
  it('kind 가 note 여도 카드를 준다 — 이것이 없어서 두 장이 사라졌다', () => {
    const s = applyGrant(createState(), { kind: 'note', grantCard: 'sokbang' })
    expect(s.sources.held).toContain('sokbang')
    expect(s.sources.read).toContain('sokbang')
  })

  it('brush · outing · edict · escape 어느 종류든 똑같이 준다', () => {
    for (const kind of ['brush', 'outing', 'edict', 'escape', 'note', 'council']) {
      const s = applyGrant(createState(), { kind, grantCard: 'jemulpo4' })
      expect(s.sources.read, kind).toContain('jemulpo4')
    }
  })

  it('grantCard 가 없으면 상태를 그대로 돌려준다', () => {
    const before = createState()
    expect(applyGrant(before, { kind: 'note' })).toBe(before)
    expect(applyGrant(before, null)).toBe(before)
  })
})

// 「엔진이 그 함수를 실제로 부르는가」— vitest 환경이 node 라 boot() 의 DOM 경로를
// 돌릴 수 없다. 대신 문자열로 본다. 완벽한 검사가 아니라, 실제로 우리를 문 것
// 하나(비트 종류별로 따로 주다가 한 종류를 빠뜨림)를 확실히 잡는 검사다 —
// tests/ui/class-namespace.test.js 와 같은 방식이다.
describe('main.js 는 카드를 비트 종류별로 주지 않는다', () => {
  // 주석은 뺀다 — 왜 이렇게 되어 있는지 설명하는 줄에서 같은 낱말을 못 쓰게 되면
  // 검사가 글을 깎는다. 검사가 좋은 글을 틀렸다고 하면 글이 아니라 검사를 고친다.
  const src = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8')
    .split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')

  it('applyGrant 를 부르는 자리가 딱 하나다', () => {
    const calls = src.match(/applyGrant\(/g) ?? []
    expect(calls).toHaveLength(1)
  })

  // 예전에는 「하나뿐이다」였다. 그 하나가 playBeat() 의 문지기
  // (`if (!beat.grantCard) return after`)였고, 알현 비트가 visitors[].grantCards 로
  // 주기 시작하자 그 문지기가 문서 두 장을 삼켰다 — 화면에는 카드가 떴는데
  // 사초함은 비어 있었고, 1막 어전회의의 선택지가 셋에서 하나로 줄었다.
  // 「무엇을 주는가」의 답은 scenario.js 한 곳뿐이어야 한다. 그래서 0 이다.
  it('main.js 는 grantCard·grantCards 를 스스로 읽지 않는다 — 답은 scenario.js 에 있다', () => {
    expect(src.match(/beat\.grantCard/g) ?? []).toHaveLength(0)
    expect(src.match(/\.grantCards/g) ?? []).toHaveLength(0)
  })

  // 「하나뿐이다」만으로는 모자란다 — 그 하나가 **어디** 있는지가 중요하다.
  // 나들이(stop)는 runBeats() 를 거치지 않고 runStop() 에서 곧장 playBeat() 으로
  // 들어온다. 그래서 지급을 runBeats() 로 옮기면 위 두 검사는 그대로 초록불인데
  // 나들이에서 받는 카드(무위영의 겨와 모래)가 조용히 사라진다.
  //
  // 함수의 **중괄호를 세어** 몸통을 정확히 잘라낸다(tests/helpers/body-of.js).
  // 「다음 함수 이름까지」로 자르면 사이에 새 함수가 끼는 순간 그 함수의 내용까지
  // 몸통으로 세어 검사가 통과한다 — 실제로 이 검사의 첫 판이 그렇게 써 있었고,
  // 변이(지급을 밖으로 옮기기)를 놓쳤다.

  it('applyGrant 를 부르는 자리가 playBeat 몸통 안이다 — 밖으로 옮기면 나들이가 빠진다', () => {
    expect(bodyOf(src, 'playBeat')).toContain('applyGrant(')
  })

  // 예전에는 「playBrush 부터 playEscape 까지」로 잘랐다 — 사이에 새 함수가 끼면
  // 검사 범위가 말없이 넓어지고, playEscape 의 이름이 바뀌면 indexOf 가 -1 이라
  // 파일 끝까지 삼켰다. 두 함수의 몸통을 각각 정확히 잘라 본다.
  it('playBrush · playOuting 안에 따로 지급하는 줄이 남아 있지 않다', () => {
    for (const fn of ['playBrush', 'playOuting']) {
      const body = bodyOf(src, fn)
      expect(body, `${fn} 안에 markRead 가 남아 있다`).not.toContain('markRead(')
      expect(body, `${fn} 안에 applyGrant 가 남아 있다`).not.toContain('applyGrant(')
    }
  })
})

// 데이터 쪽 잠금 — grantCard 를 든 비트가 실제로 재생되는 자리에 있는가.
// 「필드가 있다」가 아니라 「그 비트가 막의 비트 배열이나 낮의 나들이 안에 있다」를 본다.
describe('grantCard 를 든 비트는 전부 실제로 재생되는 자리에 있다', () => {
  // 무엇을 주는 비트인가 — grantCard 한 장이든 알현의 visitors[].grantCards 여럿이든
  // 답은 scenario.js 의 grantedIdsOf 하나다. 여기서 필드 이름을 다시 적지 않는다.
  function grantingBeats() {
    const out = []
    for (const act of ACTS) {
      for (const b of beatsOf(act)) {
        if (grantedIdsOf(b).length) out.push({ act: act.id, where: 'beats', beat: b })
        for (const st of b.stops ?? []) {
          if (grantedIdsOf(st.beat).length) out.push({ act: act.id, where: 'stop', beat: st.beat })
        }
      }
    }
    return out
  }

  const grantedIds = () => new Set(grantingBeats().flatMap(g => grantedIdsOf(g.beat)))

  it('모든 사료가 바닥 지점이나 지급 중 하나로 손에 들어온다 — 배선된 막만', () => {
    const placed = new Set(Object.values(PALACES).flatMap(d => (d.pickups ?? []).map(p => p.cardId)))
    const granted = grantedIds()
    for (const c of SOURCES.filter(c => c.act <= ACTS.length)) {
      expect(placed.has(c.id) || granted.has(c.id), `${c.id} 를 손에 넣을 길이 없다`).toBe(true)
    }
  })

  it('4막의 제물포·속방은 오직 지급으로만 들어온다 — 그래서 지급이 동작해야 한다', () => {
    const placed = new Set(Object.values(PALACES).flatMap(d => (d.pickups ?? []).map(p => p.cardId)))
    for (const id of ['jemulpo4', 'sokbang']) {
      expect(placed.has(id), `${id} 는 바닥에 놓여 있지 않다`).toBe(false)
      expect([...grantedIds()]).toContain(id)
    }
  })

  // 「내 기록 복사」와 마지막 화면이 세는 것이 이 값이다 — 두 장이 빠지면 학생
  // 활동지의 「읽은 문서 N장」이 그만큼 모자란 채로 나간다.
  it('4막을 걸어 나온 학생의 사초함에 4막 카드 여섯 장이 다 있다', async () => {
    const { dryRun } = await import('../../src/systems/branch.js')
    const imo = ACTS.find(a => a.id === 'imo')
    // 나들이는 낮 안의 선택이라 dryRun 이 걷지 않는다 — 그 한 장만 따로 먹인다.
    const day = beatsOf(imo).find(b => b.kind === 'explore')
    const seeded = applyGrant(createState(), day.stops[0].beat)
    const { state } = dryRun(imo, seeded, 3)
    const read = everRead(state)
    for (const c of SOURCES.filter(c => c.act === 4)) {
      // 궁 바닥에 놓인 셋은 학생이 낮에 줍는 것이라 여기 없는 게 맞다
      if (read.includes(c.id)) continue
      const placed = Object.values(PALACES).some(d => (d.pickups ?? []).some(p => p.cardId === c.id))
      expect(placed, `${c.id} 가 지급으로도 바닥으로도 안 들어온다`).toBe(true)
    }
    expect(read).toContain('muwiyeong')
    expect(read).toContain('jemulpo4')
    expect(read).toContain('sokbang')
  })
})
