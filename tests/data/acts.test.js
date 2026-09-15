import { describe, it, expect } from 'vitest'
import { ACTS, actById } from '../../src/data/acts.js'
import { beatsOf, controlTimeline, palaceTimeline, peakControl, endControl, hasWayForward } from '../../src/systems/scenario.js'
import { SOURCES } from '../../src/data/sources.js'
import { PALACES, roomAt, baseOf } from '../../src/data/palaces.js'
import { RANK, isRoomOpen } from '../../src/core/control.js'
import { costOf } from '../../src/core/clock.js'
import { PLACES } from '../../src/ui/ganghwa-map.js'

const KINDS = [
  'note', 'explore', 'council', 'orders', 'move', 'rush', 'plunder', 'salvage', 'brush', 'dispatch',
  // 3단계
  'outing',   // G 회수 — 종로와 무위영 (Task 6)
  'escape',   // 변장과 맡길 사람 (Task 8)
  'edict',    // 국상·의복장 하교 (Task 9)
  'hold',     // 조작권 D — 눌러도 안 움직인다 (Task 12)
  'audience', // 알현 — 임금은 서 있고 사람이 온다 (systems/audience.js)
  'procession', // 행렬 — 신하들이 임금을 데리고 간다
]

describe('막 정의', () => {
  it('모든 막이 id·제목·궁·조작권·비트를 가진다', () => {
    for (const a of ACTS) {
      expect(a.id).toBeTruthy()
      expect(a.title).toBeTruthy()
      expect(a.palace).toBeTruthy()
      expect(['A', 'B', 'C', 'D']).toContain(a.control)
      expect(beatsOf(a).length).toBeGreaterThan(0)
    }
  })

  it('모든 비트의 종류가 정해진 목록 안에 있다', () => {
    for (const a of ACTS) for (const b of beatsOf(a)) {
      expect(KINDS, `${a.id}/${b.id}`).toContain(b.kind)
    }
  })

  it('모든 비트의 조작권 값이 A~D 네 개 안에 있다', () => {
    for (const a of ACTS) for (const b of beatsOf(a)) {
      if (b.control) expect(['A', 'B', 'C', 'D'], `${a.id}/${b.id}`).toContain(b.control)
    }
  })

  it('비트 id 가 막 안에서 겹치지 않는다', () => {
    for (const a of ACTS) {
      const ids = beatsOf(a).map(b => b.id)
      expect(new Set(ids).size, a.id).toBe(ids.length)
    }
  })

  it('1막 「즉위」는 운현궁에서 시작해 창덕궁으로 가고, 조작권은 끝까지 C 다', () => {
    const a = actById('enthronement')
    expect(a.palace).toBe('unhyeon')
    expect(controlTimeline(a)).toEqual(['C'])
    expect(palaceTimeline(a)).toEqual(['unhyeon', 'changdeok'])
  })
})

describe('2막 「양요」', () => {
  const a = actById('yangyo')

  it('창덕궁에서 시작해 경복궁으로 한 번 옮긴다', () => {
    expect(a.palace).toBe('changdeok')
    expect(palaceTimeline(a)).toEqual(['changdeok', 'gyeongbok'])
    expect(beatsOf(a).filter(b => b.kind === 'move')).toHaveLength(1)
  })

  it('조작권이 처음부터 끝까지 C 다 — 새 집인데 내 집이 아니다', () => {
    expect(controlTimeline(a)).toEqual(['C'])
  })

  it('장계 비트가 두 번 — 병인양요와 신미양요 — 있다', () => {
    expect(beatsOf(a).filter(b => b.kind === 'dispatch')).toHaveLength(2)
  })

  it('병인양요 장계는 창덕궁 국면, 신미양요 장계는 경복궁 국면에 있다', () => {
    const ks = beatsOf(a).map(b => b.kind)
    const moveAt = ks.indexOf('move')
    const dispatchAt = ks.map((k, i) => (k === 'dispatch' ? i : -1)).filter(i => i >= 0)
    expect(dispatchAt[0]).toBeLessThan(moveAt)
    expect(dispatchAt[1]).toBeGreaterThan(moveAt)
  })

  it('모든 장계에 출처와 등급이 붙어 있다', () => {
    for (const b of beatsOf(a).filter(b => b.kind === 'dispatch')) {
      for (const d of b.dispatches) {
        expect(d.origin, d.id).toBeTruthy()
        expect(['textbook', 'source', 'staged'], d.id).toContain(d.grade)
        // 표지는 화면 비율(0~1)이 아니라 **지도 위의 이름**이다 — 지도를 다시 그려도
        // 표지가 엉뚱한 바다에 뜨지 않게 ui/ganghwa-map.js 의 PLACES 를 가리킨다.
        expect(Object.keys(PLACES), `${d.id} 의 at`).toContain(d.at)
      }
    }
  })

  it('어제의 정보만 보인다 — 모든 장계에 걸리는 날이 하루 이상이다', () => {
    for (const b of beatsOf(a).filter(b => b.kind === 'dispatch')) {
      for (const d of b.dispatches) expect(d.lagDays, d.id).toBeGreaterThan(0)
    }
  })

  it('D1 약탈 대상은 「외규장각 도서 목록」 한 장이다 — 판정 R17·검증 C', () => {
    const p = beatsOf(a).find(b => b.kind === 'plunder')
    expect(p.cardIds).toEqual(['oegyujanggak'])
    expect(p.cardIds).not.toContain('yangheonsu')
  })

  it('약탈은 이어보다 먼저 일어난다 — 1866년 일이고 이어는 1868년이다', () => {
    const ks = beatsOf(a).map(b => b.kind)
    expect(ks.indexOf('plunder')).toBeLessThan(ks.indexOf('move'))
  })

  it('척화비를 쓰고 나면 그 비문이 사초함에 들어온다', () => {
    const b = beatsOf(a).find(x => x.kind === 'brush')
    expect(b.grantCard).toBe('cheokhwabi')
    // 학생이 쓰는 것은 「主和賣國」 네 글자다(2026-09-15). 주어진 여덟 자와 합쳐 비문 앞부분 열두 자가 된다.
    expect(b.glyphs.join('')).toBe('主和賣國')
    expect(b.intro.lines.join(' ')).toContain('비문')
    expect((b.givenText + b.glyphs.join('')).replace(/\s/g, '')).toBe('洋夷侵犯非戰則和主和賣國')
  })

  it('척화비 비트가 「발췌」임을 밝힌다 — 검증 C', () => {
    const b = beatsOf(a).find(x => x.kind === 'brush')
    expect(b.origin).toContain('발췌')
    expect(b.afterLines.join(' ')).toContain('앞부분')
  })

  it('어전회의의 요구 사료가 모두 실재하는 카드다', () => {
    const known = new Set(SOURCES.map(c => c.id))
    for (const act of ACTS) {
      for (const b of beatsOf(act).filter(b => b.kind === 'council')) {
        for (const ch of b.council.choices) {
          for (const id of ch.requires ?? []) expect(known, `${act.id}/${ch.id}/${id}`).toContain(id)
        }
      }
    }
  })

  it('어전회의에는 언제나 아무것도 안 읽고도 고를 수 있는 선택지가 있다 — 회의는 그냥 열린다', () => {
    for (const act of ACTS) {
      for (const b of beatsOf(act).filter(b => b.kind === 'council')) {
        expect(hasWayForward(b), `${act.id}/${b.id}`).toBe(true)
      }
    }
  })
})

