import { SCENE_ART } from './scene-art-data.js'
import {
  arrivedAt, pendingAt, lagLabelAt,
  arrivalOrder, shouldOfferOrdering, orderingVerdict, happenedLabel, travelLabel,
  travelShortLabel, belongsAt, allPlaced,
  isInHappenedOrder, orderingHint,
} from '../systems/dispatch.js'
import { noticeFor } from './dialog.js'
import { drawGanghwa, MAP_W, MAP_H, CAPTION, APPROX, PLACES, project } from './ganghwa-map.js'

const W = MAP_W
const H = MAP_H

// ── 한 화면이 된 장계 (2026-09-27) ────────────────────────────────────────
//
// 2026-09-27 선생님:
//   「1. 장계를 힉스필드 써서 진짜 장계 올라온 거처럼 만들라는 게 하나도 반영이
//    안 되었어. 장계 순서 펴 보는 거랑 지도에서 장계의 위치 찾아보는 걸 하나로
//    합치는 게 좋을 것 같아.」
//
// 두 가지를 이르신 것이고, 둘 다 맞았다.
//
// (가) 종이가 안 보였다. 어제까지 카드 밑에 --janggye-wide 를 깔아 두고 「장계
//      종이를 깔았다」고 적어 두었지만, 화면에 뜬 것은 누런 얼룩 한 칸이었다.
//      까닭은 셋이 겹친 것이다 — ① 먹이 종이빛과 거의 같은 엷은 회색이라 붓줄이
//      안 보였고, ② 그 위에 반투명 크림빛(linear-gradient 0.55 알파)을 한 겹 더
//      덮어 남은 대비마저 지웠고, ③ background-size:100% auto + center 라 카드에
//      보이는 것은 종이 한복판을 가로로 베어 낸 띠뿐이어서, 장계임을 알려 주는
//      것들(찢긴 가장자리·접힌 자국·붉은 인장)이 전부 칸 밖으로 잘려 나갔다.
//      그래서 종이를 다시 그리고(tools/pack-paper.py 머리말), 덧칠을 걷어 내고,
//      종이 한 장이 칸을 **통째로** 덮게 했다. 장계는 두 모습으로 온다 —
//      묶여 봉한 채로 왔다가, 학생이 누르면 펴진다.
//
// (나) 두 화면이 따로 있었다. 「일어난 순서로 놓아 보기」를 다 하고 나서야 지도가
//      나왔다. 그래서 학생에게 이 둘은 남남이었다 — 순서는 카드놀이였고 지도는
//      구경거리였다. 이제 하나다: 장계를 펴 읽고 → **지도에서 그 장계가 올라온
//      자리를 찾아 놓고** → 일어난 순서로 줄을 세운다. 지도 위 표지에 그 줄의
//      번호가 함께 뜨므로, 학생이 세운 순서는 지도 위에 그려진다. 마지막에
//      참된 순서를 밝힐 때에도 화면은 그대로다 — 같은 지도 위에 각 장계가 한양까지
//      며칠 걸렸는지가 선으로 그어진다. 「소식은 거리만큼 늦게 온다」를 말로
//      읽히지 않고 지도에서 보게 하는 것이 이 장면의 전부다.
//
// 지키기로 한 것들(하나도 바꾸지 않았다):
//   · 어긋난 순서로는 넘어가지 않는다. 대신 갈수록 더 말해 준다(orderingHint 세 단).
//   · 같은 날 떠난 장계 둘의 앞뒤는 어느 쪽이어도 좋다(isInHappenedOrder).
//   · 「오답·정답·점수·실패」는 한 글자도 없다. 못 짚었을 때 설명하는 것은 거리다.
//   · 순서를 묻는 자리인지는 systems 가 정한다(shouldOfferOrdering).
//   · 끌어 놓기(drag)는 없다. 눌러서 고르고 눌러서 놓는다 — 태블릿에서 끌기는
//     화면 넘기기와 겹치고, 손이 떨리는 학생에게 그 길이 유일한 길이 되면 안 된다.
//   · 시계가 없다. 몇 번을 다시 놓아도 잃는 것이 없다.
//   · 장계 본문·출처·지연 일수는 data/acts.js 의 글자 그대로다.

