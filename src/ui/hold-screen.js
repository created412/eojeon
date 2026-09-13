// 조작권 D 장면 — 눌러도 임금이 한 걸음도 못 움직인다(설계서 §7 5막 비트 2·3).
//
// **안 움직이게 만드는 코드는 여기 없다.** 그것은 systems/movement.js 의 step() 이
// 첫 문장 `if (!canMove(state.control)) return state` 로 이미 한다(1단계 보증,
// tests/systems/movement.test.js 가 지킨다). 이 화면이 하는 일은 하나다 —
// **안 움직인다는 것이 고장이 아니라 이 장면의 내용이라는 것을 학생에게 알리는 것.**
//
// ⚠ 이 게임에서 가장 위험한 화면이다. 학생이 「내 태블릿이 고장났나」로 읽으면
//    수업이 그 자리에서 멈춘다. 그래서 NOT_BROKEN 한 줄은 장식이 아니라 이 화면의
//    존재 이유다 — 누르기 전부터 떠 있다. 짐작하게 두지 않는다.
//
// ⚠ 촉박이 아니다. 초 카운터도 실패도 미니맵의 붉은 점도 없다. maxMs 가 지나면
//    한 번도 안 눌러도 나갈 단추가 나온다 — 조작권이 떨어져 방에 영구히 갇히는
//    결함이 예전에 있었다(4막 대원군 재집권). 같은 구멍을 다시 파지 않는다.
//
// ⚠ pointer-events:none 으로 깔아 두어 3D 화면을 가리기만 하고 잡지 않는다. 궁은
//    그대로 보이고 카메라도 그대로 돈다 — 까맣게 덮으면 정말로 고장처럼 보인다.
//    단추만 예외다.
import { isCoarse } from './controls-hint.js'