// 「막다른 회의가 없다」 — 판정 자체는 src/systems/scenario.js 의 hasWayForward() 다.
// [리뷰 Minor 1] 예전에는 이 파일과 integrity.test.js 가 같은 술어를 각각 손으로
// 적어 두었다 — 한쪽만 고치면 갈라도 아무것도 울지 않는다. 한 함수를 둘이 부른다.

describe('막다른 회의가 없다 — 판정을 판정한다', () => {
  // 일부러 망가뜨린 회의. requires 는 비었지만 needsFlag 로 잠기고, 얼지도 않았다 —
  // 화면에 누를 것이 하나도 없다. 옛 판정은 이것을 통과시켰다(실제로 확인했다).
  const DEAD_END = {
    id: 'dead-end-council',
    kind: 'council',
    council: {
      question: '넘어갈 길이 하나도 없는 회의',
      choices: [
        { id: 'only', text: '고를 수 없는 유일한 선택지', requires: [], needsFlag: 'never-set' },
        { id: 'locked', text: '사료가 필요한 선택지', requires: ['joil-trade'] },
      ],
    },
  }

  it('옛 판정(requires 만 본다)이라면 이 막다른 회의가 통과한다 — 구멍이 있었다', () => {
    expect(DEAD_END.council.choices.some(c => (c.requires ?? []).length === 0)).toBe(true)
  })

  it('지금 판정은 이 막다른 회의를 거부한다', () => {
    expect(hasWayForward(DEAD_END)).toBe(false)
  })

  it('같은 회의라도 얼어붙어 있으면 길이 있다 — frozenLabel 단추가 그 길이다', () => {
    expect(hasWayForward({ ...DEAD_END, frozen: true })).toBe(true)
  })

  it('4막의 얼어붙은 회의에는 사료도 깃발도 없는 선택지가 그래도 하나 있다', () => {
    const c = beatsOf(actById('imo')).find(b => b.kind === 'council')
    const free = c.council.choices.filter(ch => (ch.requires ?? []).length === 0 && !ch.needsFlag)
    expect(free.map(ch => ch.id)).toEqual(['appease'])
  })
})

describe('3막 「친정」', () => {
  const a = actById('chinjeong')

  it('경복궁에서 시작한다 — 2막에서 옮겨온 그 집이다', () => {
    expect(a.palace).toBe('gyeongbok')
    expect(a.control).toBe('B')
  })

  it('조작권이 B → A → B → A → B 로 오르내린다', () => {
    expect(controlTimeline(a)).toEqual(['B', 'A', 'B', 'A', 'B'])
  })

  it('정점은 A 인데 끝은 B 다 — 오른 자리보다 낮게 끝난다', () => {
    expect(peakControl(a)).toBe('A')
    expect(endControl(a)).toBe('B')
    expect(RANK[endControl(a)]).toBeLessThan(RANK[peakControl(a)])
  })

  it('궁이 세 번 바뀐다', () => {
    expect(beatsOf(a).filter(b => b.kind === 'move')).toHaveLength(3)
  })

  it('그중 스스로 정한 이동은 1875 환어 하나뿐이다', () => {
    const self = beatsOf(a).filter(b => b.kind === 'move' && b.self === true)
    expect(self).toHaveLength(1)
    expect(self[0].year).toBe(1875)
  })

  it('불이 두 번 난다 — 1873 자경전과 1876 대화재', () => {
    expect(beatsOf(a).filter(b => b.kind === 'rush')).toHaveLength(1)
    expect(beatsOf(a).filter(b => b.kind === 'salvage')).toHaveLength(1)
  })

  it('촉박은 90초이며 광화문까지 나가는 것이 목표다', () => {
    const r = beatsOf(a).find(b => b.kind === 'rush')
    expect(r.totalMs).toBe(90000)
    expect(r.goalRoom).toBe('gwanghwamun')
    expect(r.track[0]).toBe('jagyeongjeon')
    expect(r.track.at(-1)).toBe('gwanghwamun')
  })

  it('자경전이 탄 뒤 돌아온 경복궁은 자경전이 봉쇄된 변형이다', () => {
    const back = beatsOf(a).find(b => b.kind === 'move' && b.year === 1875)
    expect(back.palace).toBe('gyeongbok_jagyeong')
  })

  it('대화재 뒤에는 불탄 경복궁을 걸어 나온다', () => {
    const ks = beatsOf(a)
    const salvageAt = ks.findIndex(b => b.kind === 'salvage')
    const walk = ks.slice(salvageAt).find(b => b.kind === 'explore')
    expect(walk.palace).toBe('gyeongbok_burnt')
    expect(walk.exit.room).toBe('gwanghwamun')
  })

  it('D2 는 촉박이 아니다 — 시계를 붙이지 않는다', () => {
    const s = beatsOf(a).find(b => b.kind === 'salvage')
    expect(s.totalMs).toBeUndefined()
    expect(s.track).toBeUndefined()
  })

  it('조약 어전회의는 D2 보다 먼저다 — 읽고 정한 뒤에 잃는다', () => {
    const ks = beatsOf(a).map(b => b.kind)
    expect(ks.lastIndexOf('council')).toBeLessThan(ks.indexOf('salvage'))
  })

  it('모든 이어가 실록에서 확인한 음력 날짜와 근거를 달고 있다', () => {
    for (const b of ACTS.flatMap(x => beatsOf(x)).filter(b => b.kind === 'move')) {
      expect(b.lunarDate, `${b.id}`).toMatch(/고종 \d+년 음력 \d+월 \d+일/)
      expect(b.sillok, `${b.id}`).toContain('『고종실록』')
      expect(b.lunarDate, `${b.id} — 양력을 적으면 안 된다`).not.toContain('양력')
    }
  })

  it('대화재 뒤 창덕궁 이어는 1876년이 아니라 1877년이다', () => {
    const last = beatsOf(a).filter(b => b.kind === 'move').at(-1)
    expect(last.year).toBe(1877)
    expect(last.lunarDate).toContain('고종 14년')
  })

  it('자경전 화재 장면은 재구성으로 표시한다 — 실록에는 「慈慶殿災」 네 글자뿐이다', () => {
    const r = beatsOf(a).find(b => b.kind === 'rush')
    expect(r.intro.grade).toBe('staged')
    expect(r.intro.origin).toContain('음력 12월 10일')
  })

  // 선생님 지적 11번: "불날 때 사초함 3개만 들고 나갈 수 있는건 교육적 의미가 뭐야?
  // 그리고 왕이 왜 사초를 들고나가? 사관이 들고가야지"
  //
  // 두 가지를 못 박는다. ① 지고 나오는 사람은 사관이고 임금은 무엇을 먼저 꺼내라
  // 이르기만 한다. ② 왜 셋뿐인지가 화면 어딘가에서 학생에게 말해져야 한다.
  it('불에서 문서를 지고 나오는 사람은 사관이다 — 임금은 이르기만 한다', () => {
    const s = beatsOf(a).find(b => b.kind === 'salvage')
    expect(s.asker, '무엇을 먼저 꺼낼지 여쭙는 사람이 없다').toBeTruthy()
    expect(s.asker.name).toBe('사관')
    expect(s.asker.lines.length).toBeGreaterThan(0)
    const said = s.asker.lines.join(' ')
    expect(said).toContain('지고 나올 수 있는')
    expect(said).toContain('하시겠습니까')
    // 「임금이 들고 나간다」로 읽히는 문장이 이 비트 안에 남아 있지 않다
    const all = [...s.lines, ...s.asker.lines, s.footer].join(' ')
    expect(all).not.toContain('들고 나')
  })

  // 2026-09-13 — 사료 카드를 태우는 가상 규칙 대신, 실록이 적은 실제 소실물로 묻는다.
  it('대화재는 실록이 적은 실제 소실물로 묻고, 실제로 건진 것은 대보와 세자 옥인뿐이다', () => {
    const s = beatsOf(a).find(b => b.kind === 'salvage')
    expect(s.treasures.map(t => t.id).sort()).toEqual(['busin', 'daebo', 'eopil', 'oksae', 'seja-in'])
    expect(s.treasures.filter(t => t.saved).map(t => t.id).sort()).toEqual(['daebo', 'seja-in'])
    expect(s.actual.origin).toContain('11월 4일')
    expect(s.pick).toBe(2)
    expect(s.footer).toContain('옥새와 부신')
  })

  it('「830여 칸」이 실록 원문 표현임을 밝히고 이견도 적는다', () => {
    const s = beatsOf(a).find(b => b.kind === 'salvage')
    expect(s.origin).toContain('실록 국역 원문의 표현')
    expect(s.origin).toContain('922칸')
  })

  // Gate 1·2 — 촉박(재구성) 바로 뒤에, 실록이 실제로 남긴 넉 자를 밝히는 카드가
  // 반드시 뒤따른다. 이 카드는 재구성이 아니라 실록 원문 그대로이므로 grade 는
  // 'staged'가 아니라 'source'여야 한다 — 'staged'로 두면 note-screen.js 가
  // 「이 장면은 기록이 남아있지 않아 재구성했습니다」를 정확한 인용 화면 위에 찍는다.
  it('촉박 바로 다음 비트가 실록 원문 고지다 — grade 는 source, staged 가 아니다', () => {
    const ks = beatsOf(a)
    const rushIdx = ks.findIndex(b => b.kind === 'rush')
    const actual = ks[rushIdx + 1]
    expect(actual.kind).toBe('note')
    expect(actual.grade).toBe('source')
    expect(actual.lines.join(' ')).toContain('慈慶殿災')
    expect(actual.origin).toContain('『고종실록』')
  })

  // Gate 3 — 이어는 화재 당일 밤이 아니라 열흘 뒤다. 양력 날짜는 어디에도 적지 않는다.
  it('1873 이어는 화재 당일이 아니라 열흘 뒤다', () => {
    const m = beatsOf(a).find(b => b.kind === 'move' && b.year === 1873)
    expect(m.lunarDate).toBe('고종 10년 음력 12월 20일')
    expect(m.sillok).toContain('열흘')
  })

  // 1875 환어는 이 게임 전체에서 조작권이 A로 오르는 유일한 이어다.
  it('1875 환어는 음력 5월 27일이고, 이 막에서 조작권이 A 로 오르는 유일한 이어다', () => {
    const m = beatsOf(a).find(b => b.kind === 'move' && b.year === 1875)
    expect(m.lunarDate).toBe('고종 12년 음력 5월 27일')
    const risingMoves = beatsOf(a).filter(b => b.kind === 'move' && b.control === 'A')
    expect(risingMoves).toHaveLength(1)
    expect(risingMoves[0].year).toBe(1875)
  })
})

