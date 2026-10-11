import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { PHONE_LANDSCAPE_CSS, installPhoneLandscape } from '../../src/ui/phone-landscape.js'

// 선생님(2026-10-09, 휴대전화 가로 화면): 「pc버전에서 만든걸 모바일로 할 때 창이 감당이 안되게 커져버려 …
// 모바일의 원칙은 한판에 들어와야하는거야. 모바일버전만 재점검해봐.」
//
// 844×390 흉내로 76장면을 찍어 보니 글 화면·문서 뜯어 읽기·그림 선택지·거처 옮김·어전회의·납치 길이 화면의
// 1.3~2.2배였다. ui/phone-landscape.js 가 높이 480 이하에서만 그 여섯 판을 줄인다. 이 시험은 그 한 장이
// 여섯 판을 빠짐없이 다루고, 높이 조건 밖으로 새지 않으며, 다른 모듈의 규칙보다 앞서는 선택자(#root …)를
// 쓰는지 본다 — 모듈 쪽 CSS 가 바뀌어도 이 판들이 다시 커지지 않게.
const PANELS = ['note', 'study', 'dilemma', 'move', 'council', 'trail', 'loss', 'dispatch', 'orders', 'jeongjok', 'seekdoc', 'weigh', 'veil', 'ration']

describe('가로 휴대전화 한 화면 스타일(ui/phone-landscape.js)', () => {
  it('높이 480 이하에서만 산다 — 규칙 전부가 한 @media 안에 있다', () => {
    const body = PHONE_LANDSCAPE_CSS.trim()
    expect(body.startsWith('@media(max-height:480px){')).toBe(true)
    expect(body.endsWith('}')).toBe(true)
    // 안쪽에 또 다른 @media 가 없다 — 조건이 겹치면 어느 쪽이 이기는지 아무도 모른다.
    expect(body.slice(1).includes('@media')).toBe(false)
  })

  it('열네 판을 모두 다루고, 선택자는 #root 로 시작해 모듈의 .eojeon 규칙을 이긴다', () => {
    for (const p of PANELS) expect(PHONE_LANDSCAPE_CSS).toMatch(new RegExp(`#root \\.${p}[ .{]`))
    const selectors = PHONE_LANDSCAPE_CSS.match(/^\s*([^{}\n]+)\{/gm).map(s => s.trim().replace(/\{$/, '').trim())
      .filter(s => !s.startsWith('@media'))
    for (const s of selectors) for (const part of s.split(',')) expect(part.trim(), part).toMatch(/^#root \./)
  })

  it('다루는 판 이름이 실제 뿌리 클래스다', () => {
    const src = (f) => readFileSync(new URL(`../../src/ui/${f}`, import.meta.url), 'utf8')
    const files = { note: 'note-screen.js', study: 'doc-study.js', dilemma: 'dilemma.js', move: 'move-screen.js', council: 'council-ui.js', trail: 'trail.js', loss: 'loss-screen.js', dispatch: 'dispatch-map.js', orders: 'orders-ui.js', jeongjok: 'jeongjok.js', seekdoc: 'doc-seek.js', weigh: 'weigh.js', veil: 'dialog.js', ration: 'ration.js' }
    for (const [p, f] of Object.entries(files)) expect(src(f), `${f} 에 「${p}」 판이 없다`).toContain(`'${p}'`)
  })

  it('main.js 가 한 번 붙인다', () => {
    const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8')
    expect(main).toMatch(/installPhoneLandscape\(\)/)
    // DOM 이 없는 자리에서는 조용히 아무것도 안 한다(시험·서버).
    expect(() => installPhoneLandscape()).not.toThrow()
  })

  it('모바일에서 빼는 것은 중요하지 않은 줄뿐이다 — 물음·단추·대신·말은 남는다', () => {
    // 선생님(2026-10-11): 「한판에 거슬리는 중요하지 않은것들은 모바일에서 없애서」. 뺀 것은 서계의 들머리·읽는 법·풀이,
    // 정족산성의 출처 줄, 저울의 출처 줄이다. 물음(.q)·단추·대신(.seat)·말(.speech)은 어디서도 display:none 이 아니다.
    // 숨기는 규칙마다 선택자의 마지막 마디만 본다 — 「.record .excerpt br+br」 은 기록이 아니라 빈 줄을 숨기는 것이다.
    const hidden = PHONE_LANDSCAPE_CSS.split('\n').filter(l => /display:none/.test(l))
      .map(l => l.replace(/\{.*$/, '').split(',').map(s => s.trim().split(/\s+/).pop()).join(' '))
    for (const l of hidden) expect(l).not.toMatch(/\.q\b|button|\.seat|\.speech|\.name|\.look|\.gate|\.lane/)
    expect(PHONE_LANDSCAPE_CSS).toMatch(/#root \.seekdoc \.lead,#root \.seekdoc \.readnote,#root \.seekdoc \.trans\{display:none\}/)
    expect(PHONE_LANDSCAPE_CSS).toMatch(/#root \.jeongjok \.foot \.src\{display:none\}/)
    // 2026-10-11 사료 카드: 그림 칸·낱말 풀이·해석을 빼고, 기록(.record)은 왼쪽 칸·물음은 오른쪽 칸. 급료 가마: 긴 설명 줄만 뺀다.
    expect(PHONE_LANDSCAPE_CSS).toMatch(/#root \.veil \.card \.historical-figure\{display:none\}/)
    expect(PHONE_LANDSCAPE_CSS).toMatch(/#root \.veil \.card \.gloss,#root \.veil \.card \.reading\{display:none\}/)
    expect(PHONE_LANDSCAPE_CSS).toMatch(/#root \.veil \.card \.source-copy>\.record\{grid-column:1;grid-row:3 \/ span 12/)
    expect(PHONE_LANDSCAPE_CSS).toMatch(/#root \.ration \.hand-help\{display:none\}/)
    expect(PHONE_LANDSCAPE_CSS).toMatch(/#root \.ration \.tray-wrap\{width:min\(56vw/)
    // 밑줄 긋기의 물음(.ask)·따져 읽기(.probe)·기록(.record)·닫기는 어디서도 숨기지 않는다.
    for (const l of hidden) expect(l).not.toMatch(/\.ask\b|\.probe\b|\.record\b|\.close\b|\.excerpt\b|\.tray\b/)
  })

  it('글 화면의 사진 칸은 글보다 좁다 — 글이 먼저다', () => {
    expect(PHONE_LANDSCAPE_CSS).toMatch(/#root \.note \.sheet\.has-media\{grid-template-columns:minmax\(0,1fr\) clamp\(150px,24%,200px\)/)
  })
})
