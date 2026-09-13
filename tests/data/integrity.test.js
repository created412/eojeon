import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { hasWayForward, grantedIdsOf } from '../../src/systems/scenario.js'
import { PORTRAITS } from '../../src/ui/portraits-data.js'
import { PALACES } from '../../src/data/palaces.js'
import { SOURCES } from '../../src/data/sources.js'

const CARD_IDS = new Set(SOURCES.map(c => c.id))

function beatsOf(act) {
  return act.beats ?? []
}
// frozen 을 그대로 실어 나른다 — 얼어붙은 회의는 고를 단추가 하나도 없는 것이 설계이고
// (frozenLabel 단추로 넘어간다, ui/council-ui.js), 그 사실을 이 파일의 불변식이 알아야 한다.
function councilsOf(act) {
  const fromBeats = beatsOf(act)
    .filter(b => b.kind === 'council' || b.kind === 'orders')
    .map(b => (b.council ? { ...b.council, frozen: b.frozen === true, id: b.id }
      : (b.clauses ? { choices: b.clauses, frozen: false, id: b.id } : null)))
    .filter(Boolean)
  return act.council ? [act.council, ...fromBeats] : fromBeats
}
function allPickups() {
  return Object.entries(PALACES).flatMap(([pid, def]) =>
    (def.pickups ?? []).map(p => ({ ...p, palace: pid })))
}

// 아직 궁·사료 지점이 배선되지 않은 막. 배선이 끝나면 여기서 빼야 한다.
// Task 6이 경복궁·창덕궁에 2·3막 사료 지점을 모두 배선했다 — 둘 다 뺀다.
// 아직 궁·사료 지점이 배선되지 않은 막. 배선이 끝나면 여기서 빼야 한다.
// 3단계: Task 1 이 4·5막 카드를 넣었으므로 둘을 다시 넣는다.
//   Task 11(4막 완주) 이 4 를 빼고, Task 14(5막 완주) 가 5 를 뺀다.
//   목록에 남은 막의 카드가 하나라도 배선되면 아래 마지막 시험이 울어 잊을 수 없다 (판정 R37).
// 3단계가 끝났다. 다섯 막이 모두 배선되었으므로 목록이 비었다.
// 여기에 다시 무언가를 넣는 일이 생기면, 그것은 배선 안 된 막을 만들었다는 뜻이다.
const UNWIRED_ACTS = []

// 3단계 Task 2 — 4막의 배선은 한 태스크가 아니라 여러 태스크(2·4~10)에 걸쳐 조금씩
// 끝난다. Task 2가 창덕궁에 세 장(조선책략·영남 만인소·홍재학)의 자리를 놓으면서
// 이 사실이 드러났다: UNWIRED_ACTS 에서 4를 통째로 빼면 아직 배선 안 된 나머지
// 다섯 장(무위영·제물포4관·속방 …)의 도달성 검사가 깨지고, 4를 그대로 두면 방금
// 배선한 세 장이 바로 아래 잠금장치에 걸린다. 그래서 이미 배선된 낱장만 잠금장치
// 에서 예외로 둔다 — Task 11(4막 완주)이 나머지를 마저 배선하며 UNWIRED_ACTS 에서
// 4를 통째로 빼면, 그 순간부터 이 집합은 조용히 의미를 잃는다(무해하게 남는다).
const WIRED_EARLY = new Set(['joseon-chaeryak', 'yeongnam-manin', 'hong-jaehak'])

// 3단계 — 카드를 쥐여 주는 자리가 두 곳이 되었다. 비트 자신(b.grantCard)과,
// 탐색하는 낮 안의 나들이(b.stops[].beat.grantCard, systems/outing.js)다. 나들이 쪽을
// 빼놓으면 4막의 「겨와 모래」(muwiyeong)가 실제로는 손에 들어오는데도 도달성 검사가
// 「손에 넣을 길이 없다」고 운다 — 검사가 게임보다 좁아서 나는 거짓 경보다.
function grantedCardIds() {
  const s = new Set()
  for (const act of ACTS) {
    for (const b of beatsOf(act)) {
      for (const id of grantedIdsOf(b)) s.add(id)
      for (const st of b.stops ?? []) for (const id of grantedIdsOf(st.beat)) s.add(id)
    }
  }
  return s
}

