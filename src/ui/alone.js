// 혼자 서 있는 몇 초 — 글 화면이 아니다.
//
// 선생님(2026-09-26) 스토리 개편안 C: 「3막에서 임금이 아버지를 물러나게 한다.
// **그 직후 화면을 비워 둔다** — 곁에 아무도 없이 혼자 어전에 서는 몇 초.
// (지금은 글로만 말한다)」
//
// 그래서 이 화면은 **화면을 덮지 않는다.** 궁은 그대로 보이고, 그 안에 임금 혼자
// 서 있고, 아래쪽에 한 줄씩 천천히 떠오를 뿐이다. 이 게임에서 글 화면(note-screen)은
// 한지를 펴서 읽는 자리이고, 여기는 읽는 자리가 아니라 **서 있는 자리**다.
//
// 넘기는 단추는 마지막 줄이 다 뜬 뒤에야 나온다. 서둘러 넘길 수 없게 하려는 것이
// 아니라, 다 뜨기 전에는 넘길 것이 없기 때문이다.
//
// ⚠ 시계가 아니다. 촉박(rush)과 헷갈리지 않게 숫자도 막대도 두지 않는다.
// ⚠ prefers-reduced-motion 에서는 줄이 떠오르지 않고 한 번에 선다 — 기다림은 남는다.
const CSS = `
.alone{position:fixed;inset:0;z-index:54;display:flex;flex-direction:column;
  align-items:center;justify-content:flex-end;gap:18px;padding:0 24px 8vh;
  pointer-events:none;background:linear-gradient(transparent 46%,#0b0f12cc 86%,#0b0f12ee)}
.alone .line{max-width:var(--read-measure,34em);width:100%;text-align:center;
  font-family:var(--face-body,system-ui,sans-serif);font-size:var(--read-lead,21px);
  line-height:var(--read-lh-body,1.8);color:#efe9da;text-shadow:0 2px 10px #000a,0 0 22px #0008;
  word-break:keep-all;opacity:0;transform:translateY(10px);
  transition:opacity 1.5s ease,transform 1.5s ease}
.alone .line.on{opacity:1;transform:none}
.alone .go{pointer-events:auto;margin-top:10px;padding:13px 32px;background:#241a12e6;
  border:1px solid #6a5230;color:#e0a23a;border-radius:3px;
  font-size:var(--read-label,15px);cursor:pointer;opacity:0;transition:opacity .9s ease}
.alone .go.on{opacity:1}
@media(prefers-reduced-motion:reduce){
  .alone .line,.alone .go{transition:none}
}
@media(max-width:760px){.alone{padding-bottom:12vh}}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// 줄이 떠오르는 차례 — 몇 번째 줄이 언제 뜨는가(ms). 순수 함수라 시험이 시계 없이 본다.
export const LINE_GAP_MS = 2600
export const FIRST_DELAY_MS = 1400
export function lineTimes(count, gap = LINE_GAP_MS, first = FIRST_DELAY_MS) {
  return Array.from({ length: count }, (_, i) => first + i * gap)
}
export function totalMs(count, gap = LINE_GAP_MS, first = FIRST_DELAY_MS) {
  return count === 0 ? first : first + (count - 1) * gap + gap
}

export function createAlone(root) {
  ensureStyle()
  return {
    /**
     * view — { lines: string[], label?: string }
     * 약속은 마지막 줄까지 뜨고 학생이 단추를 누르면 한 번 풀린다.
     */
    show(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'alone'
        const lines = (view.lines ?? []).map(text => {
          const p = document.createElement('p')
          p.className = 'line'
          p.textContent = text          // 글은 데이터에서 온다 — 마크업을 끼우지 않는다
          el.appendChild(p)
          return p
        })
        const go = document.createElement('button')
        go.className = 'go'
        go.textContent = view.label ?? '걸음을 옮긴다'
        el.appendChild(go)
        root.appendChild(el)

        const timers = []
        let done = false
        const finish = () => {
          if (done) return
          done = true
          for (const t of timers) clearTimeout(t)
          el.remove()
          resolve()
        }
        go.addEventListener('click', finish)

        const times = lineTimes(lines.length)
        for (const [i, at] of times.entries()) {
          timers.push(setTimeout(() => lines[i].classList.add('on'), at))
        }
        timers.push(setTimeout(() => { go.classList.add('on'); go.focus?.() },
          totalMs(lines.length)))
      })
    },
  }
}