// [R75] 양력이 확정된 것은 1884년뿐이다. 1868·1873·1875·1877 네 이어는 실록이
// 음력만 남겼고 어느 자료도 양력 일 단위를 확정해 주지 못해 solarDate 를 아예
// 갖지 않는다 — 오늘은 그렇다. 이 시험이 없으면 나중에 「그럴듯해 보여서」 넷
// 중 하나에 solarDate 를 조용히 지어 붙여도 아무것도 울지 않는다.
describe('양력이 확정된 것은 1884년뿐이다 (R75)', () => {
  const LUNAR_ONLY_MOVE_IDS = ['move-1868', 'move-1873', 'move-1875', 'move-1877']

  it('네 이어(1868·1873·1875·1877)가 모두 있고, 그 넷만 solarDate 를 갖지 않는다', () => {
    const moves = ACTS.flatMap(a => beatsOf(a)).filter(b => b.kind === 'move')
    const found = moves.filter(b => LUNAR_ONLY_MOVE_IDS.includes(b.id))
    expect(found.map(b => b.id).sort()).toEqual([...LUNAR_ONLY_MOVE_IDS].sort())
    for (const b of found) expect(b.solarDate, b.id).toBeUndefined()
  })
})

describe('막 전체를 가로지르는 규칙', () => {
  it('탐색 비트의 나가는 방에는 사료 지점이 없다 — E 가 겹치면 사료를 못 줍는다', () => {
    for (const act of ACTS) {
      let palace = act.palace
      for (const b of beatsOf(act)) {
        if (b.palace) palace = b.palace
        if (b.kind !== 'explore' || !b.exit) continue
        const def = PALACES[palace]
        const clash = (def.pickups ?? [])
          .filter(p => roomAt(def, p.x, p.z)?.id === b.exit.room)
          .map(p => p.cardId)
        expect(clash, `${act.id}/${b.id} — ${b.exit.room}`).toEqual([])
      }
    }
  })

  it('모든 비트가 지금 있는 궁에 실재하는 방만 가리킨다', () => {
    for (const act of ACTS) {
      let palace = act.palace
      for (const b of beatsOf(act)) {
        if (b.palace) palace = b.palace
        const ids = new Set(PALACES[palace].rooms.map(r => r.id))
        for (const roomId of [b.exit?.room, b.spawnRoom, b.goalRoom, ...(b.track ?? [])]) {
          if (roomId) expect(ids, `${act.id}/${b.id} → ${roomId}`).toContain(roomId)
        }
      }
    }
  })

  // 3막 자경전 화재(C1) · 4막 난군의 밤(C2) · 5막 정변 사흘째 밤(C3) 셋이다.
  // 셋뿐이라는 것을 못 박아 둔다 — 촉박이 조용히 늘면 게임이 기다림이 아니라
  // 재촉으로 기운다(설계서 5장 C).
  it('다섯 막을 다 합쳐 촉박은 세 번이다', () => {
    const rushes = ACTS.flatMap(a => beatsOf(a)).filter(b => b.kind === 'rush')
    expect(rushes.map(b => b.id)).toEqual(['jagyeong-fire', 'imo-rush', 'gapsin-rush'])
  })
})

