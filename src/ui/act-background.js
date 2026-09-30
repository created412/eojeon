// 막을 열기 전 배경지식 — 사진과 글로 읽는 한 판.
//
// 선생님(2026-09-30): 「1막의 역사적 내용을 영상이나 그림 등으로 배경지식을
// 설명해 주면 좋을 것 같아.」
//
// 영상이 아니라 사진인 까닭을 적어 둔다. 이 게임은 한 파일로 나가고(13MB 한도,
// 남은 여유 1.4MB) 바깥으로 아무 요청도 하지 않는다 — 학교 망에서 외부가 막혀도
// 돌아야 하기 때문이다. 짧은 영상 하나도 그 두 조건을 한꺼번에 깬다.
// 대신 **이미 게임 안에 있는 실제 사진**을 쓴다(data/act-background.js 머리말).
//
// ⚠ 사진마다 relation 을 반드시 적는다. 고종의 사진은 즉위 때가 아니고, 근정전
//   사진은 중건 직후가 아니다. 배경지식을 가르치는 자리에서 그 구분이 무너지면
//   이 게임이 줄곧 지켜 온 것이 가장 중요한 자리에서 무너진다.
import { installTypeVars } from './type-css.js'
import { HISTORICAL_MEDIA } from './historical-media-data.js'

