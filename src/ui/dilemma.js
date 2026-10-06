// 고민해서 정하는 자리 — 보기마다 얻는 것과 내어주는 것이 나란히 적혀 있다.
//
// 선생님(2026-10-06): 「대원군이 떠난 이후에는 스스로 선택하고 고민하는 고종의 모습이 보이도록
// 주요 이벤트들이 역사적으로 고민하게 만들어야 해.」 「물론 결과는 실제 역사적 사실을 따르지만.」
//
// 맞는 답이 없다(data/studies.js DILEMMAS). 고르면 「실제로는」이 뜬다 — 교과서의 문장이다.
// 무엇과 무엇 사이에 서 있었는지를 그림 카드로 살핀 뒤 하나를 고른다.
// 고른 뒤의 역사 확인은 별도 화면이다 — 자기 선택과 기록을 한 덩어리로 읽지 않게 한다.
//
// ⚠ 곧장 고르지 못하게 한다. 보기를 누르면 먼저 **펼쳐져** 얻는 것·내어주는 것이 보이고,
//   그 안의 「이렇게 정한다」를 눌러야 정해진다 — 읽지 않고 첫 줄을 누르고 지나가지 않게.
import { installTypeVars } from './type-css.js'
import { choiceArtHtml, choiceArtKey, CHOICE_ART_CSS } from './choice-art.js'

