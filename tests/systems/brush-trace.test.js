import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CHEOKHWABI_LINES, CHEOKHWABI_GLYPHS, CHEOKHWABI_REST, CHEOKHWABI_PARTIAL_NOTE,
  HIT_RADIUS, DONE_RATIO, coverage, isTraced,
  ILSA_GLYPHS, ILSA_VARIANTS, ILSA_NOTE,
} from '../../src/systems/brush-trace.js'
import { actById } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

// 5막 배열 안의 그 비트를 그대로 본다. main.js 가 이것을 가리키는 상수를 들고
// 있던 시절이 있었지만 임시 통로와 함께 지웠다(Task 15) — 여기서 베껴 적지 않고
// 언제나 acts.js 에서 id 로 꺼낸다.
const F2_BEAT = beatsOf(actById('gapsin')).find(b => b.id === 'gapsin-brush')
import { writingHtml, finishHtml } from '../../src/ui/brush.js'
// 게임이 실제로 화면에 넘기는 그 view 를 짓는 함수다. 비트를 화면 함수에 직접
// 넘겨 보면, 그 사이에서 값을 흘리는 자리(playBrush 의 조립)는 영원히 안 보인다
// — 판정 R97 이 정확히 그렇게 새어 나갔다.
import { brushView } from '../../src/main.js'
import { bodyOf } from '../helpers/body-of.js'

const guides = [
  { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 },
]

describe('척화비 글자', () => {
  it('세 마디 열두 글자다', () => {
    expect(CHEOKHWABI_LINES).toEqual(['洋夷侵犯', '非戰則和', '主和賣國'])
    expect(CHEOKHWABI_GLYPHS).toHaveLength(12)
    expect(CHEOKHWABI_GLYPHS.join('')).toBe('洋夷侵犯非戰則和主和賣國')
  })

  it('열두 자는 비문 전체가 아니라 앞부분이다 — 뒤가 무엇인지 데이터로 들고 있다 (검증 C)', () => {
    expect(CHEOKHWABI_REST.map(r => r.text)).toEqual(['戒我萬年子孫', '丙寅作 辛未立'])
    for (const r of CHEOKHWABI_REST) expect(r.gloss).toBeTruthy()
    expect(CHEOKHWABI_PARTIAL_NOTE).toContain('앞부분')
    // 뒤따르는 구절이 학생이 쓰는 열두 자와 겹치지 않는다
    expect(CHEOKHWABI_REST.some(r => CHEOKHWABI_GLYPHS.join('').includes(r.text))).toBe(false)
  })
})

describe('획 판정', () => {
  it('아무것도 안 그으면 0 이다', () => {
    expect(coverage(guides, [], 0.1)).toBe(0)
  })

  it('안내점 위를 다 지나가면 1 이다', () => {
    expect(coverage(guides, guides, 0.01)).toBe(1)
  })

  it('절반만 지나가면 0.5 다', () => {
    expect(coverage(guides, [guides[0], guides[1]], 0.01)).toBe(0.5)
  })

  it('반지름 안이면 닿은 것으로 본다', () => {
    expect(coverage([{ x: 0.5, y: 0.5 }], [{ x: 0.54, y: 0.5 }], 0.05)).toBe(1)
    expect(coverage([{ x: 0.5, y: 0.5 }], [{ x: 0.6, y: 0.5 }], 0.05)).toBe(0)
  })

  it('안내점이 없어도 자동으로 완료 처리하지 않는다', () => {
    expect(coverage([], [], 0.1)).toBe(0)
    expect(isTraced([], [])).toBe(false)
  })

  it('기준을 넘으면 다 쓴 것으로 본다', () => {
    expect(isTraced(guides, [guides[0]], 0.01)).toBe(false)
    expect(isTraced(guides, [guides[0], guides[1], guides[2]], 0.01)).toBe(true)
    expect(isTraced(guides, guides, 0.01)).toBe(true)
  })

  it('기본 기준은 도달률 75% 이상이다', () => {
    expect(DONE_RATIO).toBe(0.75)
    expect(HIT_RADIUS).toBeGreaterThan(0)
  })

  it('74%는 미완료, 75%와 76%는 빈 구역이 있어도 완료다', () => {
    const points = Array.from({ length: 100 }, (_, i) => ({ x: (i % 10) / 10, y: Math.floor(i / 10) / 10 }))
    expect(isTraced(points, points.slice(0, 74))).toBe(false)
    expect(isTraced(points, points.slice(0, 75))).toBe(true)
    expect(isTraced(points, points.slice(0, 76))).toBe(true)
  })

  it('같은 곳을 여러 번 지나가도 한 번으로 센다', () => {
    const marks = [guides[0], guides[0], guides[0], guides[0]]
    expect(coverage(guides, marks, 0.01)).toBe(0.25)
  })
})

