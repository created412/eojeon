import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { SOURCES } from '../../src/data/sources.js'
import { ILSA_NOTE } from '../../src/systems/brush-trace.js'

// 사료 등급 표기가 어긋나는 것은 역사 수업 자료에서 그냥 넘길 자리가 아니다(전역 제약 5).
// 이 파일이 붙드는 것은 둘이다.
//   ① 한 문서를 게임이 두 이름으로 부르지 않는다.
//   ② 화면에 적힌 등급 낱말이 데이터의 grade 값과 같은 말을 한다.
//
// ── 왜 『갑신일록』인가 ────────────────────────────────────────────
// 이 게임은 한때 같은 문서를 두 가지로 불렀다. sources.js 의 개혁 정강 14개조는
// 『갑신일록』에서 인용하며 사료로 다루는데, 친필(F2) 화면은 같은 문서를
// 「등급 2차문헌 · 논쟁적」이라 적었다.
//
// 확인한 것:
//   · 한국민족문화대백과사전 「갑신일록」 — "≪갑신일록≫은 갑신정변과 김옥균의
//     생애를 이해하는 데 있어서 필수적인 일차사료로 인정되고 있다."
//   · 우리역사넷(국사편찬위) 「갑신일록」 — 김옥균이 일본 망명 뒤 1885년 9~12월
//     사이에 쓴 것으로 추정된다. 위작설이 있었으나 다른 기록과 대조해 김옥균의
//     저술로 인정되었고, 갑신정변 연구의 주요 자료로 쓰인다.
//   · 같은 자료들이 신빙성 문제도 함께 적는다 — 사건 1년 뒤 기억에 의지해 썼고,
//     음력과 양력을 섞어 써 날짜에 착오가 있으며, 저술 목적(일본의 배신 폭로냐
//     정변의 정당성 천명이냐)을 두고 연구가 갈린다. 엄밀한 사료 비판이 필요하다.
//
// 「2차문헌」은 다른 사람이 정리한 연구·개설서에 붙는 말이다. 당사자가 직접 남긴
// 기록에는 붙지 않는다. 그러므로 등급은 셋(교과서·사료·재구성) 가운데 **사료**이고,
// 논쟁은 등급이 아니라 origin 문구가 진다.
//
// 등급 칸을 새로 만들지 않은 까닭: 「기록은 있으나 그 기록 자체가 논쟁 중」은
// 『갑신일록』만의 사정이 아니라 거의 모든 사료의 사정이다. 그것 때문에 네 번째
// 등급을 만들면 학생이 외울 낱말만 하나 늘고, 정작 무엇이 논쟁인지는 여전히
// 문장으로 읽어야 한다. 문장이 그 일을 하게 둔다.

const GRADE_WORD = { textbook: '교과서', source: '사료', staged: '재구성', rumor: '소문' }

// 데이터 나무를 통째로 훑어 문자열을 모은다 — 「어느 필드에 적혀 있었나」를 손으로
// 세면 새 필드가 생기는 순간 검사가 그 자리를 조용히 놓친다.
function walkStrings(node, path, out) {
  if (typeof node === 'string') { out.push({ path, text: node }); return out }
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkStrings(v, `${path}[${i}]`, out))
    return out
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) walkStrings(v, `${path}.${k}`, out)
  }
  return out
}

function allStrings() {
  const out = []
  walkStrings(ACTS, 'ACTS', out)
  walkStrings(SOURCES, 'SOURCES', out)
  out.push({ path: 'brush-trace/ILSA_NOTE', text: ILSA_NOTE })
  return out
}

// grade 와 origin 을 나란히 든 객체 — 비트·화면 조각(view·intro)·장계·사료 카드가
// 모두 이 모양이다. 등급 낱말이 데이터와 어긋날 수 있는 자리는 정확히 여기다.
// (edict 의 rowsOrigin, escape 의 secondary·staged 처럼 grade 를 안 든 안쪽 출처
//  줄은 여기 걸리지 않는다 — 대조할 값이 없는 자리에 잣대를 들이대지 않는다.)
function gradedNodes(node, path, out = []) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => gradedNodes(v, `${path}[${i}]`, out))
    return out
  }
  if (node && typeof node === 'object') {
    if (typeof node.grade === 'string' && typeof node.origin === 'string') {
      out.push({ path, node })
    }
    for (const [k, v] of Object.entries(node)) gradedNodes(v, `${path}.${k}`, out)
  }
  return out
}