// 2단계 Important 3 — 서로 다른 해에 벌어진 두 사건(1871 신미양요, 1875 운요호 사건)의
// 초지진 장계 본문이 글자 하나까지 같았다. 실록 인용과 교과서 인용이 우연히 같은
// 문장일 수는 없다 — 장계 말투로 지어낸 재구성이라는 뜻이고, grade 는 'staged' 여야
// 그 사실이 화면에 드러난다(dispatch-map.js 가 grade 를 읽어야 한다는 것도 함께 고쳤다).
describe('장계 본문의 정직성 — 같은 문장이면 같은 등급이어야 한다', () => {
  it('모든 장계를 훑어, 본문이 같은 두 장계는 등급도 같다', () => {
    const dispatches = ACTS.flatMap(a => beatsOf(a))
      .filter(b => b.kind === 'dispatch')
      .flatMap(b => b.dispatches)
    for (let i = 0; i < dispatches.length; i++) {
      for (let j = i + 1; j < dispatches.length; j++) {
        if (dispatches[i].body === dispatches[j].body) {
          expect([dispatches[i].grade, dispatches[j].grade], `${dispatches[i].id}/${dispatches[j].id}`)
            .toEqual([dispatches[i].grade, dispatches[i].grade])
        }
      }
    }
  })

  it('초지진 장계 두 건(sn1·un1)은 재구성으로 표시된다 — 실록·교과서를 그대로 옮긴 것이 아니다', () => {
    const dispatches = ACTS.flatMap(a => beatsOf(a))
      .filter(b => b.kind === 'dispatch')
      .flatMap(b => b.dispatches)
    const sn1 = dispatches.find(d => d.id === 'sn1')
    const un1 = dispatches.find(d => d.id === 'un1')
    expect(sn1.body).toBe(un1.body)   // 여전히 같은 문장이다 — 등급만 정직해졌다
    expect(sn1.grade).toBe('staged')
    expect(un1.grade).toBe('staged')
    expect(sn1.origin).toContain('고종 8년')
    expect(un1.origin).toContain('p.110')
  })
})

describe('4막 「임오」', () => {
  const a = actById('imo')

  it('창덕궁 한 곳에서 벌어진다 — 1882년에 임금은 궁을 옮기지 않았다', () => {
    expect(a.palace).toBe('changdeok')
    expect(palaceTimeline(a)).toEqual(['changdeok'])
    expect(beatsOf(a).filter(b => b.kind === 'move')).toHaveLength(0)
  })

  it("조작권이 'A' 로 시작해 'D' 로 끝난다 — 스무 해 만에 처음 자유롭고, 마지막에 다 뺏긴다", () => {
    expect(a.control).toBe('A')
    expect(controlTimeline(a)).toEqual(['A', 'D'])
    expect(peakControl(a)).toBe('A')
    expect(endControl(a)).toBe('D')
  })

  it('촉박이 한 번뿐이다 — C2 하나', () => {
    const rushes = beatsOf(a).filter(b => b.kind === 'rush')
    expect(rushes).toHaveLength(1)
    expect(rushes[0].track).toEqual(['donhwamun', 'injeongjeon', 'huijeongdang', 'daejojeon'])
    expect(rushes[0].goalRoom).toBe('daejojeon')
    expect(rushes[0].caughtFlag).toBe('queen-lost')
    expect(rushes[0].fire).toBe(false)          // 난군은 불이 아니다
  })

  it('촉박의 트랙과 시작 방과 목표가 모두 창덕궁에 실재하는 방이다', () => {
    const rooms = new Set(PALACES.changdeok.rooms.map(r => r.id))
    const rush = beatsOf(a).find(b => b.kind === 'rush')
    for (const id of [...rush.track, rush.spawnRoom, rush.goalRoom]) expect(rooms, id).toContain(id)
  })

  it('낮에 궁 밖으로 나가는 길이 있고 그 값이 세 칸이다', () => {
    const day = beatsOf(a).find(b => b.kind === 'explore')
    expect(day.stops).toHaveLength(1)
    expect(day.stops[0].placeId).toBe('outside')
    expect(day.stops[0].beat.kind).toBe('outing')
    expect(day.stops[0].room).not.toBe(day.exit.room)
  })

  it('나들이가 「겨와 모래」 카드를 쥐여 준다 — 건너뛰면 그 카드가 없다', () => {
    const day = beatsOf(a).find(b => b.kind === 'explore')
    expect(day.stops[0].beat.grantCard).toBe('muwiyeong')
  })

  it('어전회의가 얼어붙어 있다 — 대원군이 다시 나랏일을 맡았다', () => {
    const c = beatsOf(a).find(b => b.kind === 'council')
    expect(c.frozen).toBe(true)
    expect(c.frozenReason).toBeTruthy()
    expect(c.council.choices.some(ch => (ch.requires ?? []).length === 0)).toBe(true)
    // 위 한 줄은 브리프 원문이다 — requires 만 보는 약한 술어라 그것만으로는
    // 막다른 회의를 걸러내지 못한다(리뷰 Minor 7). 진짜 판정을 한 줄 덧붙인다.
    expect(hasWayForward(c)).toBe(true)
  })

  it('청군을 부르는 선택지는 「아는가」로 잠긴다 — 사료로 잠기지 않는다', () => {
    const c = beatsOf(a).find(b => b.kind === 'council')
    const qing = c.council.choices.find(ch => ch.needsFlag)
    expect(qing.needsFlag).toBe('queen-alive-known')
    expect(qing.requires).toEqual([])
    expect(qing.flagLabel).toBeTruthy()
  })

  it('불에 태운 카드가 여기서 이름으로 돌아온다 — D2 의 값', () => {
    const c = beatsOf(a).find(b => b.kind === 'council')
    const all = c.council.choices.flatMap(ch => ch.requires ?? [])
    expect(all.length).toBeGreaterThan(0)
    for (const id of all) expect(SOURCES.map(s => s.id)).toContain(id)
  })

  it('국상 비트에는 조건이 붙지 않는다 — 실록에 남은 것이 그렇다', () => {
    const e = beatsOf(a).find(b => b.kind === 'edict')
    expect(e.whenFlag).toBeUndefined()
    expect(e.unlessFlag).toBeUndefined()
    expect(e.historical).toBe(true)
  })

  // [판정 R84] 밀서와 승하 선포는 한 화면 건너 나란히 서는 두 갈래다.
  // 둘 다 학생의 플레이가 만든 자리에 게임이 지어낸 장면이다. 예전에는 밀서만
  // staged 였고 승하 선포는 source 였다 — note-screen 은 staged 일 때만 재구성
  // 고지를 내므로, 지어낸 줄이 1차사료의 권위를 입고 나갔다.
  it('갈림길의 두 화면이 같은 잣대를 받는다 — 밀서도 승하 선포도 재구성이다', () => {
    const letter = beatsOf(a).find(b => b.id === 'imo-letter')
    const declared = beatsOf(a).find(b => b.id === 'imo-declared')
    expect(letter.grade).toBe('staged')
    expect(declared.grade).toBe('staged')
  })

  it('재구성 화면이 실록에 없는 귀속을 단정하지 않는다 — 그 기사에 대원군은 없다', () => {
    const declared = beatsOf(a).find(b => b.id === 'imo-declared')
    expect(declared.lines.join(' ')).not.toContain('대원군')
    expect(declared.origin).toContain('실록에 없습니다')
  })

  // 승하를 알리고 거애 절차를 마련하게 한 6월 10일 기사는 사료다 — 그것은
  // 바로 다음 화면(국상)이 실록 표에 그대로 올려 고지 없이 보여 준다.
  it('그 실록 기사는 재구성 화면이 아니라 국상 화면이 인용한다', () => {
    const gukjang = beatsOf(a).find(b => b.kind === 'edict')
    expect(gukjang.view.rows[0].text).toContain('거애하는 절차')
    expect(gukjang.view.rows[0].lunar).toBe('6월 10일')
    expect(gukjang.grade).toBeUndefined()   // 실록 표는 재구성 고지를 달지 않는다
  })

  // [판정 R52 · 리뷰 I5] 4막에서 글자가 가장 빈빈한 화면이다. 실록 표에
  // 나오는 어려운 낱말은 하나도 빠짐없이 그 화면에서 풀려야 한다.
  // 예전에는 의계·미시·신시·옥체 넷이 풀이 없이 나갔다 — 체백(주검)은 풀어 놓고
  // 옥체를 안 풀어, 학생이 두 낱말을 같은 것으로 볼지 다른 것으로 볼지 알 수 없었다.
  it('국상 화면의 어려운 낱말이 하나도 빠짐없이 그 자리에서 풀린다', () => {
    const v = beatsOf(a).find(b => b.kind === 'edict').view
    const shown = [
      ...v.lines,
      ...v.rows.map(r => r.text),
      v.hasi.text,
      ...v.after.lines,
      v.after.objection.text,
      ...v.closing,
    ].join(' ')
    // 풀이가 있을 수 있는 자리는 둘이다 — glossary 줄과, 낱말을 그 자리에서
    // 풀어 쓰는 본문(「이런 장례를 의복장(衣服葱)이라 한다」)이다.
    const glossed = `${v.glossary} ${v.after.lines.join(' ')}`
    const HARD = ['거애', '소렴', '대렴', '성복', '대행 왕비', '곤전', '체백',
      '의계', '미시', '신시', '옥체', '의복장']
    for (const w of HARD) {
      if (!shown.includes(w)) continue
      expect(glossed, `「${w}」가 화면에 나오는데 풀이가 없다`).toContain(w)
    }
  })

  it('탈출 장면은 대조전에 닿았을 때만 있다', () => {
    const e = beatsOf(a).find(b => b.kind === 'escape')
    expect(e.unlessFlag).toBe('queen-lost')
  })

  it('양력을 단정하지 않는다 — 발발일은 폭으로 적는다 (판정 R14)', () => {
    const text = JSON.stringify(a)
    expect(text).toContain('7월 22~23일')
    expect(text).not.toContain('7월 22일 ')
    expect(text).not.toMatch(/양력 7월 23일/)
  })

  it('4막의 모든 카드가 어디선가 손에 들어온다', () => {
    const granted = new Set(beatsOf(a).flatMap(b => [
      b.grantCard, ...(b.stops ?? []).map(s => s.beat?.grantCard),
    ]).filter(Boolean))
    const placed = new Set((PALACES.changdeok.pickups ?? []).map(p => p.cardId))
    for (const c of SOURCES.filter(c => c.act === 4)) {
      expect(granted.has(c.id) || placed.has(c.id), `${c.id} 를 손에 넣을 길이 없다`).toBe(true)
    }
  })

  it('「속방」을 뜯어 보이고 여섯 해 전 조약과 나란히 놓는다 — 판정 R52', () => {
    const b = beatsOf(a).find(x => x.id === 'imo-sokbang')
    expect(b.glyphGloss.parts.map(p => p.ch)).toEqual(['屬', '邦'])
    expect(b.glyphGloss.plain).toBe('다른 나라에 딸린 나라')
    expect(b.compare.left.line).toContain('자주')
    expect(b.compare.right.line).toContain('속방')
    // 설명하지 않는다 — 두 줄이 스스로 말하게 둔다
    expect(JSON.stringify(b)).not.toContain('그래서')
  })
})

