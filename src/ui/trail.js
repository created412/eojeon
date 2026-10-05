// 소식을 좇는다(화면) — 길 한 줄 위에서, 보낸 사람은 언제나 가마보다 뒤에 닿는다.
// 셈은 systems/trail.js 가 한다.
//
// ⚠ 길은 줄여 그린 것이다(지도가 아니다). 화면이 그렇게 적는다.
// ⚠ 한 화면에 들어온다.
import { installTypeVars } from './type-css.js'
import { initialTrail, legsOf, currentLeg, send, arrive, riderAt, cargoAt, atSea, placeOf, trailRecord } from '../systems/trail.js'

const CSS = `
.trail,.trail *{box-sizing:border-box}
.trail{position:fixed;inset:0;z-index:57;overflow-y:auto;color:#e9e4d6;font-family:var(--face-body,system-ui,sans-serif);
  background:radial-gradient(110% 80% at 20% 0%,#1d2533 0%,#10141c 55%,#090b10 100%);display:flex;justify-content:center}
.trail .wrap{width:100%;max-width:1040px;min-height:100%;display:flex;flex-direction:column;justify-content:safe center;
  gap:clamp(8px,1.8vh,18px);padding:clamp(10px,2.6vh,30px) clamp(14px,3vw,34px)}
/* ⚠ 줄어들지 않게 한다 — 세로로 쌓은 칸들이 좁은 화면에서 서로 겹쳤다(2026-10-06 화면에서 확인). */
.trail .wrap>*{flex:0 0 auto}
.trail h2{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.28em;font-size:clamp(21px,3.8vh,32px);color:#f0c469}
.trail .lead p{margin:0;font-size:clamp(15px,2.5vh,20px);line-height:1.7;color:#fdf6e6;word-break:keep-all}

/* ── 길 ── */
.trail .map{position:relative;height:clamp(96px,17vh,150px);margin:0 clamp(26px,5vw,60px);flex:0 0 auto}
.trail .road{position:absolute;left:0;right:0;top:56%;height:6px;border-radius:3px;
  background:linear-gradient(90deg,#8a6a44 0 calc(var(--shore) * 100%),#0000 calc(var(--shore) * 100%))}
.trail .sea{position:absolute;left:calc(var(--shore) * 100%);right:0;top:calc(56% - 14px);height:34px;border-radius:0 8px 8px 0;
  background:repeating-linear-gradient(90deg,#27405e 0 14px,#2f4c6e 14px 28px);opacity:.75}
.trail .sea::after{content:'바 다';position:absolute;right:42%;top:8px;font-size:clamp(11px,1.7vh,13px);letter-spacing:.2em;color:#9fb9d6}
.trail .place{position:absolute;top:56%;left:calc(var(--at) * 100%);transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center}
.trail .place i{width:15px;height:15px;border-radius:50%;background:#e9e4d6;border:3px solid #10141c;box-shadow:0 0 0 2px #8a6a44}
.trail .place span{position:absolute;top:22px;white-space:nowrap;font-size:clamp(12.5px,2vh,16px);color:#d9d2c0}
.trail .mark{position:absolute;top:56%;left:calc(var(--at) * 100%);transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px;
  transition:left var(--ms,0ms) linear,opacity .5s;padding-bottom:12px}
.trail .mark b{font-weight:400;font-size:clamp(11.5px,1.8vh,14px);white-space:nowrap;padding:1px 7px;border-radius:9px}
.trail .mark .glyph{position:relative;display:block}
/* 보낸 사람 */
.trail .rider b{background:#3a2d20;color:#f0c469;border:1px solid #6a5230}
.trail .rider .glyph{width:12px;height:20px;border-radius:5px 5px 2px 2px;background:linear-gradient(#e6c9a2 0 28%,#c9b68c 28%)}
.trail .rider.run .glyph{animation:tr-bob .32s ease-in-out infinite}
@keyframes tr-bob{50%{transform:translateY(-3px)}}
/* 아버지가 실린 가마 · 배 */
.trail .cargo{top:calc(56% - 34px)}
.trail .cargo b{background:#5a1f1c;color:#ffd9cf;border:1px solid #a3302a}
.trail .cargo .glyph{width:26px;height:16px;border-radius:3px;background:#7a2a22;border:1px solid #d9a28f}
.trail .cargo .glyph::before{content:'';position:absolute;left:-9px;right:-9px;top:6px;height:2px;background:#d9a28f}
.trail .cargo.ship .glyph{width:34px;height:12px;border-radius:0 0 12px 12px;background:#2a3445;border:1px solid #9fb9d6}
.trail .cargo.ship .glyph::before{left:15px;right:auto;top:-13px;width:2px;height:13px;background:#9fb9d6}
.trail .cargo.unknown{opacity:0}
.trail .under{display:flex;justify-content:space-between;gap:14px;align-items:baseline;flex-wrap:wrap}
.trail .mapnote{font-size:clamp(11px,1.6vh,12.5px);color:#7f8ba0;margin-left:auto}

/* ── 소식 ── */
.trail .reports{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(6px,1vw,12px);align-items:start;min-height:clamp(70px,14vh,128px)}
.trail .report{padding:clamp(6px,1.3vh,10px) 14px;border-left:3px solid #a3302a;background:#ffffff08;animation:tr-in .5s ease-out}
.trail .report small{display:block;font-size:clamp(11.5px,1.7vh,13px);letter-spacing:.06em;color:#e8a08f}
.trail .report p{margin:0;font-size:clamp(14px,2.15vh,17px);line-height:1.55;color:#f1ebdc;word-break:keep-all}
@keyframes tr-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.trail .still{min-height:1.5em;margin:0;font-size:clamp(13px,2.1vh,16px);color:#0000;word-break:keep-all;transition:color .3s}
.trail .still.on{color:#f2d79b}
.trail .act{align-self:center;padding:clamp(10px,1.9vh,14px) 34px;background:#3a2d20;border:1px solid #6a5230;color:#f0c469;
  border-radius:3px;font-family:inherit;font-size:clamp(15px,2.4vh,18px);cursor:pointer}
.trail .act:disabled{opacity:.45;cursor:default}
.trail .act:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}
.trail .actual{display:flex;flex-direction:column;gap:6px;border-top:1px solid #4a5568;padding-top:clamp(8px,1.6vh,14px)}
.trail .actual[hidden]{display:none}
/* 다 듣고 나면 첫 줄과 길 아래의 작은 줄을 걷는다 — 「실제로는」이 한 화면에 들어오게. */
.trail.done .lead,.trail.done .under{display:none}
.trail .actual small{font-size:clamp(12px,1.8vh,14px);letter-spacing:.14em;color:#e8b45c}
.trail .actual p{margin:0;font-size:clamp(14.5px,2.25vh,18px);line-height:1.65;color:#fdf6e6;word-break:keep-all}
.trail .actual .origin{font-size:clamp(11.5px,1.7vh,13px);color:#98a2b3}
.trail .actual .tail{font-family:var(--face-display,serif);font-size:clamp(16px,2.7vh,21px)}
.trail .src{font-size:clamp(11px,1.6vh,12.5px);line-height:1.45;color:#7f8ba0;word-break:keep-all}
@media(max-width:720px){.trail .reports{grid-template-columns:1fr}}
@media(prefers-reduced-motion:reduce){.trail .rider.run .glyph,.trail .report{animation:none}}
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

export function trailHtml(beat) {
  const places = beat.places ?? []
  const shore = places.find(p => p.shore)?.at ?? 1
  return `<div class="wrap">
    <h2>${esc(beat.title ?? '')}</h2>
    <div class="lead">${(beat.lead ?? []).map(l => `<p>${esc(l)}</p>`).join('')}</div>
    <div class="map" style="--shore:${shore}">
      <div class="sea"></div>
      <div class="road"></div>
      ${places.map(p => `<div class="place" style="--at:${p.at}"><i></i><span>${esc(p.name)}</span></div>`).join('')}
      <div class="mark cargo unknown" style="--at:${places[0]?.at ?? 0}"><b>${esc(beat.cargoLabel ?? '아버지')}</b><span class="glyph"></span></div>
      <div class="mark rider" style="--at:${places[0]?.at ?? 0}"><b>${esc(beat.riderLabel ?? '보낸 사람')}</b><span class="glyph"></span></div>
    </div>
    <div class="under"><p class="still"></p><span class="mapnote">${esc(beat.mapNote ?? '')}</span></div>
    <div class="reports" aria-live="polite"></div>
    <div class="actual" hidden>
      <small>실 제 로 는</small>
      <p>${esc(beat.actual ?? '')}</p>
      <div class="origin">${esc(beat.actualOrigin ?? '')}</div>
      ${(beat.after ?? []).map(l => `<p class="tail">${esc(l)}</p>`).join('')}
    </div>
    <button type="button" class="act"></button>
    <div class="src">${esc(beat.origin ?? '')}</div>
  </div>`
}

export function createTrail(root) {
  ensureStyle()
  return {
    open(beat, { onSend = null, onReport = null, onStill = null, onDone = null } = {}) {
      return new Promise(resolve => {
        let state = initialTrail()
        const el = document.createElement('div')
        el.className = 'trail'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.innerHTML = trailHtml(beat)
        root.appendChild(el)

        const $ = sel => el.querySelector(sel)
        const rider = $('.rider'), cargo = $('.cargo'), reports = $('.reports'), still = $('.still'), act = $('.act'), actual = $('.actual')
        const timers = new Set()
        const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn() }, ms); timers.add(id) }
        let closed = false
        let stillTimer = 0

        const move = (node, at, ms) => { node.style.setProperty('--ms', `${ms}ms`); node.style.setProperty('--at', String(at)) }

        function paintButton() {
          const leg = currentLeg(beat, state)
          if (state.done) { act.textContent = beat.nextLabel ?? '다음으로'; act.disabled = false; return }
          act.textContent = state.moving ? (leg.waitLabel ?? '소식을 기다리는 중…') : leg.label
          act.disabled = state.moving
        }

        function go() {
          const leg = currentLeg(beat, state)
          if (!leg || state.moving) return
          const known = cargoAt(beat, state)
          state = send(beat, state)
          onSend?.()
          paintButton()
          // 보낸 사람이 달린다(바다는 건너지 못한다 — to 가 없으면 그 자리에 선다).
          const to = placeOf(beat, leg.to)
          if (to) { rider.classList.add('run'); move(rider, to.at, leg.ms) }
          // 그 사이 가마는 더 멀리 간다. 뭍에서 바다로 넘어가면 배가 된다.
          if (known != null) {
            const shore = (beat.places ?? []).find(p => p.shore)?.at
            if (shore != null && known < shore && leg.cargoAt > shore) {
              const first = leg.ms * (shore - known) / (leg.cargoAt - known)
              move(cargo, shore, first)
              later(() => { cargo.classList.add('ship'); move(cargo, leg.cargoAt, leg.ms - first) }, first)
            } else {
              move(cargo, leg.cargoAt, leg.ms)
            }
          }
          later(() => {
            state = arrive(beat, state)
            rider.classList.remove('run')
            // 소식이 말해 준 자리에 가마(배)가 나타난다 — 언제나 보낸 사람보다 앞이다.
            const at = cargoAt(beat, state)
            if (cargo.classList.contains('unknown')) { move(cargo, at, 0); cargo.classList.remove('unknown') }
            cargo.classList.toggle('ship', atSea(beat, at))
            const box = document.createElement('div')
            box.className = 'report'
            const where = to?.name ?? beat.places?.at(-1)?.name ?? ''
            box.innerHTML = `<small>${esc(leg.from ?? `${where}에서 온 소식`)}</small>${leg.report.map(l => `<p>${esc(l)}</p>`).join('')}`
            reports.appendChild(box)
            onReport?.(state.reports.length)
            if (state.done) {
              actual.hidden = false
              el.classList.add('done')
              onDone?.()
              actual.scrollIntoView?.({ block: 'nearest' })
            }
            paintButton()
            act.focus?.()
          }, leg.ms)
        }

        act.addEventListener('click', () => {
          if (closed) return
          if (state.done) {
            closed = true
            for (const id of timers) clearTimeout(id)
            window.removeEventListener('keydown', onKey, true)
            el.remove()
            resolve(trailRecord(beat, state))
            return
          }
          go()
        })

        // 조작권 D — 걸으려 해도 걸어지지 않는다. 그 키들이 이 한 줄을 띄운다.
        const MOVE_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'ㅈ', 'ㅁ', 'ㄴ', 'ㅇ'])
        function onKey(e) {
          if (!MOVE_KEYS.has(e.key.toLowerCase())) return
          e.stopPropagation()
          still.textContent = beat.still ?? ''
          still.classList.add('on')
          onStill?.()
          clearTimeout(stillTimer)
          stillTimer = setTimeout(() => still.classList.remove('on'), 1600)
        }
        window.addEventListener('keydown', onKey, true)
        $('.map').addEventListener('pointerdown', () => { still.textContent = beat.still ?? ''; still.classList.add('on') })

        paintButton()
        act.focus?.()
      })
    },
  }
}
