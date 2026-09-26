import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CHEOKHWABI_LINES, CHEOKHWABI_GLYPHS, CHEOKHWABI_REST, CHEOKHWABI_PARTIAL_NOTE,
  HIT_RADIUS, DONE_RATIO, coverage, isTraced,
  ILSA_GLYPHS, ILSA_VARIANTS, ILSA_NOTE,
  INK_MS, INK_WARN_MS, INK_PASSED_LINE, inkMsOf, isInkTimed, inkRemaining, inkRatio,
  inkSeconds, inkLabel, inkDried, inkDrying, inkDryNote, inkReport, glyphCountWord,
  INK_CRIT_MS, INK_SPARE_MS, INK_WET, INK_WARN, INK_CRIT, INK_DRY,
  INK_WARN_LINE, INK_CRIT_LINE, INK_SPARE_LINE,
  PAPER_WET, PAPER_DRY, STROKE_WET, STROKE_DRY, GUIDE_ALPHA_WET, GUIDE_ALPHA_DRY,
  inkLevelAt, inkLevel, inkPressLine, inkSpared, inkPassLine,
  inkDryness, inkPaperColor, inkStrokeColor, inkGuideAlpha, inkWashColor,
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
    // 마무리 판은 이제 둘째 인자를 받는다 — 먹을 다시 간 횟수다(2026-09-25). 그 값은
    // 비트의 데이터가 아니라 학생이 방금 한 일이라 view 에 얹지 않았다. 이 검사가
    // 붙드는 것은 인자의 개수가 아니라 「open() 이 제 손으로 판을 짜지 않는다」다.
    expect(body).toMatch(/el\.innerHTML = finishHtml\(view,\s*regrinds\)/)
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