// ── 5막 「갑신」 · 1884 ─────────────────────────────────────────────
//
// ⚠ 브리프 초안과 디스크가 어긋난 자리가 둘 있었다. 「서 있는 지시 — 디스크가 이긴다」
//    에 따라 지금 파일과 실록이 이긴다.
//
//  (1) 브리프는 이어의 lunarDate 를 `/^음력 /` 로 검사하게 했지만, 이 파일 위쪽의
//      전역 불변식('모든 이어가 실록에서 확인한 음력 날짜와 근거를 달고 있다')이
//      「고종 N년 음력 M월 D일」과 sillok 을 이미 모든 막에 요구한다. 5막만 그
//      불변식 밖에 둘 수는 없다 — 그래서 검사를 「고종 21년 음력 …」으로 좁힌다.
//
//  (2) 브리프는 환어 날짜를 「음력 10월 18~19일 · 양력 12월 5~6일」의 폭으로 적게
//      했다. 그러나 『고종실록』 21권 고종 21년 10월 18일 기사가 「오전에 잠시 종친
//      이재원의 집으로 이어(移御)하였다가 관물헌(觀物軒)으로 환어(還御)하였다」라고
//      그날에 못 박아 적는다(국사편찬위 조선왕조실록 kza_12110018_005). 실록이 날짜를
//      적어 둔 자리에서 게임이 폭으로 흐리면 그것은 정직이 아니라 부정확이다.
//      갈리는 것은 날짜가 아니라 **그날의 시각**이다 — 실록은 「오전」이라 적고 여러
//      2차문헌은 그날 저녁이라 적는다. 그 갈림을 note 가 진다.
describe('5막 「갑신」', () => {
  const a = actById('gapsin')

  it('교과서 p.116 지도 그대로 옮겨 다닌다 — 지어낸 장소가 없다', () => {
    expect(palaceTimeline(a)).toEqual(['changdeok', 'gyeongu', 'gyedong', 'changdeok', 'bukmyo', 'ojoyu'])
  })

  it('우정총국 맵을 만들지 않았다 — 임금이 간 적 없는 곳에 카메라를 세우지 않는다', () => {
    expect(Object.keys(PALACES)).not.toContain('ujeongchongguk')
    // 첫 비트는 이제 정변 전 김옥균의 알현이다(2026-09-13) — 정변의 밤을 알리는 글 화면을 id 로 찾는다.
    const first = beatsOf(a).find(b => b.id === 'gapsin-open')
    expect(first.lines.join(' ')).toContain('임금은 그 자리에 없었다')
  })

  it('조작권이 D → C → B → D 다 — 설계서 5막 머리줄(판정 R43)', () => {
    expect(a.control).toBe('D')
    expect(controlTimeline(a)).toEqual(['D', 'C', 'B', 'D'])
    expect(peakControl(a)).toBe('B')
    expect(endControl(a)).toBe('D')
  })

  it('경우궁에서 조작권이 A 로 오르지 않는다 — 일본군 이백 명에 에워싸인 것은 자유가 아니다', () => {
    expect(controlTimeline(a)).not.toContain('A')
  })

  it('이어가 다섯 번이다 — 그중 마지막 둘은 같은 날 밤이다', () => {
    const moves = beatsOf(a).filter(b => b.kind === 'move')
    expect(moves.map(m => m.palace)).toEqual(['gyeongu', 'gyedong', 'changdeok', 'bukmyo', 'ojoyu'])
    expect(moves[3].lunarDate).toContain('10월 19일')
    expect(moves[4].lunarDate).toContain('10월 19일')
  })

  it('1884년 이어에는 양력이 적혀 있다 — 이 해만 확정되었다', () => {
    for (const m of beatsOf(a).filter(b => b.kind === 'move')) {
      expect(m.lunarDate, m.id).toMatch(/^고종 21년 음력 /)
      expect(m.solarDate, m.id).toMatch(/^양력 /)
    }
  })

  it('환어는 실록이 적은 그날이다 — 갈리는 것은 날짜가 아니라 시각이다', () => {
    const back = beatsOf(a).find(b => b.kind === 'move' && b.palace === 'changdeok')
    expect(back.lunarDate).toBe('고종 21년 음력 10월 18일')
    expect(back.solarDate).toBe('양력 12월 5일')
    expect(back.sillok).toContain('10월 18일')
    expect(back.sillok).toContain('환어')
    expect(back.note).toContain('갈립니다')
    // 흐리지 않는다 — 실록이 날짜를 적어 둔 자리다
    expect(back.lunarDate).not.toContain('~')
  })

  it('계동궁 이어와 환어는 실록에서 같은 날 한 기사다', () => {
    const moves = beatsOf(a).filter(b => b.kind === 'move')
    const [, gyedong, back] = moves
    expect(gyedong.palace).toBe('gyedong')
    expect(gyedong.lunarDate).toBe(back.lunarDate)
    expect(gyedong.solarDate).toBe(back.solarDate)
  })

  it("1884 환어의 self 는 참도 거짓도 아니다 — 학생이 센다(설계서 13.2)", () => {
    const back = beatsOf(a).find(b => b.kind === 'move' && b.palace === 'changdeok')
    expect(back.self).toBe('disputed')
    for (const m of beatsOf(a).filter(b => b.kind === 'move' && b.id !== back.id)) {
      expect(m.self, m.id).toBe(false)
    }
  })

  it('경우궁의 낮은 온전한 하루가 아니다 — 정변의 사흘에 온전한 하루는 없다', () => {
    const day = beatsOf(a).find(b => b.kind === 'explore')
    expect(day.dayUnits).toBeLessThan(6)
    expect(day.exit.room).toBe('haenggak-w')
  })

  it('조작권 D 장면이 있고 그것이 촉박이 아니다', () => {
    const h = beatsOf(a).find(b => b.kind === 'hold')
    expect(h.control).toBe('D')
    expect(h.view.buttonLabel).toBeTruthy()
    expect(h.totalMs).toBeUndefined()
    expect(h.track).toBeUndefined()
  })

  it('F2 는 네 글자를 쓰게 하고 나머지 두 표기를 함께 보여 준다', () => {
    const b = beatsOf(a).find(x => x.kind === 'brush')
    expect(b.glyphs.join('')).toBe('日使來衛')
    expect(b.rest.map(r => r.text)).toEqual(['日本公使來護朕', '日本公使來護我'])
    expect(b.partial).toContain('갑신일록')
    expect(b.afterLines.join(' ')).toContain('김옥균')
    expect(b.afterLines.join(' ')).toContain('그중 하나')
  })

  it('핵심 선택의 「실제로는」이 사실과 해석을 나눠 담는다 — 판정 R12', () => {
    const c = beatsOf(a).find(b => b.kind === 'council')
    expect(c.actual.line).toBeTruthy()
    expect(c.actual.reading.label).toBeTruthy()
    expect(c.actual.reading.origin).toContain('2차문헌')
    expect(c.actual.line).not.toContain('방어')
    expect(c.actual.reading.line).toContain('갑신일록')
  })

  it('C3 는 촉박이고 불이 아니다', () => {
    const r = beatsOf(a).find(b => b.kind === 'rush')
    expect(r.fire).toBe(false)
    expect(r.goalRoom).toBe('yeongyeongdang')
    expect(r.track[r.track.length - 1]).toBe('yeongyeongdang')
    expect(r.caughtFlag).toBe('flight-caught')
  })

  it('C3 의 목표 방이 그때의 조작권으로 열린다 — 못 들어가는 곳으로 달리게 하지 않는다', () => {
    const r = beatsOf(a).find(b => b.kind === 'rush')
    const room = PALACES.changdeok.rooms.find(x => x.id === r.goalRoom)
    expect(isRoomOpen('B', room)).toBe(true)
  })

  it('홍영식·박영교는 두 경로 모두에서 남는다 — 실록이 그렇게 적었다', () => {
    const hong = beatsOf(a).find(b => b.id === 'gapsin-hong')
    expect(hong.historical).toBe(true)
    expect(hong.whenFlag).toBeUndefined()
    expect(hong.unlessFlag).toBeUndefined()
    expect(hong.origin).toContain('고종실록')
  })

  it('윤치호 일기를 확정 인용으로 단정하지 않는다 — 판정 R50 · 검증 D 8항', () => {
    const b = beatsOf(a).find(x => x.id === 'gapsin-after')
    expect(b.lines.join(' ')).toContain('교과서가 전한다')
    expect(b.lines.join(' ')).toContain('가까운 사람')
    expect(b.origin).toContain('확인하지 못했습니다')
  })

  it('막을 닫는 비트가 따로 있고, 거기서 이어 횟수를 세지 않는다 — 판정 R55', () => {
    const ids = beatsOf(a).map(b => b.id)
    // 윤치호의 일기(gapsin-after) 뒤에 김옥균의 끝(kimokgyun-fate)이 한 장 붙었다(2026-09-13).
    expect(ids.at(-3)).toBe('gapsin-after')
    expect(ids.at(-2)).toBe('kimokgyun-fate')
    expect(ids.at(-1)).toBe('end')
    const text = JSON.stringify(beatsOf(a).at(-1))
    expect(text).not.toMatch(/여덟 번|아홉 번|열 번|[0-9]+\s*번 옮/)
  })

  it('5막의 두 카드가 모두 손에 들어온다', () => {
    const granted = new Set(beatsOf(a).map(b => b.grantCard).filter(Boolean))
    const placed = new Set((PALACES.gyeongu.pickups ?? []).map(p => p.cardId))
    expect(granted.has('gapsin-memoir')).toBe(true)
    expect(placed.has('reform14')).toBe(true)
  })

  it('1884년 창덕궁에는 신하가 서 있지 않다 — 1866년 사람이 1884년에 서지 않는다', async () => {
    const { npcsAt } = await import('../../src/data/npcs.js')
    const i = ACTS.findIndex(x => x.id === 'gapsin')
    // 5막에 서는 사람은 경우궁의 개화파 관원 하나뿐이다 — 정강 14개조를 들고 온다.
    // 나머지 궁은 여전히 비어 있어야 한다: 1866년 사람이 1884년에 서지 않는다.
    for (const p of ['changdeok', 'gyedong', 'bukmyo', 'ojoyu']) {
      expect(npcsAt(baseOf, p, i), p).toEqual([])
    }
    expect(npcsAt(baseOf, 'gyeongu', i).map(n => n.id)).toEqual(['gaehwapa'])
  })
})


