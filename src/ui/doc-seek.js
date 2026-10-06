// 문서에서 문제의 글자를 찾는 판 — 1868년의 서계.
//
// 선생님(2026-10-06)이 보내 주신 그림 그대로 그린다: 누런 종이에 붉은 테, 오른쪽 줄부터
// 세로로 내려 쓴 다섯 줄, 맨 왼쪽에 붉은 도장. 찾은 곳에는 그림처럼 붉은 테가 선다.
//
// 셈은 systems/doc-seek.js 가 한다. 여기서는 그리기만 한다.
//
// ⚠ 글자가 **커야** 한다. 예전 판은 20px 글자 일곱 낱이었고 선생님이 「글자들이 잘 안 보이네」
//   라고 하셨다. 종이의 글자는 화면 높이를 따라 28~46px 로 선다.
// ⚠ 한자를 못 읽어도 할 수 있어야 한다 — 낱말을 누르면 읽기와 뜻이 곁에 뜬다.
// ⚠ 두 곳을 다 찾기 전에는 덮는 단추가 잠겨 있다(「못 찾아내면 안 넘어가져야 해」).
import { installTypeVars } from './type-css.js'
import {
  unitsOf, targetsOf, initialSeek, look, nominate, seekDone, leftCount, seekHint, seekRecord,
} from '../systems/doc-seek.js'

