import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { RECON_NOTE, GOAL_NOTE } from '../../src/systems/funding.js'

// 1막 마지막 「돈을 만든다」 화면(2026-09-26 선생님: 「원납전과 당백전을 선택하고
// 선택한 이유를 쓰는 건 교육적 의미도 없고 재미도 없어. 원납전과 당백전을 잘
// 활용하여서 다시 만들어보자」).
//
// vitest 환경이 node 라 DOM 이 없다 — 그래서 판정은 전부 systems/funding.js 로 뺐고
// (거기에 제 시험이 따로 있다), 여기서는 tests/ui/hands-on.test.js 와 같은 방식으로
// 화면 모듈의 글자를 본다. 완벽한 검사가 아니라, 이 화면에서 실제로 부러질 수 있는
// 것들만 못 박는다 — 태블릿에서 지레가 안 먹는 것, 키보드만 쓰는 학생이 갇히는 것,
// 채점하는 말투, 재구성을 사실로 읽히게 두는 것, 그리고 아버지의 그 한 줄이 사라지는 것.

// 주석은 //… 와 /*…*/ 둘 다 걷어 낸다 — CSS 안의 설명글이 검사에 걸리면
// 「채점하는 말이 없다」 같은 검사가 엉뚱한 자리에서 붉어진다.
const stripComments = src =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')
const rawUi = readFileSync(join(process.cwd(), 'src', 'ui', 'funding.js'), 'utf8')
const ui = stripComments(rawUi)

