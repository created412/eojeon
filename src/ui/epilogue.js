// 맺음(화면) — 세 장을 차례로 넘긴다. 셈은 systems/epilogue.js, 글은 data/epilogue.js.
//
//   ① 당신이 지나온 스물한 해   막마다 한 줄. 학생이 고른 것은 「 」 안에 그대로 선다.
//   ② 그 뒤                     교과서와 사전이 적은 그 뒤의 일.
//   ③ 御前 · 끝                 새벽의 빈 어좌. 기댄 기록을 적고, 「끝」을 찍는다.
//
// 선생님(2026-10-06): 「마무리가 게임이 끝난 거 같은 느낌을 주게끔.」
// 그래서 마지막 장은 목록이 아니다 — 그림 한 장과 제목, 그리고 「끝」이다. 목록(나의 기록)은 그다음이다.
//
// ⚠ 줄은 하나씩 떠오르지만 시계로 넘기지 않는다. 넘기는 것은 학생의 손이다(단추).
// ⚠ 움직임을 줄이라는 설정이면 한 번에 선다.
import { installTypeVars } from './type-css.js'
import { SCENE_ART } from './scene-art-data.js'
import { actSpan, nativeCount } from './act-end.js'
import { epilogueRecap, nextPage } from '../systems/epilogue.js'

