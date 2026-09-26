import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { codexQuizHtml, codexQuizAnswerHtml, statusLine, LABELS } from '../../src/ui/codex-quiz.js'
import { quizView, CODEX_QUIZZES } from '../../src/systems/codex-quiz.js'
import { sourceById } from '../../src/data/sources.js'

// vitest 환경이 node 라 DOM 이 없다. 그래서 이 화면은 **그릴 글자를 순수 함수로
// 내놓고**(codexQuizHtml · codexQuizAnswerHtml), 배선만 createCodexQuiz 가 한다.
// ui/day-end.js 의 dayEndHtml() 과 같은 꼴이다 — 판은 여기서 문자열로 검사하고,
// 실제로 서는 모습은 사람이 눈으로 본다(.cquiz-shot.mjs 로 1440×900·390×844 촬영).
//
// 배선 쪽(resolve 한 번·키보드·타이머 없음)은 문자열을 본다. 완벽한 검사가 아니라,
// 이 화면에서 반드시 틀리면 안 되는 것 넷을 붙드는 검사다.

const SRC = readFileSync(join(process.cwd(), 'src', 'ui', 'codex-quiz.js'), 'utf8')
const noComments = SRC.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')

// 문서를 든 학생 · 든 문서가 질문에 닿지 않는 학생 — 두 사초함을 실제 데이터로 만든다.
const withRight = quizView(2, { sources: { held: ['bellonet', 'junggeon', 'sherman'] } })
const withWrong = quizView(2, { sources: { held: ['junggeon', 'cheokhwabi', 'yangheonsu'] } })
const emptyHand = quizView(2, { sources: { held: [] } })

describe('묻는 판', () => {
  it('질문과 낱말풀이와 사초함이 함께 선다', () => {
    const html = codexQuizHtml(withRight)
    expect(html).toContain(CODEX_QUIZZES.yangyo.question)
    expect(html).toContain(CODEX_QUIZZES.yangyo.gloss)
    expect(html).toContain('2막 · 사초함')
    for (const card of withRight.held) expect(html).toContain(card.title)
    expect(html).toContain('cquiz-grid')
    expect(html).toContain('cquiz-submit')
  })

  it('든 문서만 놓인다 — 사초함에 없는 것은 고를 수 없다', () => {
    const html = codexQuizHtml(withWrong)
    expect(html).toContain(sourceById('junggeon').title)
    // 질문에 닿는 두 장은 손에 없으므로 고를 칸조차 없다. 그것이 이 화면의 요점이다.
    expect(html).not.toContain(sourceById('bellonet').title)
    expect(html).not.toContain(sourceById('sherman').title)
  })

  it('wants 를 화면에 적지 않는다 — 고르기 전에 답이 보이면 이 자리가 없어진다', () => {
    const html = codexQuizHtml(withWrong)
    for (const id of withWrong.wants) expect(html).not.toContain(`data-id="${id}"`)
  })

  it('사초함이 비어도 판이 서고, 말이 부드럽다', () => {
    const html = codexQuizHtml(emptyHand)
    expect(html).toContain(LABELS.emptyHand)
    expect(html).not.toContain('cquiz-grid')
    expect(html).toContain('cquiz-submit')
    // 고를 것이 없는 학생의 단추는 「고르지 않고 해설을 읽는다」다 — 막히지 않는다.
    expect(html).toContain(LABELS.submitWithout)
  })

  it('내 말 한 줄은 선택이다', () => {
    const html = codexQuizHtml(withRight)
    expect(html).toContain('cquiz-text')
    expect(html).toContain('써도 되고 안 써도 된다')
  })

  it('고른 장수를 셈해 보여 주지 않는다', () => {
    for (const n of [0, 1, 2, 5]) {
      const line = statusLine(withRight, n)
      expect(line).not.toMatch(/[0-9]/)
      expect(line).not.toMatch(/정답|오답|점수|채점/)
    }
  })
})