// ── 먹이 마른다 (2026-09-25 선생님) ────────────────────────────────────
//
// 「3의 척화비는 오히려 아이들이 싫어할만한 내용이야. 타임어택을 넣고 척화비
// 글씨쓰게 하는게 좋아보여.」 붓 화면에 시계가 붙었다. 이 묶음이 붙드는 것은
// 「빠른가」가 아니라 「학생이 갇히지 않는가」와 「판정 R96 이 그대로 서 있는가」다.
describe('먹이 마른다 — 재는 방식', () => {
  it('글자 하나에 22초이고, 6초 밑에서 빛깔이 바뀐다', () => {
    expect(INK_MS).toBe(22000)
    expect(INK_WARN_MS).toBeLessThan(INK_MS)
    expect(INK_WARN_MS).toBeGreaterThan(0)
  })

  it('비트가 ink 를 실어야 시간을 잰다 — 안 실으면 예전 그대로다', () => {
    expect(isInkTimed({})).toBe(false)
    expect(inkMsOf({})).toBe(0)
    expect(isInkTimed({ ink: { ms: 22000 } })).toBe(true)
    expect(inkMsOf({ ink: { ms: 9000 } })).toBe(9000)
    // ms 를 안 적으면 기본값, 숫자 하나만 줘도 받는다
    expect(inkMsOf({ ink: {} })).toBe(INK_MS)
    expect(inkMsOf({ ink: 5000 })).toBe(5000)
    // 0 이나 음수는 「안 잰다」로 읽는다 — 열자마자 마르는 화면을 만들지 않는다
    expect(inkMsOf({ ink: { ms: 0 } })).toBe(0)
    expect(isInkTimed({ ink: { ms: -1 } })).toBe(false)
  })

  // 이 검사가 이 기능의 심장이다 — 첫 획을 긋기 전에는 먹이 줄지 않는다.
  // 안내문을 읽는 시간을 벌로 매기면 글을 안 읽는 학생이 유리해진다.
  it('첫 획을 긋기 전에는 아무리 기다려도 먹이 가득하다', () => {
    expect(inkRemaining(null, 999999, 22000)).toBe(22000)
    expect(inkRatio(null, 999999, 22000)).toBe(1)
    expect(inkDried(null, 999999, 22000)).toBe(false)
    expect(inkDrying(null, 999999, 22000)).toBe(false)
    expect(inkLabel(null, 0, 22000)).toBe('먹 — 첫 획을 그으면 마르기 시작한다')
  })

  it('첫 획이 지난 만큼만 줄고, 0 밑으로는 안 내려간다', () => {
    expect(inkRemaining(1000, 1000, 22000)).toBe(22000)
    expect(inkRemaining(1000, 11000, 22000)).toBe(12000)
    expect(inkRemaining(1000, 23000, 22000)).toBe(0)
    expect(inkRemaining(1000, 99999, 22000)).toBe(0)
    expect(inkRatio(1000, 12000, 22000)).toBeCloseTo(0.5, 5)
    // 시계가 거꾸로 가도(단조롭지 않은 시각) 가득을 넘지 않는다
    expect(inkRemaining(1000, 0, 22000)).toBe(22000)
  })

  it('남은 초는 올림으로 센다 — 0.4초가 남았는데 「0초」라고 적지 않는다', () => {
    expect(inkSeconds(0, 0, 22000)).toBe(22)
    expect(inkSeconds(0, 21600, 22000)).toBe(1)
    expect(inkSeconds(0, 22000, 22000)).toBe(0)
    expect(inkLabel(0, 12000, 22000)).toBe('먹 — 마르기까지 10초')
  })

  it('말랐다·마르는 중이다를 가른다', () => {
    expect(inkDrying(0, 15000, 22000)).toBe(false)
    expect(inkDrying(0, 17000, 22000)).toBe(true)     // 5초 남음
    expect(inkDried(0, 21999, 22000)).toBe(false)
    expect(inkDried(0, 22000, 22000)).toBe(true)
  })

  it('마른 뒤에 뜨는 줄이 「틀렸다」고 말하지 않는다 — 먹을 다시 가는 일이다', () => {
    const note = inkDryNote(1)
    expect(note).toContain('먹이 말랐다')
    expect(note).toContain('다시')
    expect(note).toContain('1번')
    expect(note).not.toMatch(/실패|틀렸|벌|졌/)
    expect(inkDryNote(3)).toContain('3번')
  })

  it('마르기 전에 다 쓴 글자에도 한 줄이 있다 — 시간이 벌로만 쓰이지 않는다', () => {
    expect(INK_PASSED_LINE).toContain('다 썼다')
    expect(INK_PASSED_LINE).not.toMatch(/[A-Za-z]/)
  })

  it('마지막 한 줄은 몇 번을 갈았든 「썼다」로 끝난다 — 꾸짖지 않는다', () => {
    expect(inkReport(0, 4)).toBe('먹을 한 번도 다시 갈지 않고 넉 자를 썼다.')
    expect(inkReport(1, 4)).toBe('먹을 1번 다시 갈아 넉 자를 썼다.')
    expect(inkReport(7, 4)).toBe('먹을 7번 다시 갈아 넉 자를 썼다.')
    for (const n of [0, 1, 2, 9, 40]) {
      expect(inkReport(n, 4), String(n)).toContain('썼다')
      expect(inkReport(n, 4), String(n)).not.toMatch(/실패|틀렸|못|아쉽/)
      expect(inkReport(n, 4), String(n)).not.toMatch(/[A-Za-z]/)
    }
  })

  it('자릿수를 우리말로 센다', () => {
    expect(glyphCountWord(4)).toBe('넉 자')
    expect(glyphCountWord(2)).toBe('두 자')
    expect(glyphCountWord(12)).toBe('12자')
  })
})