// 뿌리 클래스 이름은 모듈마다 고유해야 한다(tests/ui/class-namespace.test.js).
// 안쪽 이름도 전부 hold- 로 접두해 남의 뿌리를 빌려 쓰지 않는다.
const CSS = `
.hold{position:fixed;inset:0;z-index:45;display:flex;flex-direction:column;
  align-items:center;justify-content:flex-end;gap:14px;padding:0 26px 64px;text-align:center;
  pointer-events:none;background:linear-gradient(#0f111300 40%,#0f1113cc 78%,#0f1113ee)}
.hold h2{margin:0;font-size:14px;color:#8f8a7c;letter-spacing:6px;font-weight:400}
.hold p{margin:0;font-size:19px;color:#e8e2d4;line-height:1.8;max-width:600px}
.hold p.hold-calm{font-size:15px;color:#e0a23a;letter-spacing:1px}
.hold .hold-keys{display:flex;gap:8px;margin-top:4px}
.hold .hold-keys i{width:40px;height:40px;border:1px solid #3a4248;border-radius:4px;color:#98a2aa;
  font-style:normal;font-size:15px;display:flex;align-items:center;justify-content:center;
  transition:border-color .18s, color .18s, transform .18s}
.hold .hold-keys i.hold-hit{border-color:#d2503a;color:#d2503a;transform:translateY(2px)}
.hold .hold-said{font-size:15px;color:#8f8a7c;letter-spacing:2px;min-height:22px}
.hold .hold-staged{border:1px dashed #6a5230;color:#8f8a7c;font-size:12px;padding:7px 12px;
  border-radius:3px;max-width:520px;line-height:1.6}
.hold .hold-origin{font-size:12px;color:#6b6558;max-width:520px}
.hold button{pointer-events:auto;margin-top:4px;padding:12px 30px;background:#3a2d20;
  border:1px solid #6a5230;color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// ── 화면이 말하는 것 ─────────────────────────────────────────────
// 순수 함수로 빼 둔다. vitest 환경이 node 라 DOM 이 없어서 —
// 화면 안에 박아 두면 이 문장들을 검사할 길이 없다.

// 이 한 줄이 이 화면에서 가장 중요한 문장이다. 「고장」은 학생이 실제로 쓰는 낱말이다.
export const NOT_BROKEN = '고장이 아니다. 화면은 살아 있고, 임금이 움직이지 못하는 것이다.'
// 태블릿에는 자판이 없다. 조작 안내가 「화면을 손가락으로 짚으면 그리로 걷는다」고
// 약속했으므로, 여기서도 짚어 보라고 해야 그 약속이 깨지는 자리에 학생이 설 수 있다.
export const TRY_TAP = '화면을 짚어 보아라.'
export const SAID_FIRST = '움직이지 않는다.'
export const SAID_AGAIN = '여전히 움직이지 않는다.'
export const STAGED_NOTICE = '※ 이 장면은 기록이 남아있지 않아 재구성했습니다'
export const KEYCAPS = Object.freeze(['W', 'A', 'S', 'D'])

export const DEFAULTS = Object.freeze({
  needPresses: 5,   // 이만큼 눌러 보면 「정말 안 되는구나」가 몸으로 온다
  minMs: 3500,      // 연타로 장면을 건너뛰지 못하게 하는 바닥
  maxMs: 12000,     // 한 번도 안 눌러도 여기서는 반드시 열린다 — 갇히지 않는다
})

export function holdKeys(coarse) {
  return coarse ? [] : [...KEYCAPS]
}

export function holdLines(view, { coarse } = {}) {
  return [...(view?.lines ?? []), ...(coarse ? [TRY_TAP] : []), NOT_BROKEN]
}

export function saidLine(presses) {
  return presses <= 1 ? SAID_FIRST : SAID_AGAIN
}

// 나갈 단추를 내줄 때인가. 시각(밀리초)만 본다 — 프레임을 세지 않는다.
// 첫 줄이 이 장면의 안전장치다: 누른 횟수와 무관하게 maxMs 가 지나면 연다.
export function shouldOffer({
  presses = 0,
  elapsedMs = 0,
  needPresses = DEFAULTS.needPresses,
  minMs = DEFAULTS.minMs,
  maxMs = DEFAULTS.maxMs,
} = {}) {
  if (elapsedMs >= maxMs) return true
  return presses >= needPresses && elapsedMs >= minMs
}

// ── 화면 ─────────────────────────────────────────────────────────
// view = { title, lines, needPresses?, minMs?, maxMs?, closing, buttonLabel, origin, grade }
// hooks = { onPress?, onOffer? } — 소리는 여기서 내지 않는다. 무엇이 울릴지는
//   main.js 가 정한다(소리 이름 표는 systems/audio.js 한 곳에만 있다).
export function createHold(root) {
  ensureStyle()

  return {
    open(view, hooks = {}) {
      const coarse = isCoarse()
      const keys = holdKeys(coarse)
      const needPresses = view.needPresses ?? DEFAULTS.needPresses
      const minMs = view.minMs ?? DEFAULTS.minMs
      const maxMs = view.maxMs ?? DEFAULTS.maxMs

      let presses = 0
      let startedAt = null
      let opened = false
      let resolveDone = null
      const promise = new Promise(r => { resolveDone = r })

      const el = document.createElement('div')
      el.className = 'hold'

      const add = (tag, cls, text) => {
        const n = document.createElement(tag)
        if (cls) n.className = cls
        // 글은 textContent 로만 넣는다 — innerHTML 은 이 파일에 한 번도 안 나온다
        if (text != null) n.textContent = text
        el.appendChild(n)
        return n
      }

      add('h2', '', view.title)
      for (const line of holdLines(view, { coarse })) {
        add('p', line === NOT_BROKEN ? 'hold-calm' : '', line)
      }

      const keyRow = add('div', 'hold-keys')
      const keyEls = keys.map(k => {
        const i = document.createElement('i')
        i.textContent = k
        keyRow.appendChild(i)
        return i
      })

      const said = add('div', 'hold-said')
      if (view.grade === 'staged') add('div', 'hold-staged', STAGED_NOTICE)
      if (view.origin) add('div', 'hold-origin', view.origin)

      root.appendChild(el)

      // 누를 때마다 자판 한 칸이 붉게 눌린다. 순서대로 도는 것이지 어느 키를
      // 눌렀는지 맞히는 것이 아니다 — 태블릿에는 자판 자체가 없다.
      function flash() {
        const i = keyEls[(presses - 1) % (keyEls.length || 1)]
        if (!i) return
        i.classList.add('hold-hit')
        setTimeout(() => i.classList.remove('hold-hit'), 180)
      }

      function offerButton() {
        if (opened) return
        opened = true
        said.textContent = view.closing
        const btn = document.createElement('button')
        btn.textContent = view.buttonLabel
        btn.addEventListener('click', () => { el.remove(); resolveDone() })
        el.appendChild(btn)
        btn.focus?.()
        hooks.onOffer?.()
      }

      return {
        promise,
        press() {
          if (opened) return
          presses++
          flash()
          said.textContent = saidLine(presses)
          hooks.onPress?.()
        },
        // 시각만 본다. 첫 tick 의 nowMs 가 이 장면의 0 초다 — 화면이 뜬 시각을
        // 따로 재지 않는다(탭이 숨어 있다 돌아와도 프레임이 도는 순간부터 센다).
        tick(nowMs) {
          if (startedAt === null) startedAt = nowMs
          if (opened) return
          if (shouldOffer({ presses, elapsedMs: nowMs - startedAt, needPresses, minMs, maxMs })) {
            offerButton()
          }
        },
        dispose() { el.remove() },
      }
    },
  }
}