describe('『갑신일록』을 부르는 이름이 게임 전체에서 하나다', () => {
  const mentions = allStrings().filter(s => s.text.includes('갑신일록'))

  it('게임 여러 곳이 이 문서를 부른다 — 그래서 갈릴 수 있는 자리다', () => {
    expect(mentions.length).toBeGreaterThanOrEqual(4)
  })

  it('어디에서도 이 문서를 2차문헌이라 부르지 않는다 — 당사자가 직접 쓴 기록이다', () => {
    for (const { path, text } of mentions) {
      expect(text.includes('2차문헌'), `${path}: "${text}"`).toBe(false)
    }
  })

  // 문서 이름 바로 뒤에 등급 낱말을 붙이면 그 등급은 그 문서의 것으로 읽힌다.
  // 실제로 났던 사고가 정확히 이 모양이다 — 「『갑신일록』 · 등급 2차문헌 · 논쟁적」.
  // 조작권 D 장면처럼 등급이 「그 장면」에 붙는 자리라면, 문서 이름에 잇대어 적지 말고
  // 문장으로 갈라 놓아야 한다. 그래야 학생이 무엇에 붙은 등급인지 안다.
  const ATTACHED_GRADE = /갑신일록』\s*[·,]\s*등급\s*([^.·\s]+)/

  it('문서 이름에 잇대어 붙인 등급은 「사료」뿐이다 — 다른 등급은 장면의 것이라고 문장으로 갈라 적는다', () => {
    for (const { path, text } of mentions) {
      const m = ATTACHED_GRADE.exec(text)
      if (!m) continue
      expect(m[1], `${path} — 『갑신일록』에 잇대어 「등급 ${m[1]}」이라 적었다: "${text}"`).toBe('사료')
    }
  })

  it('그 잣대가 헛돌지 않는다 — 실제로 「『갑신일록』 · 등급 사료」라 적은 자리가 있다', () => {
    expect(mentions.some(m => ATTACHED_GRADE.test(m.text))).toBe(true)
  })

  it('학생이 읽는 자리에서 1차 사료라는 것과 논쟁 중이라는 것을 함께 말한다', () => {
    const said = mentions.map(m => m.text).join('\n')
    expect(said).toContain('1차 사료')
    expect(said).toMatch(/논쟁/)
    expect(said).toContain('김옥균')
  })

  it('붓 아래 고지와 개혁 정강 카드가 같은 말을 한다 — 두 곳이 갈리지 않게', () => {
    const card = SOURCES.find(c => c.id === 'reform14')
    for (const text of [ILSA_NOTE, card.meaning]) {
      expect(text, text).toContain('1차 사료')
      expect(text, text).toMatch(/논쟁/)
    }
  })
})

describe('화면에 적힌 등급이 데이터의 등급과 같은 말을 한다', () => {
  const graded = [...gradedNodes(ACTS, 'ACTS'), ...gradedNodes(SOURCES, 'SOURCES')]

  it('등급을 든 자리를 실제로 찾아낸다 — 검사가 빈 배열을 돌며 초록불이 되지 않게', () => {
    expect(graded.length).toBeGreaterThan(20)
  })

  it('모든 grade 값이 넷 중 하나다 — 소문(rumor)은 드러내 놓고 더했다', () => {
    for (const { path, node } of graded) {
      expect(Object.keys(GRADE_WORD), path).toContain(node.grade)
    }
  })

  it("origin 에 「등급 …」을 적었다면 그 낱말이 grade 값과 일치한다", () => {
    for (const { path, node } of graded) {
      const m = /등급 ([^.·\s]+)/.exec(node.origin)
      if (!m) continue
      expect(m[1], `${path} — grade 는 '${node.grade}' 인데 화면은 「등급 ${m[1]}」이라 적었다`)
        .toBe(GRADE_WORD[node.grade])
    }
  })
})