describe('먹 시계는 척화비에만 붙는다 (2026-09-25)', () => {
  const F1_BEAT = beatsOf(actById('yangyo')).find(b => b.kind === 'brush')

  it('2막 척화비 비트가 ink 를 들고 있다 — 데이터가 켠다', () => {
    expect(F1_BEAT.id).toBe('cheokhwabi-brush')
    expect(isInkTimed(F1_BEAT)).toBe(true)
    expect(inkMsOf(F1_BEAT)).toBe(22000)
  })

  it('4막 「친 필」은 안 잰다 — 붓을 놓은 뒤에 남아야 하는 것이 의심이기 때문이다', () => {
    expect(F2_BEAT.ink).toBeUndefined()
    expect(isInkTimed(F2_BEAT)).toBe(false)
  })

  it('brushView() 가 ink 를 화면까지 실어 보낸다 — 조립하는 자리에서 흘리지 않는다 (판정 R97)', () => {
    expect(inkMsOf(brushView(F1_BEAT))).toBe(22000)
    expect(isInkTimed(brushView(F2_BEAT))).toBe(false)
  })

  it('시간을 재는 화면에만 먹 띠가 생긴다', () => {
    const timed = writingHtml(brushView(F1_BEAT))
    expect(timed).toContain('class="ink"')
    expect(timed).toContain('class="inkfill"')
    expect(timed).toContain('먹 — 첫 획을 그으면 마르기 시작한다')

    const untimed = writingHtml(brushView(F2_BEAT))
    expect(untimed).not.toContain('class="ink"')
    expect(untimed).not.toContain('inkfill')
    expect(untimed).not.toContain('먹')
  })

  // ── 판정 R96 은 칸이 하나 늘어도 그대로 선다 ──────────────────────
  // 먹 띠에 실리는 글은 「마르기까지 몇 초」뿐이다. 반전을 한 조각이라도 끌어오면
  // (예컨대 남은 시간을 설명하려고 partial 을 갖다 붙이면) 여기서 운다.
  it('시계를 붙여도 쓰기 전 화면에 반전이 새지 않는다', () => {
    const view = { ...brushView(F2_BEAT), ink: { ms: 22000 } }
    const before = writingHtml(view) + view.glyphs.join('')
    expect(before).toContain('class="ink"')          // 실제로 시계가 붙은 판을 보고 있다
    for (const w of ['『갑신일록』', '김옥균', '망명', '논쟁', '의심', '갈린다', '그중 하나']) {
      expect(before.includes(w), `쓰기 전 화면에 「${w}」가 있다`).toBe(false)
    }
    // 마무리 판의 글이 미리 오지도 않는다
    expect(before).not.toContain(ILSA_NOTE)
    for (const v of ILSA_VARIANTS) expect(before).not.toContain(v.text)
  })

  it('붓을 놓은 뒤 판이 먹을 간 횟수를 한 줄로 전한다', () => {
    const view = brushView(F1_BEAT)
    expect(finishHtml(view, 0)).toContain('먹을 한 번도 다시 갈지 않고 넉 자를 썼다.')
    expect(finishHtml(view, 3)).toContain('먹을 3번 다시 갈아 넉 자를 썼다.')
    expect(finishHtml(view, 3)).toContain('class="inkreport"')
    // 횟수를 안 주면 「한 번도 안 갈았다」로 읽는다 — 없는 실수를 지어내지 않는다
    expect(finishHtml(view)).toContain('한 번도')
  })

  it('시간을 안 재는 비트의 마무리 판에는 그 줄이 아예 없다', () => {
    const after = finishHtml(brushView(F2_BEAT), 2)
    expect(after).not.toContain('inkreport')
    expect(after).not.toContain('먹을')
  })

  it('먹 띠가 쓰기 전 판에서 안내문·출처 자리를 밀어내지 않는다', () => {
    const timed = writingHtml(brushView(F1_BEAT))
    expect(timed).toContain(CHEOKHWABI_PARTIAL_NOTE)
    expect(timed).toContain(F1_BEAT.origin)
    expect(timed).toContain('<canvas')
  })
})