const CSS = `
.dispatch{position:fixed;inset:0;z-index:52;background:#0f1113ee;display:flex;
  flex-direction:column;align-items:center;justify-content:safe center;gap:10px;padding:24px;overflow:auto}
.dispatch h2{margin:0;font:400 var(--read-label,15px)/1.4 var(--face-display,Batang,serif);
  color:var(--paper-quiet,#8f8a7c);letter-spacing:var(--read-track,.12em)}
.dispatch .lag{font-size:var(--read-small,13px);color:#dba57c;line-height:var(--read-lh-small,1.7)}
.dispatch .map-help{width:min(1180px,96vw);margin:0;font-size:var(--read-body,15px);
  line-height:var(--read-lh-body,1.8);color:var(--paper-strong,#e8e2d4);text-align:left;word-break:keep-all}
.dispatch .map-help b{color:#f0cf8e}
.dispatch .order-aside{width:100%;margin:0;font-size:var(--read-small,12px);
  line-height:var(--read-lh-small,1.7);color:var(--paper-quiet,#8f8a7c);text-align:left;word-break:keep-all}

/* 지도와 장계를 한 판에 놓는다 — 왼쪽이 지도, 오른쪽이 장계 더미다.
   좁은 화면에서는 위아래로 선다(아래 @media). 지도가 먼저 오는 까닭은,
   장계를 놓을 자리가 먼저 보여야 「어디서 왔나」라는 물음이 서기 때문이다. */
.dispatch .dispatch-layout{display:grid;grid-template-columns:minmax(0,560px) minmax(320px,540px);
  gap:24px;width:min(1180px,96vw);align-items:start}
/* 지도는 붙어 있는다 — 장계를 여러 통 읽느라 아래로 내려가도 놓을 자리가 눈앞에
   남아야 한 화면이다. 좁은 화면(아래 @media)에서는 위아래로 서므로 풀어 준다. */
.dispatch .map-column{position:sticky;top:0}
.dispatch .map-surface{position:relative;width:100%;border:1px solid #ad9d7a;box-shadow:0 12px 40px #0006;line-height:0}
.dispatch .map-surface canvas{display:block;width:100%;max-width:100%;border:0;border-radius:0}
.dispatch .map-pins{position:absolute;inset:0}
.dispatch .map-hotspot{position:absolute;transform:translate(-16px,-16px);background:transparent;border:0;padding:0;
  min-height:36px;display:flex;align-items:center;cursor:pointer;color:#622e21;
  font:600 var(--read-caption,13px)/1.35 var(--face-body,system-ui);max-width:200px;text-align:left}
.dispatch .map-hotspot .dot{flex:none;width:32px;height:32px;border:2px solid #9e4933;border-radius:50%;
  background:#e8d5b8aa;display:grid;place-items:center;box-shadow:0 0 0 4px #9e493320}
.dispatch .map-hotspot .dot::after{content:'';width:10px;height:10px;border-radius:50%;background:#9e4933}
/* 학생이 세운 순서는 지도 위에 번호로 뜬다 — 이것이 「두 화면을 하나로」의 핵심이다.
   줄에서 장계를 한 칸 올리면 지도의 번호가 곧바로 따라 바뀐다. */
.dispatch .map-hotspot .dot[data-nth]{background:#9e4933;border-color:#f3e8cf}
.dispatch .map-hotspot .dot[data-nth]::after{content:attr(data-nth);width:auto;height:auto;border-radius:0;
  background:none;color:#fff4d7;font:700 var(--read-label,15px)/1 var(--face-body,system-ui)}
.dispatch .map-hotspot .place{background:#f3e8cfeb;padding:4px 8px;border-radius:2px;margin-left:3px;white-space:nowrap}
.dispatch .map-hotspot .place b{color:#7a2f1c}
.dispatch .map-hotspot:hover .place,.dispatch .map-hotspot.lit .place{background:#733e30;color:#fff4d7}
.dispatch .map-hotspot:hover .place b,.dispatch .map-hotspot.lit .place b{color:#f6c98f}
.dispatch .map-hotspot:focus-visible{outline:3px solid #173c49;outline-offset:4px}
.dispatch .mapnote{width:100%;margin-top:10px;font-size:var(--read-caption,12px);
  line-height:var(--read-lh-small,1.6);color:#c9b98a;text-align:left}
.dispatch .mapnote span{display:block;color:#a6ada5;margin-top:5px}
.dispatch .mapnote a{color:#bcb495;font-size:var(--read-caption,10px)}
.dispatch .dispatch-report{min-width:0;text-align:left;display:flex;flex-direction:column;gap:9px}

/* 장계 줄. 순서가 곧 학생의 답이므로 <ol> 이다. */
.dispatch .order-list{width:100%;margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px}
.dispatch .order-item{display:flex;align-items:stretch;gap:8px}
.dispatch .order-card{flex:1;min-width:0;text-align:left;padding:16px 20px 18px;
  font-size:var(--read-body,15px);line-height:var(--read-lh-body,1.7);cursor:pointer;
  display:block;font-family:var(--face-body,system-ui);word-break:keep-all;overflow-wrap:anywhere}
.dispatch .order-card .order-nth{display:inline-block;min-width:24px;color:#8a3d1c;
  font:700 var(--read-body,15px)/1 var(--face-display,Batang,serif)}
.dispatch .order-card .order-where{color:#6b3b22;font-weight:700}
/* 장계 본문 — 이 줄이 있어야 이 물음이 「읽으면 풀리는」 물음이 된다. 포를 쏘았다가
   있고 나서야 올라와 빼앗아 갔다가 있을 수 있다. 표제만 보고 찍게 두지 않는다. */
.dispatch .order-card .order-text{display:block;margin-top:6px;font-size:var(--read-body,14px);
  color:var(--ink-strong,#2b261d);line-height:var(--read-lh-body,1.75);word-break:keep-all}
.dispatch .order-card .org{display:block;font-size:var(--read-small,11px);
  color:var(--ink-quiet,#4b4232);margin-top:6px;line-height:var(--read-lh-small,1.6)}
/* 어디서 올라온 장계인가 — 지도에서 찾아 놓는 자리. 비어 있을 때는 할 일을
   적고, 놓고 나면 놓인 자리를 적는다. 나무라는 말은 어느 쪽에도 없다. */
.dispatch .order-card .order-at{display:block;margin-top:9px;font-size:var(--read-small,12px);
  line-height:var(--read-lh-small,1.6);color:#6b3b22;font-weight:700}
.dispatch .order-card .order-at.empty{color:#7a4a2c;font-weight:400;border-top:1px dashed #a8794c;padding-top:7px}
.dispatch .order-card .order-when{display:block;margin-top:8px;font-size:var(--read-small,13px);
  color:#5d3a17;font-weight:700;line-height:var(--read-lh-small,1.6)}
.dispatch .order-card .staged,.dispatch .order-card .rendered{display:block;margin-top:8px;
  font-size:var(--read-small,11px);color:var(--ink-quiet,#4b4232);line-height:var(--read-lh-small,1.6)}
.dispatch .order-card .staged{border:1px dashed #9a6a3e;padding:6px 9px}
/* 장계가 가리키는 배 — 재구성 그림(ui/scene-art-data.js). 글로만 「이양선」이라
   읽던 것을 눈으로 본다. 종이 위에 붙인 사진처럼 앉힌다. */
.dispatch .report-art{display:block;margin:10px 0 0}
.dispatch .report-art img{display:block;width:100%;max-height:19vh;object-fit:cover;
  border:1px solid #8a7550;filter:saturate(.85)}
.dispatch .report-cap{display:block;font-size:var(--read-caption,11px);
  color:var(--ink-quiet,#4b4232);margin-top:4px;text-align:right}
.dispatch .order-moves{display:flex;flex-direction:column;gap:5px;justify-content:center}
.dispatch .order-moves button{min-width:46px;min-height:34px;padding:0;background:#23282c;
  border:1px solid #4a5258;border-radius:2px;color:#c9b98a;font-size:var(--read-label,13px);cursor:pointer}
.dispatch .order-card:focus-visible,.dispatch .order-moves button:focus-visible,
.dispatch button.go:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}

/* 화면이 건네는 한 줄. 붉은색도, 느낌표도, 「몇 번째」도 없다 — 나무라는 줄이
   아니라 갈수록 더 말해 주는 줄이다(systems/dispatch.js orderingHint).
   aria-live 로 두어, 화면을 눈으로 좇지 않는 학생에게도 그 자리에서 읽힌다.
   ⚠ 이 마디는 다시 그리지 않는다 — 노드를 갈아 끼우면 읽어 주는 장치가 침묵한다. */
.dispatch .order-hint{width:100%;margin:0;text-align:left;font-size:var(--read-body,15px);
  line-height:var(--read-lh-body,1.8);color:#f2e7cc;background:#2a2e26;border-left:3px solid #c9a24a;
  border-radius:2px;padding:12px 15px;word-break:keep-all}
.dispatch .order-hint:empty{display:none;padding:0;border:0}
.dispatch .order-verdict{width:100%;text-align:left;font-size:var(--read-lead,17px);
  line-height:var(--read-lh-body,1.8);color:var(--paper-strong,#e8e2d4);word-break:keep-all}
.dispatch .order-note p{margin:6px 0 0;font-size:var(--read-body,14px);
  line-height:var(--read-lh-body,1.8);color:#b9b6a5;word-break:keep-all}
.dispatch .pending{font-size:var(--read-small,12px);color:var(--paper-quiet,#6b6558);
  line-height:var(--read-lh-small,1.6)}
/* 재구성 고지 — 카드에 깔린 종이는 그 무렵 장계의 모습을 되살린 그림이지,
   여기 옮긴 바로 그 장계를 찍은 사진이 아니다. 그 말을 화면이 스스로 한다. */
.dispatch .order-recon{width:100%;margin:2px 0 0;text-align:left;font-size:var(--read-small,11px);
  color:var(--paper-quiet,#7a7462);line-height:var(--read-lh-small,1.7);word-break:keep-all}
.dispatch .cannot{width:min(1180px,96vw);padding:12px;text-align:center;border:1px dashed #4a3a2a;
  border-radius:3px;color:#b9b6a5;font-size:var(--read-small,13px);line-height:var(--read-lh-small,1.6)}
.dispatch button.go{padding:13px 30px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:var(--read-body,15px);font-family:var(--face-body,system-ui);cursor:pointer}

/* ── 장계 한 통 = 종이 한 장 ──────────────────────────────────────────────
   ⚠ 그림은 **종이**지, 글이 아니다. 종이에 그려진 한문은 읽으라고 둔 것이 아니고,
     학생이 읽는 장계는 언제나 진짜 DOM 글자다(.order-text). 그림이 안 실린
     빌드에서는 var(--janggye-open) 이 없어 background-image 한 줄이 통째로 무효가
     되고, 바로 앞에 적어 둔 단색 종이빛(#e9dfc6)만 남는다 — 글은 하나도 안 사라진다.
   ⚠ background-size 는 **100% 100%** 다. 세 가지를 다 대 봤고, 앞의 둘은 안 되었다.
       cover      — 종이를 몇 배로 키운다. 찢긴 가장자리가 글 밑에 깔려 첫 줄이
                    잘려 보인다(2026-09-26 선생님 지적 7번).
       100% auto  — 폭만 맞추고 높이는 제 비율대로 두니, 납작한 카드에 보이는 것은
                    종이 한복판을 베어 낸 띠뿐이었다. 찢긴 가장자리도, 접힌 자국도,
                    붉은 인장도 전부 칸 밖이었다 — 「하나도 반영이 안 되었어」의 정체다.
       100% 100%  — 종이 한 장을 칸에 **통째로** 편다. 가로로 넓게 그린 그림이라
                    (987x469, 카드와 비슷한 비) 눌리는 정도가 눈에 띄지 않고,
                    가장자리·접힌 자국·인장이 다 남는다.
   ⚠ 종이 위에 반투명 덧칠을 하지 않는다. 어제의 linear-gradient 한 겹이 붓줄을
     지웠다. 글이 안 읽힐까 봐 덮는 대신, 글자에 종이빛 그림자를 둘러 띄운다
     (text-shadow) — 종이는 종이대로 남고 글은 글대로 뜬다. */
.dispatch .janggye,.dispatch li.janggye{background:#e9dfc6;color:#241f17;border:0;border-radius:1px;
  background-image:var(--janggye-open);background-size:100% 100%;
  background-position:center;background-repeat:no-repeat;
  box-shadow:0 10px 26px #000a;
  text-shadow:0 1px 0 #fbf5e6,0 0 7px #fbf5e6,0 0 12px #fbf5e6cc}
.dispatch .janggye:hover{box-shadow:0 12px 30px #000c,0 0 0 2px #c08a4c66}
.dispatch .janggye[aria-pressed=true]{box-shadow:0 0 0 3px #9e4933,0 12px 30px #000c}
/* 봉한 장계 — 파발이 막 내려놓은 것이다. 접어 묶고 붉은 인장으로 봉해 놓았다.
   누르면 펴진다. 이 한 동작이 「장계가 도착했다」를 손에 쥐여 주는 자리다. */
.dispatch .janggye-sealed{background:#cfc2a8;background-image:var(--janggye-sealed);
  background-size:100% 100%;background-position:center;background-repeat:no-repeat;
  min-height:96px;display:flex;align-items:center;justify-content:flex-end;
  padding:14px 5% 14px 20px;text-shadow:none}
.dispatch .janggye-sealed .sealed-label{background:#f6efdfe8;border-radius:2px;padding:7px 12px;
  color:#4a3524;font-size:var(--read-small,13px);line-height:1.5;max-width:54%;text-align:right;word-break:keep-all}
.dispatch .janggye-sealed .sealed-label b{display:block;color:#7a2f1c;font-size:var(--read-body,14px)}
/* 펴지는 한순간. 시계가 아니다 — 학생을 재촉하지 않고, 아무것도 재지 않는다.
   움직임을 줄여 달라고 해 둔 기기에서는 그냥 펴진 채로 뜬다. */
@keyframes dispatch-unfold{from{transform:scaleY(.18);opacity:.35}to{transform:scaleY(1);opacity:1}}
.dispatch .just-opened{animation:dispatch-unfold .34s ease-out;transform-origin:top center}
@media(prefers-reduced-motion:reduce){.dispatch .just-opened{animation:none}}

@media(max-width:900px){
  .dispatch .dispatch-layout{grid-template-columns:1fr;gap:18px;width:100%}
  .dispatch .map-column{position:static}
}
@media(max-width:760px){
  .dispatch{padding:18px 12px;justify-content:flex-start}
  .dispatch .map-help,.dispatch .order-aside,.dispatch .cannot{width:100%}
  .dispatch .map-hotspot{font-size:var(--read-caption,11px);max-width:150px}
  .dispatch .map-hotspot .dot{width:28px;height:28px}
  .dispatch .order-card{padding:13px 15px 15px}
}
@media(max-width:450px){
  .dispatch .map-hotspot{min-height:26px;transform:translate(-12px,-12px)}
  .dispatch .map-hotspot .dot{width:24px;height:24px}
  .dispatch .map-hotspot[data-at=chojijin]{flex-direction:row-reverse;transform:translate(calc(-100% + 12px),-6px)}
  .dispatch .map-hotspot[data-at=chojijin] .place{margin:0 3px 0 0}
  .dispatch .order-moves button{min-width:44px}
}
`