const CSS = `
.epilogue,.epilogue *{box-sizing:border-box}
.epilogue{position:fixed;inset:0;z-index:59;overflow-y:auto;color:#ece6d6;font-family:var(--face-body,system-ui,sans-serif);
  background:#0b0d10 center/cover no-repeat;display:flex;justify-content:center}
.epilogue.close::before{content:'';position:fixed;inset:0;pointer-events:none;
  background:linear-gradient(90deg,#07090cf2 0%,#07090cd9 38%,#07090c66 70%,#07090c40 100%)}
.epilogue .wrap{position:relative;width:100%;max-width:980px;min-height:100%;display:flex;flex-direction:column;justify-content:safe center;
  gap:clamp(9px,1.8vh,18px);padding:clamp(14px,3.4vh,44px) clamp(16px,3vw,36px)}
.epilogue.close .wrap{max-width:1180px;align-items:flex-start}
.epilogue .wrap>*{flex:0 0 auto}
.epilogue h2{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.3em;font-size:clamp(24px,4.6vh,40px);color:#f0c469}
.epilogue .lead{margin:0;font-size:clamp(14px,2.2vh,17px);color:#b9b2a0}
.epilogue .rows{display:flex;flex-direction:column;gap:clamp(7px,1.5vh,14px);margin:clamp(2px,1vh,10px) 0}
.epilogue .row{display:grid;grid-template-columns:clamp(86px,13vw,132px) 1fr;gap:clamp(10px,1.6vw,20px);align-items:baseline;
  opacity:0;transform:translateY(8px);animation:ep-in .7s ease-out forwards}
.epilogue .row .yr{font-family:var(--face-display,serif);font-size:clamp(15px,2.5vh,20px);color:#e8b45c;letter-spacing:.04em;text-align:right;white-space:nowrap}
.epilogue .row p{margin:0;font-size:clamp(15px,2.45vh,19.5px);line-height:1.7;color:#fdf6e6;word-break:keep-all}
.epilogue .row.yours p{border-left:3px solid #c9a25a;padding-left:12px}
@keyframes ep-in{to{opacity:1;transform:none}}
.epilogue .quiet{margin:0;font-size:clamp(12px,1.85vh,14px);line-height:1.6;color:#8f9aa3;word-break:keep-all;opacity:0;animation:ep-in .7s ease-out forwards}
.epilogue button{align-self:flex-start;padding:clamp(10px,1.8vh,14px) 32px;background:#3a2d20;border:1px solid #6a5230;color:#f0c469;border-radius:3px;
  font-family:inherit;font-size:clamp(15px,2.3vh,17.5px);cursor:pointer;opacity:0;animation:ep-in .7s ease-out forwards}
.epilogue button:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}

/* 마지막 장 */
.epilogue.close h2{font-size:clamp(52px,13vh,120px);letter-spacing:.18em;color:#f3d089;line-height:1.05;text-shadow:0 4px 30px #000a;
  opacity:0;animation:ep-in 1.6s ease-out .3s forwards}
.epilogue .reading{margin:0;font-size:clamp(13px,2vh,16px);letter-spacing:.3em;color:#b9b2a0;opacity:0;animation:ep-in 1s ease-out 1.2s forwards}
.epilogue .last{display:flex;flex-direction:column;gap:clamp(4px,1vh,9px);margin-top:clamp(6px,2vh,20px);max-width:min(100%,560px)}
.epilogue .last p{margin:0;font-family:var(--face-display,serif);font-size:clamp(16px,2.8vh,23px);line-height:1.7;color:#fdf6e6;word-break:keep-all;
  opacity:0;transform:translateY(8px);animation:ep-in .9s ease-out forwards}
.epilogue .fin{margin:clamp(8px,2.4vh,26px) 0 0;font-family:var(--face-display,serif);font-size:clamp(26px,5vh,44px);letter-spacing:.5em;color:#f0c469;
  opacity:0;animation:ep-in 1.4s ease-out forwards}
.epilogue .credits{display:flex;flex-direction:column;gap:2px;margin-top:clamp(4px,1.4vh,14px)}
.epilogue .credits span{font-size:clamp(11px,1.65vh,13px);line-height:1.55;color:#9aa3ad;word-break:keep-all;opacity:0;animation:ep-in .8s ease-out forwards}
.epilogue .artnote{position:fixed;right:12px;bottom:8px;font-size:11px;color:#cfd5dc99}
@media(max-width:640px){.epilogue .row{grid-template-columns:1fr;gap:1px}.epilogue .row .yr{text-align:left}}
@media(prefers-reduced-motion:reduce){
  .epilogue .row,.epilogue .quiet,.epilogue button,.epilogue.close h2,.epilogue .reading,.epilogue .last p,.epilogue .fin,.epilogue .credits span{animation:none;opacity:1;transform:none}
}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const spaced = s => [...String(s)].join(' ')
const delay = s => `style="animation-delay:${s.toFixed(2)}s"`

// 「스 물 한  해」 — 햇수는 ACTS 에서 센다.
export function recapTitle(data, span = actSpan()) {
  return `${spaced(nativeCount(span.span))}  ${data.recap.titleTail}`
}

export function recapHtml(data, rows) {
  const step = .55
  return `<div class="wrap">
    <h2>${esc(recapTitle(data))}</h2>
    <p class="lead">${esc(data.recap.lead)}</p>
    <div class="rows">${rows.map((r, i) => `<div class="row${r.yours ? ' yours' : ''}" ${delay(.4 + i * step)}><span class="yr">${esc(r.year)}</span><p>${esc(r.text)}</p></div>`).join('')}</div>
    ${rows.some(r => r.yours) ? `<p class="quiet" ${delay(.4 + rows.length * step)}>${esc(data.recap.yoursNote)}</p>` : ''}
    <button type="button" class="next" ${delay(.7 + rows.length * step)}>${esc(data.recap.button)}</button>
  </div>`
}

export function afterHtml(data) {
  const a = data.after, step = .5
  return `<div class="wrap">
    <h2>${esc(a.title)}</h2>
    <div class="rows">${a.rows.map((r, i) => `<div class="row" ${delay(.3 + i * step)}><span class="yr">${esc(r.year)}</span><p>${esc(r.text)}</p></div>`).join('')}</div>
    <p class="quiet" ${delay(.3 + a.rows.length * step)}>${esc(a.origin)}</p>
    <button type="button" class="next" ${delay(.6 + a.rows.length * step)}>${esc(a.button)}</button>
  </div>`
}

export function closeHtml(data) {
  const c = data.close
  const art = SCENE_ART[c.art]
  const t0 = 2
  return `<div class="wrap">
    <h2>${esc(c.title)}</h2>
    <p class="reading">${esc(c.reading)}</p>
    <div class="last">${c.lines.map((l, i) => `<p ${delay(t0 + i * 1.1)}>${esc(l)}</p>`).join('')}</div>
    <p class="fin" ${delay(t0 + c.lines.length * 1.1 + .4)}>${esc(c.end)}</p>
    <div class="credits">${c.credits.map((l, i) => `<span ${delay(t0 + c.lines.length * 1.1 + 1.4 + i * .25)}>${esc(l)}</span>`).join('')}</div>
    <button type="button" class="next" ${delay(t0 + c.lines.length * 1.1 + 2.2 + c.credits.length * .25)}>${esc(c.button)}</button>
    ${art ? `<small class="artnote">${esc(art.caption)}</small>` : ''}
  </div>`
}

export function createEpilogue(root) {
  ensureStyle()
  return {
    /** 세 장을 넘기고 나면 풀린다. onPage(page) 는 장이 설 때마다 불린다(소리를 얹는 자리). */
    open(data, state, { onPage = null } = {}) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'epilogue'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        root.appendChild(el)
        const rows = epilogueRecap(state)

        function show(page) {
          el.className = `epilogue ${page}`
          el.style.backgroundImage = ''
          if (page === 'recap') el.innerHTML = recapHtml(data, rows)
          else if (page === 'after') el.innerHTML = afterHtml(data)
          else {
            const art = SCENE_ART[data.close.art]
            if (art) el.style.backgroundImage = `url("${art.src}")`
            el.innerHTML = closeHtml(data)
          }
          el.scrollTo?.({ top: 0 })
          onPage?.(page)
          const next = el.querySelector('.next')
          next.addEventListener('click', () => {
            const to = nextPage(page)
            if (to) { show(to); return }
            el.remove()
            resolve()
          })
          next.focus?.({ preventScroll: true })
        }
        show('recap')
      })
    },
  }
}