// 프레임을 지우는 자리가 하나뿐인지는 소스로 붙든다 — 붓 화면은 DOM 을 타서
// node 환경에서 못 돌린다(위 「붓 화면은 …」 묶음과 같은 이유다).
describe('먹 시계가 프레임을 흘리지 않는다', () => {
  const brushSrc = readFileSync(join(process.cwd(), 'src', 'ui', 'brush.js'), 'utf8')

  it('cancelAnimationFrame 을 부르는 자리가 stopInk() 하나다', () => {
    expect(brushSrc.match(/cancelAnimationFrame/g)).toHaveLength(1)
    expect(bodyOf(brushSrc, 'stopInk')).toContain('cancelAnimationFrame')
  })

  it('글자를 새로 열 때·말랐을 때·통과했을 때·붓을 놓을 때 모두 멈춘다', () => {
    for (const fn of ['loadGlyph', 'dryOut', 'passInk', 'finish']) {
      expect(bodyOf(brushSrc, fn), fn).toContain('stopInk()')
    }
  })

  it('첫 획에서만 시계가 선다 — 화면을 여는 자리에서 시작하지 않는다', () => {
    // 시작 함수는 inkStartedAt 이 이미 있으면 되돌아간다(두 번 돌지 않는다)
    expect(bodyOf(brushSrc, 'startInk')).toContain('inkStartedAt !== null')
    // 시작을 부르는 곳은 붓이 닿는 순간 하나뿐이다
    expect(brushSrc.match(/^\s*startInk\(\)$/gm)).toHaveLength(1)
  })

  it('움직임을 줄여 달라고 한 학생에게는 초 단위로만 고쳐 그린다', () => {
    expect(brushSrc).toContain('prefers-reduced-motion')
    expect(bodyOf(brushSrc, 'drawInk')).toContain('stepped')
  })

  it('먹이 말랐을 때 소리를 이 화면이 고르지 않는다 — 부른 쪽에 넘긴다', () => {
    expect(bodyOf(brushSrc, 'dryOut')).toContain('view.onDry?.()')
    expect(brushSrc).not.toContain('audio')
  })
})


