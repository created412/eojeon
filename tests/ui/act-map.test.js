import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ACTS } from '../../src/data/acts.js'
import { actMapView } from '../../src/systems/act-map.js'
import { createActMap } from '../../src/ui/act-map.js'

// 「이 막의 여정」 화면(2026-09-27 선생님: 「1막이 어떤 구성이고 어떻게 진행해야 하는지
// 안 보여」)을 잰다.
//
// 이 저장소의 시험은 DOM 없이 돈다(vitest.config.js 의 environment 는 'node'). 그래서
// 다른 화면 시험들은 소스 문자열만 훑는데, 그러면 **다섯 막을 실제로 그려 보는 일**은
// 한 번도 일어나지 않는다. 여기서는 ui/font.test.js 가 installTypeVars 에 흉내 낸
// 종이를 넘긴 것과 같은 방식으로, createActMap 이 만지는 만큼만 흉내 낸 문서를 준다 —
// 그리고 다섯 막을 전부 그려서 나온 마디를 센다. 소스 검사는 그 뒤에, 그려 봐도 드러나지
// 않는 것(CSS 의 반응·움직임 줄이기·낱말 금지)에만 쓴다.

const raw = readFileSync(join(process.cwd(), 'src', 'ui', 'act-map.js'), 'utf8')
const src = raw.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')

function fakeDocument() {
  const doc = {
    head: {
      children: [],
      firstChild: null,
      insertBefore(node) { this.children.unshift(node) },
      appendChild(node) { this.children.push(node) },
    },
    getElementById: () => null,
    createTextNode: text => ({ tagName: '#text', textContent: text, children: [] }),
    createElement(tag) {
      const el = {
        tagName: tag,
        id: '',
        className: '',
        textContent: '',
        innerHTML: '',
        children: [],
        parent: null,
        ownerDocument: doc,
        style: { setProperty(name, value) { this[name] = value } },
        listeners: {},
        appendChild(child) { child.parent = el; el.children.push(child); return child },
        addEventListener(type, fn) { (el.listeners[type] ??= []).push(fn) },
        remove() {
          if (el.parent) el.parent.children = el.parent.children.filter(c => c !== el)
          el.removed = true
        },
        focus(opts) { el.focused = (el.focused ?? 0) + 1; el.focusOpts = opts },
        click() { for (const fn of el.listeners.click ?? []) fn() },
      }
      return el
    },
  }
  return doc
}

function walk(node, out = []) {
  for (const child of node.children ?? []) { out.push(child); walk(child, out) }
  return out
}
const byClass = (node, name) => walk(node).filter(n => String(n.className).split(' ').includes(name))
const textOf = node => [node.textContent, ...walk(node).map(n => n.textContent)].filter(Boolean).join(' ')

function render(act, i, extra = {}) {
  const doc = fakeDocument()
  const root = doc.createElement('div')
  const screen = createActMap(root)
  const done = screen.open(actMapView(act, i, extra))
  const el = root.children[0]
  return { doc, root, el, done, steps: byClass(el, 'actmap-step') }
}

describe('다섯 막이 다 그려진다', () => {
  for (const [i, act] of ACTS.entries()) {
    it(`${i + 1}막 ${act.id} — 걸음이 하나씩 다 선다`, () => {
      const { el, steps } = render(act, i)
      const view = actMapView(act, i)
      expect(el.className).toBe('actmap')
      expect(steps).toHaveLength(view.steps.length)
      // 번호는 1부터 차례로 — 학생이 세는 것이 이것이다.
      expect(byClass(el, 'actmap-num').map(n => n.textContent))
        .toEqual(view.steps.map((_, n) => String(n + 1)))
      // 걸음마다 이름 한 줄과 무리 글리프가 있다.
      for (const [n, step] of steps.entries()) {
        expect(byClass(step, 'actmap-name')[0].textContent, `${act.id} ${n + 1}번째 걸음`)
          .toBe(view.steps[n].title)
        expect(byClass(step, 'actmap-kind')[0].innerHTML, `${act.id} ${n + 1}번째 글리프`).toContain('<svg')
      }
      // 손으로 하는 걸음은 눈에 띄는 표시와 **글자**를 함께 가진다(색만으로 가르지 않는다).
      const doing = byClass(el, 'actmap-doing')
      // 손잡이가 든 걸음도 「직접 한다」다 — 4막의 손잡이는 걷는 낮 안의 급료 가마다.
      expect(doing).toHaveLength(view.steps.filter(s => s.group === 'hands' || s.handle).length)
      for (const step of doing) expect(textOf(step)).toContain('직접 한다')
      // 「몇 걸음인가」가 화면 위에 적힌다.
      expect(byClass(el, 'actmap-count')).toHaveLength(1)
    })
  }

  it('이 막에서 쥔 것 한 줄은 표시된 걸음 **안에서만** 나온다', () => {
    for (const [i, act] of ACTS.entries()) {
      const { el } = render(act, i)
      const handles = byClass(el, 'actmap-handle')
      expect(handles, act.id).toHaveLength(1)
      expect(handles[0].parent.parent.className, act.id).toContain('actmap-doing')
      // `**셈**` 의 별 둘은 화면에 남지 않는다 — 굵은 글씨가 된다.
      expect(textOf(handles[0]), act.id).not.toContain('**')
      expect(walk(handles[0]).some(n => n.tagName === 'b'), act.id).toBe(true)
    }
  })

  it('게임 전체를 말하는 문장은 두 개까지만 낸다', () => {
    const { el } = render(ACTS[0], 0, { intro: ['하나.', '둘.', '셋.'] })
    const intro = byClass(el, 'actmap-intro')
    expect(intro).toHaveLength(1)
    expect(intro[0].textContent).toBe('하나. 둘.')
    expect(intro[0].textContent).not.toContain('셋.')
  })

  it('막 데이터가 「이 막에서 할 일」 한 줄을 가지면 그것도 낸다', () => {
    const { el } = render(ACTS[0], 0, { todo: '열두 살 명복이 왕이 되는 날부터 시작한다.' })
    expect(byClass(el, 'actmap-todo')[0].textContent).toContain('열두 살')
  })
})

