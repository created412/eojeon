import { SCENE_ART } from './scene-art-data.js'
import {
  arrivedAt, pendingAt, lagLabelAt,
  arrivalOrder, shouldOfferOrdering, orderingVerdict, happenedLabel, travelLabel,
  isInHappenedOrder, orderingHint,
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
.dispatch .row .org{display:block;font-size:11px;color:#8f8a7c;margin-top:3px}
/* 장계를 담는 칸의 종이 한 벌은 이 파일 맨 아래(.janggye)에 있다 — 뒤에 오는
   규칙이 이겨야 해서 일부러 끝에 두었다. */
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
.dispatch .row[aria-pressed=true]:not(.janggye){border-color:#dfb276;background:#35443f}
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
/* 아직 아닐 때 건네는 한 줄. 붉은색도, 느낌표도, 「몇 번째」도 없다 — 이 줄은
   나무라는 줄이 아니라 갈수록 더 말해 주는 줄이다(systems/dispatch.js orderingHint).
   aria-live 로 두어, 화면을 눈으로 좇지 않는 학생에게도 그 자리에서 읽힌다. */
.dispatch .order-hint{width:min(650px,92vw);max-width:100%;margin:0;text-align:left;font-size:15px;
  line-height:1.8;color:#f2e7cc;background:#2a2e26;border-left:3px solid #c9a24a;border-radius:2px;padding:11px 14px}
.dispatch .order-hint:empty{display:none;padding:0;border:0}
/* 재구성 고지 — 카드에 깔린 종이는 그 무렵 장계의 모습을 되살린 그림이지,
   여기 옮긴 바로 그 장계를 찍은 사진이 아니다. 그 말을 화면이 스스로 한다. */
.dispatch .order-recon{width:min(650px,92vw);max-width:100%;margin:6px 0 0;text-align:left;font-size:11px;
  color:#7a7462;line-height:1.7}
.dispatch .order-list{width:min(650px,92vw);margin:4px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.dispatch .order-item{display:flex;align-items:stretch;gap:8px}
.dispatch .order-card{flex:1;min-width:0;text-align:left;padding:13px 16px 15px;background:#23282c;
  border:1px solid #6a5230;border-radius:2px;color:#e8e2d4;font-size:15px;line-height:1.6;cursor:pointer}
.dispatch .order-card .order-nth{display:inline-block;min-width:22px;color:#8a5a1e;letter-spacing:1px}
.dispatch .order-card .order-where{color:#6b3b22;font-weight:600}
/* 장계 본문 — 이 줄이 있어야 이 물음이 「읽으면 풀리는」 물음이 된다. 포를 쏘았다가
   있고 나서야 올라와 빼앗아 갔다가 있을 수 있다. 표제만 보고 찍게 두지 않는다. */
.dispatch .order-card .order-text{display:block;margin-top:5px;font-size:14px;color:#3b352a;line-height:1.75}
.dispatch .order-card .org{display:block;font-size:11px;color:#6d6350;margin-top:5px}
.dispatch .order-moves{display:flex;flex-direction:column;gap:4px}
.dispatch .order-moves button{min-width:44px;min-height:26px;padding:0;background:#23282c;
  border:1px solid #4a5258;border-radius:2px;color:#c9b98a;font-size:13px;cursor:pointer}
.dispatch .order-card:focus-visible,.dispatch .order-moves button:focus-visible,.dispatch button.go:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}
.dispatch .order-verdict{width:min(650px,92vw);text-align:left;font-size:17px;color:#e8e2d4;line-height:1.8}
.dispatch .order-truth{width:min(650px,92vw);margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.dispatch .order-truth li{text-align:left;padding:13px 16px 15px;background:#23282c;border:1px solid #6a5230;
  border-radius:2px;color:#e8e2d4;font-size:15px;line-height:1.6}
.dispatch .order-truth .order-nth{color:#8a5a1e;letter-spacing:1px}
.dispatch .order-truth .order-where{color:#6b3b22;font-weight:600}
.dispatch .order-truth .order-when{display:block;font-size:13px;color:#5d4a2c;margin-top:5px}
.dispatch .order-truth .org{display:block;font-size:11px;color:#6d6350;margin-top:3px}
.dispatch .order-note{width:min(650px,92vw);text-align:left}
.dispatch .order-note p{margin:6px 0 0;font-size:14px;color:#b9b6a5;line-height:1.8}
@media(max-width:450px){.dispatch .order-help{font-size:14px}.dispatch .order-card{font-size:14px;padding:11px 12px 13px}
  .dispatch .order-card .order-text{font-size:13px}.dispatch .order-hint{font-size:14px;padding:10px 12px}}
/* 장계 한 통 = 종이 한 장. 2026-09-26 선생님: 「장계가 그냥 텍스트가 아니라 실제
   장계같은 모습이어야하고, 힉스필드 활용해서 실제 장계처럼 만들어봐.」
   그래서 장계를 담는 칸은 어디서나 이 한 벌을 두른다 — 목록의 줄도, 놓아 보는
   카드도, 마지막에 펼쳐 보이는 참된 순서도 같은 종이다.
   ⚠ 그림은 **종이**지, 글이 아니다. 종이에 그려진 한문은 읽으라고 둔 것이 아니고,
     학생이 읽는 장계는 언제나 진짜 DOM 글자다(.order-text·.text). 그림이 안 실린
     빌드에서는 var(--janggye-wide) 가 없어 background-image 한 줄이 통째로 무효가
     되고, 바로 앞에 적어 둔 단색 종이빛(#e9dfc6)만 남는다 — 글은 하나도 안 사라진다.
   ⚠ background-size 는 cover 도 100% 100% 도 아니고 **100% auto** 다. 셋을 다 대 봤다.
       cover      — 종이를 몇 배로 키운다. 찢긴 가장자리가 글 밑에 깔려 첫 줄이
                    잘려 보인다(선생님 지적 7번, 위 .body 주석).
       100% 100%  — 카드가 납작해서 종이가 네댓 배로 눌린다. 세로 괘선이 가는 빗금이
                    되어, 멀리서 보면 그냥 누런 칸이다 — 장계로 안 보인다.
       100% auto  — 폭만 칸에 맞추고 높이는 제 비율 그대로 둔다. 칸에 보이는 것은
                    종이 한복판의 붓글씨 몇 줄이다. 종이가 커지지도, 눌리지도 않는다.
     세로로 긴 .body 는 여전히 100% 100% 다 — 거기는 종이 한 장을 통째로 펴는 자리다.
   ⚠ 이 묶음은 반드시 .row·.order-card·.order-truth li **뒤에** 와야 한다. 그것들이
     어두운 바탕을 깔아 두었고, 규칙의 힘이 같으면 뒤에 적은 쪽이 이기기 때문이다.
     .order-truth li 만 힘이 한 칸 세므로(요소 선택자) 그쪽은 따로 적어 준다.
     아래 남은 것은 폭에 따른 미세 조정뿐이고, 바탕을 다시 칠하지 않는다. */
.dispatch .janggye,.dispatch .order-truth li.janggye{background:#e9dfc6;color:#231f18;
  border:1px solid #9a835c;background-image:linear-gradient(#efe6d08c,#e4d8ba8c),var(--janggye-wide);
  background-size:100% auto;background-position:center;background-repeat:no-repeat;
  box-shadow:0 5px 16px #0006}
.dispatch .janggye .org{color:#6d6350}
.dispatch .janggye:hover{background-color:#f6efe0}
.dispatch .janggye[aria-pressed=true]{border-color:#9e4933;box-shadow:0 0 0 3px #9e49333a,0 5px 16px #0006}
.dispatch .janggye:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}
@media(max-width:760px){.dispatch{padding:18px 12px;justify-content:flex-start}.dispatch .dispatch-layout{grid-template-columns:1fr;gap:18px;width:100%}.dispatch .dispatch-report .body{min-height:0}.dispatch .map-hotspot{font-size:11px}.dispatch .map-hotspot .dot{width:28px;height:28px}.dispatch .mapnote{font-size:12px}}
@media(max-width:450px){.dispatch .map-hotspot{min-height:26px;transform:translate(-12px,-12px)}.dispatch .map-hotspot .dot{width:24px;height:24px}.dispatch .map-hotspot[data-at=chojijin]{flex-direction:row-reverse;transform:translate(calc(-100% + 12px),-6px)}.dispatch .map-hotspot[data-at=chojijin] .place{margin:0 3px 0 0}}
`

let styled = false

// 카드 밑에 깔린 종이에 대한 고지. 다른 재구성 고지(ui/dialog.js 의 noticeFor)와
// 같은 규칙을 따른다 — 재구성을 사실로 읽히게 두지 않는다. 그림은 그 무렵 장계가
// 어떤 모습이었는지를 되살린 것이고, 여기 옮겨 적은 그 장계를 찍은 사진이 아니다.
// 그림 속 글씨도 읽으라고 둔 것이 아니다(학생이 읽는 장계는 언제나 진짜 글자다).
const PAPER_NOTE = '※ 카드에 깔린 장계 종이는 그 무렵 장계가 어떤 모습이었는지를 되살린 재구성 그림입니다(Higgsfield 로 그렸습니다). 여기 옮긴 바로 그 장계를 찍은 사진이 아니며, 종이에 그려진 글씨는 읽으라고 둔 것이 아닙니다.'

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
        //
        // 2026-09-26 선생님: 「장계의 순서를 정하는거도 틀린지도 모르겠어. 제대로
        // 놓기 전까지는 안넘어가야해.」 어제까지 이 자리는 어떤 순서든 받아 주고
        // 곧바로 설명으로 넘어갔다. 이제는 어긋난 채로 넘어가지 않는다 — 대신
        // 갈수록 더 말해 준다(systems/dispatch.js 의 orderingHint, 세 단).
        //
        // 그래도 **가두지 않는다**. 이 물음은 읽으면 풀린다: 장계 본문이 일의 앞뒤를
        // 이미 적고 있고(포를 쏘았다 → 올라와 빼앗아 갔다), 세 번째부터는 가장 먼저
        // 일어난 장계를 이름으로 짚어 준다. 몇 번을 다시 놓든 세지 않고, 화면에
        // 횟수를 적지 않는다 — 학생이 제 횟수를 보며 부끄러워할 자리를 만들지 않는다.
        function orderStep() {
          const cards = arrivalOrder(view.dispatches, view.day)
          const rank = new Map(cards.map((d, i) => [d.id, i + 1]))
          let order = cards.map(d => d.id)
          let picked = null
          let tries = 0          // 말의 단을 정할 뿐이다. 화면에는 나가지 않는다.

          el.innerHTML = `
            <h2>${view.title}</h2>
            <p class="order-help">장계 ${cards.length}통이 닿았다. 지금은 <b>닿은 순서</b>대로 놓여 있다.</p>
            <p class="order-help">장계에 <b>적힌 일</b>을 읽어 보라. 어느 일이 있고 나서야 다른 일이 일어날 수 있었는지가 그 안에 적혀 있다 — 먼저 일어난 일이 위로 오도록 다시 놓는다. 두 장을 차례로 누르면 자리가 바뀌고, 옆의 ▲▼ 단추로 한 칸씩 옮길 수도 있다.</p>
            <p class="order-aside">장계는 일이 난 그 자리에서 띄운 것이니, 보낸 순서가 곧 일어난 순서다. 보낸 날은 아직 가려 두었다.</p>
            <ol class="order-list"></ol>
            <p class="order-hint" role="status" aria-live="polite"></p>
            <p class="order-recon">${PAPER_NOTE}</p>
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
                  <button class="order-card janggye" data-id="${id}" aria-pressed="${picked === id}">
                    <span class="order-nth">${i + 1}.</span>
                    <span class="order-where">${d.placeName}</span> — ${d.headline}
                    <span class="order-text">${d.body ?? ''}</span>
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

          // 「이대로 놓는다」 — 일어난 순서와 어긋나지 않을 때에만 다음이 온다.
          // 어긋났으면 판을 그대로 두고 한 줄만 건넨다. 놓인 것을 흩뜨리지 않는
          // 까닭은, 학생이 방금 무슨 생각으로 그렇게 놓았는지가 화면에 남아 있어야
          // 그 다음 한 수가 「고쳐 놓기」가 되기 때문이다(다시 처음부터가 아니라).
          const hint = el.querySelector('.order-hint')
          el.querySelector('.go').addEventListener('click', () => {
            const placed = order.slice()
            if (isInHappenedOrder(view.dispatches, placed)) { truthStep(placed); return }
            tries += 1
            hint.textContent = orderingHint(view.dispatches, view.day, placed, tries).text
          })
        }

        function truthStep(placed) {
          const v = orderingVerdict(view.dispatches, view.day, placed)
          const rank = new Map(arrivalOrder(view.dispatches, view.day).map((d, i) => [d.id, i + 1]))
          el.innerHTML = `
            <h2>${view.title}</h2>
            <div class="order-verdict">${v.headline}</div>
            <ol class="order-truth">${v.truth.map((d, i) => `
              <li class="janggye">
                <span class="order-nth">${i + 1}.</span>
                <span class="order-where">${d.placeName}</span> — ${d.headline}
                <span class="order-when">${happenedLabel(d, view.day)} · ${travelLabel(d)} · 닿은 순서 ${rank.get(d.id)}째</span>
                <span class="org">${d.origin}</span>
              </li>`).join('')}</ol>
            <div class="order-note">${v.lines.map(l => `<p>${l}</p>`).join('')}</div>
            <p class="order-recon">${PAPER_NOTE}</p>
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
              <button class="row janggye" data-id="${d.id}" aria-pressed="false">${d.placeName} — ${d.headline}
                <span class="org">${d.origin}</span></button>`).join('')
              || '<div class="pending">아직 아무 장계도 닿지 않았다.</div>'}</div>
            <div class="pending">${waiting.length ? `아직 오지 않은 장계 ${waiting.length}통` : ''}</div>
            <p class="order-recon">${PAPER_NOTE}</p>
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