// ── 눈에 보이는 시계 (2026-09-26 선생님) ───────────────────────────────
//
// 「척화비 쓸때 타임어택이 잘 눈에 안보여, 타임어택의 묘미를 살려서 다시 만들어봐」
//
// 어제 붙인 시계는 종이 아래 7픽셀 띠와 12픽셀 글씨였다. 재는 방식은 맞았는데
// 학생이 그것을 못 봤다 — 그러면 먹이 마르는 일은 압박이 아니라 영문 모를 초기화가
// 되고, 이 기능은 압박도 못 주면서 손맛만 깎는다(게임 재제작 실패 패턴).
//
// 이 묶음이 붙드는 것은 「예쁜가」가 아니라 넷이다:
//   ① 단계가 남은 시간 하나에서 나온다 — 색·글·띠가 어긋나지 않는다
//   ② 종이가 마르되 **안내점을 덮지 않는다** — 안내점은 학생이 따라 그리는 그것이다
//   ③ 여유 있게 끝낸 글자에 말이 붙는다 — 시간이 벌로만 쓰이지 않는다
//   ④ 판정 R96 은 칸이 여럿 늘어도 그대로 선다
describe('먹이 마른다 — 눈에 보이게 (2026-09-26)', () => {
  it('조절 손잡이가 넷 다 상수로 나와 있다 — 22초·6초·3초·여유 8초', () => {
    expect(INK_MS).toBe(22000)
    expect(INK_CRIT_MS).toBeLessThan(INK_WARN_MS)
    expect(INK_CRIT_MS).toBeGreaterThan(0)
    expect(INK_SPARE_MS).toBeGreaterThan(INK_WARN_MS)
    expect(INK_SPARE_MS).toBeLessThan(INK_MS)
  })

  it('남은 시간 하나가 단계를 정한다 — 경계에 닿는 쪽이 새 단계다', () => {
    expect(inkLevelAt(22000)).toBe(INK_WET)
    expect(inkLevelAt(INK_WARN_MS + 1)).toBe(INK_WET)
    expect(inkLevelAt(INK_WARN_MS)).toBe(INK_WARN)
    expect(inkLevelAt(INK_CRIT_MS + 1)).toBe(INK_WARN)
    expect(inkLevelAt(INK_CRIT_MS)).toBe(INK_CRIT)
    expect(inkLevelAt(1)).toBe(INK_CRIT)
    expect(inkLevelAt(0)).toBe(INK_DRY)
    expect(inkLevelAt(-5)).toBe(INK_DRY)
    // 네 단계가 서로 다른 이름이다 — 둘이 같은 낱말이면 CSS 에서 한 단계가 사라진다
    expect(new Set([INK_WET, INK_WARN, INK_CRIT, INK_DRY]).size).toBe(4)
  })

  it('첫 획을 긋기 전에는 3초짜리 먹이라도 단계가 오르지 않는다', () => {
    // 이 한 줄이 없으면 ink 를 짧게 준 비트에서 화면이 열리는 순간부터 빨간 글씨가
    // 떠 있다 — 아직 마르기 시작하지도 않았는데.
    expect(inkLevel(null, 999999, 3000)).toBe(INK_WET)
    expect(inkLevel(0, 0, 22000)).toBe(INK_WET)
    expect(inkLevel(0, 17000, 22000)).toBe(INK_WARN)   // 5초 남음
    expect(inkLevel(0, 20000, 22000)).toBe(INK_CRIT)   // 2초 남음
    expect(inkLevel(0, 22000, 22000)).toBe(INK_DRY)
  })

  it('마르는 중이라는 판정이 예전과 똑같이 선다 — 단계로 다시 썼어도', () => {
    expect(inkDrying(null, 999999, 22000)).toBe(false)
    expect(inkDrying(0, 15000, 22000)).toBe(false)
    expect(inkDrying(0, 17000, 22000)).toBe(true)
    expect(inkDrying(0, 22000, 22000)).toBe(true)
  })

  it('단계마다 한 줄이 붙고, 그 줄이 짧다 — 3초 남은 학생에게 읽을 것을 주지 않는다', () => {
    expect(inkPressLine(null, 0, 22000)).toBe('')
    expect(inkPressLine(0, 10000, 22000)).toBe('')          // 12초 남음
    expect(inkPressLine(0, 17000, 22000)).toBe(INK_WARN_LINE)
    expect(inkPressLine(0, 20000, 22000)).toBe(INK_CRIT_LINE)
    expect(INK_WARN_LINE).toBe('먹이 마른다')
    expect(INK_CRIT_LINE).not.toBe(INK_WARN_LINE)
    for (const line of [INK_WARN_LINE, INK_CRIT_LINE]) {
      expect(line.length, line).toBeLessThanOrEqual(12)
      expect(line, line).not.toMatch(/[A-Za-z]/)
      // 꾸짖지 않는다 — 일어나는 일은 먹이 마르는 것이다
      expect(line, line).not.toMatch(/실패|틀렸|벌|빨리|서둘/)
    }
  })

  it('종이가 마른다 — 시간을 안 재는 화면에서는 끝까지 안 마른다', () => {
    expect(inkDryness(null, 999999, 22000)).toBe(0)
    expect(inkDryness(0, 11000, 22000)).toBeCloseTo(0.5, 5)
    expect(inkDryness(0, 22000, 22000)).toBe(1)
    // 「안 잰다」가 「다 말랐다」로 읽히면 4막 친필의 종이가 열리자마자 메말라 있다
    expect(inkDryness(null, 0, 0)).toBe(0)
    expect(inkDryness(0, 5000, 0)).toBe(0)
  })

  it('바탕은 가라앉고 먹빛은 갈색으로 뜬다 — 양 끝이 정확히 상수다', () => {
    expect(inkPaperColor(0)).toBe(PAPER_WET)
    expect(inkPaperColor(1)).toBe(PAPER_DRY)
    expect(inkStrokeColor(0)).toBe(STROKE_WET)
    expect(inkStrokeColor(1)).toBe(STROKE_DRY)
    // 중간도 캔버스가 받는 #rrggbb 모양 그대로다(NaN 을 넘기면 조용히 검정이 된다)
    for (const t of [0.25, 0.5, 0.75]) {
      expect(inkPaperColor(t), String(t)).toMatch(/^#[0-9a-f]{6}$/)
      expect(inkStrokeColor(t), String(t)).toMatch(/^#[0-9a-f]{6}$/)
    }
    // 마를수록 바탕은 어두워지고 먹은 밝아진다 — 두 방향이 반대라야 「마른 먹」으로 읽힌다
    const lum = (hex) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16)
    expect(lum(inkPaperColor(1))).toBeLessThan(lum(inkPaperColor(0)))
    expect(lum(inkStrokeColor(1))).toBeGreaterThan(lum(inkStrokeColor(0)))
    expect(inkPaperColor(-1)).toBe(PAPER_WET)
    expect(inkPaperColor(9)).toBe(PAPER_DRY)
  })

  // ⚠ 이 검사가 이 판의 심장이다 — 「보기 좋게 만들다 따라 쓸 것을 지운다」는
  // 이 장면에서 밟을 수 있는 가장 나쁜 맞바꿈이다.
  it('마를수록 안내점이 오히려 또렷해진다 — 종이가 안내점을 덮는 일이 없다', () => {
    expect(inkGuideAlpha(0)).toBeCloseTo(GUIDE_ALPHA_WET, 5)
    expect(inkGuideAlpha(1)).toBeCloseTo(GUIDE_ALPHA_DRY, 5)
    expect(GUIDE_ALPHA_DRY).toBeGreaterThan(GUIDE_ALPHA_WET)
    let last = -1
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const a = inkGuideAlpha(t)
      expect(a, String(t)).toBeGreaterThanOrEqual(last)
      expect(a, String(t)).toBeLessThanOrEqual(1)
      last = a
    }
  })

  it('종이에 앉는 남은 초는 물자국만큼만 진하다 — 획과 안내점을 이기지 않는다', () => {
    for (const level of [INK_WET, INK_WARN, INK_CRIT]) {
      const wash = inkWashColor(level)
      expect(wash, level).toMatch(/^rgba\(\d+,\d+,\d+,0\.\d+\)$/)
      const alpha = Number(wash.match(/,([0-9.]+)\)$/)[1])
      // 안내점(0.28)보다 옅게 — 숫자가 안내점보다 진해지면 그것은 물자국이 아니라 방해다
      expect(alpha, level).toBeLessThan(GUIDE_ALPHA_WET)
    }
    // 단계가 오르면 조금 더 진해진다 — 숫자를 안 읽는 학생에게도 종이가 말한다
    const a = (lv) => Number(inkWashColor(lv).match(/,([0-9.]+)\)$/)[1])
    expect(a(INK_WARN)).toBeGreaterThan(a(INK_WET))
    expect(a(INK_CRIT)).toBeGreaterThan(a(INK_WARN))
  })

  it('여유 있게 끝낸 글자에는 「한 번에 썼다」가 붙는다', () => {
    expect(inkSpared(0, 0, 22000)).toBe(true)
    expect(inkSpared(0, 22000 - INK_SPARE_MS, 22000)).toBe(true)        // 딱 8초 남음
    expect(inkSpared(0, 22000 - INK_SPARE_MS + 1, 22000)).toBe(false)   // 8초에서 1밀리초 모자람
    expect(inkSpared(0, 21000, 22000)).toBe(false)                      // 1초 남음
    expect(inkPassLine(0, 5000, 22000)).toBe(INK_SPARE_LINE)
    expect(inkPassLine(0, 21000, 22000)).toBe(INK_PASSED_LINE)
    expect(INK_SPARE_LINE).toContain('한 번에 썼다')
    expect(INK_SPARE_LINE).not.toMatch(/[A-Za-z]/)
    // 아슬아슬하게 넘긴 학생에게도 꾸짖는 말이 안 붙는다 — 그 학생도 글자를 다 썼다
    for (const line of [INK_SPARE_LINE, INK_PASSED_LINE]) {
      expect(line, line).not.toMatch(/실패|틀렸|간신히|아쉽/)
    }
  })
})