const CSS = `
.seekdoc,.seekdoc *{box-sizing:border-box}
.seekdoc{position:fixed;inset:0;z-index:57;background:#1b2226;color:#ece6d6;overflow:hidden;
  font-family:var(--face-body,system-ui,sans-serif);display:flex;justify-content:center}
.seekdoc .wrap{width:100%;max-width:1180px;height:100%;display:grid;
  grid-template-columns:minmax(300px,1.05fr) minmax(300px,1fr);gap:clamp(12px,2.4vw,30px);
  padding:clamp(10px,3vh,30px) clamp(12px,2.6vw,30px)}

/* ── 종이 ── */
.seekdoc .sheet{min-height:0;display:flex;flex-direction:column;gap:8px}
.seekdoc .paper{flex:1 1 auto;min-height:0;background:#f1e6cb;border:2px solid #b9a877;
  box-shadow:0 14px 40px #0009;padding:clamp(8px,1.8vh,14px);display:flex}
.seekdoc .frame{flex:1;border:1.5px solid #c98a78;display:flex;flex-direction:row-reverse;
  justify-content:space-between;min-height:0}
.seekdoc .col{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;
  gap:clamp(8px,2.2vh,22px);padding:clamp(10px,3vh,30px) 2px;border-left:1px solid #c98a7855;min-width:0}
.seekdoc .col:last-child{border-left:0}
.seekdoc .unit{display:flex;flex-direction:row;align-items:center;gap:3px;padding:6px 4px;margin:0;
  background:transparent;border:3px solid transparent;border-radius:6px;cursor:pointer;color:#221c14}
.seekdoc .unit .h{writing-mode:vertical-rl;text-orientation:upright;
  font-family:var(--face-display,"Batang","Noto Serif CJK KR",serif);
  font-size:clamp(24px,5vh,44px);line-height:1.08;letter-spacing:.06em;font-weight:500}
/* 읽는 소리 — 한자 오른쪽에 작게 세로로 적는다(선생님: 「해석이 빠져서 뭐가 뭔지 구분 못 할 거 같아」). */
.seekdoc .unit .r{writing-mode:vertical-rl;text-orientation:upright;font-family:var(--face-body,system-ui,sans-serif);
  font-size:clamp(11px,1.9vh,15px);line-height:1;letter-spacing:.12em;color:#8a3b22;white-space:nowrap}
/* 줄 아래의 풀이 — 그 줄이 무슨 말인지. */
.seekdoc .col .gl{margin-top:auto;padding:6px 5px 0;border-top:1px dashed #c98a7888;width:100%;text-align:center;
  font-size:clamp(11.5px,1.85vh,14.5px);line-height:1.45;color:#4f3d21;word-break:keep-all}
.seekdoc .trans{display:none;margin:0;font-size:clamp(12.5px,2vh,15px);line-height:1.6;color:#f2d79b;word-break:keep-all}
.seekdoc .readnote{margin:0;font-size:clamp(11.5px,1.75vh,13.5px);line-height:1.5;color:#a9b4b8;word-break:keep-all}
.seekdoc .unit:hover{background:#00000010}
.seekdoc .unit.on{border-color:#3c5a66;background:#3c5a6618}
.seekdoc .unit.found{border-color:#a3302a;background:#a3302a26;cursor:default}
.seekdoc .unit.no{animation:seek-no .3s}
@keyframes seek-no{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
/* 한 낱말로 이어 읽는 두 글자(皇祚)는 틈 없이 붙인다. */
.seekdoc .unit.join{margin-bottom:calc(-1 * clamp(8px,2.2vh,22px))}
/* 도장 — 글자가 아니라 찍힌 것이다. */
.seekdoc .unit.seal{color:#b03a30;border:4px solid #a3302a;border-radius:8px;
  padding:8px 6px;background:#e9c9b8;box-shadow:inset 0 0 0 2px #f1e6cb}
.seekdoc .unit.seal .h{font-size:clamp(17px,3.2vh,26px)}
.seekdoc .unit.seal .r{color:#b03a30}
.seekdoc .unit.seal.on{outline:3px solid #3c5a66;outline-offset:3px}
.seekdoc .unit.seal.found{outline:4px solid #a3302a;outline-offset:3px;background:#e2b5a2}
.seekdoc .unit:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}
.seekdoc .src{font-size:clamp(11px,1.6vh,12.5px);line-height:1.5;color:#a9a394;word-break:keep-all}

/* ── 곁의 판 ── */
.seekdoc .side{min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:clamp(8px,1.6vh,14px)}
.seekdoc h2{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.08em;
  font-size:clamp(18px,3.2vh,26px);color:#e8b45c}
.seekdoc .lead{margin:0;font-size:clamp(13px,2vh,15.5px);line-height:1.65;color:#cfc8b8;word-break:keep-all}
.seekdoc .q{margin:0;font-family:var(--face-display,serif);font-size:clamp(17px,3vh,24px);line-height:1.5;
  color:#fdf6e6;word-break:keep-all}
.seekdoc .pips{display:flex;align-items:center;gap:10px;font-size:clamp(13px,2vh,15px);color:#cfc8b8}
.seekdoc .pips i{width:22px;height:22px;border:2px solid #a3302a;border-radius:5px;display:inline-block}
.seekdoc .pips i.on{background:#a3302a}
.seekdoc .look{border:1px solid #47565c;background:#232d32;border-radius:4px;padding:clamp(10px,2vh,16px);
  display:grid;grid-template-columns:auto 1fr;gap:4px 16px;align-items:center;min-height:clamp(84px,15vh,120px)}
.seekdoc .look .han{grid-row:1 / span 2;font-family:var(--face-display,"Batang",serif);
  font-size:clamp(30px,6vh,48px);color:#fdf6e6;line-height:1.1}
.seekdoc .look .read{font-size:clamp(15px,2.4vh,19px);color:#e8b45c}
.seekdoc .look .mean{font-size:clamp(14px,2.2vh,17px);line-height:1.6;color:#ece6d6;word-break:keep-all}
.seekdoc .look .empty{grid-column:1 / -1;color:#a9a394;font-size:clamp(13.5px,2.1vh,16px);line-height:1.6}
.seekdoc button.name{padding:clamp(10px,1.9vh,14px) 18px;background:#7c2a25;border:1px solid #c2574d;color:#ffe9dc;
  border-radius:4px;font-family:inherit;font-size:clamp(15px,2.3vh,18px);cursor:pointer}
.seekdoc button.name:disabled{background:#2a3236;border-color:#47565c;color:#7f8a8f;cursor:not-allowed}
.seekdoc .say{min-height:3.2em;margin:0;font-size:clamp(14px,2.2vh,17px);line-height:1.65;color:#f2d79b;word-break:keep-all}
.seekdoc .say.ok{color:#fdf6e6;border-left:4px solid #a3302a;padding-left:12px}
.seekdoc .hint{margin:0;font-size:clamp(13px,2vh,15.5px);line-height:1.6;color:#9fc0cc;word-break:keep-all}
.seekdoc .after{border-top:1px solid #47565c;padding-top:10px;display:flex;flex-direction:column;gap:6px}
.seekdoc .after p{margin:0;font-size:clamp(13.5px,2.1vh,16.5px);line-height:1.7;color:#ece6d6;word-break:keep-all}
.seekdoc .after .whole{color:#f2d79b;font-family:var(--face-display,serif)}
.seekdoc button.close{margin-top:auto;padding:clamp(10px,1.9vh,14px) 24px;background:#3a2d20;border:1px solid #6a5230;
  color:#f0c469;border-radius:3px;font-family:inherit;font-size:clamp(15px,2.3vh,17px);cursor:pointer;flex:0 0 auto}
.seekdoc button.close:disabled{background:#232d32;border-color:#47565c;color:#7f8a8f;cursor:not-allowed}

@media(max-width:700px){
  .seekdoc .wrap{grid-template-columns:1fr;grid-template-rows:minmax(0,46%) minmax(0,1fr);overflow:hidden}
  .seekdoc .unit{font-size:clamp(22px,3.6vh,34px)}
  .seekdoc .col{padding:10px 2px;gap:8px}
  .seekdoc .unit.join{margin-bottom:-8px}
}
/* 낮은 화면에서는 줄 아래의 풀이가 들어갈 자리가 없다 — 곁의 판에 한 문장으로 적는다. */
@media(max-height:560px){
  .seekdoc .col .gl{display:none}
  .seekdoc .trans{display:block}
}
@media(prefers-reduced-motion:reduce){.seekdoc .unit.no{animation:none}}
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

function unitHtml(u, { seal = false, join = false } = {}) {
  return `<button type="button" class="unit${seal ? ' seal' : ''}${join ? ' join' : ''}" data-unit="${esc(u.id)}" aria-label="${esc(u.read)}"><span class="h">${esc(u.han)}</span><span class="r" aria-hidden="true">${esc(u.read)}</span></button>`
}

export function seekHtml(doc) {
  const targets = targetsOf(doc).length
  // 「皇」처럼 한 글자만 따로 짚게 가른 낱말은, 바로 아래 글자와 틈 없이 붙여 한 낱말로 보이게 한다.
  const gloss = text => (text ? `<p class="gl">${esc(text)}</p>` : '')
  const cols = (doc.columns ?? []).map((col, c) =>
    `<div class="col">${col.map((u, i) => unitHtml(u, { join: [...u.han].length === 1 && [...(col[i + 1]?.han ?? '')].length === 1 })).join('')}${gloss(doc.glosses?.[c])}</div>`).join('')
  const sealCol = doc.seal ? `<div class="col">${unitHtml(doc.seal, { seal: true })}${gloss(doc.sealGloss)}</div>` : ''
  return `<div class="wrap">
    <div class="sheet">
      <div class="paper"><div class="frame">${cols}${sealCol}</div></div>
      <div class="src">${esc(doc.origin ?? '')}</div>
    </div>
    <div class="side">
      <h2>${esc(doc.title)}</h2>
      <p class="lead">${esc(doc.lead ?? '')}</p>
      <p class="q">${esc(doc.question)}</p>
      ${doc.readNote ? `<p class="readnote">${esc(doc.readNote)}</p>` : ''}
      ${doc.whole ? `<p class="trans">풀이 — ${esc(doc.whole)}</p>` : ''}
      <div class="pips" aria-label="찾은 곳">${Array.from({ length: targets }, () => '<i></i>').join('')}<span data-left></span></div>
      <div class="look" data-look><div class="empty">${esc(doc.how ?? '')}</div></div>
      <button type="button" class="name" disabled>이곳을 문제 삼는다</button>
      <p class="say" aria-live="polite"></p>
      <p class="hint" aria-live="polite"></p>
      <div class="after" hidden></div>
      <button type="button" class="close" disabled>${esc(doc.doneLabel ?? '문서를 덮는다')}</button>
    </div>
  </div>`
}

export function createDocSeek(root) {
  ensureStyle()
  return {
    open(doc, { onPick = null, onFound = null, onMiss = null } = {}) {
      return new Promise(resolve => {
        let state = initialSeek()
        const units = new Map(unitsOf(doc).map(u => [u.id, u]))
        const el = document.createElement('div')
        el.className = 'seekdoc'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.innerHTML = seekHtml(doc)
        root.appendChild(el)

        const $ = sel => el.querySelector(sel)
        const lookEl = $('[data-look]'), nameBtn = $('.name'), say = $('.say'), hintEl = $('.hint')
        const afterEl = $('.after'), closeBtn = $('.close'), leftEl = $('[data-left]')
        const pips = [...el.querySelectorAll('.pips i')]
        const btns = new Map([...el.querySelectorAll('[data-unit]')].map(b => [b.dataset.unit, b]))

        function paint() {
          const done = seekDone(doc, state)
          for (const [id, b] of btns) {
            b.classList.toggle('on', state.picked === id && !state.found.includes(id))
            b.classList.toggle('found', state.found.includes(id))
          }
          pips.forEach((p, i) => p.classList.toggle('on', i < state.found.length))
          const left = leftCount(doc, state)
          leftEl.textContent = done ? '다 찾았다' : `${left}곳 남았다`
          const u = units.get(state.picked)
          lookEl.innerHTML = u
            ? `<div class="han">${esc(u.han)}</div><div class="read">${esc(u.read)}</div><div class="mean">${esc(u.mean)}</div>`
            : `<div class="empty">${esc(doc.how ?? '')}</div>`
          nameBtn.disabled = done || !u || state.found.includes(u.id)
          hintEl.textContent = seekHint(doc, state) ?? ''
          if (done && afterEl.hidden) {
            afterEl.hidden = false
            afterEl.innerHTML = `<p class="whole">${esc(doc.whole ?? '')}</p>` +
              (doc.after ?? []).map(l => `<p>${esc(l)}</p>`).join('')
            closeBtn.disabled = false
            nameBtn.hidden = true
            closeBtn.focus?.()
          }
        }

        for (const [id, b] of btns) {
          b.addEventListener('click', () => {
            state = look(doc, state, id)
            say.classList.remove('ok'); say.textContent = ''
            onPick?.()
            paint()
          })
        }
        nameBtn.addEventListener('click', () => {
          const picked = state.picked
          const r = nominate(doc, state)
          const missed = r.state.misses > state.misses
          state = r.state
          say.textContent = r.ok && !seekDone(doc, state) ? `${r.line} ${doc.lines?.left1 ?? ''}` : r.line
          say.classList.toggle('ok', r.ok)
          if (r.ok) onFound?.()
          else {
            if (missed && onMiss?.(r.line) === true) return
            const b = btns.get(picked)
            b?.classList.remove('no'); void b?.offsetWidth; b?.classList.add('no')
          }
          paint()
        })

        let closed = false
        closeBtn.addEventListener('click', () => {
          if (closed || closeBtn.disabled) return
          closed = true
          el.remove()
          resolve(seekRecord(doc, state))
        })

        paint()
      })
    },
  }
}
