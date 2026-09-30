// 「아직」 — 손으로 하는 장면을 못 해냈을 때 그 사이에 서는 화면.
//
// 선생님(2026-09-30): 「조여.」 해내지 못하면 처음부터 다시 한다.
//
// 이 화면의 일은 **가로막는 것**이지 나무라는 것이 아니다. 그래서:
//   · 큰 글자는 「아직」 한 마디뿐이다. 붉은 빛도, 가위표도, 숫자도 없다.
//   · 무엇이 모자랐는지를 그 장면의 말로 한 줄 적는다(reason).
//   · 두 번째부터 거드는 말이 는다(systems/minigame.js againView) — 벌이 아니라
//     도움이 쌓이는 쪽이라야 「처음부터 다시」를 견딜 수 있다.
//   · 단추는 하나다. 빠져나갈 길을 주지 않는 것이 「조인다」의 뜻이다.
//
// ⚠ 점수·정답·틀림 같은 낱말을 쓰지 않는다. 이 게임은 시험이 아니다
//   (tests/systems/minigame.test.js 가 그 낱말들을 막는다).
const CSS = `
.again{position:fixed;inset:0;z-index:62;display:flex;align-items:center;justify-content:center;
  padding:24px;background:#07080ae0;font-family:var(--face-body,system-ui,sans-serif)}
.again .sheet{max-width:min(520px,94vw);width:100%;padding:34px 34px 28px;text-align:center;
  background:#15161a;border:1px solid #4a4335;border-radius:4px;
  box-shadow:0 18px 60px #000a;display:flex;flex-direction:column;gap:16px;align-items:center}
.again h2{margin:0;font-family:var(--face-display,serif);font-size:var(--read-display,34px);
  letter-spacing:.3em;color:#e0c489;text-indent:.3em}
.again p{margin:0;font-size:var(--read-body,18px);line-height:var(--read-lh-body,1.78);
  color:#cfc8b8;word-break:keep-all;text-wrap:balance;max-width:var(--read-measure,30em)}
.again p.quiet{font-size:var(--read-small,15px);color:#9a9282}
.again button{margin-top:6px;padding:13px 40px;background:#241d15;border:1px solid #6a5230;
  color:#f0c469;border-radius:3px;font-family:inherit;font-size:var(--read-label,16px);
  letter-spacing:.06em;cursor:pointer}
.again button:hover{background:#3a2d1f;border-color:#c89a52}
.again button:focus-visible{outline:2px solid #f0c469;outline-offset:3px}
@media(max-width:760px){.again .sheet{padding:26px 20px 22px}.again button{width:100%}}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

export function createAgain(root) {
  ensureStyle()
  return {
    /** view — systems/minigame.js 의 againView() 가 낸 { title, lines, label } */
    show(view = {}) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'again'
        const sheet = document.createElement('div')
        sheet.className = 'sheet'

        const h = document.createElement('h2')
        h.textContent = view.title ?? '아직'
        sheet.appendChild(h)

        // 마지막 줄(「처음부터 다시 합니다.」)은 작게 — 그것은 안내이지 까닭이 아니다.
        const lines = view.lines ?? []
        for (const [i, text] of lines.entries()) {
          const p = document.createElement('p')
          if (i === lines.length - 1 && lines.length > 1) p.className = 'quiet'
          p.textContent = text        // 글은 데이터에서 온다 — 마크업을 끼우지 않는다
          sheet.appendChild(p)
        }

        const go = document.createElement('button')
        go.textContent = view.label ?? '다시 한다'
        let done = false
        go.addEventListener('click', () => {
          if (done) return            // 두 번 눌러도 한 번이다
          done = true
          el.remove()
          resolve()
        })
        sheet.appendChild(go)

        el.appendChild(sheet)
        root.appendChild(el)
        go.focus?.()
      })
    },
  }
}