const CSS = `
.dilemma,.dilemma *{box-sizing:border-box}
.dilemma{position:fixed;inset:0;z-index:57;background:#14181b;color:#ece6d6;overflow-y:auto;
  font-family:var(--face-body,system-ui,sans-serif);display:flex;justify-content:center}
.dilemma .wrap{width:100%;max-width:880px;min-height:100%;display:flex;flex-direction:column;justify-content:safe center;
  gap:clamp(8px,1.6vh,16px);padding:clamp(10px,2.4vh,32px) clamp(14px,3vw,30px)}
.dilemma h2{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.04em;
  font-size:clamp(20px,3.5vh,29px);line-height:1.4;color:#fdf6e6;word-break:keep-all;text-wrap:balance}
.dilemma .prompt{margin:0;font-size:clamp(14.5px,2.3vh,18px);line-height:1.7;color:#cfc8b8;word-break:keep-all}
.dilemma .opts{display:flex;flex-direction:column;gap:clamp(8px,1.5vh,12px)}
.dilemma .opt{border:1px solid #55646b;border-radius:5px;background:#20272b;overflow:hidden}
.dilemma .opt.open{border-color:#e0a23a;background:#262d32}
.dilemma .opt.picked{border-color:#e0a23a;background:#33291a}
.dilemma .opt.dim{opacity:.4}
.dilemma .head{width:100%;display:flex;align-items:center;gap:12px;padding:clamp(11px,2vh,16px) 18px;background:transparent;border:0;
  color:#f3ede0;font-family:inherit;font-size:clamp(16px,2.6vh,20px);text-align:left;cursor:pointer;word-break:keep-all}
.dilemma .head::after{content:'▾';margin-left:auto;color:#9aa7ad}
.dilemma .opt.open .head::after{content:'▴'}
.dilemma .opt.picked .head::after{content:'✓';color:#e0a23a}
.dilemma .more{display:none;padding:0 18px clamp(12px,2vh,16px);flex-direction:column;gap:8px}
.dilemma .opt.open .more,.dilemma .opt.picked .more{display:flex}
.dilemma .row{display:grid;grid-template-columns:5.2em 1fr;gap:10px;font-size:clamp(14px,2.2vh,17px);line-height:1.6;word-break:keep-all}
.dilemma .row b{font-weight:600;font-size:.86em;letter-spacing:.02em;padding-top:.15em}
.dilemma .row.gain b{color:#9fd3a7}
.dilemma .row.cost b{color:#e8a08f}
.dilemma .choose{align-self:flex-start;margin-top:4px;padding:10px 22px;background:#3a2d20;border:1px solid #6a5230;color:#f0c469;
  border-radius:3px;font-family:inherit;font-size:clamp(14.5px,2.2vh,17px);cursor:pointer}
.dilemma .opt.picked .choose{display:none}
.dilemma .actual{border-top:1px solid #55646b;padding-top:clamp(10px,2vh,16px);display:flex;flex-direction:column;gap:8px}
.dilemma .actual small{font-size:clamp(12px,1.8vh,14px);letter-spacing:.14em;color:#e8b45c}
.dilemma .actual p{margin:0;font-size:clamp(15px,2.25vh,18px);line-height:1.65;color:#fdf6e6;word-break:keep-all}
.dilemma .actual .origin{font-size:clamp(12px,1.8vh,13.5px);color:#a9a394}
.dilemma .actual .tail{color:#cfc8b8;font-size:clamp(14px,2.2vh,17px)}
.dilemma .go{align-self:center;flex:0 0 auto;padding:clamp(9px,1.7vh,13px) 38px;background:#3a2d20;border:1px solid #6a5230;color:#f0c469;
  border-radius:3px;font-family:inherit;font-size:clamp(15px,2.3vh,17px);cursor:pointer}
/* ⚠ 위의 display:flex 가 hidden 속성을 이긴다(브라우저의 [hidden] 규칙은 힘이 가장 약하다).
   이 줄이 없으면 「실제로는」이 고르기 전부터 떠 있다 — 2026-10-06 화면에서 실제로 그랬다. */
.dilemma .actual[hidden],.dilemma .go[hidden]{display:none}
.dilemma button:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}
/* 2026-10-06 「선택지마다 그림을 만들어 힉스필드로」 — 선택과 역사 확인을 두 화면으로 나눈다. */
${CHOICE_ART_CSS}
.dilemma .wrap{max-width:1260px;gap:18px;padding:30px 28px}
.dilemma h2{font-size:clamp(25px,3vw,38px);letter-spacing:0;line-height:1.35}
.dilemma .prompt{font-size:20px;line-height:1.7;max-width:48em}
.dilemma .opts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;align-items:start}
.dilemma .opt{border-radius:12px}
.dilemma .head{display:block;padding:0;font-size:22px;line-height:1.5}
.dilemma .head::after{display:none}
.dilemma .head .choice-art{height:clamp(170px,27vh,260px)}
.dilemma .choice-label{display:block;padding:18px 18px 7px;min-height:4.4em}
.dilemma .choice-invite{display:block;padding:0 18px 17px;color:#c5c2b8;font:14px/1.4 var(--face-body,system-ui)}
.dilemma .opt.open .choice-invite{color:#e8b45c}
.dilemma .more{padding:4px 18px 20px;gap:16px}
.dilemma .row{display:flex;flex-direction:column;gap:3px;font-size:18px;line-height:1.65}
.dilemma .row b{font-size:14px;color:#dec594}
.dilemma .choose,.dilemma .go{font-size:19px;min-height:50px;border-radius:6px}
.dilemma .choose{align-self:stretch}
.dilemma .actual{padding:0;border:0;gap:18px}
.dilemma .actual>small{font-size:18px;letter-spacing:.15em}
.dilemma .history-layout{display:grid;grid-template-columns:minmax(220px,.85fr) minmax(0,1.25fr);gap:28px;align-items:center}
.dilemma .history-layout>.choice-art{height:clamp(240px,45vh,400px);border-radius:10px}
.dilemma .history-copy{display:flex;flex-direction:column;gap:18px}
.dilemma .actual p{font-size:21px;line-height:1.8}
.dilemma .actual .origin{font-size:15px;line-height:1.6}
.dilemma .actual .tail{font-size:20px;line-height:1.7}
.dilemma .picked-line{font-size:17px;color:#c9b28b;margin:0}
.dilemma [hidden]{display:none!important}
@media(max-width:760px){.dilemma .wrap{padding:22px 16px}.dilemma .opts{grid-template-columns:1fr}.dilemma .head .choice-art{height:210px}.dilemma .choice-label{min-height:0}.dilemma .history-layout{grid-template-columns:1fr}.dilemma .history-layout>.choice-art{height:240px}}
@media(max-height:500px) and (min-width:761px){.dilemma .wrap{padding:18px}.dilemma .head .choice-art{height:135px}.dilemma .choice-label{font-size:19px}.dilemma .history-layout>.choice-art{height:210px}}
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

export function dilemmaHtml(d) {
  return `<div class="wrap">
    <h2>${esc(d.title)}</h2>
    <p class="prompt">${esc(d.prompt ?? '')}</p>
    <div class="opts">${(d.options ?? []).map(o => `
      <div class="opt" data-opt="${esc(o.id)}">
        <button type="button" class="head" aria-expanded="false">${choiceArtHtml(choiceArtKey('dilemma', d.id, null, o.id))}<span class="choice-label">${esc(o.text)}</span><span class="choice-invite">이 선택 살펴보기</span></button>
        <div class="more">
          <div class="row gain"><b>얻는 것</b><span>${esc(o.gain)}</span></div>
          <div class="row cost"><b>내어주는 것</b><span>${esc(o.cost)}</span></div>
          <button type="button" class="choose">이렇게 정한다</button>
        </div>
      </div>`).join('')}</div>
    <div class="actual" hidden>
      <small>실 제 로 는</small>
      <p class="picked-line"></p>
      <div class="history-layout">
        ${choiceArtHtml(choiceArtKey('dilemma', d.id, null, 'actual'), '역사적 상황을 그린 재구성')}
        <div class="history-copy"><p>${esc(d.actual)}</p><div class="origin">${esc(d.origin ?? '')}</div></div>
      </div>
      ${d.after ? `<p class="tail">${esc(d.after)}</p>` : ''}
    </div>
    <button type="button" class="go" hidden>${esc(d.nextLabel ?? '다음으로')}</button>
  </div>`
}

export function createDilemma(root) {
  ensureStyle()
  return {
    open(d, { onPick = null, onOpen = null } = {}) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'dilemma'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.innerHTML = dilemmaHtml(d)
        root.appendChild(el)

        const opts = [...el.querySelectorAll('[data-opt]')]
        const actual = el.querySelector('.actual'), go = el.querySelector('.go')
        let picked = null
        const seen = new Set()

        for (const box of opts) {
          const head = box.querySelector('.head')
          head.addEventListener('click', () => {
            if (picked) return
            const open = !box.classList.contains('open')
            for (const other of opts) { other.classList.remove('open'); other.querySelector('.head').setAttribute('aria-expanded', 'false') }
            if (open) { box.classList.add('open'); head.setAttribute('aria-expanded', 'true'); seen.add(box.dataset.opt); onOpen?.() }
          })
          box.querySelector('.choose').addEventListener('click', () => {
            if (picked) return
            picked = box.dataset.opt
            for (const other of opts) {
              other.classList.toggle('picked', other === box)
              other.classList.toggle('dim', other !== box)
              other.classList.remove('open')
            }
            actual.hidden = false
            go.hidden = false
            el.querySelector('.opts').hidden = true
            el.querySelector('.prompt').hidden = true
            el.querySelector('.picked-line').textContent = `당신의 선택 · ${d.options.find(o => o.id === picked)?.text ?? ''}`
            onPick?.()
            el.scrollTop = 0
            go.focus?.()
          })
        }

        let closed = false
        go.addEventListener('click', () => {
          if (closed || !picked) return
          closed = true
          el.remove()
          const option = (d.options ?? []).find(o => o.id === picked)
          resolve({ choiceId: picked, text: option?.text ?? '', looked: seen.size })
        })
        opts[0]?.querySelector('.head')?.focus?.()
      })
    },
  }
}