const CSS = `
.actbg,.actbg *{box-sizing:border-box}
.actbg{position:fixed;inset:0;z-index:58;overflow:auto;background:#efe7d2;
  color:var(--ink-strong,#23201a);font-family:var(--face-body,system-ui,sans-serif);
  background-image:var(--hanji);background-size:cover;background-position:center}
.actbg .wrap{max-width:1000px;margin:0 auto;padding:40px 28px 56px;
  display:flex;flex-direction:column;gap:20px}
.actbg .date{font-size:var(--read-small,13px);color:var(--ink-quiet,#6b5a3e)}
.actbg h2{margin:0;font-family:var(--face-display,serif);letter-spacing:.14em;
  font-size:var(--read-display,30px);line-height:1.4;color:#4f3d21;font-weight:400}
.actbg .lead{margin:0;font-size:var(--read-lead,18px);line-height:var(--read-lh-body,1.8);
  color:var(--ink-strong,#23201a);word-break:keep-all;max-width:var(--read-measure,34em)}

/* 한 대목 = 사진 한 장 + 글 두어 줄. 좁아지면 사진이 위로 올라간다. */
.actbg .panel{display:grid;grid-template-columns:260px 1fr;gap:20px;align-items:start;
  padding:18px 0;border-top:1px solid #8a6a4433}
.actbg .panel:first-of-type{border-top:none}
.actbg figure{margin:0}
.actbg figure img{display:block;width:100%;border:1px solid #8a6a4455;border-radius:2px;
  background:#dfd5bb}
.actbg figcaption{margin-top:6px;font-size:var(--read-caption,12px);
  line-height:var(--read-lh-small,1.6);color:var(--ink-quiet,#6b5a3e);word-break:keep-all}
.actbg h3{margin:0 0 8px;font-family:var(--face-display,serif);font-size:var(--read-title,21px);
  color:#4f3d21;font-weight:400;letter-spacing:.04em}
/* 한 줄이 너무 길면 눈이 다음 줄 첫머리를 놓친다 — 읽는 폭을 묶어 둔다
   (ui/type-css.js 의 --read-measure 는 이 게임 전체가 쓰는 그 값이다). */
.actbg .panel p{margin:0 0 8px;font-size:var(--read-body,16.5px);
  line-height:var(--read-lh-body,1.85);word-break:keep-all;
  max-width:var(--read-measure,34em)}

/* 교과서에 실린 사료는 카드와 같은 결로 — 인용 줄을 세우고 글꼴을 바꾼다. */
.actbg blockquote{margin:12px 0 0;padding:8px 0 8px 16px;border-left:4px solid #8a6a44;
  max-width:var(--read-measure,34em);
  font-family:var(--face-display,serif);font-size:var(--read-lead,17px);
  line-height:var(--read-lh-body,1.9);color:var(--ink-strong,#23201a);word-break:keep-all}
.actbg blockquote cite{display:block;margin-top:6px;font-family:var(--face-body,sans-serif);
  font-style:normal;font-size:var(--read-small,13px);color:var(--ink-quiet,#6b5a3e)}

.actbg .years{display:flex;flex-wrap:wrap;gap:0;border:1px solid #8a6a4455;border-radius:2px;
  overflow:hidden;background:#00000008}
.actbg .years div{flex:1 1 140px;padding:10px 14px;border-left:1px solid #8a6a4433}
.actbg .years div:first-child{border-left:none}
.actbg .years b{display:block;font-family:var(--face-display,serif);font-size:var(--read-lead,18px);
  color:#8a3b22;font-weight:400}
.actbg .years span{font-size:var(--read-small,13px);color:var(--ink-quiet,#5e4a2c)}

.actbg .ahead{margin:0;padding:14px 16px;background:#8a6a4412;border:1px solid #8a6a4433;
  border-radius:2px;font-size:var(--read-body,16px);line-height:var(--read-lh-body,1.8);
  word-break:keep-all}
.actbg .origin{font-size:var(--read-small,12px);color:var(--ink-quiet,#6b5a3e)}
.actbg .go{align-self:center;padding:14px 40px;background:#3a2d20;border:1px solid #6a5230;
  color:#f0c469;border-radius:3px;font-family:inherit;font-size:var(--read-label,16px);
  letter-spacing:.08em;cursor:pointer}
.actbg .go:hover{background:#4a3a2a}
.actbg .go:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}

@media(max-width:760px){
  .actbg .wrap{padding:24px 16px 40px;gap:16px}
  .actbg .panel{grid-template-columns:1fr;gap:12px}
  .actbg figure{max-width:340px}
  .actbg .go{width:100%}
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

// 한 대목. 사진이 없으면 글만 낸다 — 없는 사진을 지어내지 않는다.
export function panelHtml(panel) {
  const media = panel.media ? HISTORICAL_MEDIA[panel.media] : null
  const figure = media?.src
    ? `<figure><img src="${media.src}" alt="${esc(media.title ?? '')}">
        <figcaption>${esc(panel.relation ?? '')}${media.credit ? `<br>${esc(media.credit)}` : ''}</figcaption>
      </figure>`
    : '<div></div>'
  const quote = panel.quote
    ? `<blockquote>${esc(panel.quote.text)}<cite>${esc(panel.quote.origin ?? '')}</cite></blockquote>`
    : ''
  return `<section class="panel">${figure}<div>
      <h3>${esc(panel.heading)}</h3>
      ${(panel.lines ?? []).map(l => `<p>${esc(l)}</p>`).join('')}
      ${quote}
    </div></section>`
}

export function backgroundHtml(view) {
  const years = (view.timeline ?? []).map(t =>
    `<div><b>${esc(t.year)}</b><span>${esc(t.what)}</span></div>`).join('')
  return `<div class="wrap">
    ${view.dateLabel ? `<div class="date">${esc(view.dateLabel)}</div>` : ''}
    <h2>${esc(view.title)}</h2>
    ${view.lead ? `<p class="lead">${esc(view.lead)}</p>` : ''}
    ${(view.panels ?? []).map(panelHtml).join('')}
    ${years ? `<div class="years">${years}</div>` : ''}
    ${view.ahead ? `<p class="ahead">${esc(view.ahead)}</p>` : ''}
    ${view.origin ? `<div class="origin">출처 — ${esc(view.origin)}</div>` : ''}
    <button class="go">${esc(view.buttonLabel ?? '1막을 시작한다')}</button>
  </div>`
}

export function createActBackground(root) {
  ensureStyle()
  return {
    open(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'actbg'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.innerHTML = backgroundHtml(view)
        root.appendChild(el)
        const go = el.querySelector('.go')
        // 두 번 눌러도 한 번이다 — 다른 화면에서 한 번 났던 일이다.
        let done = false
        go.addEventListener('click', () => {
          if (done) return
          done = true
          el.remove()
          resolve()
        })
        go.focus?.()
      })
    },
  }
}