describe('F2 「日使來衛」 — 논쟁을 데이터로 들고 있는다', () => {
  it('학생이 쓰는 것은 네 글자다', () => {
    expect(ILSA_GLYPHS).toEqual(['日', '使', '來', '衛'])
    expect(ILSA_GLYPHS.join('')).toBe('日使來衛')
  })

  it('나머지 두 표기를 함께 들고 있다 — 셋 중 하나를 쓰는 것이다', () => {
    expect(ILSA_VARIANTS).toHaveLength(2)
    expect(ILSA_VARIANTS.map(v => v.text)).toEqual(['日本公使來護朕', '日本公使來護我'])
    for (const v of ILSA_VARIANTS) expect(v.gloss, v.text).toBeTruthy()
  })

  // 판정 R96 이후 이 줄이 뜨는 자리는 「쓰는 동안」이 아니라 「붓을 놓은 뒤」다.
  it('붓을 놓은 뒤의 고지가 유일 출처와 논쟁을 함께 말한다', () => {
    expect(ILSA_NOTE).toContain('갑신일록')
    expect(ILSA_NOTE).toContain('김옥균')
  })

  it('척화비 상수는 한 글자도 안 바뀌었다', () => {
    expect(CHEOKHWABI_GLYPHS.join('')).toBe('洋夷侵犯非戰則和主和賣國')
    expect(CHEOKHWABI_REST).toHaveLength(2)
    // 브리프 초안은 여기서 '발췌' 를 찾게 했지만 실제 상수에는 그 낱말이 없다
    // (「앞부분」이라고 쓴다). 「서 있는 지시 — 디스크가 이긴다」에 따라 지금 파일이
    // 이긴다 — 그리고 「한 글자도 안 바뀌었다」는 문장 통째로 못 박는 것이 더 세다.
    expect(CHEOKHWABI_PARTIAL_NOTE).toBe(
      '※ 여기 제시된 열두 자는 비석에 새긴 글의 앞부분입니다. 실제 비석에는 뒤에 글자가 더 있습니다.')
    expect(CHEOKHWABI_REST.map(r => r.text)).toEqual(['戒我萬年子孫', '丙寅作 辛未立'])
  })
})

