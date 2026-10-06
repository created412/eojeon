// 소식을 좇는다(화면) — 길 한 줄 위에서, 보낸 사람은 언제나 가마보다 뒤에 닿는다.
// 셈은 systems/trail.js 가 한다.
//
// ⚠ 길은 줄여 그린 것이다(지도가 아니다). 화면이 그렇게 적는다.
// ⚠ 한 화면에 들어온다.
//
// ── 그림 넉 장(2026-10-06) ────────────────────────────────────────────────
// 선생님, 이 화면을 보고: 「이거도 너무 대충 만들었어. 힉스필드로 제대로 그림 만들어서 어떤 일이
// 일어난 건지 전달되게 만들어.」 그전에는 줄 하나 위의 점 둘과 글 세 토막이 전부였다.
//
// 이제 소식이 닿을 때마다 **그 소식이 말하는 장면이 큰 그림으로 선다**(군영에서 에워싸임 → 밤길의
// 가마 → 빈 가마와 떠나는 배 → 톈진으로 가는 바다). 아래 줄에는 지나온 그림이 차례로 남고, 다 듣고
// 나면 넉 장이 나란히 놓여 무슨 일이 어떤 차례로 일어났는지가 한눈에 들어온다.
//
// ⚠ 그림은 재구성이다 — 그림마다 그 사실을 적는다(scene-art-data.js 의 caption).
// ⚠ 대원군의 얼굴을 지어 그리지 않는다. 첫 장은 뒷모습이고 나머지에는 사람이 멀다.
// ⚠ 그림은 **소식이 닿은 뒤에야** 보인다. 임금은 그 자리에 없었다 — 본 것이 아니라 들은 것이다.
import { installTypeVars } from './type-css.js'
import { SCENE_ART } from './scene-art-data.js'
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
.trail .map{position:relative;height:clamp(78px,12.5vh,118px);margin:clamp(16px,3.2vh,30px) clamp(26px,5vw,60px) 0;flex:0 0 auto}
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

/* ── 소식: 큰 그림 한 장과 그 곁의 글 ── */
.trail .story{display:grid;grid-template-columns:minmax(0,58fr) minmax(0,42fr);gap:clamp(10px,1.8vw,22px);align-items:stretch}
.trail .scene{margin:0;position:relative;height:clamp(130px,31vh,330px);border:1px solid #3a4558;border-radius:4px;overflow:hidden;background:#0c1017;
  display:flex;align-items:center;justify-content:center}