describe('사료 id 정합성 — 카드 22장·막 4개가 더 들어와도 조용히 어긋나지 않는다', () => {
  it('어전회의가 요구하는 사료가 모두 실재한다', () => {
    for (const act of ACTS) {
      for (const c of councilsOf(act)) {
        for (const ch of c.choices ?? []) {
          for (const id of ch.requires ?? []) {
            expect(CARD_IDS, `${act.id}/${ch.id}/${id}`).toContain(id)
          }
        }
      }
    }
  })

  it('궁에 놓인 사료 지점이 모두 실재하는 카드를 가리킨다', () => {
    for (const p of allPickups()) {
      expect(CARD_IDS, `${p.palace}/${p.cardId}`).toContain(p.cardId)
    }
  })

  it('사료 지점의 placeId 가 그 궁에 실재하는 방이다', () => {
    for (const [pid, def] of Object.entries(PALACES)) {
      const rooms = new Set(def.rooms.map(r => r.id))
      for (const p of def.pickups ?? []) {
        expect(rooms, `${pid}/${p.cardId}/${p.placeId}`).toContain(p.placeId)
      }
    }
  })

  // 궁끼리 비교하지 않는다 — 화재 변형(gyeongbok_burnt 등)은 같은 궁의 다른 상태이고
  // 같은 사료 지점을 물려받는다(Task 6의 burntVariant). 한 궁 안에서만 겹치지 않으면 된다.
  it('한 궁 안에서 같은 카드가 두 지점에 놓여 있지 않다', () => {
    for (const [pid, def] of Object.entries(PALACES)) {
      const ids = (def.pickups ?? []).map(p => p.cardId)
      expect(new Set(ids).size, `${pid}: ${ids.join(',')}`).toBe(ids.length)
    }
  })

  it('비트가 지목하는 카드가 모두 실재한다 — cardIds · grantCard', () => {
    for (const act of ACTS) {
      for (const b of beatsOf(act)) {
        for (const id of b.cardIds ?? []) expect(CARD_IDS, `${act.id}/${b.id}/${id}`).toContain(id)
        if (b.grantCard) expect(CARD_IDS, `${act.id}/${b.id}`).toContain(b.grantCard)
      }
    }
  })

  // 막다른 회의가 없다 — requires 만 보면 구멍이 하나 남는다:
  // requires 가 빈 유일한 선택지에 needsFlag 가 붙으면 얼지도 않은 회의가
  // 누를 단추 하나 없는 영구 정지 화면이 되고도 모든 시험이 초록불이다.
  // 같은 판정을 tests/data/acts.test.js 의 hasWayForward() 가 가짜 비트로 따로 붙든다.
  it('어전회의에는 언제나 사료도 깃발도 없이 고를 수 있는 선택지가 있다', () => {
    for (const act of ACTS) {
      for (const c of councilsOf(act)) {
        // 술어를 여기 다시 적지 않는다 — acts.test.js 가 가짜 비트로 붙드는 그 함수다.
        expect(hasWayForward({ council: c, frozen: c.frozen }),
          `${act.id}/${c.id ?? 'act.council'}`).toBe(true)
      }
    }
  })

  // 도달성 검사 — 배선이 끝난 막에만 의미가 있다. UNWIRED_ACTS 에 있는 막의 카드는
  // 아직 궁·지점이 없는 게 당연하므로 여기서는 건너뛴다. (오타 검출은 위의 두 시험이
  // 이미 늘 유효하게 맡고 있다 — 지점·비트가 가리키는 카드가 실재하는지는 그쪽에서 잡는다.)
  it('모든 사료 카드는 어디선가 손에 들어온다 — 줍거나, 직접 쓰거나 (배선된 막만)', () => {
    const reachable = new Set(allPickups().map(p => p.cardId))
    for (const id of grantedCardIds()) reachable.add(id)
    for (const c of SOURCES) {
      if (UNWIRED_ACTS.includes(c.act)) continue
      expect(reachable, `${c.id} 를 손에 넣을 길이 없다`).toContain(c.id)
    }
  })

  // UNWIRED_ACTS 가 조용히 낡아버리지 않도록 하는 잠금장치.
  // 누군가 2막을 배선하기 시작해 지점이나 지급을 하나라도 추가하면 이 시험이 실패한다 —
  // 그 실패가 UNWIRED_ACTS 에서 2를 빼라는 신호이고, 뺀 순간 위의 도달성 검사가
  // 그 막에도 다시 걸리기 시작한다.
  it('UNWIRED_ACTS 에 남은 막은 사료 지점도 지급도 아직 하나도 없다', () => {
    const pickupCardIds = new Set(allPickups().map(p => p.cardId))
    const granted = grantedCardIds()
    for (const actNum of UNWIRED_ACTS) {
      for (const c of SOURCES.filter(c => c.act === actNum && !WIRED_EARLY.has(c.id))) {
        expect(
          pickupCardIds.has(c.id) || granted.has(c.id),
          `${actNum}막의 ${c.id} 가 이미 배선되었다 — UNWIRED_ACTS 에서 ${actNum}을 빼야 한다`
        ).toBe(false)
      }
    }
  })

  // [R74] WIRED_EARLY 는 「이미 배선을 마쳤다」는 사실만 적는 자리다. 배선되지
  // 않은 id 가 하나라도 섞여 들어오면 위 잠금장치를 몰래 무력화하는 뒷문이 된다 —
  // 이 시험이 그 뒷문을 막는다.
  it('WIRED_EARLY 에 적힌 id 는 모두 실제로 배선되어 있다', () => {
    const pickupCardIds = new Set(allPickups().map(p => p.cardId))
    const granted = grantedCardIds()
    for (const id of WIRED_EARLY) {
      expect(pickupCardIds.has(id) || granted.has(id), `${id} 는 WIRED_EARLY 에 있지만 배선되어 있지 않다`).toBe(true)
    }
  })

  // [R74] WIRED_EARLY 가 예외를 계속 흡수해 결국 한 막의 카드를 전부 덮으면,
  // 위 잠금장치는 그 막이 완전히 배선된 뒤에도 절대 실패하지 않게 된다 —
  // 「막을 다 배선했으면 UNWIRED_ACTS 에서 빼라」는 진짜 경로 대신 예외 목록에
  // 슬쩍 흡수되어 버리는 것이다. 이 시험이 그 흡수를 막는다.
  it('WIRED_EARLY 가 UNWIRED_ACTS 의 한 막을 통째로 덮지 않는다', () => {
    for (const actNum of UNWIRED_ACTS) {
      const cardsOfAct = SOURCES.filter(c => c.act === actNum).map(c => c.id)
      const allSwallowed = cardsOfAct.length > 0 && cardsOfAct.every(id => WIRED_EARLY.has(id))
      expect(allSwallowed, `${actNum}막의 카드가 전부 WIRED_EARLY 에 있다 — UNWIRED_ACTS 에서 ${actNum}을 빼야 한다`).toBe(false)
    }
  })

  // [판정 R12] 「역사가들은 이렇게 본다」는 사료가 말한 것이 아니라 오늘의 연구자가
  // 읽어 낸 것이다. 그래서 사실(actual)과 다른 상자에 담기고, 제 출처를 따로 단다 —
  // 그 규칙이 화면 코드에만 있으면 출처 없는 해석이 조용히 들어와 화면에 undefined 가
  // 찍힌다. 데이터 쪽에서 강제한다. (오늘 이 갈래를 쓰는 비트는 아직 하나도 없다 —
  // 첫 사용처가 생기는 순간부터 이 시험이 그 비트를 붙든다.)
  // 학생이 고른 것을 덮는 말에는 **그 말을 한 사람의 얼굴**이 붙어야 한다.
  // 덮였다는 사실만 남고 누가 덮었는지 안 남으면, 그 장면이 가르치는 것이 반쯤 사라진다.
  it('뒤집는 말에는 그 말을 한 사람이 붙어 있다', () => {
    for (const act of ACTS) {
      for (const c of beatsOf(act).filter(b => b.overturn)) {
        expect(c.overturnBy, `${act.id}/${c.id} 의 overturn 에 사람이 없다`).toBeTruthy()
        expect(c.overturnBy.name, `${act.id}/${c.id}`).toBeTruthy()
        expect(Object.keys(PORTRAITS), `${act.id}/${c.id} 의 얼굴`).toContain(c.overturnBy.portrait)
      }
    }
  })

  it('해석(actual.reading)을 쓰는 비트는 이름표·본문·출처를 모두 단다', () => {
    for (const act of ACTS) {
      for (const b of beatsOf(act)) {
        const r = b.actual?.reading
        if (!r) continue
        expect(r.label, `${act.id}/${b.id} — 해석에 이름표가 없다`).toBeTruthy()
        expect(r.line, `${act.id}/${b.id} — 해석에 본문이 없다`).toBeTruthy()
        expect(r.origin, `${act.id}/${b.id} — 해석이 제 출처를 달지 않았다 (판정 R12)`).toBeTruthy()
      }
    }
  })

  it('모든 카드가 출처와 등급을 가진다', () => {
    for (const c of SOURCES) {
      expect(c.origin, c.id).toBeTruthy()
      expect(['textbook', 'source', 'staged'], c.id).toContain(c.grade)
    }
  })

  it('막이 가리키는 시작 궁이 실재한다', () => {
    for (const act of ACTS) expect(Object.keys(PALACES), act.id).toContain(act.palace)
  })
})
