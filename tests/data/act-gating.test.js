import { describe, it, expect } from 'vitest'
import { pressE } from '../../src/main.js'
import { PALACES, baseOf } from '../../src/data/palaces.js'
import { NPCS, npcsAt, npcCardIds } from '../../src/data/npcs.js'
import { SOURCES, sourceById } from '../../src/data/sources.js'
import { ACTS } from '../../src/data/acts.js'
import { createState } from '../../src/core/state.js'
import { grantedIdsOf } from '../../src/systems/scenario.js'

// 「명부」재제작 지시 Task 2 — 사정전(경복궁)이 2막(양요, 1868~71)과 3막(친정,
// 1873~76)에서 같은 궁·같은 좌표를 재사용하기 때문에, 3막 사료(최익현의 1873년
// 상소, 수군 관원의 1875년 운요호 카드, 신헌의 1876년 조약 카드 넉 장 …)가
// npcsAt()/pressE() 에 막(act) 가드가 없던 동안 2막에서부터 이미 읽혔다. SOURCES 의
// act 가 유일한 근거다 — 이 시험은 「어느 막에서 실제로 손에 들어오는 카드도 그
// 카드 자신의 act 를 넘어서지 않는다」를 바닥(pressE)·신하(npcsAt)·grantCard 세
// 통로 모두에서 확인한다.

function beatsOf(act) {
  return act?.beats ?? []
}

// 그 막(0-인덱스) 안에서 실제로 밟는 궁(baseOf 로 화재 변형도 같은 궁으로 본다) —
// act.palace 로 시작해, 비트가 palace 를 바꾸면(move 등) 그것도 더한다.
function basePalacesUsedInAct(act) {
  const ids = new Set([act.palace, ...beatsOf(act).filter(b => b.palace).map(b => b.palace)])
  return new Set([...ids].map(baseOf))
}

// pressE() 를 그 자리에 정확히 세워 실제 바닥 판정을 구동한다 — SOURCES.act 를 다시
// 베껴 적어 비교하지 않고, main.js 가 실제로 쓰는 그 함수가 이 막에서 무엇을
// 내주는지를 직접 묻는다. dayLeft 를 넉넉히 주어 'no-time' 때문에 진짜 새는 카드를
// 놓치지 않게 한다.
function floorReachableCardIds(palaceId, actNumber) {
  const def = PALACES[palaceId]
  const out = []
  for (const p of def.pickups ?? []) {
    const state = { ...createState(), palace: palaceId, dayLeft: 999 }
    const action = pressE({
      dialogOpen: false, exit: null, room: null, palaceDef: def,
      playerX: p.x, playerZ: p.z, taken: new Set(), state, act: actNumber,
    })
    if (action.type === 'pickup') out.push(action.cardId)
  }
  return out
}

function npcReachableCardIds(palaceId, actIndex) {
  return npcsAt(baseOf, palaceId, actIndex).flatMap(npcCardIds)
}

// 지급되는 카드 — grantCard 한 장이든 알현의 visitors[].grantCards 여럿이든
// 「무엇을 주는가」의 답은 scenario.js 한 곳이다. 여기서 다시 세지 않는다.
function grantCardIdsOf(act) {
  return beatsOf(act).flatMap(grantedIdsOf)
}

describe('막 가드 — 나중 막의 카드는 이른 막에서 손에 들어오지 않는다', () => {
  it('SOURCES 의 모든 카드가 act 를 가진다 — 이 시험 전체가 그 값에 기댄다', () => {
    for (const c of SOURCES) expect(c.act, c.id).toBeTruthy()
  })

  for (const [actIndex, act] of ACTS.entries()) {
    const actNumber = actIndex + 1

    it(`${actIndex + 1}막 「${act.title}」 — 바닥·신하·grantCard 로 손에 들어오는 카드는 모두 ${actIndex + 1}막 이하다`, () => {
      const palaceIds = basePalacesUsedInAct(act)
      const reachable = new Map()   // cardId → 통로(디버그용)

      for (const palaceId of palaceIds) {
        for (const cardId of floorReachableCardIds(palaceId, actNumber)) {
          reachable.set(cardId, `바닥(${palaceId})`)
        }
        for (const cardId of npcReachableCardIds(palaceId, actIndex)) {
          reachable.set(cardId, `신하(${palaceId})`)
        }
      }
      for (const cardId of grantCardIdsOf(act)) {
        reachable.set(cardId, 'grantCard')
      }

      for (const [cardId, via] of reachable) {
        const card = sourceById(cardId)
        expect(card, cardId).toBeTruthy()
        expect(
          card.act,
          `${cardId}(${card.act}막 카드, ${via} 로 들어옴)가 ${actNumber}막에서 이미 손에 들어온다`
        ).toBeLessThanOrEqual(actNumber)
      }
    })
  }

  // 회귀 고정 — 리뷰가 실제로 지목한 세 장. 위의 일반 시험이 이 셋을 포함해 다
  // 잡아내지만, 어떤 카드가 문제였는지는 이름으로 남겨 둔다.
  it('사정전(경복궁)의 3막 카드는 2막(day-gyeongbok)에서 손에 들어오지 않는다', () => {
    const actIndex1 = 1   // '양요' — day-gyeongbok 이 이 막 안에 있다
    const reachable = new Set([
      ...floorReachableCardIds('gyeongbok', actIndex1 + 1),
      ...npcReachableCardIds('gyeongbok', actIndex1),
    ])
    for (const cardId of ['choe-ikhyeon', 'unyo', 'ganghwa1', 'ganghwa7', 'ganghwa10', 'joil-trade']) {
      expect(reachable, cardId).not.toContain(cardId)
    }
  })
})