describe('답이 선 판 — 문서의 말로 답이 보인다', () => {
  it('고른 문서의 원문이 질문 옆에 그대로 놓인다', () => {
    const html = codexQuizAnswerHtml(withRight, { picked: ['bellonet', 'sherman'], text: '' })
    expect(html).toContain('cquiz-pair')
    expect(html).toContain(withRight.question)                      // 질문이 옆에 남는다
    expect(html).toContain(sourceById('bellonet').title)
    expect(html).toContain(sourceById('bellonet').origin)           // 출처까지 함께
    expect(html).toContain('조선 왕국 최후의 날이 될 것이다')          // 원문 그대로
    expect(html).toContain('그 배를 불살랐다')
  })

  it('해설은 고른 것이 있든 없든 나온다', () => {
    const withPick = codexQuizAnswerHtml(withRight, { picked: ['bellonet'] })
    const without = codexQuizAnswerHtml(withWrong, { picked: [] })
    for (const html of [withPick, without]) {
      expect(html).toContain('선교사를 처형한 일을 구실로 삼았다')
      expect(html).toContain('cquiz-explain')
      expect(html).toContain('cquiz-next')                          // 누구나 넘어간다
    }
  })

  it('하나도 못 고른 학생에게 꾸짖는 말을 하지 않는다', () => {
    const html = codexQuizAnswerHtml(withWrong, { picked: [] })
    expect(html).toContain(LABELS.noneHead)
    expect(html).toContain(LABELS.noneBody)
    for (const word of ['정답', '오답', '틀렸', '점수', '채점', '실패', '못 했']) {
      expect(html.includes(word), `「${word}」가 떴다`).toBe(false)
    }
  })

  it('없던 문서는 이름과 「어디에 있었는가」로만 적는다', () => {
    const html = codexQuizAnswerHtml(withWrong, { picked: [] })
    expect(html).toContain(LABELS.absentHead)
    expect(html).toContain(sourceById('bellonet').title)
    expect(html).toContain('승정원 승지')                            // 거기 있었다
    expect(html).toContain('훈련도감 군교')
    expect(html).toContain(LABELS.absentFoot)
    expect(html).not.toMatch(/왜 안|놓쳤|주웠어야/)
  })

  it('다 모은 학생에게는 없던 문서 칸이 아예 안 뜬다', () => {
    const all = quizView(2, { sources: { held: ['bellonet', 'sherman'] } })
    const html = codexQuizAnswerHtml(all, { picked: ['bellonet', 'sherman'] })
    expect(html).not.toContain(LABELS.absentHead)
  })

  it('해설의 빈 줄은 문단으로 갈린다 — 한 덩어리로 쏟지 않는다', () => {
    const html = codexQuizAnswerHtml(withRight, { picked: ['bellonet'] })
    const paras = html.match(/<p>/g) ?? []
    expect(paras.length).toBeGreaterThanOrEqual(3)
  })

  it('학생이 쓴 글은 HTML 에 섞이지 않는다 — 빈 칸만 내고 textContent 로 채운다', () => {
    const html = codexQuizAnswerHtml(withRight, { picked: [], text: '<script>나쁜 것</script>' })
    expect(html).toContain('cquiz-mine-shown')
    expect(html).not.toContain('나쁜 것')
    expect(noComments).toMatch(/mine\.textContent\s*=/)
  })

  it('안 쓴 학생에게는 그 칸이 아예 안 뜬다', () => {
    expect(codexQuizAnswerHtml(withRight, { picked: [], text: '   ' })).not.toContain('cquiz-mine-shown')
  })

  it('카드의 글자를 벗어나는 문자는 달아 준다', () => {
    const html = codexQuizHtml({ act: 1, question: 'ㄱ', held: [{ id: 'x', title: '<b>끼움</b>', origin: '' }] })
    expect(html).not.toContain('<b>끼움</b>')
    expect(html).toContain('&lt;b&gt;끼움&lt;/b&gt;')
  })
})