let styled = false

// 카드 밑에 깔린 종이에 대한 고지. 다른 재구성 고지(ui/dialog.js 의 noticeFor)와
// 같은 규칙을 따른다 — 재구성을 사실로 읽히게 두지 않는다. 그림은 그 무렵 장계가
// 어떤 모습이었는지를 되살린 것이고, 여기 옮겨 적은 그 장계를 찍은 사진이 아니다.
// 그림 속 글씨도 읽으라고 둔 것이 아니다(학생이 읽는 장계는 언제나 진짜 글자다).
const PAPER_NOTE = '※ 장계 종이는 그 무렵 장계가 어떤 모습이었는지를 되살린 재구성 그림입니다(Higgsfield 로 그렸습니다). 여기 옮긴 바로 그 장계를 찍은 사진이 아니며, 종이에 그려진 글씨는 읽으라고 둔 것이 아닙니다.'

// 재구성·번역 고지는 ui/dialog.js 의 noticeFor() 가 짓는다(카드든 장계든 같은 규칙으로
// 고른다 — 화면이 고지 문구를 지어내지 않는다). 다만 그것이 앉을 자리가 <button> 안이라,
// 감싼 <div> 를 <span> 으로 바꿔 끼운다. **글자는 한 글자도 건드리지 않는다** —
// 바꾸는 것은 껍데기 태그뿐이다. 버튼 안에 <div> 를 넣으면 브라우저마다 줄바꿈이
// 제각각이 되고, 무엇보다 그것은 규격에 맞지 않는 HTML 이다.
const asSpan = html => html.replace(/<div /g, '<span ').replace(/<\/div>/g, '</span>')

