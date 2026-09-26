import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveArt, actLine } from '../../src/ui/act-question.js'
import { ACT_QUESTION_ART, ART_NOTE } from '../../src/ui/act-question-data.js'

// 막마다 하나씩 놓이는 질문 화면(2026-09-26 선생님: 「막마다 질문은 전체화면으로,
// 힉스필드를 활용해서 정말 질문을 고민하게 만들어야 해」)을 잰다.
//
// vitest 환경이 node 라 DOM 이 없다 — 그래서 tests/ui/hands-on.test.js·pause.test.js 와
// 같은 방식으로 화면 모듈의 글자를 본다. 순수 함수 둘(resolveArt·actLine)만 실제로
// 불러 쓴다. 완벽한 검사가 아니라, **이 화면이 실제로 부러질 수 있는 것들**만 못 박는다:
// 질문이 작아지는 것, 화면이 두 번 넘어가는 것, 학생의 생각을 우리 문장으로 덮는 것,
// 그리고 재구성 그림을 사진처럼 읽히게 두는 것.

const stripComments = src => src.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')
const raw = readFileSync(join(process.cwd(), 'src', 'ui', 'act-question.js'), 'utf8')
const src = stripComments(raw)

describe('두 모드가 한 화면에서 갈린다', () => {
  it('open 이 기본이고, close 는 mode 로만 켜진다', () => {
    expect(src).toMatch(/view\.mode === 'close'/)
    expect(src).toContain("'actq actq-close'")
  })

  it('두 모드의 단추 글씨가 다르고, 부르는 쪽이 갈아 끼울 수 있다', () => {
    expect(src).toContain("'생각하며 들어간다'")
    expect(src).toContain("'다음 막으로'")
    expect(src).toContain('view.closeLabel')
    expect(src).toContain('view.openLabel')
  })

  it('닫는 화면은 같은 그림을 어둡게 깐다 — 지우지는 않는다', () => {
    const m = src.match(/\.actq-close \.actq-art\{filter:brightness\(\.(\d+)\)/)
    expect(m, '.actq-close .actq-art 에 brightness 가 없다').toBeTruthy()
    expect(Number(`.${m[1]}`)).toBeGreaterThanOrEqual(0.45)
  })
})

describe('질문이 화면에서 가장 큰 글씨다', () => {
  it('질문은 부르는 쪽이 준 글을 그대로 낸다', () => {
    expect(src).toContain('class="actq-q"')
    expect(src).toContain('view.question')
  })

  // 띠(banner)가 아니라 전면이다 — 이 두 줄이 없으면 그냥 얹힌 글이 된다.
  it('전면이다 — position:fixed;inset:0', () => {
    expect(src).toMatch(/\.actq\{position:fixed;inset:0/)
  })

  // 프로젝터의 뒷줄 기준(ui/type-css.js §4). --read-title 을 바닥으로 깔고 그 위로 커진다.
  it('질문 크기의 바닥이 --read-title 이다', () => {
    expect(src).toMatch(/\.actq-q\{[^}]*font-size:clamp\(var\(--read-title/)
  })

  it('본문은 --read-body 를 쓴다 — 크기를 손으로 적지 않는다', () => {
    expect(src).toContain('var(--read-body')
    expect(src).toContain('installTypeVars()')
  })
})

describe('한 번 눌리면 한 번만 넘어간다', () => {
  it('두 번 눌러도 resolve 는 한 번이다', () => {
    expect(src).toMatch(/let done = false/)
    expect(src).toMatch(/if \(done\) return[\s\S]{0,40}done = true/)
    // resolve 를 부르는 자리가 하나뿐이다
    expect(src.match(/resolve\(\)/g) ?? []).toHaveLength(1)
  })

  it('화면을 걷는 일도 이 안에서 끝난다 — 부르는 쪽은 await 만 한다', () => {
    expect(src).toContain('el.remove()')
  })

  it('키보드로도 눌린다 — 단추이고, 뜨자마자 초점이 간다', () => {
    expect(src).toContain('createElement(\'button\')')
    expect(src).toContain('go.focus?.()')
    expect(src).toContain('.actq-go:focus-visible')
  })
})

describe('학생이 본 것을 적되, 학생 대신 대답하지 않는다', () => {
  it('evidence 가 있으면 줄로 그려진다', () => {
    expect(src).toContain('view.evidence')
    expect(src).toContain("box.className = 'actq-seen'")
    expect(src).toContain("list.className = 'actq-seen-list'")
    expect(src).toMatch(/for \(const seen of evidence\)[\s\S]{0,140}li\.textContent = seen/)
  })

  it('evidence 는 닫는 화면에서만, 그리고 빈 칸이면 아예 나오지 않는다', () => {
    expect(src).toMatch(/close \? \(view\.evidence \?\? \[\]\)\.filter\(Boolean\) : \[\]/)
    expect(src).toMatch(/if \(evidence\.length\)/)
  })

  it('머리말이 「본 것」이다 — 알아낸 것도, 배운 것도 아니다', () => {
    expect(raw).toContain('이 막에서 당신이 본 것')
  })

  // 이 화면이 요약이 되는 순간 학생은 자기 생각을 지우고 우리 문장을 옮겨 적는다.
  // 셈하는 말이 붙으면 학생은 질문이 아니라 셈을 본다.
  it('맞고 틀림을 말하는 낱말이 하나도 없다', () => {
    for (const word of ['정답', '오답', '점수', '채점', '맞혔', '틀렸', '득점', '벌점']) {
      expect(src.includes(word), `화면에 「${word}」 이 있다`).toBe(false)
    }
  })

  it('질문이 돌아올 때도 답을 주지 않는다 — 생각이 같은지만 묻는다', () => {
    expect(raw).toContain('같은 질문이 돌아왔다')
  })
})

describe('재구성을 사실로 읽히게 두지 않는다', () => {
  it('그림 밑에 고지가 붙는다', () => {
    expect(src).toContain("note.className = 'actq-note'")
    expect(src).toMatch(/view\.note \?\? art\.caption \?\? ART_NOTE/)
  })

  it('고지 문구가 재구성임을 말한다', () => {
    expect(ART_NOTE).toContain('재구성')
    expect(ART_NOTE).toContain('사진')
  })

  it('실려 있는 그림마다 제 몫의 고지와 대체글이 있다', () => {
    const keys = Object.keys(ACT_QUESTION_ART)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      const art = ACT_QUESTION_ART[key]
      expect(art.src.startsWith('data:image/webp;base64,'), `${key} 가 바깥 주소를 가리킨다`).toBe(true)
      expect(art.caption, `${key} 에 고지가 없다`).toContain('재구성')
      expect(art.alt?.length, `${key} 에 대체글이 없다`).toBeGreaterThan(3)
    }
  })

  // 그림이 없는 막에 「재구성 그림입니다」를 붙이면 없는 그림을 두고 거짓을 말한 것이 된다.
  it('그림이 없으면 고지도 내지 않는다', () => {
    expect(src).toMatch(/if \(art\) \{[\s\S]{0,220}actq-note/)
  })
})

describe('그림 한 장이 빠져도 막은 열린다', () => {
  it('resolveArt 는 열쇠·통짜·빈 것을 모두 받는다', () => {
    const table = { act1: { src: 'data:image/webp;base64,AA', alt: 'ㄱ' } }
    expect(resolveArt('act1', table)).toBe(table.act1)
    expect(resolveArt('없는열쇠', table)).toBe(null)
    expect(resolveArt(null, table)).toBe(null)
    expect(resolveArt({ src: 'data:image/webp;base64,BB' }, table).src).toContain('BB')
    expect(resolveArt({ alt: '주소가 없다' }, table)).toBe(null)
  })

  it('그림이 없으면 먹빛 바탕이 대신 선다', () => {
    expect(src).toContain('actq-dark')
    expect(src).toMatch(/art \?[\s\S]{0,180}actq-dark/)
  })
})

describe('막 이름 줄은 빠진 조각을 조용히 건너뛴다', () => {
  it('셋 다 있으면 셋 다 적는다', () => {
    expect(actLine({ act: 3, actLabel: '친정', year: '1873~76' }))
      .toBe('제3막 <span>· 친정 1873~76</span>')
  })
  it('막 번호만 있으면 그것만 적는다', () => {
    expect(actLine({ act: 1 })).toBe('제1막')
  })
  it('아무것도 없으면 빈 줄이고, 화면은 그 칸을 통째로 뺀다', () => {
    expect(actLine({})).toBe('')
    expect(src).toMatch(/line \?/)
  })
})

describe('390px 과 1920px, 그리고 움직임을 줄인 학생', () => {
  it('폭에 테두리를 포함시킨다 — 손전화에서 밖으로 밀려나지 않게', () => {
    expect(src).toMatch(/\.actq,\.actq \*\{box-sizing:border-box\}/)
  })
  it('760px 아래에서 크기를 한 단계 내린다', () => {
    expect(src).toContain('@media(max-width:760px)')
  })
  it('움직임을 줄여 달라고 하면 그림이 떠돌지 않는다', () => {
    expect(src).toContain('@media(prefers-reduced-motion:reduce)')
    expect(src).toMatch(/prefers-reduced-motion:reduce\)\{[\s\S]{0,160}animation:none/)
  })
  it('넘치면 위부터 스크롤된다 — 가운데 정렬에 갇히지 않는다(ui/act-end.js 와 같은 함정)', () => {
    expect(src).toContain('justify-content:safe center')
    expect(src).toMatch(/\.actq-body\{[^}]*overflow:auto/)
  })
})

describe('클래스 이름은 모두 .actq 아래에 있다', () => {
  it('이 모듈이 요소에 붙이는 이름이 전부 actq 로 시작한다', () => {
    const names = new Set()
    const sites = [/class="([^"$]*)"/g, /className = '([^']*)'/g, /classList\.add\('([^']*)'\)/g]
    for (const re of sites) {
      let m
      while ((m = re.exec(src)) !== null) {
        for (const piece of m[1].split(/\s+/)) if (piece) names.add(piece)
      }
    }
    expect(names.size).toBeGreaterThan(4)
    for (const name of names) {
      expect(name.startsWith('actq'), `class="${name}" 이 actq 밖에 있다`).toBe(true)
    }
  })

  it('CSS 의 규칙도 전부 .actq 로 시작한다', () => {
    const rules = [...src.matchAll(/^\.([a-z][a-z0-9-]*)/gm)].map(m => m[1])
    expect(rules.length).toBeGreaterThan(6)
    for (const rule of rules) {
      expect(rule.startsWith('actq'), `.${rule} 이 actq 밖에 있다`).toBe(true)
    }
  })
})
