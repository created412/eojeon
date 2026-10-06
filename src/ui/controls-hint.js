import { HOWTO_ART } from './howto-data.js'

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

// ── 줄 조각 ───────────────────────────────────────────────────────────────
// 한 줄 한 줄을 여기서 한 번만 만든다. 아래 두 가지가 이것을 나눠 쓴다 —
// controlLines() 는 예전처럼 한 벌의 목록으로, howtoSteps() 는 그림과 짝지은 걸음으로.
// 같은 문장을 두 군데 적어 두면 한쪽만 고쳐지는 날이 온다.
const piece = {
  walk: (coarse) => coarse
    ? '화면을 손가락으로 짚으면 그리로 걷는다'
    : `${labels(HINT_KEYS.move.filter(c => c.startsWith('Arrow')))}  또는  `
      + `${labels(HINT_KEYS.move.filter(c => c.startsWith('Key')))} — 걷는다`,
  run: () => `${label(HINT_KEYS.run[0])} — 누른 채로 걸으면 달린다`,
  act: (coarse) => `${label(HINT_KEYS.act[0])}${coarse ? ' 단추' : ''} — 사람에게 말을 걸고, 바닥의 문서를 줍는다`,
  codex: (coarse) => `${label(HINT_KEYS.codex[0])}${coarse ? ' 단추' : ''} — ${CODEX_LINE}`,
  pause: () => `${label(HINT_KEYS.pause[0])} — 잠시 멈추고 저장한다`,
  look: () => '마우스 오른쪽을 누른 채 끌기 — 둘러보기 · 휠 — 시야 확대와 축소',
  where: () => `${label(HINT_KEYS.act[0])} · ${label(HINT_KEYS.codex[0])} 단추는 화면 오른쪽 가장자리에 있다`,
}

// 순수 함수. coarse 는 isCoarse() 가 낸 답을 그대로 받는다 — 여기서 다시 판정하지 않는다.
export function controlLines({ coarse } = {}) {
  const device = coarse
    ? [piece.walk(true), piece.act(true), piece.codex(true), piece.where()]
    : [piece.walk(false), piece.run(), piece.act(false), piece.codex(false), piece.pause(), piece.look()]
  return [...device, ...RULE_LINES]
}

// ── 걸음 ──────────────────────────────────────────────────────────────────
// 2026-09-29 선생님: 「이 게임 설명서가 전혀 친절하지 않아. 하나하나 그림을 보며
// 설명하듯 … 순서대로 하나씩 설명하듯이 알려줘. 설명을 길게하라는게 아니라 직관적인
// 그림들로 만들라고.」
//
// 그전까지 이 화면은 아홉 줄을 한꺼번에 쏟았다. 조작을 모르는 학생이 아홉 줄을 읽고
// 시작할 리 없다 — 읽을 것이 많을수록 아무도 안 읽는다. 그래서 **한 걸음에 그림 한 장,
// 글 한두 줄**로 끊는다. 글을 늘리지 않는 것이 요점이라 문장은 위의 조각 그대로다.
//
// 걸음의 차례는 실제로 하는 차례다: 걷고 → 줍고 → 펼쳐 보고 → 말하고 → 멈춘다.
// art 는 ui/howto-data.js 의 열쇠다. 그림이 없으면 그 걸음은 글만 뜬다.
export function howtoSteps({ coarse } = {}) {
  return [
    { art: 'stepYard', title: '걷는다', lines: coarse ? [piece.walk(true)] : [piece.walk(false), piece.run()] },
    { art: 'stepScroll', title: '줍는다', lines: coarse ? [piece.act(true), piece.where()] : [piece.act(false)] },
    { art: 'stepChest', title: '펼친다', lines: [piece.codex(coarse)] },
    // 이 게임의 존재 이유다. 여기만은 조작이 아니라 규칙을 적는다 — rule 이 그 표시다.
    { art: 'stepCourt', title: '말한다', rule: true, lines: [RULE_LINES[1], RULE_LINES[0]] },
    { art: 'stepLamp', title: '멈춘다', lines: coarse ? ['멈춤 단추로 잠시 멈추고 저장한다'] : [piece.pause(), piece.look()] },
  ]
}