// 지도 밖 자리(평양)는 지도 왼쪽 위 귀퉁이에 세운다 — 「여기서 북쪽으로 사백 리」다.
function pointOf(at) {
  const pl = PLACES[at]
  if (!pl) return null
  return pl.offmap ? { x: W * 0.10, y: H * 0.14 } : project(pl.lon, pl.lat)
}

// 장계 지도 — 「지도에 표시되는 적 함대 위치는 어제의 정보다」(설계서 5장 E).
// cannotGo 한 줄이 이 장면의 바탕이다: 강화도가 보이는데 갈 수 없다. 그 문장을 이
// 화면이 지어내지 않는다 — 비트가 건네는 그대로만 보여준다.
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
        const cards = arrivalOrder(view.dispatches, view.day)
        const byId = new Map(cards.map(d => [d.id, d]))
        const rank = new Map(cards.map((d, i) => [d.id, i + 1]))
        // 지도에 표지를 세울 자리 — 닿은 장계가 가리키는 곳만이다. 아직 오지 않은
        // 일은 임금도 이 화면도 모른다.
        const spots = [...new Set(arrived.map(d => d.at))].filter(at => PLACES[at])

        // 순서를 묻는 자리인지는 systems 가 정한다 — 닿은 장계가 하나뿐이거나 다
        // 같은 날 보낸 것이면 「순서」라는 물음 자체가 성립하지 않는다. 그때 이
        // 화면은 장계를 펴 읽고 지도에서 자리를 찾는 데까지만 하고 끝난다.
        const ordering = shouldOfferOrdering(view.dispatches, view.day)

        // ── 이 화면이 들고 있는 것 전부 ──────────────────────────────────
        const opened = new Set()            // 펴 본 장계
        const placedAt = new Map()          // 장계 → 지도에서 놓은 자리
        let order = cards.map(d => d.id)    // 학생이 세운 줄. 처음에는 닿은 순서다.
        let picked = null                   // 손에 든 장계
        let tries = 0                       // 말의 단을 정할 뿐이다. 화면에 안 나간다.
        let phase = 'place'                 // 'place' → 'truth'
        let verdict = null
        let justOpened = null               // 방금 펴진 장계 — 펴지는 한순간을 준다
        let note = ''                       // 화면이 건네는 한 줄
        let done = false

        const el = document.createElement('div')
        el.className = 'dispatch'
        root.appendChild(el)

        // 판을 한 번만 세운다. 다시 그리는 것은 안쪽(장계 줄·지도 표지·한 줄)뿐이라,
        // aria-live 를 단 마디가 살아남는다 — 노드를 갈아 끼우면 읽어 주는 장치가
        // 그 자리에서 침묵한다.
        el.innerHTML = `
          <h2>${view.title}</h2>
          <div class="lag" hidden></div>
          <p class="map-help"></p>
          <div class="dispatch-layout">
            <div class="map-column">
              <div class="map-surface">
                <canvas width="${W * 4}" height="${H * 4}" aria-label="강화도와 한강 하구 지도"></canvas>
                <div class="map-pins"></div>
              </div>
              <div class="mapnote">${CAPTION}<span>${APPROX} 한강 물길은 위치 이해를 위한 개략선입니다.</span><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">지도 자료: Natural Earth · Public domain</a></div>
            </div>
            <div class="dispatch-report">
              <p class="order-aside"></p>
              <ol class="order-list"></ol>
              <p class="order-hint" role="status" aria-live="polite"></p>
              <div class="order-note"></div>
              <div class="pending">${waiting.length ? `아직 오지 않은 장계 ${waiting.length}통` : ''}</div>
              <p class="order-recon">${PAPER_NOTE}</p>
            </div>
          </div>
          <div class="cannot">${view.cannotGo}</div>
          <button class="go"></button>`

        const help = el.querySelector('.map-help')
        const aside = el.querySelector('.order-aside')
        const list = el.querySelector('.order-list')
        const pins = el.querySelector('.map-pins')
        const hint = el.querySelector('.order-hint')
        const noteBox = el.querySelector('.order-note')
        const lagLine = el.querySelector('.lag')
        const go = el.querySelector('.go')
        const g = el.querySelector('canvas').getContext('2d')

        const at = id => order.indexOf(id)
        const isPlaced = id => belongsAt(byId.get(id), placedAt.get(id))
        const allOpened = () => cards.every(d => opened.has(d.id))
        const allOnMap = () => allPlaced(view.dispatches, view.day, placedAt)

        // ── 지도 ────────────────────────────────────────────────────────
        // 해안선은 ui/ganghwa-map.js 가 그린다 — 경위도로 적힌 자리들이다. 이 화면이
        // 그 위에 더하는 것은 마지막 한 가지뿐이다: 장계가 한양까지 온 길.
        function paintMap() {
          g.setTransform(4, 0, 0, 4, 0, 0)
          drawGanghwa(g, W, H, [])
          if (phase !== 'truth') return
          const home = pointOf('hanyang')
          if (!home) return
          g.save()
          g.setLineDash([5, 4])
          g.lineWidth = 1.6
          g.strokeStyle = '#9e4933cc'
          for (const d of arrived) {
            const p = pointOf(d.at)
            if (!p) continue
            g.beginPath()
            g.moveTo(p.x, p.y)
            // 살짝 휜 선 — 곧은 선은 지도의 물길과 헷갈린다
            g.quadraticCurveTo((p.x + home.x) / 2, (p.y + home.y) / 2 - 20, home.x, home.y)
            g.stroke()
          }
          g.restore()
        }

        // 지도 표지. 놓인 장계가 있으면 학생이 세운 줄의 번호가 표지 안에 뜨고,
        // 참된 순서를 밝힌 뒤에는 그 장계가 닿는 데 걸린 날수가 지명 곁에 붙는다.
        function paintPins() {
          pins.innerHTML = spots.map(place => {
            const pl = PLACES[place]
            const p = pointOf(place)
            const here = order.find(id => isPlaced(id) && byId.get(id).at === place)
            const nth = here ? order.indexOf(here) + 1 : null
            const days = phase === 'truth' && here ? ` · <b>${travelShortLabel(byId.get(here))}</b>` : ''
            const label = `${pl.name}${pl.offmap ? ' · 지도 밖 북쪽' : ''}${days}`
            const say = here
              ? `${pl.name} — 장계를 놓았다`
              : `${pl.name} — 고른 장계를 여기에 놓는다`
            return `<button class="map-hotspot" data-at="${place}" aria-pressed="${Boolean(here)}"
              aria-label="${say}" style="left:${p.x / W * 100}%;top:${p.y / H * 100}%">
              <span class="dot"${nth ? ` data-nth="${nth}"` : ''}></span>
              <span class="place">${label}</span></button>`
          }).join('')

          pins.querySelectorAll('.map-hotspot').forEach(btn => {
            btn.addEventListener('click', () => dropAt(btn.dataset.at))
            // 지도와 장계가 한 화면이라는 것을 눈으로 알린다 — 표지에 손이 닿으면
            // 거기 놓인 장계가 함께 밝아진다(그 반대도 마찬가지다).
            for (const ev of ['pointerenter', 'focus']) btn.addEventListener(ev, () => lightUp(btn.dataset.at, true))
            for (const ev of ['pointerleave', 'blur']) btn.addEventListener(ev, () => lightUp(btn.dataset.at, false))
          })
        }

        function lightUp(place, on) {
          const id = order.find(x => isPlaced(x) && byId.get(x).at === place)
          if (id) list.querySelector(`[data-id="${id}"]`)?.classList?.toggle('lit', on)
          pins.querySelector(`.map-hotspot[data-at="${place}"]`)?.classList?.toggle('lit', on)
        }

        // ── 장계 줄 ─────────────────────────────────────────────────────
        function cardHtml(id, i) {
          const d = byId.get(id)
          if (!opened.has(id)) {
            return `<button class="order-card janggye janggye-sealed" data-id="${id}"
              aria-pressed="${picked === id}" aria-label="봉한 장계를 편다">
              <span class="sealed-label"><b>봉한 장계</b>파발이 지고 온 것이다. 눌러서 편다.</span></button>`
          }

          const art = d.art && SCENE_ART[d.art]
          const figure = art
            ? `<span class="report-art"><img src="${art.src}" alt="${art.alt}"><span class="report-cap">${art.caption}</span></span>`
            : ''
          // 놓았는지, 아직인지. 「오답」이라는 말은 어느 쪽에도 없다.
          const where = isPlaced(id)
            ? `<span class="order-at">지도에 놓았다 — ${d.placeName}</span>`
            : `<span class="order-at empty">이 장계가 올라온 자리를 지도에서 찾아 누른다</span>`
          const when = `<span class="order-when">${happenedLabel(d, view.day)} · ${travelLabel(d)} · 닿은 순서 ${rank.get(id)}째</span>`
          const nth = ordering || phase === 'truth' ? `<span class="order-nth">${i + 1}.</span> ` : ''
          const inner = `${nth}<span class="order-where">${d.placeName}</span> — ${d.headline}
            <span class="order-text">${d.body ?? ''}</span>
            ${figure}
            <span class="org">${d.origin}</span>
            ${asSpan(noticeFor(d))}
            ${phase === 'truth' ? when : where}`

          if (phase === 'truth') return `<div class="order-card janggye" data-id="${id}">${inner}</div>`
          return `<button class="order-card janggye" data-id="${id}" aria-pressed="${picked === id}">${inner}</button>`
        }

        function paintList(focusSel) {
          list.innerHTML = order.map((id, i) => {
            const d = byId.get(id)
            // ▲▼ 는 순서를 묻는 자리에서만, 그리고 밝히기 전까지만 나온다.
            const moves = ordering && phase !== 'truth'
              ? `<span class="order-moves">
                   <button class="order-up" data-id="${id}" aria-label="${d.placeName} 장계를 한 칸 위로">▲</button>
                   <button class="order-down" data-id="${id}" aria-label="${d.placeName} 장계를 한 칸 아래로">▼</button>
                 </span>`
              : ''
            return `<li class="order-item">${cardHtml(id, i)}${moves}</li>`
          }).join('')

          // 그림이 깨진 빌드·느린 교실에서도 글은 남는다 — 못 싣는 그림은 지운다
          list.querySelectorAll('.report-art img').forEach(img =>
            img.addEventListener('error', () => img.closest('.report-art')?.remove()))

          list.querySelectorAll('button.order-card').forEach(btn =>
            btn.addEventListener('click', () => tapCard(btn.dataset.id)))
          list.querySelectorAll('.order-up').forEach(btn => btn.addEventListener('click', () => {
            const i = at(btn.dataset.id)
            swap(i, i - 1)
            picked = null
            render(`.order-up[data-id="${btn.dataset.id}"]`)
          }))
          list.querySelectorAll('.order-down').forEach(btn => btn.addEventListener('click', () => {
            const i = at(btn.dataset.id)
            swap(i, i + 1)
            picked = null
            render(`.order-down[data-id="${btn.dataset.id}"]`)
          }))
          for (const id of order) {
            const card = list.querySelector(`.order-card[data-id="${id}"]`)
            if (!card) continue
            for (const ev of ['pointerenter', 'focus']) card.addEventListener(ev, () => lightUp(byId.get(id).at, true))
            for (const ev of ['pointerleave', 'blur']) card.addEventListener(ev, () => lightUp(byId.get(id).at, false))
          }
          if (justOpened) {
            list.querySelector(`.order-card[data-id="${justOpened}"]`)?.classList?.add('just-opened')
            justOpened = null
          }
          // 옮긴 뒤에는 옮긴 장계로 초점을 되돌린다 — 그러지 않으면 키보드로
          // ▲ 를 두 번 누를 수 없다(줄을 다시 그리면서 초점이 몸통으로 날아간다).
          if (focusSel) (list.querySelector(focusSel) ?? el.querySelector(focusSel))?.focus?.()
        }

        function swap(i, j) {
          if (i < 0 || j < 0 || i >= order.length || j >= order.length) return
          ;[order[i], order[j]] = [order[j], order[i]]
        }

        // 장계를 누르면 — 봉한 것이면 펴지고, 펴진 것이면 손에 든다. 이미 손에 든
        // 것을 하나 더 누르면 둘의 자리가 바뀐다(예전 그대로의 자리 바꾸기다).
        function tapCard(id) {
          if (phase === 'truth') return
          if (!opened.has(id)) {
            opened.add(id)
            justOpened = id
            // ⚠ 편 장계를 곧바로 손에 들리지 않는다. 들리게 두었더니, 둘째 장을 펴고
            //    첫째 장을 눌러 읽으려는 순간 **두 장이 자리를 바꿔 버렸다** — 학생은
            //    누른 적이 없는 일이 일어난 것으로 본다. 펴는 것과 드는 것은 다른
            //    동작이다: 한 번 눌러 펴고, 한 번 더 눌러 든다.
            picked = null
            note = allOpened()
              ? '펴 보았다. 이제 장계를 하나 눌러 든 뒤, 그 장계가 올라온 자리를 지도에서 찾아 누른다.'
              : '펴 보았다. 남은 장계도 눌러서 펴 본다.'
            render(`.order-card[data-id="${id}"]`)
            return
          }
          if (picked === null || picked === id) {
            picked = picked === id ? null : id
            // ⚠ 지명 뒤에 조사를 붙이지 않는다 — 「강화 앞바다를」과 「초지진을」이
            //    갈리는데, 이 화면은 그 지명이 무엇일지 미리 알 수 없다.
            if (picked && !isPlaced(picked)) note = `손에 들었다. 지도에서 「${byId.get(picked).placeName}」 자리를 찾아 누르면 거기 놓인다.`
            render(`.order-card[data-id="${id}"]`)
            return
          }
          swap(at(picked), at(id))
          picked = null
          render(`.order-card[data-id="${id}"]`)
        }

        // 지도의 자리를 누르면 — 손에 든 장계를 거기 놓는다.
        function dropAt(place) {
          if (phase === 'truth') return
          if (picked === null) {
            note = '먼저 장계를 하나 골라 누른 뒤에, 그 장계가 올라온 자리를 지도에서 누른다.'
            render()
            return
          }
          const d = byId.get(picked)
          if (!belongsAt(d, place)) {
            // 짚어 주되 세지 않는다. 장계 첫 줄에 어디서 올라온 것인지가 적혀 있다.
            note = `이 장계는 「${d.placeName}」에서 올라온 것이다. 지도에서 그 자리를 찾아 눌러 보라.`
            render(`.order-card[data-id="${picked}"]`)
            return
          }
          placedAt.set(picked, place)
          const id = picked
          picked = null
          note = allOnMap()
            ? (ordering
              ? '장계가 다 제자리에 놓였다. 이제 줄을 세운다 — 먼저 일어난 일이 위로 오도록.'
              : '장계가 다 제자리에 놓였다.')
            : '놓았다. 남은 장계도 지도에서 그 자리를 찾아 놓는다.'
          render(`.order-card[data-id="${id}"]`)
        }

        // ── 다시 그린다 ─────────────────────────────────────────────────
        function render(focusSel) {
          if (phase === 'truth') {
            help.innerHTML = '같은 지도다. 장계가 각자 한양까지 며칠 걸려 왔는지를 지명 곁에 적었다 — 붉은 점선이 그 길이다.'
            aside.textContent = ''
            lagLine.hidden = false
            lagLine.textContent = lagLabelAt(view.dispatches, view.day)
            hint.textContent = ''
            noteBox.innerHTML =
              `<div class="order-verdict">${verdict.headline}</div>` +
              verdict.lines.map(l => `<p>${l}</p>`).join('')
            go.textContent = '결정하러 간다'
          } else {
            // 닿은 것이 없는 판도 있을 수 있다(첫날). 그때 빈 줄만 남겨 두면 학생은
            // 화면이 고장 난 줄 안다 — 아무것도 안 온 것이 이 장면의 내용이라고 적는다.
            help.innerHTML = cards.length === 0
              ? '아직 아무 장계도 닿지 않았다. 강화도에서 무슨 일이 있는지, 당신은 아직 모른다.'
              : ordering
                ? `장계 ${cards.length}통이 닿았다. 봉한 것을 눌러 <b>펴 보고</b>, 그 장계가 올라온 자리를 <b>지도에서 찾아 놓고</b>, 장계에 <b>적힌 일</b>을 읽어 <b>먼저 일어난 일이 위로 오도록</b> 줄을 세운다. 장계 둘을 차례로 누르면 자리가 바뀌고, 옆의 ▲▼ 단추로 한 칸씩 옮길 수도 있다.`
                : `장계 ${cards.length}통이 닿았다. 봉한 것을 눌러 <b>펴 보고</b>, 그 장계가 올라온 자리를 <b>지도에서 찾아</b> 놓는다.`
            aside.textContent = ordering
              ? '장계는 일이 난 그 자리에서 띄운 것이니, 보낸 순서가 곧 일어난 순서다. 보낸 날은 아직 가려 두었다. 지금 줄은 닿은 순서 그대로다.'
              : ''
            lagLine.hidden = true
            hint.textContent = note
            noteBox.innerHTML = ''
            go.textContent = ordering ? '이대로 놓는다' : '결정하러 간다'
          }
          paintList(focusSel)
          paintPins()
          paintMap()
        }

        // ── 「이대로 놓는다」 ────────────────────────────────────────────
        // 어긋난 채로는 다음이 오지 않는다. 다만 붙잡는 것과 벌하는 것은 다르다 —
        // 붙잡되, 갈수록 더 말해 준다(systems/dispatch.js orderingHint, 세 단).
        // 그리고 판은 그대로 남는다: 학생이 방금 무슨 생각으로 그렇게 놓았는지가
        // 화면에 남아 있어야 다음 한 수가 「고쳐 놓기」가 된다(다시 처음부터가 아니라).
        go.addEventListener('click', () => {
          if (phase === 'truth') { finish(); return }
          if (!allOpened()) {
            note = '아직 봉한 장계가 있다 — 눌러서 펴 보라.'
            render()
            return
          }
          if (!allOnMap()) {
            note = '아직 지도에 놓지 않은 장계가 있다 — 장계를 하나 고른 뒤, 그 장계가 올라온 자리를 지도에서 누른다.'
            render()
            return
          }
          if (!ordering) { finish(); return }
          const placed = order.slice()
          if (!isInHappenedOrder(view.dispatches, placed)) {
            tries += 1
            note = orderingHint(view.dispatches, view.day, placed, tries).text
            render()
            return
          }
          verdict = orderingVerdict(view.dispatches, view.day, placed)
          phase = 'truth'
          picked = null
          note = ''
          render('.go')
        })

        // 이 한 번이 이 화면의 유일한 resolve 다. 장계를 몇 번 다시 놓든,
        // main.js 의 playDispatch() 가 기다리는 약속은 여기서 딱 한 번 풀린다.
        function finish() {
          if (done) return
          done = true
          el.remove()
          resolve()
        }

        render()
      })
    },
  }
}
