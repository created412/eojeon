import { PORTRAITS } from './portraits-data.js'
import { SCENE_ART } from './scene-art-data.js'
import { installTypeVars } from './type-css.js'
import {
  GOAL_BLOCKS, LEVY_MAX, MINT_MAX, RICE_BASE_COINS,
  villageIsFailing,
  RECON_NOTE, GOAL_NOTE, WONNAP_GLOSS, DANGBAEK_GLOSS,
  initialBoard, setLevy, setMint, stepLevy, stepMint,
  blocks, filledBlocks, goalMet, goalLabel,
  minsimLabel, minsimBar, priceLabel, priceTimes, riceCoins, levyCoin, levyWorthLine,
  levyAt, mintAt, needAt, NEED_START_AT, needLine,
  nudgeFor, summaryLine, comparison,
} from '../systems/funding.js'

// ──────────────────────────────────────────────────────────────────────────────
// 「돈을 만든다」 — 1막 마지막 자리(예전 kind:'council' 을 대신한다).
//
// 2026-09-26 선생님: 「원납전과 당백전을 선택하고 선택한 이유를 쓰는 건 교육적 의미도
// 없고 재미도 없어. 원납전과 당백전을 잘 활용하여서 다시 만들어보자.」
//
// 그래서 여기에는 고르는 단추도, 이유를 쓰는 칸도 없다. 두 지레가 있고, 학생은
// 경복궁 중건에 드는 일감 100칸이 찰 때까지 그 둘을 제 손으로 민다. 미는 동안
// 민심이 깎이고 물가가 오르고, 이미 걷어 둔 원납전의 값어치가 눈앞에서 줄어든다.
// 셈이 끝난 뒤에야 교과서가 적은 것이 나오고, 그 끝에 아버지가 뒤집는다.
//
// 판정은 하나도 여기 없다 — 전부 systems/funding.js 다(DOM 없이 시험한다).
//
// ── 계약 ─────────────────────────────────────────────────────────────────────
// createFunding(root).open(view) → Promise<result>
//
// view (모두 없어도 화면은 선다 — 기본값은 아래 DEFAULT_VIEW. acts.js 에서 덮어쓴다)
//   title        h2 에 걸리는 한 줄        예) '경 복 궁 을  다 시  짓 는 다'
//   lines        도입 문단(문자열 배열)     예) ['아직 아무것도 내려보내지 않았다. …']
//   question     막대 위에 큰 글씨로 걸리는 물음  예) '이 비용을 어디서 만드는가'
//   levy         { name, gloss, blurb }    원납전 지레의 이름·글자풀이·한 줄 설명
//   mint         { name, gloss, blurb }    당백전 지레
//   origin       출처 한 줄(셈판과 되짚기 양쪽에 나간다)
//                예) '『고종실록』 · 한국사1 pp.104~107'
//   doneLabel    100칸이 찬 뒤 단추 글      예) '이만하면 되었다 — 아버지께 아뢴다'
//   giveUpLabel  못 채운 채 멈추는 단추 글  예) '셈을 여기서 멈춘다'
//   nextLabel    되짚기의 마지막 단추 글    예) '밤이 깊었다 — 다음으로'
//   actual       { lines?: string[], line?: string, origin?: string }
//                교과서가 적은 것. 없으면 systems/funding.js 의 HISTORY_LINES.
//                ⚠ 여기에 「물가가 몇 배」를 적지 않는다 — 기록으로 정할 수 없다.
//   overturn     대원군이 뒤집는 말. 지우지 말 것 — 1막의 요점이다.
//   overturnBy   { name, portrait }  portrait 는 ui/portraits-data.js 의 열쇠
//   onPush       (state) => void  지레를 밀 때마다 부른다(소리 되먹임용, 없어도 된다)
//
// result (약속이 풀릴 때 한 번)
//   levy         원납전을 돌린 차례 수 (0~LEVY_MAX)
//   mint         당백전을 찍은 칸 수   (0~MINT_MAX)
//   price        물가 배수 (1 = 처음)
//   priceTimes   화면에 찍힌 그대로의 배수 문자열 ('2.5')
//   minsim       민심 0~100 (숫자는 화면에 나가지 않는다 — 기록용이다)
//   minsimLabel  민심을 적은 말 ('원망이 돈다')
//   filled       채운 칸 수(내림, 0~GOAL_BLOCKS 넘을 수 있다)
//   goalMet      100칸을 채웠는가
//   gaveUp       못 채운 채 멈추었는가(= !goalMet)
//   summary      학생의 셈을 적은 한 줄 — 예전 「이유 쓰기」 자리를 대신하는 기록이다
//
// ⚠ 채점하지 않는다. 이기는 배합이 없다 — 어느 길로 가도 채워지고, 어느 길로 가도
//    무엇인가 깎인다. 화면에 점수도 정답도 오답도 없다.
// ⚠ 시계가 없다. 촉박은 C1·C2·C3 세 번뿐이다 — setTimeout 하나 없다.
// ⚠ 재구성 고지(RECON_NOTE·GOAL_NOTE)와 출처가 셈판과 되짚기 양쪽에 다 나간다.
// ⚠ 끌기만으로 되는 길을 만들지 않는다. 지레는 role="slider" 라 화살표키로 밀리고,
//    +− 단추가 따로 있다. 손가락이 마음대로 움직이지 않는 학생이 갇히면 그 자리에서
//    수업이 멈춘다(ration.js 의 「손이 불편하면 건너뛴다」와 같은 규칙).
// ──────────────────────────────────────────────────────────────────────────────