describe('돈을 만든다 — 두 지레를 손으로 민다', () => {
  it('판정은 화면에 없다 — systems/funding.js 를 불러 쓴다', () => {
    expect(ui).toMatch(/from '\.\.\/systems\/funding\.js'/)
    expect(ui).toMatch(/blocks|goalMet|priceLabel/)
    // 셈을 화면에서 다시 하지 않는다 — 배수·걷히는 양을 여기서 짓는 자리가 없다
    expect(ui).not.toMatch(/PRICE_PER_MINT\s*\*/)
    expect(ui).not.toMatch(/LEVY_COIN|MINT_COIN|MINSIM_PER_LEVY/)
  })

  it('고르는 단추도, 이유를 쓰는 칸도 없다 — 선생님이 지운 그 자리다', () => {
    expect(ui).not.toMatch(/<textarea/)
    expect(ui).not.toMatch(/reasonPrompt|왜 그렇게/)
    expect(ui).not.toMatch(/class="opt"/)
  })

  // 태블릿에서 이 한 줄이 없으면 지레를 미는 손짓이 「화면 넘기기」로 먹혀 한 칸도
  // 움직이지 않는다(ration.js 낟알판에서 한 번 물린 자리다).
  it('마우스·펜·손가락이 모두 된다', () => {
    expect(ui).toContain('touch-action:none')
    expect(ui).toContain("addEventListener('pointerdown'")
    expect(ui).toContain("addEventListener('pointermove'")
    expect(ui).toContain('setPointerCapture')
    expect(ui).not.toMatch(/addEventListener\('mousedown'/)
    expect(ui).not.toMatch(/draggable|dragstart|dragover/)
  })

  it('키보드로도 밀린다 — 끌기만으로 되는 길이 없다', () => {
    expect(ui).toContain("addEventListener('keydown'")
    expect(ui).toContain("'ArrowRight'")
    expect(ui).toContain("'ArrowLeft'")
    expect(ui).toContain("'Home'")
    expect(ui).toContain("'End'")
    expect(ui).toContain('role="slider"')
    expect(ui).toContain('tabindex="0"')
    expect(ui).toContain('aria-valuenow')
    expect(ui).toContain('.funding .lever-track:focus-visible')
  })

  it('단추로도 밀린다 — 화살표키를 모르는 학생도 갇히지 않는다', () => {
    expect(ui).toMatch(/data-step="\$\{kind\}" data-delta="-1"/)
    expect(ui).toMatch(/data-step="\$\{kind\}" data-delta="1"/)
    expect(ui).toContain('.funding .lever-btns button:focus-visible')
    expect(ui).toContain('되돌린다')
  })

  it('한 문으로만 움직인다 — 끌기·키·단추가 같은 자리로 들어온다', () => {
    expect(ui).toMatch(/function move\(kind, next\)/)
    expect(ui).toMatch(/const line = nudgeFor\(prev, state\)/)
  })

  it('밀 때마다 화면을 다시 쓰지 않는다 — 누르던 초점이 날아가면 키보드 길이 끊긴다', () => {
    // 판을 세우는 자리(board)와 되짚기(reveal) 두 번만 innerHTML 을 쓴다
    expect(ui.match(/el\.innerHTML = /g)).toHaveLength(2)
    expect(ui).toMatch(/function paint\(/)
    expect(ui).toContain('style.width')
  })

  it('무엇이 움직이는지 눈에 든다 — 채운 막대·물가 배수·쌀 동전 줄·민심', () => {
    expect(ui).toContain('class="goal-bar"')
    expect(ui).toContain('class="goal-fill levy"')
    expect(ui).toContain('class="goal-fill mint"')
    expect(ui).toContain('priceLabel')
    expect(ui).toContain('riceCoins')
    expect(ui).toContain('minsimLabel')
    expect(ui).toContain('levyWorthLine')
    // 걷어 둔 돈이 줄어든 자리를 막대 위에 그대로 남긴다
    expect(ui).toContain('class="goal-ghost"')
  })

  it('좁은 화면에서도 미는 동안 막대와 물가가 보인다', () => {
    expect(ui).toContain('.funding .board-top{position:sticky')
    expect(ui).toContain('class="board-top"')
  })

  it('약속은 한 번만 풀린다 — main.js 의 await funding.open(view) 가 한 번이다', () => {
    expect(ui).toContain('open(view')
    expect(ui.match(/resolve\(/g)).toHaveLength(1)
    expect(ui).toMatch(/return new Promise\(resolve =>/)
  })

  it('넘겨주는 값이 계약대로다 — acts.js·main.js 가 받아 적을 것들', () => {
    for (const key of ['levy:', 'mint:', 'price:', 'priceTimes:', 'minsim:',
      'minsimLabel:', 'filled:', 'goalMet:', 'gaveUp:', 'summary:']) {
      expect(ui, key).toContain(key)
    }
    // 계약이 파일 머리에 적혀 있다 — 배선하는 사람이 짐작하지 않게
    expect(rawUi).toContain('createFunding(root).open(view) → Promise<result>')
    expect(rawUi).toContain('// view')
    expect(rawUi).toContain('// result')
  })
})

describe('이 화면이 말하지 않는 것', () => {
  it('채점하지 않는다 — 점수도 정답도 오답도 없다', () => {
    expect(ui).not.toMatch(/오답|정답|점수|맞았습니다|틀렸|실점|감점|벌점|승리|패배/)
  })

  it('못 채운 채로도 멈출 수 있다 — 아무도 갇히지 않는다', () => {
    expect(ui).toContain('giveUpLabel')
    expect(ui).toContain('여기서 멈추어도 된다')
    // 채우지 못했다고 다음으로 가는 길을 막지 않는다
    expect(ui).not.toMatch(/go\.disabled/)
  })

  it('절대 수치가 새지 않는다 — 냥도 총액도 없다', () => {
    expect(ui).not.toMatch(/냥/)
  })

  it('시계가 없다 — 촉박은 C1·C2·C3 세 번뿐이다', () => {
    expect(ui).not.toMatch(/setTimeout|setInterval|Date\.now|performance\.now/)
  })

  it('재구성 고지가 셈판과 되짚기 양쪽에 나간다', () => {
    expect(ui).toContain('GOAL_NOTE')
    expect(ui).toContain('RECON_NOTE')
    expect(ui).toContain('c.note')
    expect(RECON_NOTE).toContain('재구성')
    expect(GOAL_NOTE).toContain('칸')
  })

  it('출처가 셈판과 되짚기 양쪽에 나간다', () => {
    expect(ui).toMatch(/class="origin">\$\{v\.origin\}/)
    expect(ui).toMatch(/\$\{v\.actual\?\.origin \?\? v\.origin\}/)
  })

  it('실제로 물가가 몇 배였는지는 화면이 말하지 않는다 — systems 가 준 말만 쓴다', () => {
    expect(ui).toContain('c.actualPrice')
    expect(ui).not.toMatch(/실제로는[^<]*\d+배/)
  })

  it('움직임을 줄여 달라는 학생의 뜻을 따른다', () => {
    expect(ui).toContain('@media(prefers-reduced-motion:reduce)')
  })
})

describe('아버지가 뒤집는 한 줄이 그대로 남아 있다', () => {
  it('되짚기 끝에 뒤집는 말과 그 얼굴이 붙는다', () => {
    expect(ui).toContain('v.overturn')
    expect(ui).toContain('class="overturn"')
    expect(ui).toContain('PORTRAITS[by.portrait]')
    expect(ui).toContain('<blockquote>')
  })

  it('셈을 한 사람과 정한 사람이 다르다는 것을 적는다 — 1막의 요점이다', () => {
    expect(ui).toContain('정한 사람은 당신이 아니었다')
  })

  it('학생의 셈과 교과서를 나란히 놓는다', () => {
    expect(ui).toContain('당 신 은')
    expect(ui).toContain('실 제 로 는')
    expect(ui).toContain('c.you')
    expect(ui).toContain('c.actual.map')
  })
})

describe('클래스 이름과 좁은 화면', () => {
  it('새 클래스는 모두 .funding 안에 있다', () => {
    for (const name of ['board', 'board-top', 'goal-head', 'goal-bar', 'goal-fill', 'goal-ghost',
      'goal-worth', 'goal-keys', 'gauges', 'gauge', 'price-line', 'rice-row', 'rice-coins',
      'rice-coin', 'rice-eq', 'minsim-bar', 'minsim-word', 'nudge', 'levers', 'lever',
      'lever-head', 'lever-blurb', 'lever-track', 'lever-fill', 'lever-ticks', 'lever-count',
      'lever-btns', 'recon', 'origin', 'go', 'done-line', 'sheet', 'cmp', 'actual-line',
      'overturn', 'not-yours', 'ask']) {
      // 한 겹 더 들어간 자리(.funding .sheet .origin)도 .funding 안이다
      expect(ui, name).toMatch(new RegExp(`\\.funding( \\.[a-z-]+)* \\.${name}[{ ,:]`))
    }
    // 화면 뿌리는 .funding 하나뿐이다(tests/ui/class-namespace.test.js 가 전역을 잰다)
    expect(ui).toContain('.funding{position:fixed')
    expect(ui.match(/^\.[a-z-]+\{position:fixed/gm)).toHaveLength(1)
  })

  it('390px 폭에 들어간다 — 가로로 넘치지 않는다', () => {
    expect(ui).toContain('width:min(880px,94vw)')
    expect(ui).toContain('@media(max-width:700px)')
    // 세로로 세운 뒤 칸이 늘어나 빈 상자가 되지 않게 한다(실제로 한 번 그렇게 났다)
    expect(ui).toContain('.funding .gauge,.funding .lever{flex:0 0 auto}')
  })
})