describe('큰 시계가 붓 아래가 아니라 종이 옆에 선다 (2026-09-26)', () => {
  const F1_BEAT = beatsOf(actById('yangyo')).find(b => b.kind === 'brush')

  it('시간을 재는 화면에만 큰 숫자가 생긴다', () => {
    const timed = writingHtml(brushView(F1_BEAT))
    // 종이·띠·큰 숫자가 한 덩이다 — 눈이 종이에서 떠나지 않는 거리에 시계가 있다
    expect(timed).toContain('class="desk"')
    expect(timed).toContain('class="sheet"')
    expect(timed).toContain('class="clocknum"')
    expect(timed).toContain('class="clockunit"')
    expect(timed).toContain('class="clocknote"')
    // 첫 획을 긋기 전에는 가득 찬 초가 적혀 있다 — 0 이 아니다
    expect(timed).toContain('>' + INK_MS / 1000 + '<')
    // 종이는 여전히 캔버스 하나다(두 장이 생기면 querySelector 가 엉뚱한 것을 잡는다)
    expect(timed.match(/<canvas/g)).toHaveLength(1)
    // 예전 칸들이 사라지지 않았다 — 띠와 한 줄 안내는 그대로 있다
    expect(timed).toContain('class="ink"')
    expect(timed).toContain('class="inkfill"')
    expect(timed).toContain('먹 — 첫 획을 그으면 마르기 시작한다')
  })

  it('시간을 안 재는 화면(4막 친필)에는 시계의 흔적이 한 조각도 없다', () => {
    const untimed = writingHtml(brushView(F2_BEAT))
    for (const c of ['class="ink"', 'inkfill', 'desk', 'sheet', 'clocknum', 'clockunit', 'clocknote', '먹', '초']) {
      expect(untimed.includes(c), '안 재는 화면에 「' + c + '」가 있다').toBe(false)
    }
    // 그래도 종이는 있다 — 시계를 지우면서 캔버스를 지우는 일이 없게
    expect(untimed.match(/<canvas/g)).toHaveLength(1)
    expect(untimed).toContain('class="paper"')
  })

  // 판정 R96 — 칸이 여섯 개 늘었다. 그 여섯 칸에 실리는 글은 「남은 초」와
  // 「먹이 마른다」뿐이다. 반전을 한 조각이라도 끌어오면 여기서 운다.
  it('큰 시계를 붙여도 쓰기 전 화면에 반전이 새지 않는다', () => {
    const view = { ...brushView(F2_BEAT), ink: { ms: 22000 } }
    const before = writingHtml(view) + view.glyphs.join('')
    expect(before).toContain('class="clocknum"')      // 실제로 큰 시계가 붙은 판을 보고 있다
    expect(before).toContain('class="desk"')
    for (const w of ['『갑신일록』', '김옥균', '망명', '논쟁', '의심', '갈린다', '그중 하나']) {
      expect(before.includes(w), '쓰기 전 화면에 「' + w + '」가 있다').toBe(false)
    }
    expect(before).not.toContain(ILSA_NOTE)
    for (const v of ILSA_VARIANTS) expect(before).not.toContain(v.text)
  })

  it('붓을 놓은 뒤 한 줄은 그대로다 — 먹을 몇 번 갈았는가', () => {
    const view = brushView(F1_BEAT)
    expect(finishHtml(view, 0)).toContain('먹을 한 번도 다시 갈지 않고 넉 자를 썼다.')
    expect(finishHtml(view, 2)).toContain('먹을 2번 다시 갈아 넉 자를 썼다.')
    expect(finishHtml(view, 2)).toContain('class="inkreport"')
    // 마무리 판에는 큰 시계가 따라오지 않는다 — 붓을 놓았으면 잴 것이 없다
    expect(finishHtml(view, 2)).not.toContain('clocknum')
    expect(finishHtml(view, 2)).not.toContain('class="desk"')
  })
})