const CSS = `
.funding{position:fixed;inset:0;z-index:56;background:#12100d;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:11px;padding:18px 22px;overflow:auto;text-align:center}
.funding h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:4px;font-weight:400}
.funding p{margin:0;font-size:var(--read-body,17px);color:var(--paper-body,#d8d2c2);
  line-height:var(--read-lh-body,1.72);max-width:var(--read-measure,34em);
  font-family:var(--face-body,system-ui,sans-serif);text-align:left;word-break:keep-all;text-wrap:pretty}
.funding .ask{font-size:var(--read-lead,22px);color:#f0ebdd;max-width:var(--read-measure,34em);
  line-height:var(--read-lh-title,1.45);font-family:var(--face-body,system-ui,sans-serif);
  letter-spacing:normal;word-break:keep-all}
.funding .board{width:min(880px,94vw);display:flex;flex-direction:column;gap:10px}
/* 좁은 화면에서는 지레가 화면 아래로 내려가, 미는 동안 막대와 물가가 보이지 않는다.
   그러면 이 화면이 가르치려는 것(밀면 무엇이 움직이는가)이 그대로 사라진다 —
   그래서 채울 것·물가·민심·한 줄은 위에 붙여 둔다. 스크롤 상자는 .funding 이다. */
.funding .board-top{position:sticky;top:-18px;z-index:1;background:#12100d;
  padding:6px 0 7px;display:flex;flex-direction:column;gap:9px;
  border-bottom:1px solid #3a2d20;box-shadow:0 7px 9px -7px #12100d}

/* 채울 것 — 막대는 「가진 돈」이고, 붉은 금은 「벽을 다 쌓는 데 드는 돈」이다.
   당백전을 밀면 막대가 늘고 그 금이 함께 오른쪽으로 달아난다. **막대는 절대
   물러나지 않는다** — 왜 뒤집었는지는 systems/funding.js 「결승선이 달아난다」에 있다. */
.funding .goal-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;
  font-size:14px;color:#b9b2a1;letter-spacing:1px}
.funding .goal-head strong{color:#e0a23a;font-weight:400}
.funding .goal-bar{position:relative;display:flex;height:34px;border:1px solid #6a5230;border-radius:3px;
  background:#1d1710;overflow:hidden}
/* 쌓는 층을 못박아 둔다: 돈 막대(1) 위에 금과 빗금(2), 그 아래 아직 안 열린 땅(0).
   z-index 를 안 적으면 DOM 순서대로 덮여, 금을 넘어선 막대가 가려진다. */
.funding .goal-fill{position:relative;z-index:1;height:100%;transition:width .18s ease-out}
/* 두 몫은 색과 무늬를 둘 다 다르게 한다 — 색만 다르면 색을 잘 못 가리는 학생에게는
   한 덩어리로 보인다(ration.js 낟알판과 같은 규칙). */
.funding .goal-fill.levy{background:repeating-linear-gradient(135deg,#6f5733,#6f5733 7px,#5e4a2b 7px,#5e4a2b 14px)}
.funding .goal-fill.mint{background:#e0a23a}
.funding .goal-bar.full{border-color:#e0a23a;box-shadow:0 0 0 1px #e0a23a55}
/* 결승선 너머 — 아직 일어나지 않은 물가의 땅이다. 당백전을 찍어야 열린다.
   이것이 없으면 원납전만 민 학생에게는 「거의 빈 막대」로 보인다. 자는 고정이므로
   그 빈 곳은 못 채운 몫이 아니라 **아직 치르지 않은 값**이다.
   처음에 이 땅을 바탕색보다 아주 조금만 어둡게 두었더니, 원납전만 민 화면에서 그냥
   「거의 빈 막대」로 보였다(92칸을 채우고도 20%처럼 읽힌다). 눈에 띄게 갈라 놓는다 —
   가로줄 무늬는 「아직 손대지 않은 곳」이지 「못 채운 곳」이 아니다. */
.funding .goal-beyond{position:absolute;z-index:0;top:0;bottom:0;right:0;
  background:repeating-linear-gradient(90deg,#0c0a06 0 5px,#151109 5px 10px);
  border-left:1px solid #3a2d20;transition:left .18s ease-out;pointer-events:none}
/* 물가가 결승선을 밀어낸 거리. 예전에 이 빗금은 「줄어든 몫」이었다 —
   같은 빗금에 같은 뜻이고, 움직이는 쪽만 바뀌었다.
   위 모서리에 자처럼 얇게 눕힌다. 처음에 막대 높이만큼 채웠더니 빗금이 돈 막대를
   덮어, 「번 돈의 절반이 못 쓸 돈」처럼 보였다 — 가리려던 것이 아니라 잰 거리다. */
.funding .goal-ghost{position:absolute;z-index:2;top:0;height:7px;
  background:repeating-linear-gradient(45deg,#d2503a 0 3px,#d2503a33 3px 7px);
  transition:left .18s ease-out,width .18s ease-out;pointer-events:none}
/* 결승선. 처음 자리는 흐린 점선으로 남기고, 지금 자리는 또렷한 붉은 금이다. */
.funding .goal-line{position:absolute;z-index:3;top:0;bottom:0;width:0;border-left:2px solid #d2503a;
  transition:left .18s ease-out;pointer-events:none}
.funding .goal-line.start{z-index:2;border-left:1px dashed #8a7a5e}
.funding .goal-need{font-size:var(--read-small,15px);color:#e0704f;min-height:18px;
  font-family:var(--face-body,system-ui,sans-serif);letter-spacing:normal;word-break:keep-all}
.funding .goal-keys{display:flex;justify-content:center;gap:16px;font-size:var(--read-caption,13px);
  color:var(--paper-quiet,#b3aa95);flex-wrap:wrap;font-family:var(--face-body,system-ui,sans-serif)}
.funding .goal-keys i{display:inline-block;width:11px;height:11px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.funding .goal-keys i.levy{background:#6f5733}
.funding .goal-keys i.mint{background:#e0a23a}
.funding .goal-keys i.line{border-radius:0;width:0;height:12px;border-left:2px solid #d2503a}
.funding .goal-keys i.ghost{border-radius:0;height:7px;
  background:repeating-linear-gradient(45deg,#d2503a 0 3px,#d2503a33 3px 7px)}
.funding .goal-worth{font-size:var(--read-small,15px);color:#e0704f;min-height:18px;
  font-family:var(--face-body,system-ui,sans-serif);letter-spacing:normal;word-break:keep-all}

/* 물가와 민심. 물가는 배수와 동전 줄로 두 번 보인다 — 숫자를 못 읽어도 동전 줄이
   길어지는 것은 보인다. 민심은 숫자 없이 막대와 말로만 적는다(점수가 아니다). */
.funding .gauges{display:flex;gap:11px;flex-wrap:wrap}
.funding .gauge{flex:1 1 300px;border:1px solid #3a2d20;border-radius:3px;background:#181410;
  padding:10px 13px;text-align:left;display:flex;flex-direction:column;gap:7px}
.funding .gauge h3{margin:0;font-size:12px;color:#8f8a7c;letter-spacing:3px;font-weight:400}
.funding .price-line{font-size:16px;color:#e0a23a;letter-spacing:1px}
.funding .rice-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#8f8a7c}
.funding .rice-row.then{opacity:.5}
.funding .rice-coins{display:flex;flex-wrap:wrap;gap:3px;max-width:100%}
.funding .rice-coin{width:13px;height:13px;border-radius:50%;background:#b98a3c;
  border:1px solid #d9ae5e;display:flex;align-items:center;justify-content:center}
.funding .rice-coin::after{content:'';width:4px;height:4px;background:#12100d}
.funding .rice-eq{color:#b9b2a1;letter-spacing:1px;white-space:nowrap}
.funding .minsim-bar{height:14px;border:1px solid #3a4248;border-radius:2px;background:#15181a;overflow:hidden}
.funding .minsim-bar span{display:block;height:100%;background:#5c7f6a;transition:width .18s ease-out}
.funding .minsim-word{font-size:16px;color:#e8e2d4;letter-spacing:1px}

/* 장면 그림 — 2026-09-27 선생님: 「제대로 된 게임의 형태를 만들어봐.」
   그전까지 민심은 「원망이 돈다」는 **낱말**이었고 채울 것은 빈 막대였다. 낱말과 막대는
   읽는 것이지 겪는 것이 아니다. 이제 지레를 밀면 고을 그림이 바뀌고 공사장이 올라간다 —
   학생이 보는 것은 숫자가 아니라 **응답하는 장소**다.
   ⚠ 캡션을 지우지 마라. 전부 Higgsfield 로 그린 재구성 그림이고, 그 사실이 화면에
      남아야 한다(assets/scene-art · tools/pack-scene-art.py 의 같은 규율). */
.funding .scene{margin:0;border:1px solid #3a2d20;border-radius:3px;overflow:hidden;background:#0f0c08}
/* height 를 100% 로 두면 안 된다 — 부모 높이가 auto 라 그림이 칸을 다 먹고, 그 아래
   캡션이 overflow:hidden 에 잘려 **재구성 고지가 화면에서 사라진다.** 한 번 그렇게
   찍어 놓고 「캡션이 왜 안 보이지」로 한참 헤맸다. 높이는 aspect-ratio 가 정한다. */
.funding .scene img{display:block;width:100%;object-fit:cover;
  /* 그림이 갈릴 때 탁 끊기지 않게 — 고을이 「바뀐다」로 보여야지 「깜빡인다」면 안 된다 */
  transition:opacity .22s ease-out}
.funding .scene figcaption{padding:5px 8px;font-size:var(--read-caption,12px);
  color:var(--paper-quiet,#9a9280);line-height:1.5;text-align:left;
  font-family:var(--face-body,system-ui,sans-serif);letter-spacing:normal;word-break:keep-all}
/* 공사장은 이 판의 목표다 — 가장 크게 둔다. 막대는 그 아래 눈금으로 내려간다.
   다만 한 판이 화면을 넘기면 지레에 손이 안 간다. 처음에 3/1.35 로 두었더니 판이
   1980px 이 되어 교실 화면에서 지레가 안 보였다 — 목표보다 먼저 지켜야 할 것이다. */
.funding .scene.site img{aspect-ratio:3/0.92;object-position:center 58%}
.funding .gauge .scene img{aspect-ratio:3/1.35}
.funding .lever-scene img{aspect-ratio:3/1.1}
@media(max-height:900px){.funding .scene.site img{aspect-ratio:3/0.62}}

/* ── 가로 화면은 두 칸으로 (2026-09-27) ──────────────────────────────────
   선생님: 「모바일도 가능하게 해. 가로버전으로 할 수 있게.」
   재 보니 가로 폰에서 이 판이 창의 3.6배, 태블릿에서 2배였다 — **지레가 첫 화면에
   없었다.** 그림을 줄이고 여백을 죄어도 1.7배가 한계였다. 까닭은 배치다: 공사장 →
   막대 → 게이지 둘 → 지레 둘을 **세로로 쌓으니** 가로로 누운 화면에서 넘칠 수밖에 없다.
   가로는 옆이 넓고 위아래가 좁다. 그러면 옆으로 벌려야 한다 —
     왼쪽: 무엇을 채우는가(공사장·막대·물가·고을)
     오른쪽: 무엇으로 채우는가(두 지레)
   보는 것과 하는 것이 한 화면에 나란히 놓인다. 세로 화면과 PC 는 그대로 위아래로 쌓는다.
   .board-top 의 sticky 는 여기서 푼다 — 다 보이는데 붙여 둘 까닭이 없고, 붙여 두면
   오른쪽 칸이 그 밑으로 말려 들어간다. */
@media(min-width:700px) and (max-height:900px){
  .funding .board{width:min(1240px,97vw);display:grid;gap:12px;align-items:start;
    grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .funding .board-top{position:static;border-bottom:0;box-shadow:none;padding:0}
  .funding .gauges{gap:9px}
  /* 오른쪽 칸을 붙여 둔다. 가로 화면에서는 왼쪽(보는 것)이 길어 스크롤이 생기는데,
     그때 지레까지 같이 밀려 올라가면 **조작할 것이 화면에서 사라진다** — 재 보니
     실제로 그랬다(폰에서 지레 단추 넷 중 둘이 창 밖). 보는 것은 흐르고, 하는 것은
     제자리에 있어야 한다. 「독립군의 별」에서 통한 것과 같은 수다. */
  .funding .levers{flex-direction:column;gap:9px;position:sticky;top:4px}
}

/* ── 가로로 누운 태블릿 (2026-09-27) ──────────────────────────────────────
   1180x820 가로에서 재 보니 판이 창의 2배(1644px)라 지레가 첫 화면에 없었다. 교실에서
   제일 많이 쓰는 기기가 이것이다 — 여기서 지레가 안 보이면 그림을 넣은 보람이 없다.
   그림을 반쯤 낮추고 여백을 죈다. 그림은 남되 지레가 한 화면에 들어오게. */
@media(max-height:900px){
  .funding{padding:12px 14px;gap:8px}
  .funding .scene.site img{aspect-ratio:3/0.5}
  .funding .gauge .scene img{aspect-ratio:3/0.85}
  .funding .lever-scene img{aspect-ratio:3/0.6}
  .funding .board-top{padding:4px 0 6px;gap:7px}
  .funding .gauges{gap:9px}
  /* 지레는 가로 화면에서 늘 나란히 눕는다 — 세로로 쌓으면 그것만으로 한 화면을 넘긴다. */
  .funding .levers{flex-direction:row;flex-wrap:nowrap;gap:9px}
  .funding .lever{flex:1 1 0;min-width:0}
  .funding .gauge,.funding .lever{padding:8px 11px}
  .funding p{font-size:15px;line-height:1.55}
  .funding .ask{font-size:18px}
}

/* ── 가로로 누운 손전화 (2026-09-27) ──────────────────────────────────────
   844x390 가로에서 재 보니 이 판이 창의 **3.6배**(1644px/453px)가 되어 지레 네 단추와
   멈춤 단추가 **전부 화면 밖**에 있었다. 그림을 넣어 판을 키운 값이다. 스크롤하면 닿지만
   학생에게는 그 표시가 없다 — 「독립군의 별」에서 겪은 그 증상이고, 이 판에서는 조작
   자체가 지레에 있으니 곧 「아무것도 못 하는 화면」이다.

   그래서 짧은 화면에서는 그림을 접는다. 손맛보다 **할 수 있는 것**이 먼저다.
   다만 공사장만은 얇게 남긴다 — 이 판의 목표가 무엇인지 말해 주는 유일한 그림이라,
   그것까지 지우면 다시 계기판이 된다. 태블릿·PC 배치는 그대로다.
   ⚠ 재구성 고지(.recon)와 출처(.origin)는 짧은 화면에서도 절대 감추지 않는다 —
      화면이 좁다는 것은 출처를 지워도 된다는 뜻이 아니다. */
@media(max-height:560px){
  .funding{padding:8px 12px;gap:7px;justify-content:flex-start}
  .funding .scene.site img{aspect-ratio:3/0.3}
  .funding .gauge .scene,.funding .lever-scene{display:none}
  .funding .board-top{padding:3px 0 5px;gap:6px}
  .funding .gauges,.funding .levers{gap:8px}
  .funding .gauge,.funding .lever{padding:7px 10px}
  .funding .rice-row.then{display:none}
  .funding .nudge{min-height:26px}
  .funding p{font-size:13px;line-height:1.5}
  .funding .ask{font-size:15px}
  .funding .recon{font-size:11px;line-height:1.45}
  .funding .lever-blurb{font-size:13px}
  /* 오른쪽 칸의 두 지레를 나란히 눕힌다. 세로로 쌓으면 그것만으로 한 화면을 넘긴다.
     이름과 글자풀이는 남기고 한 줄 설명은 접는다 — 지레가 무엇인지는 이름이 말한다. */
  .funding .levers{flex-direction:row;flex-wrap:nowrap;gap:7px}
  .funding .lever{flex:1 1 0;min-width:0;padding:6px 8px}
  .funding .lever-blurb{display:none}
  .funding .lever-head{font-size:15px}
  .funding .lever-head small{font-size:10.5px}
  .funding .lever-count{font-size:11.5px}
  .funding .lever-btns button{padding:9px 4px;font-size:12.5px}
  /* 언제나 보이는 단추 하나 — 스크롤을 모르는 학생도 여기서 빠져나갈 수 있다. */
  .funding .go{position:sticky;bottom:0;z-index:3;box-shadow:0 0 0 9px #12100d}
}

/* 밀고 난 뒤 판이 내미는 한 줄. 문구는 systems/funding.js 가 만든다. */
.funding .nudge{min-height:42px;display:flex;align-items:center;justify-content:center;
  font-size:var(--read-small,16px);color:#d9b876;line-height:var(--read-lh-body,1.7);
  max-width:var(--read-measure,34em);text-align:left;font-family:var(--face-body,system-ui,sans-serif);
  letter-spacing:normal;word-break:keep-all}

/* 두 지레. touch-action:none 이 없으면 태블릿에서 미는 손짓이 「화면 넘기기」로 먹혀
   지레가 한 칸도 움직이지 않는다(ration.js 낟알판에서 한 번 물린 자리다). */
.funding .levers{display:flex;gap:13px;flex-wrap:wrap}
.funding .lever{flex:1 1 300px;border:1px solid #6a5230;border-radius:3px;background:#1d1710;
  padding:12px 13px;text-align:left;display:flex;flex-direction:column;gap:7px}
.funding .lever-head{font-size:17px;color:#e8e2d4;letter-spacing:1px}
.funding .lever-head small{display:block;margin-top:3px;font-size:12px;color:#8f8a7c;letter-spacing:1px}
.funding .lever-blurb{font-size:var(--read-small,15px);color:var(--paper-body,#d0c9b8);
  line-height:var(--read-lh-small,1.65);min-height:42px;font-family:var(--face-body,system-ui,sans-serif);
  letter-spacing:normal;text-align:left;word-break:keep-all}
.funding .lever-track{position:relative;height:34px;border:1px solid #6a5230;border-radius:3px;
  background:#15110c;touch-action:none;cursor:ew-resize;overflow:hidden}
.funding .lever-track:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}
.funding .lever-fill{position:absolute;inset:0 auto 0 0;background:#6a5230;transition:width .12s ease-out}
.funding .lever-track::after{content:'← →';position:absolute;right:8px;top:50%;transform:translateY(-50%);
  font-size:12px;color:#7a6242;letter-spacing:2px;pointer-events:none}
.funding .lever-ticks{position:absolute;inset:0;display:flex}
.funding .lever-ticks i{flex:1 1 0;border-right:1px solid #3f2f1e}
.funding .lever-ticks i:last-child{border-right:0}
.funding .lever-count{font-size:14px;color:#e0a23a;letter-spacing:1px}
.funding .lever-btns{display:flex;gap:8px}
.funding .lever-btns button{flex:1 1 0;padding:11px 8px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:14px;cursor:pointer}
.funding .lever-btns button[disabled]{opacity:.4;cursor:not-allowed}
.funding .lever-btns button:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}

.funding .recon{font-size:var(--read-caption,14px);color:var(--paper-quiet,#b3aa95);max-width:var(--read-measure,34em);
  line-height:var(--read-lh-small,1.65);text-align:left;font-family:var(--face-body,system-ui,sans-serif);
  letter-spacing:normal;word-break:keep-all}
.funding .origin{font-size:var(--read-small,14px);color:var(--paper-quiet,#b3aa95);
  font-family:var(--face-body,system-ui,sans-serif);letter-spacing:normal}
.funding .go{padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:15px;cursor:pointer;letter-spacing:1px}
.funding .go.ready{background:#5a4324;border-color:#e0a23a;color:#f2d79b}
.funding .go:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}
.funding .done-line{font-size:var(--read-small,15px);color:var(--paper-quiet,#b3aa95);min-height:18px;
  font-family:var(--face-body,system-ui,sans-serif);letter-spacing:normal}

/* 되짚기 — 학생의 셈과 교과서를 한 장의 종이에 나란히 놓는다. */
.funding .sheet{width:min(660px,94vw);background:#e8e2d4;color:#23201a;border-radius:3px;
  background-image:var(--hanji);background-size:cover;background-position:center;
  border:1px solid #6b5a3e;box-shadow:inset 0 0 60px #b39a6a2b;padding:20px 22px;
  line-height:1.8;text-align:left}
.funding .sheet .you{font-size:15px;color:#3a352b;border-bottom:1px solid #6b5a3e44;padding-bottom:10px}
.funding .cmp{display:flex;gap:14px;flex-wrap:wrap;margin:12px 0}
.funding .cmp div{flex:1 1 240px;border-left:3px solid #8a6a44;padding-left:12px;font-size:15px}
.funding .cmp b{display:block;font-size:12px;color:#6b6558;letter-spacing:2px;font-weight:400;margin-bottom:4px}
.funding .sheet .actual-line{font-size:15px;margin-top:6px}
.funding .sheet .origin{font-size:13px;color:#5e5849;margin-top:10px}
.funding .overturn{display:flex;gap:14px;align-items:center;margin:16px 0 0;
  border-top:1px solid #6b5a3e44;padding-top:14px}
.funding .overturn img{width:84px;height:84px;flex:0 0 84px;border-radius:3px;
  object-fit:cover;object-position:50% 7%;border:1px solid #6b5a3e;background:#1a1d21}
.funding .overturn .who{font-size:12px;color:#6b5a3e;letter-spacing:2px;margin-bottom:4px}
.funding .overturn blockquote{margin:0;font-size:16px;line-height:1.8}
.funding .not-yours{font-size:14px;color:#b9b2a1;max-width:620px;line-height:1.8}

@media(max-width:700px){
  .funding{padding:20px 14px;gap:11px}
  .funding p{font-size:15px}
  .funding .ask{font-size:18px}
  .funding .gauges,.funding .levers{flex-direction:column}
  .funding .gauge,.funding .lever{flex:0 0 auto}
  /* 좁은 화면에서 지레로 초점이 옮겨 가면 브라우저가 그 지레를 스크롤 상자 맨 위로
     올리는데, 거기는 위에 붙여 둔 판(.board-top) 아래다 — 지레가 판에 덮여 손도
     닿지 않고 눈에도 안 보인다. 위쪽에 자리를 비워 두어 판 밑으로 나오게 한다.
     (실제로 물렸다: 화면을 몰아 보다가 지레를 끌 수 없는 자리를 만났다.) */
  .funding .lever{scroll-margin-top:400px}
  .funding .lever-blurb{min-height:0}
  .funding .nudge{min-height:48px;font-size:13px}
  /* 위에 붙은 판이 화면의 절반을 먹으면 지레가 그 밑으로 들어간다. 좁은 화면에서는
     빛깔 풀이 두 줄을 덜어 낸다 — 무늬 몫이 원납전이고 금빛 몫이 당백전이라는 것은
     지레를 밀어 보면 바로 보이지만, 붉은 빗금은 밀어서는 알 수 없어 그 줄만 남긴다. */
  .funding .goal-keys span:nth-child(-n+2){display:none}
}
@media(prefers-reduced-motion:reduce){
  .funding .goal-fill,.funding .lever-fill,.funding .minsim-bar span{transition:none}
}
/* ── 가로 화면 마무리 (2026-09-27) ────────────────────────────────────────
   위의 가로 규칙을 여기서 한 번 더 적는다. 까닭은 순서다 — .funding .levers 의
   바탕 규칙(flex-wrap:wrap)이 저 위 규칙들보다 **아래에** 있어서, 앞에서 적은
   nowrap 이 먹지 않았다. 그래서 좁은 칸에서 지레 둘이 줄바꿈으로 세로로 쌓였고,
   아래 지레의 단추 둘이 창 밖으로 나갔다(844x390 에서 실측). CSS 는 순서가 곧 힘이다.

   지레는 가로 화면에서 **바닥에 붙인다**. 왼쪽(보는 것)이 길어 스크롤이 생기는데
   그때 조작부까지 밀려 올라가면 학생에게는 「아무것도 못 하는 화면」이 된다.
   보는 것은 흐르고, 하는 것은 제자리에 있어야 한다. */
@media(min-width:700px) and (max-height:900px){
  .funding .levers{flex-direction:row;flex-wrap:nowrap;gap:8px;position:sticky;top:4px}
  .funding .lever{flex:1 1 0;min-width:0}
}
/* 마치는 단추도 바닥에 붙인다. 앞서 손전화 층에만 적었더니 태블릿(820px)에서는
   이 단추가 창 밖에 남았다 — 교실에서 제일 많이 쓰는 기기가 그것이다. */
@media(max-height:900px){
  .funding .go{position:sticky;bottom:0;z-index:4;box-shadow:0 0 0 9px #12100d}
}
@media(min-width:700px) and (max-height:560px){
  .funding .lever{padding:6px 8px}
  .funding .lever-blurb{display:none}
  .funding .lever-head{font-size:15px}
  .funding .lever-btns{gap:5px}
  .funding .lever-btns button{padding:9px 3px;font-size:12px}
}

`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

