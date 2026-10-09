// 가로로 눕힌 휴대전화(화면 높이 480px 이하)에서 전체 화면 판들을 **한 화면 안에** 세우는 스타일 한 장.
//
// 선생님(2026-10-09, 휴대전화 가로 화면 둘 — 「해가 진다」 판): 「이렇게 pc버전에서 만든걸 모바일로 할 때 창이 감당이
// 안되게 커져버려. 모바일로 할때만 크기를 줄이거나해서 수정해야할거 같아. 모바일의 원칙은 한판에 들어와야하는거야.
// 모바일버전만 재점검해봐.」
//
// 76개 저장 장면을 844×390 손가락 기기 흉내로 전부 찍어 보니(_tools/checks/mobile-audit.mjs) 판 자체가 화면의
// 1.3~2.2배인 것이 글 화면(note, 특히 사진이 곁에 서는 것)·문서 뜯어 읽기(study)·그림 선택지(dilemma)·거처 옮김(move)·
// 어전회의(council)·납치 길(trail)·빼앗긴 것(loss)·장계 지도(dispatch, 3.7배)·훈령(orders)이었다. 저마다의 모듈에 흩어진 CSS 를 손대는 대신 여기 한 곳에서, 높이 480 이하일 때만,
// 글자·여백·그림을 줄인다. PC(마우스)와 세로 태블릿은 이 파일의 영향을 받지 않는다.
//
// 선택자는 `#root .note …` 꼴이다 — 각 모듈의 `.eojeon .note …`(클래스 셋)보다 id 하나로 앞서므로 스타일을 붙인
// 차례와 상관없이 이긴다. 그래서 어느 모듈보다 늦게 붙어도, 먼저 붙어도 같다.
const CSS = `
@media(max-height:480px){
  /* ── 글 화면 (ui/note-screen.js · 사진은 ui/historical-media.js) ── */
  #root .note{padding:6px 10px;gap:5px}
  #root .note .sheet{padding:10px 16px 8px;gap:5px}
  #root .note .note-copy{gap:8px}
  #root .note .note-copy h2{font-size:17px}
  #root .note .note-page{gap:8px}
  #root .note .note-page p{font-size:15px;line-height:1.55}
  #root .note .note-kicker{font-size:11px}
  #root .note .note-nav{padding:4px 10px;gap:10px}
  #root .note .note-nav button{font-size:14px;min-height:36px;padding:6px 16px}
  #root .note .note-progress{font-size:12px}
  #root .note.note-briefing .note-objective{font-size:20px;line-height:1.3}
  #root .note.note-briefing .note-action{font-size:15px;line-height:1.45}
  #root .note.note-briefing .note-copy h2{font-size:14px}
  #root .note.note-briefing .note-context p{font-size:14px}
  #root .note .note-context summary{font-size:13px;padding:3px}
  #root .note .note-context .note-page{margin-top:8px}
  #root .note .origin,#root .note .staged{font-size:11px;line-height:1.45}
  #root .note .gloss{padding:8px 10px;gap:5px}
  #root .note .gloss .word{font-size:22px}
  #root .note .gloss .parts b{font-size:20px}
  #root .note .gloss .plain{font-size:13px;line-height:1.5}
  #root .note .cmp div{padding:8px 10px;font-size:12.5px;line-height:1.5}
  /* 사진이 곁에 서는 글 — 사진 칸을 좁히고 낮춘다. 글이 먼저다. */
  #root .note .sheet.has-media{grid-template-columns:minmax(0,1fr) clamp(150px,24%,200px);gap:14px;align-items:start}
  #root .note .sheet.has-media .historical-figure{padding:8px}
  #root .note .historical-figure .historical-image{height:130px}
  #root .note .historical-figure .media-heading{font-size:9px;margin-bottom:5px}
  #root .note .historical-figure figcaption{margin-top:6px;font-size:10px;line-height:1.4}
  #root .note .historical-figure figcaption strong{font-size:11px;line-height:1.4}
  #root .note .historical-figure .media-relation{font-size:9.5px;margin-top:3px}
  #root .note .historical-figure small{font-size:9px;margin-top:4px}
  #root .note .historical-figure a{font-size:9px}

  /* ── 문서 뜯어 읽기 (ui/doc-study.js) ── */
  #root .study .wrap{padding:10px 12px;gap:12px;grid-template-columns:minmax(260px,.8fr) minmax(0,1.5fr)}
  #root .study .sheet{top:8px;max-height:calc(100dvh - 20px);gap:6px}
  #root .study .paper{padding:10px 12px;gap:6px}
  #root .study .paper h3{font-size:13px;line-height:1.4;padding-bottom:3px}
  #root .study .sec{padding:5px 8px}
  #root .study .sec .lab{font-size:11px;margin-bottom:2px}
  #root .study .sec .txt{font-size:14.5px;line-height:1.55}
  #root .study .src{font-size:10.5px;line-height:1.4}
  #root .study .notes li{font-size:12px;line-height:1.4}
  #root .study .glyphs{font-size:34px}
  #root .study .source-toggle{padding:5px;font-size:12px}
  #root .study .side{gap:8px}
  #root .study h2{font-size:18px;line-height:1.3}
  #root .study .background-note{font-size:12px;line-height:1.5}
  #root .study .lead{font-size:13px;line-height:1.5;padding-top:2px}
  #root .study .step-count{font-size:12px}
  #root .study .stage{gap:8px}
  #root .study .ask{font-size:16px;line-height:1.45}
  #root .study .flipbtn{font-size:13px;min-height:36px;padding:6px 12px}
  #root .study .opts{gap:8px}
  #root .study .opt{font-size:13.5px;line-height:1.4}
  #root .study .opt .choice-art{height:86px}
  #root .study .opt .study-choice-label{padding:7px 9px}
  #root .study .chips{gap:8px}
  #root .study .chip{font-size:14px}
  #root .study .chip .choice-art{height:64px}
  #root .study .chip .study-choice-label{padding:6px}
  #root .study .say{font-size:13.5px;line-height:1.5;min-height:0}
  #root .study .after p{font-size:14px;line-height:1.55}
  #root .study .close{font-size:14px;min-height:38px;margin-top:6px;padding:6px 18px}

  /* ── 그림 선택지 (ui/dilemma.js) ── */
  #root .dilemma .wrap{padding:10px 14px;gap:8px}
  #root .dilemma h2{font-size:19px;line-height:1.3}
  #root .dilemma .prompt{font-size:13px;line-height:1.5}
  #root .dilemma .opts{gap:10px}
  #root .dilemma .head{font-size:14px;line-height:1.4}
  #root .dilemma .head .choice-art{height:88px}
  #root .dilemma .choice-label{padding:8px 10px 3px;min-height:0}
  #root .dilemma .choice-invite{padding:0 10px 8px;font-size:11px}
  #root .dilemma .more{padding:2px 10px 10px;gap:8px}
  #root .dilemma .row{font-size:12.5px;line-height:1.45}
  #root .dilemma .row b{font-size:11px}
  #root .dilemma .choose,#root .dilemma .go{font-size:14px;min-height:38px;padding:6px 20px}
  #root .dilemma .actual{gap:8px}
  #root .dilemma .actual>small{font-size:13px}
  #root .dilemma .history-layout{gap:14px}
  #root .dilemma .history-layout>.choice-art{height:150px}
  #root .dilemma .history-copy{gap:8px}
  #root .dilemma .actual p{font-size:14px;line-height:1.55}
  #root .dilemma .actual .origin{font-size:11px;line-height:1.4}
  #root .dilemma .actual .tail{font-size:13px;line-height:1.5}
  #root .dilemma .picked-line{font-size:12px}

  /* ── 거처를 옮긴다 (ui/move-screen.js) ── */
  #root .move{padding:10px 14px;gap:5px}
  #root .move .year{font-size:11px}
  #root .move .lunar,#root .move .solar{font-size:10px;margin-top:0}
  #root .move .path{font-size:22px}
  #root .move .cause{font-size:13px;line-height:1.5}
  #root .move .self{font-size:11px}
  #root .move .gloss{margin-top:3px;padding:7px 11px;font-size:11px;line-height:1.45}
  #root .move button{margin-top:4px;padding:8px 22px;font-size:13px}

  /* ── 어전회의 (ui/council-ui.js) ── */
  #root .council{padding:10px 14px;gap:7px}
  #root .council h2{font-size:11px}
  #root .council .council-tag{font-size:11px}
  #root .council .q{font-size:16px;line-height:1.35}
  #root .council .council-ask{font-size:12.5px;line-height:1.5}
  #root .council .read{font-size:11px}
  #root .council .list{gap:6px;max-width:680px}
  #root .council button.opt{padding:8px 12px;font-size:13px;line-height:1.4}
  #root .council .locked{padding:8px 12px;font-size:13px;line-height:1.4}
  #root .council .locked small{margin-top:3px;font-size:11px}
  #root .council .council-status{font-size:12px;padding:4px 0}

  /* ── 납치 길 (ui/trail.js) ── */
  #root .trail .wrap{padding:8px 14px;gap:6px}
  #root .trail h2{font-size:17px;letter-spacing:.18em}
  #root .trail .lead p{font-size:13px;line-height:1.5}
  #root .trail .map{height:58px;margin:8px 24px 0}
  #root .trail .place span{font-size:11px;top:18px}
  #root .trail .mark b{font-size:10.5px}
  #root .trail .mapnote{font-size:10px}
  #root .trail .story{gap:10px}
  #root .trail .scene{height:112px}
  #root .trail .telling{padding:6px 10px;gap:4px}
  #root .trail .telling p{font-size:13px;line-height:1.5}
  #root .trail .telling small{font-size:10.5px}
  #root .trail .telling .quiet{font-size:12px}
  #root .trail .frame .pic{height:26px}
  #root .trail.done .frame .pic{height:68px}
  #root .trail .frame figcaption{font-size:11px;line-height:1.3}
  #root .trail .still{font-size:12px;min-height:1.2em}
  #root .trail .act{padding:7px 24px;font-size:14px}
  #root .trail .actual{padding-top:6px;gap:4px}

  /* ── 빼앗긴 것 (ui/loss-screen.js) — 위쪽 96px 여백은 띠가 위에 뜨던 때의 것, 지금은 띠가 아래다 ── */
  #root .loss{padding:8px 14px;gap:5px}
  #root .loss h2{font-size:12px;letter-spacing:.2em}
  #root .loss p{font-size:13px;line-height:1.5}
  #root .loss figure{max-width:520px}
  #root .loss figure img{max-height:92px}
  #root .loss figure figcaption{font-size:9.5px;margin-top:3px}
  #root .loss .cards{gap:4px;margin-top:2px}
  #root .loss .card-row{padding:5px 10px;font-size:12px}
  #root .loss .card-row span{font-size:10px}
  #root .loss .origin,#root .loss .footer{font-size:11px;line-height:1.45}
  #root .loss button{margin-top:3px;padding:7px 22px;font-size:13px}

  /* ── 장계를 지도에 놓는다 (ui/dispatch-map.js) — 900px 아래에서 세로로 쌓이던 것을 가로에서는 다시 두 칸으로 ── */
  #root .dispatch{padding:8px 10px;gap:6px;justify-content:flex-start}
  #root .dispatch h2{font-size:11px}
  #root .dispatch .lag{font-size:11px;line-height:1.4}
  #root .dispatch .map-help{font-size:12px;line-height:1.5;width:100%}
  #root .dispatch .order-aside{font-size:10.5px;line-height:1.45}
  #root .dispatch .dispatch-layout{grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:12px;width:100%}
  #root .dispatch .map-column{position:sticky;top:0}
  #root .dispatch .mapnote{margin-top:5px;font-size:10px}
  #root .dispatch .mapnote span{margin-top:2px}
  #root .dispatch .map-hotspot{font-size:10px}
  #root .dispatch .map-hotspot .dot{width:22px;height:22px}
  #root .dispatch .dispatch-report{gap:6px}
  #root .dispatch .order-list{gap:6px}
  #root .dispatch .order-card{padding:8px 10px 9px;font-size:12px;line-height:1.45}
  #root .dispatch .order-card .order-text{margin-top:3px;font-size:12px;line-height:1.45}
  #root .dispatch .order-card .org,#root .dispatch .order-card .staged,#root .dispatch .order-card .rendered{margin-top:3px;font-size:10px;line-height:1.4}
  #root .dispatch .order-card .order-at{margin-top:4px;font-size:11px;line-height:1.4}
  #root .dispatch .order-card .order-at.empty{padding-top:3px}
  #root .dispatch .order-card .order-when{margin-top:3px;font-size:11px}
  #root .dispatch .report-art{margin-top:5px}
  #root .dispatch .report-art img{max-height:56px}
  #root .dispatch .report-cap{font-size:9.5px;margin-top:2px}
  #root .dispatch .order-moves button{min-width:38px;min-height:28px;font-size:12px}
  #root .dispatch .order-hint{font-size:12px;line-height:1.5;padding:6px 10px}
  #root .dispatch .order-verdict{font-size:14px;line-height:1.5}
  #root .dispatch .order-note p{margin-top:3px;font-size:12px;line-height:1.5}
  #root .dispatch .pending,#root .dispatch .order-recon{font-size:10px;line-height:1.4}
  #root .dispatch .cannot{padding:6px;font-size:11px;width:100%}
  #root .dispatch button.go{padding:7px 20px;font-size:13px}

  /* ── 훈령 (ui/orders-ui.js) ── */
  #root .orders{padding:8px 14px;gap:6px}
  #root .orders h2{font-size:11px;letter-spacing:2px}
  #root .orders .q{font-size:15px;line-height:1.4}
  #root .orders .gloss,#root .orders .hint,#root .orders .read{font-size:11px;line-height:1.45}
  #root .orders .list{gap:5px;max-width:680px}
  #root .orders .cl{padding:7px 10px;font-size:13px;gap:8px}
  #root .orders .cl i{width:12px;height:12px;margin-top:3px}
  #root .orders .locked{padding:7px 10px;font-size:12px}
  #root .orders .locked small{margin-top:2px;font-size:11px}
  #root .orders textarea{min-height:40px;padding:6px;font-size:12px}
  #root .orders .paper{padding:10px 12px;font-size:12px;line-height:1.5}
  #root .orders .origin{font-size:11px;margin-top:4px}
  #root .orders button.go{padding:7px 20px;font-size:13px}
}
`

let styled = false
export function installPhoneLandscape() {
  if (styled || typeof document === 'undefined') return
  styled = true
  const style = document.createElement('style')
  style.id = 'phone-landscape-style'
  style.textContent = CSS
  document.head.appendChild(style)
}

export const PHONE_LANDSCAPE_CSS = CSS