// ── 다섯 막이 이어진다 (Task 15) ────────────────────────────────────────
//
// 여기까지 막들은 따로따로 검증되었다. 학생은 그렇게 하지 않는다 — 1막 첫 화면에서
// 5막 끝까지 한 번에 지나간다. 이 묶음이 그 이음매만 본다.
describe('다섯 막이 이어진다', () => {
  it('막이 다섯이고 순서가 맞다', () => {
    expect(ACTS.map(a => a.id)).toEqual(['enthronement', 'yangyo', 'chinjeong', 'imo', 'gapsin'])
  })

  it('마지막 막이 5막이다 — 게임 오버가 아니라 막의 끝으로 닫힌다', () => {
    expect(ACTS.at(-1).id).toBe('gapsin')
  })

  // 막 끝 화면(showActEnd)은 기록과 복사 단추만 진다 — 이야기는 마지막 비트가 닫는다.
  // 한때 showActEnd() 안에 1막 문구(「담 너머에서 경복궁 중건이 시작된다.」)가 굳어 있어
  // 다섯 막에 같은 말이 찍혔다. 그 자리를 막마다 다른 글이 지고 있는지 본다.
  //
  // 닫는 방식은 두 가지다. 2~5막은 마지막이 글 비트(note)라 lines 가 닫고, 1막은
  // 마지막이 어전회의라 그 회의의 「실제로는」(actual.line)이 닫는다. 둘 다 그 막의
  // 자기 이야기다 — 종류를 강요하지 않고 「닫는 글이 있는가」만 본다.
  const closingTextOf = (act) => {
    const last = beatsOf(act).at(-1)
    return [...(last?.lines ?? []), last?.actual?.line ?? ''].join(' ').trim()
  }

  it('막마다 자기 이야기로 닫는 글이 있다 — 1막 문구가 다섯 막에 쓰이지 않는다', () => {
    const closings = ACTS.map(a => closingTextOf(a))
    for (const [i, text] of closings.entries()) {
      expect(text.length, `${ACTS[i].id} 의 마지막 비트에 닫는 글이 없다`).toBeGreaterThan(0)
    }
    expect(new Set(closings).size, '두 막이 같은 말로 닫는다').toBe(ACTS.length)
  })

  // 화재 변형(gyeongbok_jagyeong 등)은 같은 집이므로 baseOf 로 견준다.
  // 여기가 어긋나면 학생이 잠든 곳과 눈뜬 곳이 달라진다 — 이어 화면 없이 순간이동한 셈이다.
  it('막이 넘어갈 때 궁이 이어진다 — 끝난 그 집에서 다음 막이 시작한다', () => {
    for (let i = 0; i + 1 < ACTS.length; i++) {
      const endPalace = palaceTimeline(ACTS[i]).at(-1)
      const nextStart = ACTS[i + 1].palace
      expect(baseOf(nextStart), `${ACTS[i].id} → ${ACTS[i + 1].id}`).toBe(baseOf(endPalace))
    }
  })

  it('촉박은 통틀어 세 번뿐이고, 불이 붙는 것은 그중 하나다 — 자경전', () => {
    const rushes = ACTS.flatMap(a => beatsOf(a).filter(b => b.kind === 'rush'))
    expect(rushes).toHaveLength(3)
    expect(rushes.filter(r => r.fire === true).map(r => r.id)).toEqual(['jagyeong-fire'])
  })

  it('친필은 두 번뿐이다 — F1 척화비 · F2 日使來衛 (F3 는 4단계 엔딩)', () => {
    const brushes = ACTS.flatMap(a => beatsOf(a).filter(b => b.kind === 'brush'))
    expect(brushes).toHaveLength(2)
  })

  it('조작권 D 를 실제로 쓰는 막은 4막과 5막뿐이다', () => {
    const withD = ACTS.filter(a => controlTimeline(a).includes('D'))
    expect(withD.map(a => a.id)).toEqual(['imo', 'gapsin'])
  })

  // 하루 칸수 — 어느 막에서도 음수로 내려가거나 막다른 곳을 만들지 않는다.
  // 탐색 비트가 정한 낮이 0 이하면 그 낮은 시작하자마자 끝나고, 학생은 아무것도
  // 못 주운 채 밤을 맞는다. 나들이 값보다도 작으면 나갈 수 없는 문이 열려 있는 셈이다.
  it('탐색하는 낮이 어느 막에서도 0 보다 크고, 그 낮에 열린 나들이 값을 감당한다', () => {
    for (const a of ACTS) {
      for (const b of beatsOf(a)) {
        if (b.dayUnits == null) continue
        expect(b.dayUnits, `${a.id}/${b.id}`).toBeGreaterThan(0)
        for (const st of b.stops ?? []) {
          expect(costOf(st.placeId), `${a.id}/${b.id}/${st.id} — 값이 그날 하루보다 크다`)
            .toBeLessThanOrEqual(b.dayUnits)
        }
      }
    }
  })

})