const DEFAULT_VIEW = {
  title: '경 복 궁 을  다 시  짓 는 다',
  question: '이 비용을 어디서 만드는가',
  lines: [
    '아직 아무것도 내려보내지 않았다. 어전에 앉아 셈을 해 보는 것이다.',
    '두 가지를 쓸 수 있다. 밀어 보고, 무엇이 움직이는지 보라.',
  ],
  levy: {
    name: '원납전(願納錢)',
    gloss: WONNAP_GLOSS,
    blurb: '고을마다 걷는다. 돈은 확실히 모인다 — 그만큼 민심이 깎인다.',
  },
  mint: {
    name: '당백전(當百錢)',
    gloss: DANGBAEK_GLOSS,
    blurb: '한 개를 상평통보 백 개로 쳐서 쓰게 한다. 큰 돈이 단번에 생긴다 — 물가가 뛴다.',
  },
  origin: '『고종실록』 · 한국사1 pp.104~107',
  doneLabel: '이만하면 되었다 — 아버지께 아뢴다',
  giveUpLabel: '셈을 여기서 멈춘다',
  nextLabel: '밤이 깊었다 — 다음으로',
}

const pct = v => `${Math.max(0, Math.min(100, v)) * 100 / GOAL_BLOCKS}%`
const coinsHtml = n => Array.from({ length: Math.max(0, n) }, () => '<i class="rice-coin"></i>').join('')

