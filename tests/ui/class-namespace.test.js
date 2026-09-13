import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// 화면 모듈은 저마다 최상위 클래스 하나를 전역 <style> 에 심는다 —
// .note{position:fixed;inset:0;...} 같은 것들이다. 전역이므로, 다른 모듈이
// 안쪽 요소에 같은 이름을 쓰면 그 요소가 position:fixed;inset:0 을 물려받아
// 화면 전체를 덮는 보이지 않는 판이 된다.
//
// 실제로 한 번 일어났다: move-screen 과 orders-ui 가 안쪽 풀이에 class="note" 를
// 썼고, 그 풀이들이 화면에 아예 그려지지 않았다. 테스트는 전부 초록불이었다 —
// 렌더된 화면을 사람이 눈으로 봐야만 드러나는 결함이었다.
//
// 이 검사는 그 종류가 다시 나는 것을 막는다. CSS 를 파싱하지 않고 문자열만 본다:
// 완벽한 검사가 아니라, 실제로 우리를 문 것 하나를 확실히 잡는 검사다.

const UI_DIR = join(process.cwd(), 'src', 'ui')

function uiFiles() {
  return readdirSync(UI_DIR).filter(f => f.endsWith('.js'))
}

// `.foo{position:fixed` 또는 `.foo{position:absolute` 로 시작하는 최상위 규칙 —
// 화면 뿌리로 쓰이는 이름들이다.
function rootClassesOf(src) {
  const found = new Set()
  const re = /^\.([a-z][a-z0-9-]*)\{position:(?:fixed|absolute)/gim
  let m
  while ((m = re.exec(src)) !== null) found.add(m[1])
  return found
}

// 클래스 이름이 요소에 붙는 길은 넷이다 — 넷을 다 본다.
//
// 예전에는 `class="…"`(겹따옴표)와 `className = '…'`(홑따옴표) 둘만 봤다. 그래서
// `className = "veil"` 도, 템플릿 리터럴로 준 이름도, `el.classList.add('veil')` 도
// 하나도 안 잡혔다 — 따옴표 하나만 바꿔 적으면 이 검사가 없는 것과 같았다.
// 지금 위반은 없지만(직접 훑었다), 다음 사람이 어느 길로 적을지는 모른다.
//
// ${…} 가 든 값은 건너뛴다 — 조립된 이름은 이 검사가 판정할 수 있는 것이 아니다.
const CLASS_SITES = [
  /class\s*=\s*"([^"]*)"/g,              // class="foo bar"
  /class\s*=\s*'([^']*)'/g,              // class='foo bar'
  /class\s*=\s*`([^`]*)`/g,              // class=`foo ${x}`
  /className\s*=\s*"([^"]*)"/g,          // className = "foo"
  /className\s*=\s*'([^']*)'/g,          // className = 'foo'
  /className\s*=\s*`([^`]*)`/g,          // className = `foo`
  /classList\.(?:add|remove|toggle|replace)\(([^)]*)\)/g,   // el.classList.add('foo')
]

function usedClassesOf(src) {
  const found = new Set()
  for (const re of CLASS_SITES) {
    let m
    while ((m = re.exec(src)) !== null) {
      const raw = m[1]
      if (raw.includes('${')) continue      // 조립된 이름 — 판정하지 않는다
      // classList 는 인자가 여럿일 수 있고 따옴표가 붙어 있다 — 벗겨 낸다
      for (const piece of raw.split(/[,\s]+/)) {
        const name = piece.trim().replace(/^['"`]|['"`]$/g, '')
        if (name && /^[A-Za-z][\w-]*$/.test(name)) found.add(name)
      }
    }
  }
  return found
}

// 훑는 자 자체를 먼저 잰다 — 이 자가 한 길만 보면 아래 검사는 초록불인 채로
// 아무것도 안 지킨다. 그것이 예전 모습이었다.
describe('클래스 이름이 붙는 네 길을 다 본다', () => {
  it('겹따옴표·홑따옴표·템플릿·classList 를 모두 잡는다', () => {
    const src = [
      `el.setAttribute('x', '<div class="aa"></div>')`,
      `other.setAttribute('x', "<div class='bb'></div>")`,
      `box.className = "cc"`,
      `row.className = 'dd'`,
      'tag.className = `ee`',
      `el.classList.add('ff')`,
      `el.classList.remove("gg")`,
      'el.classList.toggle(`hh`)',
      `el.classList.add('ii', 'jj')`,
    ].join('\n')
    const found = usedClassesOf(src)
    for (const name of ['aa', 'bb', 'cc', 'dd', 'ee', 'ff', 'gg', 'hh', 'ii', 'jj']) {
      expect(found.has(name), `${name} 를 못 잡았다`).toBe(true)
    }
  })

  it('여러 이름이 한 칸에 있으면 갈라서 잡는다', () => {
    const src = `el.setAttribute('x', '<div class="actend final">')`
    expect([...usedClassesOf(src)].sort()).toEqual(['actend', 'final'])
  })

  it('조립된 이름(${…})은 판정하지 않는다 — 없는 위반을 지어내지 않는다', () => {
    expect(usedClassesOf('el.className = `row ${kind}`').size).toBe(0)
  })
})

describe('화면 뿌리 클래스 이름은 전역이다 — 안쪽 요소가 빌려 쓰면 안 된다', () => {
  const files = uiFiles()

  it('src/ui 에 화면 모듈이 있다', () => {
    expect(files.length).toBeGreaterThan(5)
  })

  it('두 모듈이 같은 뿌리 클래스 이름을 쓰지 않는다', () => {
    const owner = new Map()
    for (const f of files) {
      for (const c of rootClassesOf(readFileSync(join(UI_DIR, f), 'utf8'))) {
        expect(owner.has(c), `뿌리 클래스 .${c} 를 ${owner.get(c)} 와 ${f} 가 함께 쓴다`).toBe(false)
        owner.set(c, f)
      }
    }
  })

  it('남의 모듈의 뿌리 클래스 이름을 안쪽 요소에 쓰지 않는다', () => {
    const owner = new Map()
    const sources = new Map()
    for (const f of files) {
      const src = readFileSync(join(UI_DIR, f), 'utf8')
      sources.set(f, src)
      for (const c of rootClassesOf(src)) owner.set(c, f)
    }

    for (const [f, src] of sources) {
      for (const used of usedClassesOf(src)) {
        const ownedBy = owner.get(used)
        if (!ownedBy || ownedBy === f) continue
        expect.fail(
          `${f} 가 class="${used}" 를 쓰는데, .${used} 는 ${ownedBy} 가 전역에 심는 ` +
          `화면 뿌리다. 그 요소는 position:fixed;inset:0 을 물려받아 보이지 않는 ` +
          `전면 판이 된다. 다른 이름을 쓸 것.`
        )
      }
    }
  })
})