describe('시계가 눈에 보이게 배선되어 있다 (2026-09-26)', () => {
  const brushSrc = readFileSync(join(process.cwd(), 'src', 'ui', 'brush.js'), 'utf8')

  it('단계 이름을 화면이 제 손으로 적지 않는다 — 순수 함수에서 가져온다', () => {
    // 여기서 warn·crit 을 손으로 적기 시작하면 상수를 고치는 날 CSS 와 갈린다
    expect(brushSrc).toContain('INK_WARN')
    expect(brushSrc).toContain('INK_CRIT')
    expect(bodyOf(brushSrc, 'drawInk')).toContain('inkLevel(')
    expect(bodyOf(brushSrc, 'drawInk')).not.toMatch(/toggle\(\s*['"]warn['"]/)
  })

  it('큰 숫자와 단계 한 줄을 매 눈금마다 고쳐 쓴다', () => {
    const body = bodyOf(brushSrc, 'drawInk')
    expect(body).toContain('clockNum')
    expect(body).toContain('inkPressLine(')
    expect(body).toContain('paint()')        // 종이 자신이 마른다
  })

  it('종이를 칠하는 순서가 안내점을 지키게 되어 있다 — 물자국이 가장 먼저다', () => {
    const body = bodyOf(brushSrc, 'paint')
    const wash = body.indexOf('inkWashColor')
    const guide = body.indexOf('inkGuideAlpha')
    const stroke = body.indexOf('inkStrokeColor')
    expect(wash, 'paint 가 물자국을 안 그린다').toBeGreaterThan(-1)
    expect(guide, 'paint 가 안내점 불투명도를 안 쓴다').toBeGreaterThan(-1)
    expect(wash, '남은 초가 안내점 위에 올라간다 — 따라 쓸 것을 덮는다').toBeLessThan(guide)
    expect(guide, '안내점이 획 위에 올라간다').toBeLessThan(stroke)
    expect(body).toContain('inkPaperColor(')
  })

  it('여유 있게 끝낸 글자에 한 줄이 붙는다 — 통과가 침묵으로 지나가지 않는다', () => {
    const body = bodyOf(brushSrc, 'passInk')
    expect(body).toContain('inkPassLine(')
    expect(body).toContain("classList.add('pass')")
    expect(body).toContain('stopInk()')      // 숫자를 남은 채로 얼려 둔다
  })

  it('움직임을 줄여 달라고 한 학생에게는 숨쉬는 띠를 끈다', () => {
    expect(brushSrc).toContain('@media (prefers-reduced-motion: reduce)')
    // 그 규칙이 실제로 띠의 animation 을 끈다
    const at = brushSrc.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(brushSrc.slice(at, at + 220)).toMatch(/animation:\s*none/)
    // 재는 방식은 그대로다 — 보이는 것만 초 단위 계단이 된다
    expect(bodyOf(brushSrc, 'drawInk')).toContain('stepped')
  })

  it('품위를 지킨다 — 흔들지 않고, 소리 내지 않고, 넓은 면을 번쩍이지 않는다', () => {
    expect(brushSrc).not.toContain('audio')
    expect(brushSrc).not.toMatch(/shake|vibrate/)
    // 숨쉬는 것은 12픽셀 띠 하나뿐이다 — animation 을 거는 자리를 센다
    const rules = brushSrc.match(/animation:\s*brushbreath/g) ?? []
    expect(rules.length, '숨쉬는 자리가 둘(경고·임박)을 넘는다').toBeLessThanOrEqual(2)
    const beats = [...brushSrc.matchAll(/animation:\s*brushbreath\s+([0-9]*\.?[0-9]+)s/g)]
    expect(beats.length, '숨쉬는 띠의 주기를 하나도 못 읽었다').toBeGreaterThan(0)
    for (const m of beats) {
      // 광과민성 — 한 주기가 0.7초 미만이면 너무 빠르다
      expect(Number(m[1]), '띠가 너무 빨리 뛴다: ' + m[0]).toBeGreaterThanOrEqual(0.7)
    }
    // 종이 전체를 껌뻑이게 만드는 규칙이 없다
    expect(brushSrc).not.toMatch(/\.paper\{[^}]*animation/)
  })
})