export function createFunding(root) {
  ensureStyle()
  installTypeVars()

  return {
    open(view = {}) {
      const v = { ...DEFAULT_VIEW, ...view }
      const levyText = { ...DEFAULT_VIEW.levy, ...(view.levy ?? {}) }
      const mintText = { ...DEFAULT_VIEW.mint, ...(view.mint ?? {}) }

      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'funding'
        root.appendChild(el)

        let state = initialBoard()

        // 지레 하나의 속. role="slider" 를 쓰는 까닭은 「화살표키로 밀린다」를
        // 스스로 말해 주기 때문이다 — 끌기만으로 되는 지레는 이 교실에서 못 쓴다.
        // 그림 한 장을 갈아 끼운다. 같은 그림이면 아무것도 하지 않는다 — 밀 때마다
        // src 를 다시 넣으면 그림이 매번 깜빡이고, 그러면 「바뀌었다」가 안 보인다.
        // 그림이 안 실린 빌드에서는 그림 자리를 통째로 감춘다(글과 막대는 그대로다).
        function showScene(fig, img, cap, key) {
          const art = SCENE_ART[key]
          if (!fig || !img) return
          if (!art) { fig.style.display = 'none'; return }
          if (img.dataset.key === key) return
          img.dataset.key = key
          img.src = art.src
          img.alt = art.alt
          if (cap) cap.textContent = art.caption
        }

        // 지레마다 그 일이 실제로 벌어지는 자리를 머리에 얹는다 — 걷는 곳과 찍는 곳.
        // 그림이 안 실린 빌드에서는 이 줄이 통째로 비고, 지레는 예전 그대로 선다.
        // 지레마다 **그 일을 하는 자리**를 얹는다 — 아전이 장부를 펴 놓은 고을 마당과,
        // 쇳물을 붓는 주전소. 위쪽 게이지 둘은 그 일이 남긴 **결과**다(쌀가게·고을).
        // 하는 일과 남는 자국을 화면에서 갈라 놓는 것이 이 판의 뼈대다.
        //
        // 한쪽에만 그림을 걸어 보았더니 두 지레의 손잡이 높이가 어긋나 고장으로 보였다 —
        // 나란히 놓는 두 칸은 같은 것을 갖거나 둘 다 없어야 한다.
        function leverScene(kind) {
          const art = SCENE_ART[kind === 'levy' ? 'village-levied' : 'mint-house']
          if (!art) return ''
          return `<figure class="scene lever-scene">
            <img src="${art.src}" alt="${art.alt}"><figcaption>${art.caption}</figcaption></figure>`
        }

        function leverHtml(kind, text, max) {
          return `
            <div class="lever">
              ${leverScene(kind)}
              <div class="lever-head">${text.name}<small>${text.gloss}</small></div>
              <div class="lever-blurb">${text.blurb}</div>
              <div class="lever-track" data-kind="${kind}" role="slider" tabindex="0"
                aria-label="${text.name} 지레" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="0">
                <span class="lever-fill" style="width:0%"></span>
                <span class="lever-ticks">${Array.from({ length: max }, () => '<i></i>').join('')}</span>
              </div>
              <div class="lever-count" data-count="${kind}"></div>
              <div class="lever-btns">
                <button data-step="${kind}" data-delta="-1" aria-label="${text.name} 한 칸 되돌린다">− 되돌린다</button>
                <button data-step="${kind}" data-delta="1" aria-label="${text.name} 한 칸 더">＋ 더 한다</button>
              </div>
            </div>`
        }

        function board() {
          el.innerHTML = `
            <h2>${v.title}</h2>
            ${v.lines.map(l => `<p>${l}</p>`).join('')}
            <p class="ask">${v.question}</p>
            <div class="board">
              <div class="board-top">
              <figure class="scene site" data-site-fig>
                <img data-site alt="">
                <figcaption data-site-cap></figcaption>
              </figure>
              <div class="goal-head">
                <span data-goal-label></span>
                <strong data-done-mark></strong>
              </div>
              <div class="goal-bar" role="img" aria-label="가진 돈과, 벽을 다 쌓는 데 드는 돈">
                <span class="goal-fill levy" style="width:0%"></span>
                <span class="goal-fill mint" style="width:0%"></span>
                <span class="goal-beyond" data-beyond style="left:0"></span>
                <span class="goal-ghost" data-ghost style="left:0;width:0;display:none"></span>
                <span class="goal-line start" data-line-start style="left:0"></span>
                <span class="goal-line" data-line style="left:0"></span>
              </div>
              <div class="goal-need" data-need></div>
              <div class="goal-worth" data-worth></div>
              <div class="goal-keys">
                <span><i class="levy"></i>원납전으로 만든 돈</span>
                <span><i class="mint"></i>당백전으로 만든 돈</span>
                <span><i class="line"></i>벽을 다 쌓는 데 드는 돈</span>
                <span data-ghost-key style="display:none"><i class="ghost"></i>물가가 결승선을 밀어낸 만큼</span>
              </div>
              <div class="gauges">
                <div class="gauge">
                  <h3>물 가</h3>
                  ${SCENE_ART.market ? `<figure class="scene">
                    <img src="${SCENE_ART.market.src}" alt="${SCENE_ART.market.alt}">
                    <figcaption>${SCENE_ART.market.caption}</figcaption></figure>` : ''}
                  <div class="price-line" data-price></div>
                  <div class="rice-row then"><span class="rice-coins">${coinsHtml(RICE_BASE_COINS)}</span><span class="rice-eq">= 쌀 한 섬 (처음)</span></div>
                  <div class="rice-row"><span class="rice-coins" data-coins></span><span class="rice-eq">= 쌀 한 섬 (지금)</span></div>
                </div>
                <div class="gauge">
                  <h3>고 을</h3>
                  <figure class="scene" data-village-fig>
                    <img data-village alt="">
                    <figcaption data-village-cap></figcaption>
                  </figure>
                  <div class="minsim-word" data-minsim></div>
                  <div class="minsim-bar" role="img" aria-label="민심"><span data-minsim-bar style="width:100%"></span></div>
                </div>
              </div>
              <div class="nudge" role="status" aria-live="polite"></div>
              </div>
              <div class="levers">
                ${leverHtml('levy', levyText, LEVY_MAX)}
                ${leverHtml('mint', mintText, MINT_MAX)}
              </div>
            </div>
            <div class="done-line" data-done-line></div>
            <button class="go"></button>
            <div class="recon">${GOAL_NOTE}<br>${RECON_NOTE}</div>
            <div class="origin">${v.origin}</div>`

          // 막대·바늘·글자만 갈아 끼운다. innerHTML 을 다시 쓰면 화살표키를 누르던
          // 학생의 초점이 그때마다 날아간다 — 키보드로 미는 길이 그대로 끊긴다.
          const parts = {
            goalLabel: el.querySelector('[data-goal-label]'),
            doneMark: el.querySelector('[data-done-mark]'),
            bar: el.querySelector('.goal-bar'),
            fillLevy: el.querySelector('.goal-fill.levy'),
            fillMint: el.querySelector('.goal-fill.mint'),
            beyond: el.querySelector('[data-beyond]'),
            line: el.querySelector('[data-line]'),
            lineStart: el.querySelector('[data-line-start]'),
            need: el.querySelector('[data-need]'),
            ghost: el.querySelector('[data-ghost]'),
            ghostKey: el.querySelector('[data-ghost-key]'),
            worth: el.querySelector('[data-worth]'),
            price: el.querySelector('[data-price]'),
            coins: el.querySelector('[data-coins]'),
            minsim: el.querySelector('[data-minsim]'),
            minsimBar: el.querySelector('[data-minsim-bar]'),
            village: el.querySelector('[data-village]'),
            villageCap: el.querySelector('[data-village-cap]'),
            villageFig: el.querySelector('[data-village-fig]'),
            site: el.querySelector('[data-site]'),
            siteCap: el.querySelector('[data-site-cap]'),
            siteFig: el.querySelector('[data-site-fig]'),
            nudge: el.querySelector('.nudge'),
            doneLine: el.querySelector('[data-done-line]'),
            go: el.querySelector('.go'),
          }

          function paint(nudgeText) {
            const b = blocks(state)
            const met = goalMet(state)
            parts.goalLabel.textContent = goalLabel(state)
            parts.doneMark.textContent = met ? '일감이 다 찼다' : ''
            // 막대는 **가진 돈**이다. 이 두 줄에 물가가 들어오지 않는 것이 이번에 바꾼
            // 전부다 — 당백전을 밀어도 이미 그린 자리는 한 픽셀도 물러나지 않는다.
            const at = n => `${n * 100}%`
            parts.fillLevy.style.width = at(levyAt(state))
            parts.fillMint.style.width = at(mintAt(state))
            parts.bar.classList.toggle('full', met)

            // 달아나는 결승선. 처음 자리는 늘 같은 데 있고(NEED_START_AT), 지금 자리는
            // 물가를 따라 오른쪽으로 간다. 그 사이의 빗금이 곧 물가가 밀어낸 거리다.
            const need = needAt(state)
            parts.line.style.left = at(need)
            parts.lineStart.style.left = at(NEED_START_AT)
            parts.beyond.style.left = at(need)
            const pushed = need - NEED_START_AT > 0.001
            // 빗금이 없는 동안에는 빗금 풀이도 내놓지 않는다 — 없는 것을 설명하지 않는다
            parts.ghost.style.display = pushed ? 'block' : 'none'
            parts.ghostKey.style.display = pushed ? '' : 'none'
            parts.ghost.style.left = at(NEED_START_AT)
            parts.ghost.style.width = at(Math.max(0, need - NEED_START_AT))
            parts.need.textContent = needLine(state)

            // 걷어 둔 원납전이 지금 몇 칸어치인가. 달아나는 금이 가리는 것을 여기서 지킨다 —
            // 금만 보면 「돈은 그대로인데 목표가 멀어졌다」까지고, 이 줄이 「그래서 먼저
            // 걷은 돈의 값어치가 줄었다」를 잇는다. 이 판의 심지는 여전히 그쪽이다.
            const then = levyCoin(state)
            const shrunk = then > 0 && then - b.levy > 0.5
            parts.worth.textContent = shrunk ? levyWorthLine(state) : ''
            parts.price.textContent = priceLabel(state)
            parts.coins.innerHTML = coinsHtml(riceCoins(state))
            parts.minsim.textContent = minsimLabel(state)
            parts.minsimBar.style.width = `${minsimBar(state) * 100}%`

            // 고을이 바뀐다 — 아직 견디는 고을과, 사람이 떠나기 시작한 고을.
            //
            // 걷는 장면(village-levied)은 여기 쓰지 않는다. 그건 원납전 지레가 늘 걸고
            // 있어서, 게이지에 또 걸면 한 화면에 같은 그림이 두 번 뜬다 — 한 번 그렇게
            // 찍어 놓고 보니 영락없는 고장이었다. 자르는 자리를 달리해 속여 보려 했지만,
            // 칸이 그림보다 옆으로 넓어 object-position 의 가로값은 아무 일도 하지 않는다
            // (cover 는 위아래를 자른다). 속이는 대신 갈라 놓는다: **지레는 하는 일,
            // 게이지는 그 고을의 형편.**
            showScene(parts.villageFig, parts.village, parts.villageCap,
              villageIsFailing(state) ? 'village-empty' : 'village-calm')

            // 공사장이 올라간다. 한 칸도 못 채웠으면 주춧돌만 남은 터다.
            showScene(parts.siteFig, parts.site, parts.siteCap,
              filledBlocks(state) < 1 ? 'palace-site' : 'palace-rising')
            if (nudgeText !== undefined) parts.nudge.textContent = nudgeText
            // 붙잡지 않는다 — 못 채운 채로도 멈출 수 있다는 것을 먼저 적어 둔다.
            parts.doneLine.textContent = met
              ? '일감이 다 찼다. 어전에 아뢸 수 있다.'
              : '아직 다 차지 않았다 — 여기서 멈추어도 된다.'
            parts.go.textContent = met ? v.doneLabel : v.giveUpLabel
            parts.go.classList.toggle('ready', met)
            for (const kind of ['levy', 'mint']) {
              const n = state[kind]
              const max = kind === 'levy' ? LEVY_MAX : MINT_MAX
              const track = el.querySelector(`.lever-track[data-kind="${kind}"]`)
              track.setAttribute('aria-valuenow', String(n))
              track.setAttribute('aria-valuetext', kind === 'levy' ? `${n}차례` : `${n}칸`)
              track.querySelector('.lever-fill').style.width = `${n * 100 / max}%`
              el.querySelector(`[data-count="${kind}"]`).textContent =
                kind === 'levy' ? `걷기를 ${n}차례 돌렸다 (${n} / ${max})` : `당백전을 ${n}칸 찍었다 (${n} / ${max})`
              for (const btn of el.querySelectorAll(`button[data-step="${kind}"]`)) {
                const delta = Number(btn.dataset.delta)
                btn.disabled = delta < 0 ? n <= 0 : n >= max
              }
            }
          }

          // 지레를 움직이는 단 하나의 문. 끌기·화살표키·단추가 모두 여기로 들어온다.
          function move(kind, next) {
            const prev = state
            state = kind === 'levy' ? setLevy(prev, next) : setMint(prev, next)
            if (state.levy === prev.levy && state.mint === prev.mint) return
            const line = nudgeFor(prev, state)
            paint(line === '' ? undefined : line)
            v.onPush?.(state)
          }

          function nudgeStep(kind, delta) {
            const prev = state
            const next = kind === 'levy' ? stepLevy(prev, delta) : stepMint(prev, delta)
            move(kind, next[kind])
          }

          // 끌기. 마우스·펜·손가락을 한 길로 받는다(pointer events).
          for (const track of el.querySelectorAll('.lever-track')) {
            const kind = track.dataset.kind
            const max = kind === 'levy' ? LEVY_MAX : MINT_MAX
            const valueAt = event => {
              const box = track.getBoundingClientRect()
              const ratio = (event.clientX - box.left) / box.width
              return Math.round(ratio * max)
            }
            track.addEventListener('pointerdown', event => {
              track.setPointerCapture?.(event.pointerId)
              track.focus?.()
              move(kind, valueAt(event))
            })
            track.addEventListener('pointermove', event => { if (event.buttons) move(kind, valueAt(event)) })
            // 화살표키로도 밀린다. 끌기만으로 되는 지레는 쓰지 않는다.
            track.addEventListener('keydown', event => {
              const key = event.key
              let next = null
              if (key === 'ArrowRight' || key === 'ArrowUp') next = state[kind] + 1
              else if (key === 'ArrowLeft' || key === 'ArrowDown') next = state[kind] - 1
              else if (key === 'PageUp') next = state[kind] + 3
              else if (key === 'PageDown') next = state[kind] - 3
              else if (key === 'Home') next = 0
              else if (key === 'End') next = max
              if (next === null) return
              event.preventDefault()
              move(kind, next)
            })
          }

          for (const btn of el.querySelectorAll('button[data-step]')) {
            btn.addEventListener('click', () => nudgeStep(btn.dataset.step, Number(btn.dataset.delta)))
          }

          // 채웠으면 아뢰고, 못 채웠으면 멈춘다. 둘 다 같은 되짚기로 간다 —
          // 못 채운 것을 벌하지 않는다. 그런 셈도 있었다.
          parts.go.addEventListener('click', () => reveal())

          paint('두 지레를 밀어 보라. 무엇이 움직이는지 여기에 적힌다.')
        }

        // 되짚기. 학생의 셈과 교과서를 나란히 놓고, 끝에 아버지가 뒤집는다.
        function reveal() {
          const c = comparison(state, { actualLines: v.actual?.lines ?? (v.actual?.line ? [v.actual.line] : undefined) })
          const by = v.overturnBy
          const face = by && PORTRAITS[by.portrait] ? `<img alt="" src="${PORTRAITS[by.portrait]}">` : ''
          const overturn = v.overturn
            ? `<div class="overturn">${face}<div>${by?.name ? `<div class="who">${by.name}</div>` : ''}` +
              `<blockquote>${v.overturn}</blockquote></div></div>`
            : ''
          el.innerHTML = `
            <h2>${v.title}</h2>
            <div class="sheet">
              <div class="you">당신의 셈 ─ ${c.goal} ${c.you}</div>
              <div class="cmp">
                <div><b>당 신 은</b>${c.yourPrice}</div>
                <div><b>실 제 로 는</b>${c.actualPrice}</div>
              </div>
              ${c.actual.map(l => `<div class="actual-line">${l}</div>`).join('')}
              <div class="origin">${v.actual?.origin ?? v.origin}</div>
              ${overturn}
            </div>
            ${v.overturn ? '<p class="not-yours">셈을 한 사람은 당신이지만, 정한 사람은 당신이 아니었다.</p>' : ''}
            <div class="recon">${c.note}</div>
            <button class="go ready">${v.nextLabel}</button>`
          el.querySelector('.overturn img')?.addEventListener('error', event => { event.target.style.display = 'none' })
          const next = el.querySelector('.go')
          next.addEventListener('click', () => {
            el.remove()
            resolve(result())
          })
          next.focus?.()
        }

        // 넘겨주는 값. 화면에 찍힌 것과 같은 말로 넘긴다 — main.js 가 다시 셈하지 않게.
        function result() {
          return {
            levy: state.levy,
            mint: state.mint,
            price: Number(priceTimes(state)),
            priceTimes: priceTimes(state),
            minsim: minsimBar(state) * 100,
            minsimLabel: minsimLabel(state),
            filled: Math.floor(filledBlocks(state)),
            goalMet: goalMet(state),
            gaveUp: !goalMet(state),
            summary: summaryLine(state),
          }
        }

        board()
      })
    },
  }
}