// ── 판정 I1 — 윤치호가 누구의 통역이었고 언제 떠났는가 ──────────────────
//
// 이 비트는 「가까이 있던 사람의 기록은 자세하지만, 그래서 한쪽으로 기울 수도 있다」를
// 가르치는 자리다. 저울질하라고 내미는 근거 자체가 부정확하면 그 교육이 서지 않는다.
//   · 윤치호가 맡은 통역은 주한 미국공사관의 것이다 — 김옥균의 통역이 아니다.
//   · 김옥균·박영효·서재필은 1884년 12월 일본으로 망명했고, 윤치호는 이듬해 정월에
//     임금의 허락을 받아 유학 형식으로 따로 상하이에 갔다 — 「함께」가 아니다.
describe('윤치호를 소개하는 문장이 사실과 어긋나지 않는다', () => {
  const after = beatsOf(actById('gapsin')).find(b => b.id === 'gapsin-after')

  it('그 비트가 있고, 편향을 저울질하라는 말이 그대로 있다', () => {
    expect(after, '5막에 gapsin-after 비트가 없다').toBeTruthy()
    expect(after.lines.join(' ')).toContain('한쪽으로 기울 수도 있다')
  })

  it('통역이 미국 공사관의 것임을 밝힌다 — 김옥균의 통역으로 읽히지 않게', () => {
    expect(after.lines.join(' ')).toContain('미국 공사관의 통역')
  })

  it('김옥균 일행과 「함께 떠났다」고 말하지 않는다', () => {
    const text = after.lines.join(' ')
    expect(text, '함께 떠났다고 적혀 있다').not.toMatch(/함께\s*나라를\s*떠났/)
    expect(text).not.toMatch(/함께\s*망명/)
  })
})


