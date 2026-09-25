import { SCENE_ART } from './scene-art-data.js'
import {
  arrivedAt, pendingAt, lagLabelAt,
  arrivalOrder, shouldOfferOrdering, orderingVerdict, happenedLabel, travelLabel,
} from '../systems/dispatch.js'
import { noticeFor } from './dialog.js'
import { drawGanghwa, MAP_W, MAP_H, CAPTION, APPROX, PLACES, project } from './ganghwa-map.js'

const W = MAP_W
const H = MAP_H

const CSS = `
.dispatch{position:fixed;inset:0;z-index:52;background:#0f1113ee;display:flex;
  flex-direction:column;align-items:center;justify-content:safe center;gap:12px;padding:24px;overflow:auto}
.dispatch h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:3px;font-weight:400}
.dispatch .lag{font-size:13px;color:#d2503a;letter-spacing:2px}
.dispatch canvas{background:#141a1e;border:1px solid #3a4248;border-radius:3px;width:${W}px;max-width:92vw}
.dispatch .mapnote{width:${W}px;max-width:92vw;margin-top:-4px;font-size:12px;color:#c9b98a;line-height:1.6}
.dispatch .mapnote span{display:block;font-size:11px;color:#6b6558}
.dispatch .rows{width:${W}px;max-width:92vw;display:flex;flex-direction:column;gap:6px}
.dispatch .row{text-align:left;padding:10px 13px;background:#23282c;border:1px solid #6a5230;
  border-radius:2px;color:#e8e2d4;font-size:14px;cursor:pointer}
.dispatch .row:hover{background:#2f363c}
.dispatch .row .org{display:block;font-size:11px;color:#8f8a7c;margin-top:3px}
/* 장계 본문은 **장계 종이** 위에 앉는다 — 세로 괘선이 그어지고 아래에 붉은 인장이
   찍힌 그 종이다(assets/paper/janggye.png). 이 화면이 곧 장계이기 때문이다.
   ⚠ background-size 는 cover 가 아니라 **100% 100%** 다. cover 로 두면 세로로 긴
   종이가 가로로 넓은 칸을 덮느라 몇 배로 확대되고, 찢긴 가장자리가 글 밑에 깔려
   첫 줄이 잘려 보인다 — 선생님이 그 화면을 찍어 보내셨다(지적 7번).
   종이 한 장을 칸에 맞춰 펴는 것이 맞다. */
.dispatch .body{width:${W}px;max-width:92vw;background:#efe6d2;color:#23201a;border-radius:2px;
  background-image:var(--janggye);background-size:100% 100%;background-repeat:no-repeat;
  border:1px solid #6b5a3e;padding:30px 30px 34px;font-size:15px;line-height:2.0;
  box-shadow:0 10px 32px #000a}
.dispatch .body .text{text-shadow:0 1px 0 #fff6}
.dispatch .body .text{white-space:pre-wrap}
.dispatch .body .staged{margin-top:12px;border:1px dashed #8a6a44;padding:6px 8px;font-size:12px;color:#5e5849}
.dispatch .body .rendered{margin-top:12px;padding:4px 8px;font-size:11px;color:#7a7462}
.dispatch .pending{font-size:12px;color:#6b6558}
.dispatch .cannot{width:${W}px;max-width:92vw;padding:11px;text-align:center;border:1px dashed #4a3a2a;
  border-radius:3px;color:#6b6558;font-size:13px}
.dispatch button.go{padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:15px;cursor:pointer}
.dispatch .dispatch-layout{display:grid;grid-template-columns:minmax(0,650px) minmax(280px,350px);gap:26px;width:min(1060px,96vw);align-items:start}
.dispatch .map-surface{position:relative;width:100%;border:1px solid #ad9d7a;box-shadow:0 12px 40px #0006;line-height:0}
.dispatch .map-surface canvas{display:block;width:100%;max-width:100%;border:0;border-radius:0}
.dispatch .map-hotspot{position:absolute;transform:translate(-16px,-16px);background:transparent;border:0;padding:0;min-height:36px;display:flex;align-items:center;cursor:pointer;color:#622e21;font:600 13px/1.4 system-ui;max-width:180px;text-align:left}
.dispatch .map-hotspot .dot{flex:none;width:32px;height:32px;border:2px solid #9e4933;border-radius:50%;background:#e8d5b8aa;display:grid;place-items:center;box-shadow:0 0 0 4px #9e493320}
.dispatch .map-hotspot .dot::after{content:'';width:10px;height:10px;border-radius:50%;background:#9e4933}
.dispatch .map-hotspot .place{background:#f3e8cfeb;padding:4px 8px;border-radius:2px;margin-left:3px;white-space:nowrap}
.dispatch .map-hotspot:hover .place,.dispatch .map-hotspot[aria-pressed=true] .place{background:#733e30;color:#fff4d7}
.dispatch .map-hotspot:focus-visible{outline:3px solid #173c49;outline-offset:4px}
.dispatch .mapnote{width:auto;max-width:none;margin-top:12px}
.dispatch .mapnote span{color:#a6ada5;margin-top:6px}
.dispatch .dispatch-report{min-width:0;text-align:left}
.dispatch .dispatch-report .body{width:100%;max-width:none;margin:0 0 16px;padding:24px;font-size:16px;min-height:210px;box-sizing:border-box}
.dispatch .report-heading{font:23px/1.5 Batang,serif;margin:0 0 14px;color:#4d3023;word-break:keep-all;overflow-wrap:anywhere}
.dispatch .dispatch-report .rows{width:100%;max-width:none}
.dispatch .row[aria-pressed=true]{border-color:#dfb276;background:#35443f}
.dispatch .map-help{font-size:13px;color:#d1c5a9;margin:0 0 12px}
.dispatch .cannot{width:min(1060px,96vw);max-width:none;color:#b9b6a5}
.dispatch .lag{letter-spacing:0;color:#dba57c}
.dispatch .mapnote a{color:#bcb495;font-size:10px}
.dispatch .report-art{margin:0 0 10px}.dispatch .report-art img{display:block;width:100%;max-height:26vh;object-fit:cover;border-radius:3px;filter:saturate(.85)}.dispatch .report-art figcaption{font-size:11px;opacity:.7;margin-top:3px;text-align:right}
/* 놓아 보기 — 닿은 장계를 일어난 순서로 늘어놓는 자리. 끌어 놓기(drag)는 두지
   않았다: 태블릿에서 끌기는 화면 넘기기와 자꾸 겹치고, 손이 떨리는 학생에게는
   그 길이 유일한 길이 되면 안 된다. 눌러서 자리 바꾸기 + 한 칸 단추 둘이 기본이다. */
.dispatch .order-help{width:min(650px,92vw);margin:0;font-size:15px;color:#e8e2d4;line-height:1.8;text-align:left}
.dispatch .order-aside{width:min(650px,92vw);margin:0;font-size:12px;color:#8f8a7c;line-height:1.7;text-align:left}
.dispatch .order-list{width:min(650px,92vw);margin:4px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.dispatch .order-item{display:flex;align-items:stretch;gap:8px}
.dispatch .order-card{flex:1;min-width:0;text-align:left;padding:12px 14px;background:#23282c;
  border:1px solid #6a5230;border-radius:2px;color:#e8e2d4;font-size:15px;line-height:1.6;cursor:pointer}
.dispatch .order-card[aria-pressed=true]{border-color:#dfb276;background:#35443f}
.dispatch .order-card .order-nth{display:inline-block;min-width:22px;color:#e0a23a;letter-spacing:1px}
.dispatch .order-card .order-where{color:#dfb276}
.dispatch .order-card .org{display:block;font-size:11px;color:#8f8a7c;margin-top:4px}
.dispatch .order-moves{display:flex;flex-direction:column;gap:4px}
.dispatch .order-moves button{min-width:44px;min-height:26px;padding:0;background:#23282c;
  border:1px solid #4a5258;border-radius:2px;color:#c9b98a;font-size:13px;cursor:pointer}
.dispatch .order-card:focus-visible,.dispatch .order-moves button:focus-visible,.dispatch button.go:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}
.dispatch .order-verdict{width:min(650px,92vw);text-align:left;font-size:17px;color:#e8e2d4;line-height:1.8}
.dispatch .order-truth{width:min(650px,92vw);margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.dispatch .order-truth li{text-align:left;padding:12px 14px;background:#23282c;border:1px solid #6a5230;
  border-radius:2px;color:#e8e2d4;font-size:15px;line-height:1.6}
.dispatch .order-truth .order-nth{color:#e0a23a;letter-spacing:1px}
.dispatch .order-truth .order-where{color:#dfb276}
.dispatch .order-truth .order-when{display:block;font-size:13px;color:#c9b98a;margin-top:4px}
.dispatch .order-truth .org{display:block;font-size:11px;color:#8f8a7c;margin-top:3px}
.dispatch .order-note{width:min(650px,92vw);text-align:left}
.dispatch .order-note p{margin:6px 0 0;font-size:14px;color:#b9b6a5;line-height:1.8}
@media(max-width:450px){.dispatch .order-help{font-size:14px}.dispatch .order-card{font-size:14px;padding:10px 11px}}
@media(max-width:760px){.dispatch{padding:18px 12px;justify-content:flex-start}.dispatch .dispatch-layout{grid-template-columns:1fr;gap:18px;width:100%}.dispatch .dispatch-report .body{min-height:0}.dispatch .map-hotspot{font-size:11px}.dispatch .map-hotspot .dot{width:28px;height:28px}.dispatch .mapnote{font-size:12px}}
@media(max-width:450px){.dispatch .map-hotspot{min-height:26px;transform:translate(-12px,-12px)}.dispatch .map-hotspot .dot{width:24px;height:24px}.dispatch .map-hotspot[data-at=chojijin]{flex-direction:row-reverse;transform:translate(calc(-100% + 12px),-6px)}.dispatch .map-hotspot[data-at=chojijin] .place{margin:0 3px 0 0}}
`

