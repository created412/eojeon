import { SCENE_ART } from './scene-art-data.js'
import { arrivedAt, pendingAt, lagLabelAt } from '../systems/dispatch.js'
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
        root.appendChild(el)

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

        el.querySelector('.go').addEventListener('click', () => { el.remove(); resolve() })
      })
    },
  }
}