.trail .scene img{width:100%;height:100%;object-fit:cover;display:block;animation:tr-pic .7s ease-out}
.trail .scene img[hidden]{display:none}
.trail .scene .none{font-size:clamp(13px,2.1vh,16px);color:#6f7b90;letter-spacing:.08em}
.trail .scene .none[hidden]{display:none}
.trail .scene figcaption{position:absolute;left:0;right:0;bottom:0;padding:14px 12px 6px;font-size:clamp(10.5px,1.5vh,12px);color:#d5dbe6;
  background:linear-gradient(#0000,#000c);word-break:keep-all}
.trail .scene figcaption:empty{display:none}
@keyframes tr-pic{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}
.trail .telling{display:flex;flex-direction:column;justify-content:center;gap:clamp(5px,1vh,9px);padding:clamp(8px,1.6vh,14px) 16px;border-left:3px solid #a3302a;background:#ffffff08;min-height:0}
.trail .telling small{font-size:clamp(11.5px,1.7vh,13.5px);letter-spacing:.06em;color:#e8a08f}
.trail .telling p{margin:0;font-size:clamp(15px,2.5vh,20px);line-height:1.62;color:#f1ebdc;word-break:keep-all;animation:tr-in .5s ease-out}
.trail .telling .quiet{color:#8f9bb0;font-size:clamp(13.5px,2.1vh,16px);animation:none}
@keyframes tr-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
/* 지나온 그림 — 작게, 차례대로. 다 듣고 나면 커진다. */
.trail .reel{display:grid;grid-template-columns:repeat(var(--n,4),minmax(0,1fr));gap:clamp(5px,.9vw,10px)}
.trail .frame{margin:0;display:flex;flex-direction:column;gap:3px;min-width:0}
.trail .frame .pic{position:relative;height:clamp(30px,5.4vh,52px);border:1px solid #333d4e;border-radius:3px;overflow:hidden;background:#0c1017}
.trail .frame .pic img{width:100%;height:100%;object-fit:cover;display:block}
.trail .frame.wait .pic::after{content:'?';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#4a566b;font-size:clamp(14px,2.2vh,18px)}
.trail .frame.now .pic{border-color:#e0a23a;box-shadow:0 0 0 2px #e0a23a55}
.trail .frame figcaption{display:none;font-size:clamp(12px,1.9vh,15px);line-height:1.4;color:#e9e4d6;word-break:keep-all}
.trail .frame figcaption b{display:block;font-weight:400;font-size:.82em;color:#e8a08f}
.trail.done .story{display:none}
.trail.done .frame .pic{height:clamp(80px,19vh,190px)}
.trail.done .frame figcaption{display:block}
.trail.done .frame.now .pic{border-color:#333d4e;box-shadow:none}
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
@media(max-width:720px){.trail .story{grid-template-columns:1fr}.trail.done .reel{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(prefers-reduced-motion:reduce){.trail .rider.run .glyph,.trail .telling p,.trail .scene img{animation:none}}
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
  const legs = legsOf(beat)
  return `<div class="wrap">
    <h2>${esc(beat.title ?? '')}</h2>
    <div class="lead">${(beat.lead ?? []).map(l => `<p>${esc(l)}</p>`).join('')}</div>
    <div class="story">
      <figure class="scene"><span class="none">${esc(beat.waiting ?? '아직 아무 소식도 없다')}</span><img alt="" hidden><figcaption></figcaption></figure>
      <div class="telling" aria-live="polite"><p class="quiet">${esc(beat.waitingLine ?? '')}</p></div>
    </div>
    <div class="reel" style="--n:${legs.length}">${legs.map((leg, i) => `<figure class="frame wait" data-leg="${i}"><div class="pic"></div><figcaption></figcaption></figure>`).join('')}</div>
    <div class="map" style="--shore:${shore}">
      <div class="sea"></div>
      <div class="road"></div>
      ${places.map(p => `<div class="place" style="--at:${p.at}"><i></i><span>${esc(p.name)}</span></div>`).join('')}
      <div class="mark cargo unknown" style="--at:${places[0]?.at ?? 0}"><b>${esc(beat.cargoLabel ?? '아버지')}</b><span class="glyph"></span></div>
      <div class="mark rider" style="--at:${places[0]?.at ?? 0}"><b>${esc(beat.riderLabel ?? '보낸 사람')}</b><span class="glyph"></span></div>
    </div>
    <div class="under"><p class="still"></p><span class="mapnote">${esc(beat.mapNote ?? '')}</span></div>
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
        const rider = $('.rider'), cargo = $('.cargo'), still = $('.still'), act = $('.act'), actual = $('.actual')
        let sceneImg = $('.scene img')
        const sceneNone = $('.scene .none'), sceneCap = $('.scene figcaption'), telling = $('.telling')
        const frames = [...el.querySelectorAll('.frame')]
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
            const where = to?.name ?? beat.places?.at(-1)?.name ?? ''
            const from = leg.from ?? `${where}에서 온 소식`
            telling.innerHTML = `<small>${esc(from)}</small>${leg.report.map(l => `<p>${esc(l)}</p>`).join('')}`
            // 그 소식이 말하는 장면 — 들은 뒤에야 보인다.
            const art = SCENE_ART[leg.art]
            const n = state.reports.length - 1
            if (art) {
              sceneNone.hidden = true
              const fresh = sceneImg.cloneNode()   // 새로 끼워야 들어오는 움직임이 다시 돈다
              fresh.hidden = false; fresh.src = art.src; fresh.alt = art.alt
              sceneImg.replaceWith(fresh); sceneImg = fresh
              sceneCap.textContent = art.caption
            }
            for (const [i, f] of frames.entries()) f.classList.toggle('now', i === n)
            const frame = frames[n]
            if (frame) {
              frame.classList.remove('wait')
              frame.querySelector('.pic').innerHTML = art ? `<img src="${art.src}" alt="${esc(art.alt)}">` : ''
              frame.querySelector('figcaption').innerHTML = `<b>${esc(from)}</b>${esc(leg.brief ?? '')}`
            }
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