// ── 판정 R101 — 막 안에서 세는 햇수도 같은 셈법을 쓴다 ──────────────────
//
// 마지막 화면은 1863~1884 를 actSpan() 으로 세어 「스물한 해를 지났다」고 한다.
// 그런데 4막(1882)의 첫 줄은 「스무 해가 지났다」라고 적혀 있었다 — 1863에서
// 1882 는 열아홉 해다. 같은 게임 안에서 셈법이 두 가지였던 것이고, 하필 이 게임의
// 엔딩이 학생에게 「정확히 세라」고 요구한다.
//
// 그래서 손으로 적은 햇수를 그 막의 해에서 계산한 값과 맞대 본다. 데이터라
// 함수를 부를 수 없으니, 시험이 대신 센다.
describe('막 안에서 손으로 적은 햇수가 그 막의 해와 맞는다 (판정 R101)', () => {
  const NATIVE = {
    열: 10, 열하나: 11, 열둘: 12, 열셋: 13, 열넷: 14, 열다섯: 15, 열여섯: 16,
    열일곱: 17, 열여덟: 18, 열아홉: 19, 스물: 20, 스물한: 21, 스물두: 22,
    스무: 20,
  }
  const FIRST_YEAR = ACTS[0].year

  it('「N 해가 지났다」로 적힌 곳이 그 막의 해에서 센 값과 같다', () => {
    let checked = 0
    for (const a of ACTS) {
      for (const b of beatsOf(a)) {
        for (const line of b.lines ?? []) {
          const m = /([가-힣]+)\s*해가 지났다/.exec(line)
          if (!m) continue
          const said = NATIVE[m[1]]
          expect(said, `모르는 우리말 수: 「${m[1]}」 (${a.id}/${b.id})`).toBeDefined()
          expect(said, `${a.id}/${b.id} — ${a.year} 는 즉위(${FIRST_YEAR})에서 ${a.year - FIRST_YEAR} 해다`)
            .toBe(a.year - FIRST_YEAR)
          checked++
        }
      }
    }
    expect(checked, '「해가 지났다」로 적힌 줄을 하나도 못 찾았다 — 이 시험이 헛돌고 있다')
      .toBeGreaterThan(0)
  })

  it('막을 닫는 비트는 여전히 햇수를 손으로 적지 않는다', () => {
    const last = beatsOf(ACTS.at(-1)).at(-1).lines.join(' ')
    expect(last).not.toMatch(/(열|스무|스물|서른)\S*\s*해/)
  })
})

describe('1막 앞머리 — 운현궁의 명복', () => {
  const beats = beatsOf(ACTS[0])
  it('운현궁에서 시작해 인정전으로 간다', () => {
    expect(ACTS[0].palace).toBe('unhyeon')
    expect(beats.slice(0, 4).map(b => b.id)).toEqual(['unhyeon-note', 'unhyeon-day', 'unhyeon-summons', 'unhyeon-procession'])
    expect(beats.find(b => b.id === 'throne').palace).toBe('changdeok')
  })
  it('운현궁에서 창덕궁으로 가는 길은 이어가 아니다 — 왕이 되기 전의 걸음이다', () => {
    expect(beats.filter(b => b.kind === 'move')).toHaveLength(0)
  })
  it('모시러 온 사람은 실록대로 김좌근과 민치상이다', () => {
    const s = beats.find(b => b.id === 'unhyeon-summons')
    expect(s.visitors.map(v => v.npc)).toEqual(expect.arrayContaining(['kimjwageun', 'minchisang']))
    expect(s.origin).toContain('철종실록')
  })
})

it('1막 알현 — 발 뒤의 조 대비가 먼저 말하고, 김좌근이 물러간다', () => {
  const a = beatsOf(ACTS[0]).find(b => b.id === 'audience')
  expect(a.visitors[0]).toMatchObject({ npc: 'jodaebi', from: 'voice' })
  expect(a.visitors.some(v => v.npc === 'kimjwageun')).toBe(true)
})

describe('2막 — 고종의 사사로운 삶', () => {
  const beats = beatsOf(ACTS[1])
  const ids = beats.map(b => b.id)
  it('시간 순서로 끼운다 — 박해 → 철렴 → 가례 → 병인양요 → 완화군 → 경복궁 → 신미양요 → 척화비 → 원자', () => {
    const order = ['byeongin-audience', 'cheolryeom', 'garye-note', 'garye-audience', 'day-changdeok',
      'oegyujanggak-plunder', 'wanhwa', 'wanhwa-rumor', 'move-1868-out', 'move-1868',
      'sinmi-dispatch', 'cheokhwabi-brush', 'wonja', 'wonja-rumor', 'end']
    const at = order.map(id => ids.indexOf(id))
    expect(at.every(i => i >= 0), JSON.stringify(at)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })
  it('소문은 제 비트에 따로 선다', () => {
    for (const id of ['wanhwa-rumor', 'wonja-rumor']) expect(beats.find(b => b.id === id).grade).toBe('rumor')
  })
  it('원자의 날짜는 실록대로다', () => {
    const w = beats.find(b => b.id === 'wonja')
    expect(w.origin).toContain('고종실록')
    expect(w.lines.join(' ')).toContain('11월 4일')
    expect(w.lines.join(' ')).toContain('11월 8일')
  })
})

it('3막 — 아버지가 물러간 자리를 고종이 말하고, 원자(순종)가 산다', () => {
  const beats = beatsOf(ACTS[2])
  expect(beats.find(b => b.id === 'doors-open').lines.join(' ')).toContain('처음으로 아무도 곁에 서 있지 않다')
  const s = beats.find(b => b.id === 'sunjong')
  expect(s.lines.join(' ')).toContain('이번 아이는 살았다')
  expect(beats.indexOf(s)).toBeGreaterThan(beats.findIndex(b => b.id === 'move-1873'))
  expect(beats.indexOf(s)).toBeLessThan(beats.findIndex(b => b.id === 'move-1875'))
})

describe('4·5막 보강 — 난 전의 집안, 정변 전의 믿음', () => {
  const imo = beatsOf(ACTS[3]).map(b => b.id), gap = beatsOf(ACTS[4]).map(b => b.id)
  it('4막: 완화군의 죽음 → 이재선 → 세자 가례가 난보다 먼저, 아버지의 귀환이 대원군 집권 글 앞, 왕비 환궁이 제물포 뒤', () => {
    const at = id => imo.indexOf(id)
    expect(at('wanhwa-death')).toBeGreaterThan(at('imo-open'))
    expect(at('wanhwa-death')).toBeLessThan(at('jaeseon'))
    expect(at('jaeseon')).toBeLessThan(at('seja-garye'))
    expect(at('seja-garye')).toBeLessThan(at('imo-rush'))
    expect(at('imo-father-returns')).toBe(at('imo-daewongun') - 1)
    expect(at('queen-return')).toBe(at('imo-jemulpo') + 1)
  })
  it('이재선 사사는 실록 날짜를 댄다', () => {
    expect(beatsOf(ACTS[3]).find(b => b.id === 'jaeseon').origin).toContain('10월 27일')
  })
  it('5막: 김옥균의 알현으로 열고, 그의 끝을 닫기 전에 적는다 — 알현은 한쪽 회고라 재구성이다', () => {
    expect(gap[0]).toBe('kimokgyun-audience')
    expect(beatsOf(ACTS[4])[0].grade).toBe('staged')
    expect(beatsOf(ACTS[4])[0].origin).toContain('갑신일록')
  })
})
