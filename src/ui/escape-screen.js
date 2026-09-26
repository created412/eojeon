import { installTypeVars } from './type-css.js'
const CSS = `
.escape{position:fixed;inset:0;z-index:56;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:26px;text-align:center;overflow:auto}
.escape h2{margin:0;font-size:var(--read-lead,15px);color:#c9c1ad;letter-spacing:.34em;font-weight:400;
  font-family:var(--face-display,serif)}
.escape p{margin:0;font-size:var(--read-body,18px);color:var(--paper-strong,#e8e2d4);
  line-height:var(--read-lh-body,1.8);max-width:min(100%,var(--read-measure,600px));word-break:keep-all;text-wrap:balance}
.escape .q{font-size:var(--read-lead,20px);color:var(--paper-strong,#e8e2d4);letter-spacing:normal}
.escape .list{display:flex;flex-direction:column;gap:10px;width:100%;max-width:min(100%,620px)}
.escape button.opt{padding:15px 18px;text-align:left;background:#23282c;color:var(--paper-strong,#e8e2d4);
  border:1px solid #3a4248;border-radius:3px;font-size:var(--read-small,15px);
  line-height:var(--read-lh-small,1.6);word-break:keep-all;cursor:pointer}
.escape button.opt:hover{background:#2f363c;border-color:#5a646c}
.escape button.opt small{display:block;margin-top:6px;color:var(--paper-quiet,#8f8a7c);font-size:var(--read-caption,12px)}
.escape .step{font-size:var(--read-small,12px);color:var(--paper-quiet,#8f8a7c);letter-spacing:.16em}
.escape .fact{max-width:min(100%,660px);background:#e8e2d4;color:var(--ink-strong,#23201a);border-radius:4px;
  padding:22px 24px;line-height:var(--read-lh-body,1.8);font-size:var(--read-body,16px);text-align:left;word-break:keep-all}
.escape .fact .you{color:var(--ink-quiet,#6b6558);font-size:var(--read-small,13px);margin-bottom:12px}
.escape .fact .origin{font-size:var(--read-small,13px);color:var(--ink-quiet,#5e5849);margin-top:10px}
.escape .fact .second{margin-top:16px;border-top:1px solid #cfc7b4;padding-top:14px;font-size:var(--read-small,15px)}
.escape .staged{max-width:min(100%,660px);border:1px dashed #8a6a44;border-radius:4px;padding:18px 20px;
  text-align:left;color:#cdc6b5;font-size:var(--read-small,15px);line-height:var(--read-lh-body,1.8);
  background:#191b1e;word-break:keep-all}
.escape .staged .tag{display:block;color:#e0674c;font-size:var(--read-caption,12px);letter-spacing:.14em;margin-bottom:8px}
.escape .staged .origin{font-size:var(--read-caption,12px);color:var(--paper-quiet,#8f8a7c);margin-top:10px}
.escape button.go{padding:13px 32px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:var(--read-label,15px);cursor:pointer}
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

// 왕비를 내보내는 장면(설계서 §5.C2). 촉박은 이미 끝났다 — 여기에 시계는 없다.
//
// 이 화면의 어려운 부분은 고르기가 아니라 등급이다. 궁녀 변장과 장호원 피신은 2차문헌이고,
// 널리 전하는 한 마디("내 누이동생 홍 상궁")는 1차 출처를 찾지 못했다(판정 R13 · 검증 B 4항).
// 그래서 사실 블록과 재구성 블록을 나란히 두되 눈으로 구별되게 만든다. 하나가 다른 하나를
// 대신하지 않는다 — 뭉뚱그리면 실재하는 기록마저 지어낸 것처럼 읽힌다.
export function createEscape(root) {
  ensureStyle()

  return {
    open(view) {
      return new Promise(resolve => {
        const picked = {}
        const el = document.createElement('div')
        el.className = 'escape'
        root.appendChild(el)

        function step(i) {
          const s = view.steps[i]
          el.innerHTML = `
            <h2>${view.title}</h2>
            <div class="step">${i + 1} / ${view.steps.length}</div>
            ${i === 0 ? view.lines.map(l => `<p>${l}</p>`).join('') : ''}
            <p class="q">${s.question}</p>
            <div class="list">${s.options.map(o => `
              <button class="opt" data-id="${o.id}">${o.text}
                ${o.note ? `<small>${o.note}</small>` : ''}</button>`).join('')}</div>`
          el.querySelectorAll('button.opt').forEach(btn => {
            btn.addEventListener('click', () => {
              picked[s.id] = btn.dataset.id
              if (i + 1 < view.steps.length) step(i + 1)
              else after()
            })
          })
        }

        function after() {
          const chosen = view.steps
            .map(s => s.options.find(o => o.id === picked[s.id])?.text)
            .filter(Boolean)
            .join(' · ')
          el.innerHTML = `
            <h2>${view.title}</h2>
            <div class="fact">
              <div class="you">당신은 ─ ${chosen}</div>
              <div>실제로는 ─ ${view.actual.line}</div>
              <div class="origin">${view.actual.origin}</div>
              <div class="second">${view.secondary.line}
                <div class="origin">${view.secondary.origin}</div></div>
            </div>
            <div class="staged">
              <span class="tag">※ 이 대목은 기록이 남아있지 않아 재구성했습니다</span>
              ${view.staged.line}
              <div class="origin">${view.staged.origin}</div>
            </div>
            ${view.closing.map(l => `<p>${l}</p>`).join('')}
            <button class="go">문을 닫는다</button>`
          el.querySelector('.go').addEventListener('click', () => { el.remove(); resolve(picked) })
        }

        step(0)
      })
    },
  }
}