describe('한 번 눌리면 한 번만 넘어간다', () => {
  it('두 번 눌러도 resolve 는 한 번이고, 화면은 스스로 걷힌다', async () => {
    const { root, el, done } = render(ACTS[2], 2)
    let resolved = 0
    const counted = done.then(() => { resolved++ })
    const go = walk(el).find(n => n.tagName === 'button')
    go.click()
    go.click()
    await counted
    expect(resolved).toBe(1)
    expect(el.removed).toBe(true)
    expect(root.children).toHaveLength(0)
  })

  it('resolve 를 부르는 자리가 소스에 하나뿐이다', () => {
    expect(src.match(/resolve\(\)/g) ?? []).toHaveLength(1)
    expect(src).toMatch(/let done = false/)
    expect(src).toMatch(/if \(done\) return[\s\S]{0,40}done = true/)
  })

  it('키보드로 열린다 — 진짜 단추이고, 뜨자마자 초점이 간다', () => {
    const { el } = render(ACTS[0], 0)
    const go = walk(el).find(n => n.tagName === 'button')
    expect(go).toBeTruthy()
    expect(go.focused).toBe(1)
    // 초점이 화면을 아래로 끌어내리면 제목과 첫 걸음이 잘린다.
    expect(go.focusOpts).toEqual({ preventScroll: true })
    expect(src).toContain('.actmap-go:focus-visible')
  })
})

describe('클래스 이름은 모두 .actmap 아래에 있다', () => {
  it('요소에 붙이는 이름이 전부 actmap 으로 시작한다', () => {
    const names = new Set()
    for (const act of ACTS) {
      const { el } = render(act, 0)
      for (const node of [el, ...walk(el)]) {
        for (const piece of String(node.className ?? '').split(/\s+/)) if (piece) names.add(piece)
      }
    }
    expect(names.size).toBeGreaterThan(5)
    for (const name of names) {
      if (name === 'type-read' || name === 'type-display') continue   // ui/type-css.js 의 공용 활자 규칙
      expect(name.startsWith('actmap'), `class="${name}" 이 actmap 밖에 있다`).toBe(true)
    }
  })

  it('CSS 의 규칙도 전부 .actmap 으로 시작한다', () => {
    const rules = [...src.matchAll(/^\.([a-z][a-z0-9-]*)/gm)].map(m => m[1])
    expect(rules.length).toBeGreaterThan(8)
    for (const rule of rules) expect(rule.startsWith('actmap'), `.${rule} 이 actmap 밖에 있다`).toBe(true)
  })
})

describe('390px 과 1920px, 그리고 움직임을 줄인 학생', () => {
  it('폭에 테두리를 포함시킨다 — 손전화에서 밖으로 밀려나지 않게', () => {
    expect(src).toMatch(/\.actmap,\.actmap \*\{box-sizing:border-box\}/)
  })
  it('손전화는 한 줄(세로), 넓은 화면은 흐르는 판이다', () => {
    expect(src).toContain('@media(max-width:760px)')
    expect(src).toContain('@media(min-width:900px)')
    expect(src).toMatch(/@media\(min-width:900px\)\{[\s\S]{0,200}display:grid/)
  })
  it('넘치면 위부터 스크롤된다 — 가운데 정렬에 갇히지 않는다', () => {
    expect(src).toContain('justify-content:safe center')
    expect(src).toMatch(/\.actmap\{[^}]*overflow:auto/)
  })
  it('움직임을 줄여 달라고 하면 걸음이 차례로 들어오지 않는다', () => {
    expect(src).toMatch(/@media\(prefers-reduced-motion:reduce\)\{[\s\S]{0,120}animation:none/)
  })
  it('활자는 스스로 정하지 않고 type-css.js 에서 받는다', () => {
    expect(src).toContain('installTypeVars(')
    expect(src).toContain('var(--read-body')
    expect(src).toContain('var(--face-body')
  })
})

describe('지도는 셈하지 않는다', () => {
  // 이 화면이 점수판이 되는 순간, 학생은 막을 지나는 것이 아니라 막을 따는 것이 된다.
  it('맞고 틀림·점수를 말하는 낱말이 하나도 없다', () => {
    for (const word of ['정답', '오답', '점수', '채점', '맞혔', '틀렸', '득점', '벌점', '통과']) {
      expect(raw.includes(word), `화면에 「${word}」 이 있다`).toBe(false)
    }
  })

  it('그려 낸 글에도 그런 낱말이 없다', () => {
    for (const [i, act] of ACTS.entries()) {
      const { el } = render(act, i)
      const shown = textOf(el)
      for (const word of ['정답', '오답', '점수', '채점']) {
        expect(shown.includes(word), `${act.id} 화면에 「${word}」 이 나온다`).toBe(false)
      }
    }
  })
})
