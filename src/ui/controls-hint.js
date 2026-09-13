// 조작 안내 — 「이렇게 합니다」 한 판.
//
// 이 게임에는 걷는 법을 알려주는 문구가 한 줄도 없었다(4단계 점검). 30명 학급에서
// 다섯 명만 못 움직여도 수업이 그 자리에서 멈춘다. 그래서 이 화면은 취향이 아니라
// 결함 수정이다.
//
// 여기 적힌 키는 짐작이 아니라 코드가 실제로 받는 키다:
//   걷기·달리기 — src/input/input.js 의 KEYS·shift
//   E · Q · Esc — src/main.js 의 handleKey()
// tests/ui/controls-hint.test.js 가 그 둘을 붙든다. 안내가 조용히 거짓말을 하면
// 학생은 자기 탓이라고 생각한다 — 안내가 없는 것보다 나쁘다.

// ── 기기 판정 ─────────────────────────────────────────────────────
// 예전에는 판정이 두 갈래였다. main.js 는 matchMedia('(pointer: coarse)') 로 태블릿
// 단추를 붙이고, fire-rush.js 는 navigator.maxTouchPoints > 0 으로 제한 시간을 늘렸다.
// 터치스크린 달린 노트북은 maxTouchPoints > 0 이지만 pointer: coarse 는 거짓이다 —
// 그러면 안내는 「화면을 짚으세요」라 하는데 짚을 단추가 안 붙어 있다. 학생이 갇힌다.
// 기준은 「실제로 단추가 붙는 조건」이어야 하므로 (pointer: coarse) 로 모았다.

// 기본 판정기. window.matchMedia 를 떼어내 부르면 브라우저가 Illegal invocation 으로
// 던지므로(this 가 window 여야 한다) 반드시 이렇게 감싸서 부른다.
function defaultMatchMedia(query) {
  return globalThis.matchMedia?.(query) ?? { matches: false }
}

export function isCoarse(mm = defaultMatchMedia) {
  if (typeof mm !== 'function') return false
  return !!mm('(pointer: coarse)')?.matches
}

// ── 안내가 약속하는 키 ────────────────────────────────────────────
// 아래 문구는 전부 이 표에서 만들어진다. 표와 화면이 따로 놀 수 없다.
export const HINT_KEYS = Object.freeze({
  move: Object.freeze(['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD']),
  run: Object.freeze(['ShiftLeft', 'ShiftRight']),
  act: Object.freeze(['KeyE']),
  codex: Object.freeze(['KeyQ']),
  pause: Object.freeze(['Escape']),
})

const LABEL = Object.freeze({
  ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓', ArrowRight: '→',
  KeyW: 'W', KeyA: 'A', KeyS: 'S', KeyD: 'D',
  ShiftLeft: 'Shift', ShiftRight: 'Shift',
  KeyE: 'E', KeyQ: 'Q', Escape: 'Esc',
})

const label = (code) => LABEL[code] ?? code
const labels = (codes) => codes.map(label).join(' ')

// 이 두 줄이 이 화면에서 가장 중요한 문장이다. 「사료를 읽어야 어전회의에서 말할 수
// 있다」는 이 게임의 존재 이유인데, 지금까지 학생은 회의에 가서 ??? 를 보고 나서야
// 알았다. 눈치 빠른 학생은 알아채고, 나머지는 「고장났나」 한다.
export const RULE_LINES = Object.freeze([
  '궁을 걸어 다니며 문서를 줍는 것이 이 게임의 전부입니다.',
  '어전회의에서는 읽은 문서만 말할 수 있습니다.',
  '3D 공간과 시간 제한은 학습용 재구성입니다. 사료·해석·재구성은 각 문서의 표시로 구분합니다.',
])

const CODEX_LINE = '史草(사초) — 지금까지 읽은 문서를 펼친다'