let styled = false

// 장계 지도 — 「지도에 표시되는 적 함대 위치는 어제의 정보다」(설계서 5장 E).
// cannotGo 한 줄이 이 장면의 전부다: 강화도가 보이는데 갈 수 없다. 그 문장을 이 화면이
// 지어내지 않는다 — 비트가 건네는 그대로만 보여준다.
export function createDispatchMap(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    show(view) {
      return new Promise(resolve => {
        const arrived = arrivedAt(view.dispatches, view.day)
        const waiting = pendingAt(view.dispatches, view.day)

        const el = document.createElement('div')
        el.className = 'dispatch'
        root.appendChild(el)

        // 놓아 보기를 먼저 내주고, 그 뒤에 예전 화면(지도와 장계)이 그대로 나온다.
        // 내줄 자리인지는 systems/dispatch.js 가 정한다 — 닿은 장계가 하나뿐이거나
        // 다 같은 날 보낸 것이면 「순서」라는 물음이 성립하지 않으므로, 그때 이 화면은
        // 예전과 한 글자도 다르지 않게 움직인다.
        if (shouldOfferOrdering(view.dispatches, view.day)) orderStep()
        else mapStep()

        // ── 놓아 보기 ──────────────────────────────────────────────
        // 2026-09-25 선생님: 「장계 도착 순서 맞추기(2·3막).」 이 화면은 원래
        // 「이 소식은 N일 전에 ○○에서 보낸 것이다」를 학생에게 읽어 주고 있었다.
        // 제 손으로 늘어놓아 보면 그 줄이 읽을 것에서 겪은 것으로 바뀐다.
        // ⚠ 점수를 매기지 않는다. 화면 어디에도 「오답」이 없다 — 못 짚었을 때
        //    설명하는 것은 학생이 아니라 거리다(orderingVerdict 의 네 갈래).
        // ⚠ 시계를 붙이지 않는다. 몇 번을 다시 놓아도 잃는 것이 없다.
        function orderStep() {
          const cards = arrivalOrder(view.dispatches, view.day)
          const rank = new Map(cards.map((d, i) => [d.id, i + 1]))
          let order = cards.map(d => d.id)
          let picked = null

          el.innerHTML = `
            <h2>${view.title}</h2>
            <p class="order-help">장계 ${cards.length}통이 닿았다. 지금은 <b>닿은 순서</b>대로 놓여 있다.</p>
            <p class="order-help">먼저 일어난 일이 위로 오도록 다시 놓아 보라. 두 장을 차례로 누르면 자리가 바뀌고, 옆의 ▲▼ 단추로 한 칸씩 옮길 수도 있다.</p>
            <p class="order-aside">장계는 일이 난 그 자리에서 띄운 것이니, 보낸 순서가 곧 일어난 순서다. 보낸 날은 아직 가려 두었다.</p>
            <ol class="order-list"></ol>
            <button class="go">이대로 놓는다</button>`

          const list = el.querySelector('.order-list')
          const at = id => order.indexOf(id)

          function swap(i, j) {
            if (i < 0 || j < 0 || i >= order.length || j >= order.length) return
            ;[order[i], order[j]] = [order[j], order[i]]
          }

          // 옮긴 뒤에는 옮긴 장계로 초점을 되돌린다 — 그러지 않으면 키보드로
          // ▲ 를 두 번 누를 수 없다(목록을 다시 그리면서 초점이 몸통으로 날아간다).
          function draw(focusId) {
            list.innerHTML = order.map((id, i) => {
              const d = cards.find(c => c.id === id)
              return `
                <li class="order-item">
                  <button class="order-card" data-id="${id}" aria-pressed="${picked === id}">
                    <span class="order-nth">${i + 1}.</span>
                    <span class="order-where">${d.placeName}</span> — ${d.headline}
                    <span class="org">닿은 순서 ${rank.get(id)}째</span>
                  </button>
                  <span class="order-moves">
                    <button class="order-up" data-id="${id}" aria-label="${d.placeName} 장계를 한 칸 위로">▲</button>
                    <button class="order-down" data-id="${id}" aria-label="${d.placeName} 장계를 한 칸 아래로">▼</button>
                  </span>
                </li>`
            }).join('')

            list.querySelectorAll('.order-card').forEach(btn => btn.addEventListener('click', () => {
              const id = btn.dataset.id
              if (picked === null) { picked = id; draw(id); return }
              if (picked === id) { picked = null; draw(id); return }
              swap(at(picked), at(id))
              picked = null
              draw(id)
            }))
            list.querySelectorAll('.order-up').forEach(btn => btn.addEventListener('click', () => {
              const i = at(btn.dataset.id)
              swap(i, i - 1)
              picked = null
              draw(btn.dataset.id)
            }))
            list.querySelectorAll('.order-down').forEach(btn => btn.addEventListener('click', () => {
              const i = at(btn.dataset.id)
              swap(i, i + 1)
              picked = null
              draw(btn.dataset.id)
            }))

            if (focusId) list.querySelector(`.order-card[data-id="${focusId}"]`)?.focus?.()
          }

          draw(null)
          el.querySelector('.go').addEventListener('click', () => truthStep(order.slice()))
        }

        function truthStep(placed) {
          const v = orderingVerdict(view.dispatches, view.day, placed)
          const rank = new Map(arrivalOrder(view.dispatches, view.day).map((d, i) => [d.id, i + 1]))
          el.innerHTML = `
            <h2>${view.title}</h2>
            <div class="order-verdict">${v.headline}</div>
            <ol class="order-truth">${v.truth.map((d, i) => `
              <li>
                <span class="order-nth">${i + 1}.</span>
                <span class="order-where">${d.placeName}</span> — ${d.headline}
                <span class="order-when">${happenedLabel(d, view.day)} · ${travelLabel(d)} · 닿은 순서 ${rank.get(d.id)}째</span>
                <span class="org">${d.origin}</span>
              </li>`).join('')}</ol>
            <div class="order-note">${v.lines.map(l => `<p>${l}</p>`).join('')}</div>
            <button class="go">장계를 펴 본다</button>`
          const next = el.querySelector('.go')
          next.addEventListener('click', mapStep)
          next.focus?.()
        }

        // ── 예전 화면 그대로 — 지도와 장계, 그리고 갈 수 없다는 한 줄 ──────
        function mapStep() {
          el.innerHTML = `
            <h2>${view.title}</h2>
            <div class="lag">${lagLabelAt(view.dispatches, view.day)}</div>
            <div class="dispatch-layout"><div>
            <p class="map-help">지도 위 지명에 마우스를 올리거나 눌러 장계를 읽으세요.</p>
            <div class="map-surface"><canvas width="${W*4}" height="${H*4}" aria-label="강화도와 한강 하구 지도"></canvas>
            ${[...new Set(arrived.map(d=>d.at))].filter(at=>PLACES[at]).map(at=>{
              const pl=PLACES[at],p=pl.offmap?{x:W*.10,y:H*.14}:project(pl.lon,pl.lat)
              return `<button class="map-hotspot" data-at="${at}" aria-pressed="false" aria-label="${pl.name} 장계 보기" style="left:${p.x/W*100}%;top:${p.y/H*100}%"><span class="dot"></span><span class="place">${pl.name}${pl.offmap?' · 지도 밖 북쪽':''}</span></button>`
            }).join('')}</div>
            <div class="mapnote">${CAPTION}<span>${APPROX} 한강 물길은 위치 이해를 위한 개략선입니다.</span><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">지도 자료: Natural Earth · Public domain</a></div>
            </div><div class="dispatch-report">
            <div class="body" aria-live="polite"><h3 class="report-heading">어느 곳의 소식부터 읽을까요?</h3><div class="text">지도에 표시된 곳만 현재 도착한 장계가 있습니다. 지명이나 아래 목록을 선택하면 이 자리에 보고가 펼쳐집니다.</div></div>
            <div class="rows">${arrived.map(d => `
              <button class="row" data-id="${d.id}" aria-pressed="false">${d.placeName} — ${d.headline}
                <span class="org">${d.origin}</span></button>`).join('')
              || '<div class="pending">아직 아무 장계도 닿지 않았다.</div>'}</div>
            <div class="pending">${waiting.length ? `아직 오지 않은 장계 ${waiting.length}통` : ''}</div>
            </div></div>
            <div class="cannot">${view.cannotGo}</div>
            <button class="go">결정하러 간다</button>`

          // 지도는 ui/ganghwa-map.js 가 그린다 — 경위도로 적힌 해안선과 자리들이다.
          // 도착한 장계가 가리키는 곳만 표지로 넘긴다.
          const g=el.querySelector('canvas').getContext('2d');g.scale(4,4)
          drawGanghwa(g, W, H, [])

          const body = el.querySelector('.body')
          function showReport(d) {
              if(!d)return
              body.hidden = false
              body.innerHTML = ''
              const heading=document.createElement('h3');heading.className='report-heading';heading.textContent=d.headline;body.appendChild(heading)
              // 장계가 가리키는 배 — 재구성 그림(ui/scene-art-data.js). 글로만 「이양선」이라 읽던 것을 눈으로 본다.
              const art=d.art&&SCENE_ART[d.art]
              if(art){const fig=document.createElement('figure');fig.className='report-art'
                fig.innerHTML=`<img src="${art.src}" alt="${art.alt}"><figcaption>${art.caption}</figcaption>`
                fig.querySelector('img').addEventListener('error',()=>fig.remove());body.appendChild(fig)}
              const text = document.createElement('div')
              text.className = 'text'
              text.textContent = `${d.body}\n\n${d.origin}`
              body.appendChild(text)
              // grade 를 읽어 재구성·번역 고지를 낸다 — 예전엔 이 화면이 grade 를
              // 아예 안 읽어, 장계 본문을 지어냈어도(grade: 'staged') 아무 표시가
              // 없었다(2단계 Important 3 부속). noticeFor()(dialog.js)를 그대로 쓴다 —
              // 카드든 장계든 같은 규칙으로 정직 고지를 고른다.
              body.insertAdjacentHTML('beforeend', noticeFor(d))
              el.querySelectorAll('.map-hotspot').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.at===d.at)))
              el.querySelectorAll('.row').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===d.id)))
          }
          el.querySelectorAll('.row,.map-hotspot').forEach(btn => {
            const select=()=>showReport(btn.dataset.id?arrived.find(d=>d.id===btn.dataset.id):arrived.filter(d=>d.at===btn.dataset.at).at(-1))
            for(const event of ['pointerenter','focus','click'])btn.addEventListener(event,select)
          })

          // 이 한 번이 이 화면의 유일한 resolve 다. 놓아 보기를 몇 번 거치든,
          // main.js 의 playDispatch() 가 기다리는 약속은 여기서 딱 한 번 풀린다.
          el.querySelector('.go').addEventListener('click', () => { el.remove(); resolve() })
        }
      })
    },
  }
}