// 붓 화면은 DOM 을 타므로(canvas·getImageData) node 환경에서 돌릴 수 없다.
// 그래서 F1 이 안 깨졌는지는 소스 문자열로 붙든다 — 「인자 하나만 열고 그 밖에는
// 한 글자도 안 고친다」가 지켜졌는지 보는 검사다.
describe('붓 화면은 마무리 문장 하나만 인자로 연다', () => {
  const brushSrc = readFileSync(join(process.cwd(), 'src', 'ui', 'brush.js'), 'utf8')

  it('restLead 가 없으면 척화비(F1) 문장이 그대로 나온다', () => {
    expect(brushSrc).toContain("view.restLead ?? '이 열두 자 뒤에 비석은 이렇게 이어진다.'")
  })

  it('마무리 화면이 그 문장을 박아 두지 않고 변수로 쓴다', () => {
    // 척화비 문장이 남아 있어도 좋은 자리는 딱 하나다 — restLead 의 기본값.
    // 그 밖에 한 번이라도 더 박혀 있으면 F2 에서도 그 문장이 새어 나온다.
    const body = bodyOf(brushSrc, 'finishHtml')
    expect(brushSrc.match(/이 열두 자 뒤에/g)).toHaveLength(1)
    expect(body).toContain('${lead}')
  })

  // 판정 R96 — 판을 조립하는 일이 순수 함수로 나와 있어야 아래 「반전이 안 샌다」
  // 검사가 실제 마크업을 훑을 수 있다. open() 이 다시 제 손으로 innerHTML 을 짜기
  // 시작하면 그 검사는 아무것도 못 보는 채로 초록불이 된다.
  // open() 은 `function open(` 이 아니라 객체 메서드 축약형(`open(view) {`)이라
  // bodyOf 의 정규식에 안 걸린다. 여는 중괄호를 직접 찾아 같은 방식으로 센다 —
  // 「다음 이름까지」로 자르지 않는다.
  function methodBody(src, re) {
    const m = re.exec(src)
    if (!m) throw new Error(`${re} 를 못 찾았다`)
    const start = src.indexOf('{', m.index + m[0].length - 1)
    let depth = 0
    for (let i = start; i < src.length; i++) {
      if (src[i] === '{') depth++
      else if (src[i] === '}' && --depth === 0) return src.slice(start + 1, i)
    }
    throw new Error('닫는 중괄호를 못 찾았다')
  }

  it('두 판을 순수 함수가 만든다 — open() 이 제 손으로 짜지 않는다', () => {
    const body = methodBody(brushSrc, /\bopen\s*\(view\)\s*\{/)
    expect(body).toContain('el.innerHTML = writingHtml(view)')
    expect(body).toContain('el.innerHTML = finishHtml(view)')
    // 판을 짜는 백틱 템플릿이 open() 안에 남아 있으면 새 슬롯이 몰래 생길 수 있다
    // 따옴표 한 종류만 훑지 않는다 — 겹따옴표로 바꿔 적어도 지나가면 검사가 헛돈다
    expect(body).not.toContain('<canvas')
    expect(body).not.toMatch(/class=['"`]partial['"`]/)
  })

  it('F1(척화비)은 예전 그대로다 — 인자를 안 주면 붓 아래 줄과 출처가 그대로 뜬다', () => {
    const f1 = {
      title: '척 화 비',
      glyphs: CHEOKHWABI_GLYPHS,
      meaning: '서양 오랑캐가 침범하는데',
      origin: '『고등 한국사1』 p.108 수록 · 비문 일부 발췌',
    }
    const before = writingHtml(f1)
    expect(before).toContain(CHEOKHWABI_PARTIAL_NOTE)
    expect(before).toContain('비문 일부 발췌')
  })
})

// 이 비트는 이제 ACTS 5막 안에 있다(Task 14). 이 검사도 화면도 그 객체 하나를
// 본다 — 두 벌로 베껴 두면 갈린다.
describe('F2 비트 — 쓰고 난 다음에 의심을 알린다', () => {
  it('네 글자와 세 표기를 같은 상수에서 가져온다', () => {
    expect(F2_BEAT.kind).toBe('brush')
    expect(F2_BEAT.glyphs).toBe(ILSA_GLYPHS)
    expect(F2_BEAT.rest).toBe(ILSA_VARIANTS)
    expect(F2_BEAT.partial).toBe(ILSA_NOTE)
    expect(F2_BEAT.restLead).toBe('이 네 글자는 이렇게도 전한다.')
  })

  it('설계서의 열여섯 줄이 줄지 않았다', () => {
    expect(F2_BEAT.afterLines).toHaveLength(16)
    const text = F2_BEAT.afterLines.join('\n')
    expect(text).toContain('당신은 방금 네 글자를 썼다.')
    expect(text).toContain('『갑신일록』을 쓴 사람은 김옥균이다.')
    expect(text).toContain('일본으로 망명한 뒤에 썼다.')
    expect(text).toContain('日使來衛 · 日本公使來護朕 · 日本公使來護我')
    expect(text).toContain('당신이 방금 쓴 것은 그중 하나다.')
  })

  // ── 판정 R96 — 반전은 붓을 놓은 뒤에 온다 ──────────────────────────
  //
  // 예전에 이 자리에 있던 검사는 울 수 없는 동어반복이었다: title 과 meaning 두
  // 문자열에 '갈린다'·'만들어진'이 있는지만 보았는데, 정작 반전이 새던 곳은
  // partial 과 origin 이었고 그 둘은 검사 밖에 있었다. 게다가 title 은 「친 필」
  // 두 글자다 — 무엇을 넣어도 통과한다.
  //
  // 이제는 화면에 실제로 나가는 마크업을 그대로 받아 훑는다. 반전 낱말은 손으로
  // 적지 않고 **그 비트 자신의 afterLines 에서 뽑는다** — 다른 낱말로 바꿔 쓰면
  // 목록도 따라 움직인다.
  describe('쓰기 전 화면에 반전이 새지 않는다', () => {
    // afterLines 가 처음 드러내는 것들: 『』로 묶인 문서 이름과, 의심을 말하는 낱말들.
    const DOUBT_WORDS = ['김옥균', '망명', '갈린다', '의심', '논쟁', '하나뿐']

    function revealWords(beat) {
      const after = (beat.afterLines ?? []).join('\n')
      const titles = after.match(/『[^』]+』/g) ?? []
      return [...new Set([...titles, ...DOUBT_WORDS.filter(w => after.includes(w))])]
    }

    const words = revealWords(F2_BEAT)
    // 쓰는 동안 학생 눈에 닿는 것 전부 — 판의 마크업에 지금 쓰는 글자까지 더한다
    // ⚠ 비트를 직접 넘기지 않는다. 게임이 화면에 주는 것은 playBrush 가 brushView()
    //    로 지은 객체다 — 그 사이에서 한 칸이라도 빠지면 여기서 잡혀야 한다(판정 R97).
    const view = brushView(F2_BEAT)
    const before = writingHtml(view) + view.glyphs.join('')
    const after = finishHtml(view)

    it('붙들 반전 낱말을 실제로 뽑아낸다 — 빈 목록을 돌며 초록불이 되지 않게', () => {
      expect(words).toContain('『갑신일록』')
      expect(words).toContain('김옥균')
      expect(words.length).toBeGreaterThanOrEqual(4)
    })

    it('그 낱말들이 붓을 놓은 뒤 화면에는 다 있다', () => {
      for (const w of words) expect(after, w).toContain(w)
    })

    it('그 낱말들이 쓰기 전 화면에는 하나도 없다', () => {
      for (const w of words) {
        expect(before.includes(w), `쓰기 전 화면에 「${w}」가 있다: ${before}`).toBe(false)
      }
    })

    it('쓰기 전 화면이 비어 있지도 않다 — 무엇을 하는 중인지는 말해 준다', () => {
      expect(before).toContain('네 글자를 한 자씩 따라 씁니다')
    })
  })

  it('교과서가 틀렸다고 말하지 않는다', () => {
    const all = [F2_BEAT.title, F2_BEAT.meaning, F2_BEAT.origin, F2_BEAT.partial,
      F2_BEAT.restLead, ...F2_BEAT.afterLines, ...ILSA_VARIANTS.map(v => v.gloss)].join('\n')
    expect(all).not.toMatch(/교과서/)
    expect(all).not.toMatch(/거짓|틀렸/)
  })

  // 학생 화면과 「내 기록 복사」에 영어 낱말을 내보내지 않는다(전역 제약 4).
  it('학생 화면에 영어 낱말이 나가지 않는다', () => {
    const texts = [F2_BEAT.title, F2_BEAT.meaning, F2_BEAT.origin, F2_BEAT.partial,
      F2_BEAT.noteWhileWriting, F2_BEAT.restLead, ...F2_BEAT.afterLines,
      ...ILSA_VARIANTS.flatMap(v => [v.text, v.gloss]), ILSA_NOTE]
    for (const t of texts) expect(t, t).not.toMatch(/[A-Za-z]/)
  })

  // historical: true 인 비트에 조건을 달면 systems/branch.js 의 unsafeConditionalBeats()
  // 가 정적으로 거부한다.
  it('일어난 일 그 자체이고, 조건이 붙어 있지 않다', () => {
    expect(F2_BEAT.historical).toBe(true)
    expect(F2_BEAT.whenFlag).toBeUndefined()
    expect(F2_BEAT.unlessFlag).toBeUndefined()
  })
})

// Task 14 — F2 도 마찬가지다. 5막이 ACTS 에 붙으면서 처음으로 실제 경로를 탄다.
describe('F2 가 실제 막 진행을 탄다 (Task 14)', () => {
  it('5막 배열에 gapsin-brush 비트가 있다 — 위 검사들이 보는 데이터의 출처다', () => {
    expect(F2_BEAT, '5막에 gapsin-brush 비트가 없다 — 위 검사들이 undefined 를 본다').toBeTruthy()
  })

  it('5막을 처음부터 걸어가면 이 비트를 실제로 지나간다', async () => {
    const { actById } = await import('../../src/data/acts.js')
    const { dryRun } = await import('../../src/systems/branch.js')
    const { createState } = await import('../../src/core/state.js')
    const { played } = dryRun(actById('gapsin'), createState(), 4)
    expect(played).toContain('gapsin-brush')
  })

  it('F2 는 경우궁에 든 다음에 온다 — 창덕궁 침전에서 쓰지 않는다', async () => {
    const { actById } = await import('../../src/data/acts.js')
    const { beatsOf } = await import('../../src/systems/scenario.js')
    const ids = beatsOf(actById('gapsin')).map(b => b.id)
    expect(ids.indexOf('gapsin-move-gyeongu')).toBeLessThan(ids.indexOf('gapsin-brush'))
  })
})

// ── 판정 R97 — 게임이 실제로 지나는 길을 검사한다 ──────────────────────
//
// R96 은 「반전은 붓을 놓은 뒤에 온다」를 데이터와 화면 함수 사이에서 붙들었다.
// 그런데 그 둘 사이에 **조립하는 자리**가 하나 더 있었고(playBrush), 거기서
// noteWhileWriting·originWhileWriting 두 칸이 조용히 떨어져 나갔다. 데이터도
// 화면 함수도 옳은데 학생 화면만 틀린, 이 프로젝트가 세 번째로 밟은 모양이다.
//
// 그래서 이 묶음은 **비트를 화면 함수에 직접 넘기지 않는다.** brushView() 가
// 짓는 그 객체를 받아 훑는다.
describe('붓 화면이 받는 view 는 비트에서 한 칸도 흘리지 않는다 (판정 R97)', () => {
  const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8')

  it('비트의 모든 칸이 view 에 그대로 있다 — 골라 담지 않는다', () => {
    const view = brushView(F2_BEAT)
    for (const k of Object.keys(F2_BEAT)) {
      expect(view, `view 에 「${k}」 가 없다`).toHaveProperty(k)
      if (k !== 'glyphs') expect(view[k], k).toBe(F2_BEAT[k])
    }
    // 쓰는 동안 뜰 두 칸이 실제로 실려 있다 — 이 둘이 빠지면 brush.js 의
    // `?? view.partial` · `?? view.origin` 이 반전을 그대로 끌어온다
    expect(view.noteWhileWriting, 'noteWhileWriting 이 view 에 없다').toBeTruthy()
    expect(view.originWhileWriting, 'originWhileWriting 이 view 에 없다').toBeTruthy()
  })

  it('playBrush 가 필드를 손으로 골라 담지 않는다 — brushView() 하나를 편다', () => {
    // 함수 몸통을 중괄호로 센다(파일 위쪽의 bodyOf) — 「다음 함수 이름까지」로 자르면
    // 사이에 새 함수가 끼는 순간 검사가 통과해 버린다
    const body = bodyOf(main, 'playBrush')
    expect(body).toContain('brushView(beat)')
    // 손으로 고르던 자리로 되돌아가면 여기서 운다
    expect(body).not.toMatch(/title:\s*beat\.title/)
    expect(body).not.toMatch(/partial:\s*beat\.partial/)
  })

  it('그 view 로 그린 쓰기 전 화면에 반전이 하나도 없다 — 실행 경로 그대로', () => {
    const view = brushView(F2_BEAT)
    const before = writingHtml(view) + view.glyphs.join('')
    for (const w of ['『갑신일록』', '김옥균', '망명', '논쟁', '의심', '갈린다']) {
      expect(before.includes(w), `쓰기 전 화면에 「${w}」가 있다`).toBe(false)
    }
  })

  it('F1(척화비)은 이 길로도 예전 그대로다 — 붓 아래 줄과 출처가 그대로 뜬다', () => {
    const f1 = beatsOf(actById('yangyo')).find(b => b.kind === 'brush')
    expect(f1, '2막에 친필 비트가 없다').toBeTruthy()
    const before = writingHtml(brushView(f1))
    expect(before).toContain(f1.partial ?? CHEOKHWABI_PARTIAL_NOTE)
    expect(before).toContain(f1.origin)
  })
})