// 순수 함수. coarse 는 isCoarse() 가 낸 답을 그대로 받는다 — 여기서 다시 판정하지 않는다.
export function controlLines({ coarse } = {}) {
  const arrows = labels(HINT_KEYS.move.filter(c => c.startsWith('Arrow')))
  const wasd = labels(HINT_KEYS.move.filter(c => c.startsWith('Key')))

  const device = coarse
    ? [
      '화면을 손가락으로 짚으면 그리로 걷는다',
      `${label(HINT_KEYS.act[0])} 단추 — 사람에게 말을 걸고, 바닥의 문서를 줍는다`,
      `${label(HINT_KEYS.codex[0])} 단추 — ${CODEX_LINE}`,
      `${label(HINT_KEYS.act[0])} · ${label(HINT_KEYS.codex[0])} 단추는 화면 오른쪽 가장자리에 있다`,
    ]
    : [
      `${arrows}  또는  ${wasd} — 걷는다`,
      `${label(HINT_KEYS.run[0])} — 누른 채로 걸으면 달린다`,
      `${label(HINT_KEYS.act[0])} — 사람에게 말을 걸고, 바닥의 문서를 줍는다`,
      `${label(HINT_KEYS.codex[0])} — ${CODEX_LINE}`,
      `${label(HINT_KEYS.pause[0])} — 잠시 멈추고 저장한다`,
      '마우스 오른쪽을 누른 채 끌기 — 둘러보기 · 휠 — 시야 확대와 축소',
    ]

  return [...device, ...RULE_LINES]
}

export const HOWTO_HEADING = '이 렇 게  합 니 다'
export const HOWTO_OK = '알겠습니다'

// 뿌리 클래스 이름은 모듈마다 고유해야 한다(tests/ui/class-namespace.test.js).
// .hint 같은 흔한 이름을 뿌리로 쓰면 다른 모듈의 안쪽 요소가 position:fixed;inset:0 을
// 물려받아 보이지 않는 전면 판이 된다 — 실제로 한 번 당했다.
const CSS = `
.howto{position:fixed;inset:0;z-index:80;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:18px;padding:28px 22px;overflow:auto}
.howto h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:6px;font-weight:400}
.howto .howto-rows{display:flex;flex-direction:column;gap:12px;max-width:560px;width:100%}
.howto .howto-row{font-size:16px;color:#e8e2d4;line-height:1.7}
.howto .howto-rule{border-top:1px solid #2a3035;padding-top:16px;margin-top:4px;
  display:flex;flex-direction:column;gap:8px}
.howto .howto-rule div{font-size:16px;color:#e0a23a;line-height:1.8}
.howto button{margin-top:6px;padding:13px 30px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false

function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// 조작 안내 화면. show() 는 학생이 「알겠습니다」를 누를 때 resolve 하는 약속을 준다.
// coarse 는 열 때마다 다시 본다 — 기기를 돌리거나 블루투스 키보드를 붙이는 일이 있다.
export function createControlsHint(root) {
  let el = null

  function close() {
    if (!el) return
    removeEventListener('keydown', onKey)
    el.remove()
    el = null
  }

  let resolveOpen = null
  const onKey = (e) => {
    // 단추에 초점이 있으면 브라우저가 알아서 누른다 — 여기서 또 누르면 두 번 닫힌다.
    if (e.target?.tagName === 'BUTTON') return
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      e.preventDefault()
      done()
    }
  }

  function done() {
    const resolve = resolveOpen
    resolveOpen = null
    close()
    resolve?.()
  }

  return {
    isOpen: () => el !== null,
    close,
    show() {
      ensureStyle()
      // 이미 떠 있는데 또 열라고 하면, 먼저 것의 약속을 지키고 나서 새로 연다.
      // 그냥 닫으면 그 약속이 영원히 안 지켜진다 — 첫 안내였다면 1막이 안 열린다.
      if (el) done()
      return new Promise((resolve) => {
        resolveOpen = resolve
        el = document.createElement('div')
        el.className = 'howto'

        const h = document.createElement('h2')
        h.textContent = HOWTO_HEADING
        el.appendChild(h)

        const rows = document.createElement('div')
        rows.className = 'howto-rows'
        const lines = controlLines({ coarse: isCoarse() })
        const rules = document.createElement('div')
        rules.className = 'howto-rule'
        for (const line of lines) {
          const d = document.createElement('div')
          d.textContent = line
          if (RULE_LINES.includes(line)) {
            rules.appendChild(d)
          } else {
            d.className = 'howto-row'
            rows.appendChild(d)
          }
        }
        el.appendChild(rows)
        el.appendChild(rules)

        const ok = document.createElement('button')
        ok.textContent = HOWTO_OK
        ok.addEventListener('click', done)
        el.appendChild(ok)

        root.appendChild(el)
        addEventListener('keydown', onKey)
        ok.focus?.()
      })
    },
  }
}