describe('배선 — 한 번만 풀리고, 키보드로도 끝까지 간다', () => {
  it('resolve() 는 한 자리에서 한 번만 불린다', () => {
    expect((noComments.match(/resolve\(/g) ?? []).length).toBe(1)
    expect(noComments).toMatch(/if \(done\) return\s*\n\s*done = true/)
  })

  it('타이머가 없다 — 기다리게 하는 장치를 두지 않는다', () => {
    expect(noComments).not.toMatch(/setTimeout|setInterval|requestAnimationFrame/)
  })

  it('고르는 칸은 단추다 — 손가락과 키보드가 같은 자리를 지난다', () => {
    expect(noComments).toMatch(/<button type="button" class="cquiz-card"/)
    expect(noComments).toMatch(/aria-pressed="false"/)
    expect(noComments).toMatch(/setAttribute\('aria-pressed'/)
  })

  it('Enter 로도 답을 놓고 넘어간다 — 글 쓰는 칸은 비켜 준다', () => {
    expect(noComments).toMatch(/addEventListener\('keydown'/)
    expect(noComments).toMatch(/e\.key !== 'Enter'/)
    expect(noComments).toMatch(/if \(e\.target === area\) return/)
  })

  it('화면이 닫힐 때 키 듣기를 걷어 낸다', () => {
    expect(noComments).toMatch(/removeEventListener\('keydown', onKey\)/)
  })

  it('초점은 판에서 시작해 다음 단추로 간다 — 첫 칸에 주지 않는다', () => {
    expect(noComments).toMatch(/next\.focus\(\)/)
    expect(noComments).toMatch(/sheet\.focus\(/)
    // 첫 칸에 초점을 주면 그 테가 「이미 한 장을 골랐다」로 읽힌다(화면을 눈으로 본 자리).
    expect(noComments).not.toMatch(/\.cquiz-card'\)\?\.focus\(\)/)
    expect(codexQuizHtml(withRight)).toContain('tabindex="-1"')
  })

  it('돌려주는 것은 picked·text·matched·missed 넷이다', () => {
    const body = noComments.slice(noComments.indexOf('resolve({'))
    for (const key of ['picked:', 'text:', 'matched:', 'missed:']) expect(body).toContain(key)
  })
})

describe('클래스 이름과 활자·화면 규칙', () => {
  it('모든 클래스가 .cquiz 아래에 있다 (type-* 는 공용 활자 규칙이다)', () => {
    const used = new Set()
    for (const m of SRC.matchAll(/class="([^"${]*)"/g)) {
      for (const name of m[1].split(/\s+/)) if (name) used.add(name)
    }
    expect(used.size).toBeGreaterThan(8)
    for (const name of used) {
      expect(/^cquiz(-|$)/.test(name) || /^type-/.test(name), `.${name} 가 남의 이름이다`).toBe(true)
    }
  })

  it('화면 뿌리는 .cquiz 하나다', () => {
    const roots = [...SRC.matchAll(/^\.([a-z][a-z0-9-]*)\{position:(?:fixed|absolute)/gm)].map(m => m[1])
    expect(roots).toEqual(['cquiz'])
  })

  it('활자 값을 스스로 정하지 않는다 — type-css.js 에서 받아 쓴다', () => {
    expect(SRC).toMatch(/installTypeVars\(\)/)
    expect(SRC).toMatch(/var\(--read-body/)
    expect(SRC).toMatch(/var\(--face-body/)
    expect(SRC).toMatch(/var\(--ink-strong/)
  })

  it('390px 에서도 서고, 움직임을 줄인 기기에서는 숨을 걷는다', () => {
    expect(SRC).toMatch(/@media\(max-width:760px\)/)
    expect(SRC).toMatch(/@media\(prefers-reduced-motion:no-preference\)/)
    // 애니메이션은 그 괄호 **안에만** 있다 — 바깥에 새면 규칙이 무효가 된다.
    const guarded = SRC.slice(SRC.indexOf('@media(prefers-reduced-motion:no-preference)'))
    expect((SRC.match(/animation:/g) ?? []).length).toBe((guarded.match(/animation:/g) ?? []).length)
  })

  it('종이는 변수로 깐다 — 그림이 없는 빌드에서도 판이 선다', () => {
    expect(SRC).toMatch(/background-image:var\(--hanji\)/)
  })
})