export const HOWTO_HEADING = '이 렇 게  합 니 다'
export const HOWTO_OK = '알겠습니다'

// 뿌리 클래스 이름은 모듈마다 고유해야 한다(tests/ui/class-namespace.test.js).
// .hint 같은 흔한 이름을 뿌리로 쓰면 다른 모듈의 안쪽 요소가 position:fixed;inset:0 을
// 물려받아 보이지 않는 전면 판이 된다 — 실제로 한 번 당했다.
const CSS = `
.howto{position:fixed;inset:0;z-index:80;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:22px 20px;overflow:auto;
  font-family:var(--face-body,system-ui,'Malgun Gothic',sans-serif)}
.howto h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:6px;font-weight:400}
/* 한 걸음 = 그림 한 장 + 글 한두 줄. 판 크기를 그림에 맞춰 고정해 두어야 걸음을 넘길 때
   화면이 덜컹거리지 않는다 — 덜컹거리면 학생의 눈이 매번 글을 다시 찾는다. */
.howto .howto-step{width:min(560px,92vw);display:flex;flex-direction:column;gap:12px}
.howto .howto-art{margin:0;border:1px solid #2a3035;border-radius:4px;overflow:hidden;background:#141719}
.howto .howto-art img{display:block;width:100%;aspect-ratio:3/2;object-fit:cover}
.howto .howto-title{font-size:var(--read-title,22px);color:#f0ebdd;letter-spacing:.1em;
  font-weight:400;text-align:center}
.howto .howto-row{font-size:var(--read-body,16px);color:#e8e2d4;line-height:1.7;
  text-align:center;word-break:keep-all;text-wrap:pretty}
/* 「어전회의에서는 읽은 문서만」 걸음만 금빛이다 — 조작이 아니라 규칙이기 때문이다. */
.howto .howto-step.rule .howto-row{color:#e0a23a}
/* 몇 걸음 중 몇째인가. 점을 세는 것만으로 「곧 끝난다」가 보인다. */
.howto .howto-dots{display:flex;gap:7px;justify-content:center}
.howto .howto-dots i{width:7px;height:7px;border-radius:50%;background:#2a3035;transition:background .2s}
.howto .howto-dots i.on{background:#e0a23a}
.howto .howto-nav{display:flex;gap:10px;align-items:center;justify-content:center}
.howto button{padding:12px 26px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer;font-family:inherit}
.howto button:disabled{opacity:.35;cursor:default}
.howto .howto-back{background:none;border-color:#3a4248;color:#8f8a7c;padding:12px 18px}
/* 건너뛰기 — 이미 아는 학생을 다섯 걸음 붙잡아 두지 않는다. 조용히 둔다. */
.howto .howto-skip{background:none;border:0;border-bottom:1px solid #3a4248;color:#6f6a5e;
  font-size:13px;padding:3px 2px;border-radius:0;font-family:inherit}
.howto .howto-note{font-size:var(--read-caption,12.5px);color:#6f6a5e;line-height:1.6;
  max-width:min(560px,92vw);text-align:center;word-break:keep-all}
.howto .howto-title{font-family:inherit;font-size:28px;font-weight:600;letter-spacing:0}
.howto .howto-row{font-size:21px;line-height:1.6}
.howto .howto-note{color:#b8b4a7;font-size:14px}
.howto .howto-nav button{min-height:48px;font-size:18px;border-radius:6px}
.howto .howto-skip{color:#bbb3a0}
.howto .howto-progress{color:#cbbd9e;font-size:15px;font-variant-numeric:tabular-nums}
/* 가로로 누운 손전화 — 그림과 글을 옆으로 벌린다. 위아래로 쌓으면 단추가 창 밖으로 나간다
   (옛 셈판에서 겪은 그 일). 재 보고 정한 값이다. */
@media(max-height:560px){
  .howto{gap:9px;padding:10px 14px}
  .howto h2{display:none}
  .howto .howto-step{width:min(860px,96vw);display:grid;grid-template-columns:1fr 1fr;
    gap:14px;align-items:center}
  .howto .howto-art{grid-row:span 2}
  .howto .howto-art img{aspect-ratio:3/1.9}
  .howto .howto-title{font-size:24px;text-align:center}
  .howto .howto-row{font-size:18px;text-align:center;line-height:1.6}
  .howto .howto-note{font-size:11.5px}
}
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
    nextBtn = null
    el.remove()
    el = null
  }

  let resolveOpen = null
  // 지금 판의 「다음」 단추. Enter·Space 가 여기로 들어온다.
  let nextBtn = null
  const onKey = (e) => {
    // 단추에 초점이 있으면 브라우저가 알아서 누른다 — 여기서 또 누르면 두 번 눌린다.
    if (e.target?.tagName === 'BUTTON') return
    if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
      e.preventDefault()
      // 걸음이 여럿이 되었으므로 Enter 는 **다음 걸음**이다. 예전처럼 곧장 닫으면
      // 초점을 잃은 학생이 Enter 한 번에 설명서를 통째로 건너뛴다.
      if (nextBtn) nextBtn.click(); else done()
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

        const steps = howtoSteps({ coarse: isCoarse() })
        let at = 0

        const step = document.createElement('div')
        step.className = 'howto-step'
        const fig = document.createElement('figure'); fig.className = 'howto-art'
        const img = document.createElement('img')
        fig.appendChild(img)
        const title = document.createElement('div'); title.className = 'howto-title'
        const body = document.createElement('div')
        step.append(fig, title, body)

        const dots = document.createElement('div'); dots.className = 'howto-dots'
        for (const _ of steps) dots.appendChild(document.createElement('i'))
        const progress = document.createElement('div'); progress.className = 'howto-progress'

        const nav = document.createElement('div'); nav.className = 'howto-nav'
        const back = document.createElement('button'); back.className = 'howto-back'; back.textContent = '← 이전'
        const next = document.createElement('button')
        nav.append(back, next)

        const skip = document.createElement('button')
        skip.className = 'howto-skip'
        skip.textContent = '이미 압니다 — 건너뛰기'
        skip.addEventListener('click', done)

        // 재구성 고지는 걸음마다 그대로 둔다. 화면이 바뀐다고 사라져도 되는 말이 아니다.
        const note = document.createElement('div')
        note.className = 'howto-note'
        note.textContent = RULE_LINES[2]

        function paint() {
          const s = steps[at]
          progress.textContent = `${at + 1} / ${steps.length}`
          const art = HOWTO_ART[s.art]
          // 그림이 안 실린 빌드에서는 그림 자리만 접는다 — 글과 단추는 그대로다.
          fig.style.display = art ? '' : 'none'
          if (art) { img.src = art.src; img.alt = art.alt }
          title.textContent = s.title
          body.replaceChildren(...s.lines.map(l => {
            const d = document.createElement('div'); d.className = 'howto-row'; d.textContent = l; return d
          }))
          step.classList.toggle('rule', !!s.rule)
          dots.childNodes.forEach((d, i) => d.classList.toggle('on', i === at))
          back.disabled = at === 0
          const last = at === steps.length - 1
          next.textContent = last ? HOWTO_OK : '다음 →'
          skip.style.display = last ? 'none' : ''
        }

        back.addEventListener('click', () => { if (at > 0) { at--; paint() } })
        next.addEventListener('click', () => {
          if (at < steps.length - 1) { at++; paint(); next.focus?.() } else done()
        })

        nextBtn = next
        el.append(step, dots, progress, nav, skip, note)
        paint()

        root.appendChild(el)
        addEventListener('keydown', onKey)
        next.focus?.()
      })
    },
  }
}
