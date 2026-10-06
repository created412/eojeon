// 사료를 잘못 짚었을 때 — 막의 처음으로 돌아가기 전에 서는 한 장.
//
// 선생님(2026-10-06): 「사료를 잘못짚으면 틀렸다는 문구가 뜨면서 막의 처음으로 돌아가야해.
// 전체를 다시하는게 아니라 그 막의 처음으로 돌아가는것이기 때문에 부담이 적을거 같긴 해.」
//
// 예전에는 잘못 짚는 순간 화면이 통째로 갈려 막의 질문부터 다시 떴다. 학생은 무엇을
// 잘못 짚었는지 모른 채 처음으로 와 있었다. 이제 **먼저 말한다** — 무엇이 답이 아니었는지,
// 어디로 돌아가는지, 무엇은 남는지. 그리고 학생이 눌러야 돌아간다.
//
// ⚠ 이 화면에서는 「틀렸다」고 적는다. 이 게임은 그동안 점수·정답·오답의 말을 피해 왔지만
//   (systems/minigame.js), 사료 물음만은 선생님이 「틀렸다는 문구」를 청했다 — 밑줄·따져 읽기·
//   서계·뜯어 읽기·저울의 확인 물음은 근거가 있는 물음이고, 학생이 그것을 알아야 한다.
//   정답이 없는 자리(고민해서 정하는 자리·저울의 결정·회고)에는 이 화면이 오지 않는다.
//
// 뒤의 화면(사료·문서·저울)은 그대로 둔 채 그 위에 선다 — 돌아가기는 main.js 의
// restartAfterSourceMiss 가 이 Promise 가 풀린 뒤에 한다. 열려 있는 동안 키는 여기서 끝난다
// (E 가 뒤의 사료를 닫거나 Esc 가 멈춤을 열지 않게).
import { installTypeVars } from './type-css.js'

const CSS = `
.missnote{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;
  padding:24px 16px;background:#07090cd9;color:#ece6d6;font-family:var(--face-body,system-ui,sans-serif);
  animation:missnoteIn .32s ease-out}
@keyframes missnoteIn{from{opacity:0}to{opacity:1}}
.missnote .card{width:min(680px,100%);padding:clamp(22px,4vh,38px) clamp(20px,4vw,40px);
  background:linear-gradient(160deg,#1a1512,#120f0d);border:1px solid #8a6a3a;border-top:4px solid #b4452f;border-radius:10px;
  box-shadow:0 24px 80px #000c;display:flex;flex-direction:column;gap:clamp(10px,2vh,18px)}
.missnote h2{margin:0;font-family:var(--face-display,serif);font-weight:400;font-size:clamp(28px,5vh,42px);letter-spacing:.2em;color:#f0c469}
.missnote .reason{margin:0;font-size:clamp(17px,2.6vh,22px);line-height:1.7;color:#fdf6e6;word-break:keep-all;text-wrap:pretty}
.missnote .lead{margin:0;font-size:clamp(14px,2.1vh,17px);line-height:1.7;color:#c9c0ad;word-break:keep-all}
.missnote .go{align-self:flex-end;margin-top:4px;min-height:48px;padding:11px 28px;background:#3a2d20;border:1px solid #8a6a3a;color:#f0c469;
  border-radius:5px;font-family:inherit;font-size:clamp(16px,2.4vh,19px);cursor:pointer}
.missnote .go:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}
@media(prefers-reduced-motion:reduce){.missnote{animation:none}}
`

export const MISS_LINES = {
  title: '틀렸습니다',
  // 돌아가는 곳과 남는 것 — 「전체를 다시 하는 게 아니다」가 이 줄의 요점이다.
  lead: act => `${act}막의 처음으로 돌아갑니다. 앞 막의 기록과 문서는 그대로 남습니다. 이 막에서 받은 문서와 한 일만 다시 합니다.`,
  button: act => `${act}막의 처음으로`,
}

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

const CONFIRM = new Set(['Enter', 'Space', 'KeyE', 'NumpadEnter'])

export function createMissNotice(root) {
  ensureStyle()
  let el = null
  let onKey = null

  function close() {
    if (onKey) { removeEventListener('keydown', onKey, true); onKey = null }
    el?.remove()
    el = null
  }

  return {
    /** act — 돌아갈 막 번호(1부터). reason — 그 물음이 돌려준 「왜 아닌지」 한 줄. */
    open({ act, reason = '' }) {
      close()
      return new Promise(resolve => {
        el = document.createElement('div')
        el.className = 'missnote'
        el.setAttribute('role', 'alertdialog')
        el.setAttribute('aria-modal', 'true')
        const card = document.createElement('div'); card.className = 'card'
        const h = document.createElement('h2'); h.textContent = MISS_LINES.title
        const r = document.createElement('p'); r.className = 'reason'; r.textContent = reason
        const l = document.createElement('p'); l.className = 'lead'; l.textContent = MISS_LINES.lead(act)
        const go = document.createElement('button'); go.type = 'button'; go.className = 'go'; go.textContent = MISS_LINES.button(act)
        card.append(h)
        if (reason) card.append(r)
        card.append(l, go)
        el.append(card)
        root.appendChild(el)
        const finish = () => { close(); resolve() }
        go.addEventListener('click', finish)
        onKey = e => {
          e.stopImmediatePropagation()
          if (CONFIRM.has(e.code)) { e.preventDefault(); finish() }
        }
        addEventListener('keydown', onKey, true)
        go.focus?.({ preventScroll: true })
      })
    },
    isOpen: () => el !== null,
    dispose() { close() },
  }
}
