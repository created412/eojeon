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
  #root .note .sheet.has-media .historical-figure{padding:6px}
  #root .note .historical-figure .historical-image{height:118px}
  #root .note .historical-figure .media-relation,#root .note .historical-figure small,#root .note .historical-figure a{display:none}
  #root .note .historical-figure .media-heading{font-size:9px;margin-bottom:5px}
  #root .note .historical-figure figcaption{margin-top:6px;font-size:10px;line-height:1.4}
  #root .note .historical-figure figcaption strong{font-size:11px;line-height:1.4}
  #root .note .historical-figure .media-relation{font-size:9.5px;margin-top:3px}
  #root .note .historical-figure small{font-size:9px;margin-top:4px}
  #root .note .historical-figure a{font-size:9px}

  /* ── 문서 뜯어 읽기 (ui/doc-study.js) ── */
  #root .study .wrap{padding:8px 12px;gap:12px;grid-template-columns:minmax(260px,.8fr) minmax(0,1.5fr)}
  #root .study .sheet{top:8px;max-height:calc(100dvh - 20px);gap:6px}
  #root .study .paper{padding:8px 10px;gap:4px}
  #root .study .paper h3{font-size:13px;line-height:1.4;padding-bottom:3px}
  #root .study .sec{padding:5px 8px}
  #root .study .sec .lab{font-size:11px;margin-bottom:2px}
  #root .study .sec .txt{font-size:14.5px;line-height:1.55}
  #root .study .src{font-size:10px;line-height:1.35}
  #root .study .notes li{font-size:12px;line-height:1.4}
  #root .study .glyphs{font-size:30px}
  #root .study .source-toggle{padding:5px;font-size:12px}
  #root .study .side{gap:6px}
  #root .study h2{font-size:18px;line-height:1.3}
  #root .study .background-note{font-size:12px;line-height:1.5}
  #root .study .lead{font-size:13px;line-height:1.5;padding-top:2px}
  #root .study .step-count{font-size:12px}
  #root .study .stage{gap:6px}
  #root .study .ask{font-size:16px;line-height:1.45}
  #root .study .flipbtn{font-size:13px;min-height:36px;padding:6px 12px}
  #root .study .opts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-items:stretch}
  #root .study .opts:has(>.opt:last-child:nth-child(2)){grid-template-columns:repeat(2,minmax(0,1fr))}
  #root .study .opt{font-size:12.5px;line-height:1.35;padding:0;display:flex;flex-direction:column;border-radius:7px;overflow:hidden}
  #root .study .opt .choice-art{height:62px;width:100%;flex-shrink:0}
  #root .study .opt .study-choice-label{display:block;padding:5px 7px}
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
  #root .dilemma .actual{gap:6px}
  #root .dilemma .actual>small{font-size:13px}
  /* 2026-10-11 선생님(「실제로는」 화면): 「지금 할일이 지금 가운데 클릭하는걸 가리고 있는」 — 띠는 접었고(guide-strip.js), 그림을 낮춰 단추까지 한 화면에. */
  #root .dilemma .history-layout{gap:12px;align-items:center}
  #root .dilemma .history-layout>.choice-art{height:120px}
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
  #root .trail .wrap{padding:6px 14px;gap:4px}
  #root .trail h2{font-size:17px;letter-spacing:.18em}
  #root .trail .lead p{font-size:13px;line-height:1.5}
  #root .trail .map{height:50px;margin:6px 24px 0}
  #root .trail .place span{font-size:11px;top:18px}
  #root .trail .mark b{font-size:10.5px}
  #root .trail .mapnote{font-size:10px}
  #root .trail .story{gap:10px}
  #root .trail .scene{height:86px}
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
  #root .loss p{font-size:13px;line-height:1.4}
  #root .loss figure{max-width:520px}
  #root .loss figure img{max-height:68px}
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

  /* ── 2026-10-11 선생님 휴대전화 그림 다섯: 「한판에 거슬리는 중요하지 않은것들은 모바일에서 없애서 어떻게든 한판에
     들어올 수 있게 해줘」. 정족산성(잘림)·서계(오른쪽 글이 길어 굴러가고 누르면 위가 잘림)·저울(오른쪽 글이 길다). ── */

  /* 정족산성 (ui/jeongjok.js): 두 산길이 화면에 다 서야 한다. 출처 줄은 모바일에서 뺀다(안내 판에 이미 있다). */
  #root .jeongjok .wrap{padding:4px 10px;gap:4px}
  #root .jeongjok .head{gap:10px}
  #root .jeongjok h2{font-size:16px;letter-spacing:.2em}
  #root .jeongjok .sub{display:none}
  #root .jeongjok .meters{font-size:11px;gap:12px}
  #root .jeongjok .pips i{width:9px;height:9px}
  #root .jeongjok .field{gap:5px}
  #root .jeongjok .lane{grid-template-columns:84px minmax(0,1fr)}
  #root .jeongjok .gate{gap:2px}
  #root .jeongjok .gate b{font-size:15px;letter-spacing:.08em}
  #root .jeongjok .embers i{width:4px;height:4px}
  #root .jeongjok .firebtn{padding:3px 2px;font-size:11px;width:92%}
  #root .jeongjok .reach small,#root .jeongjok .far{font-size:10px;top:3px}
  #root .jeongjok .cue{font-size:16px}
  #root .jeongjok .foot .src{display:none}
  #root .jeongjok .foot .say{font-size:12px;line-height:1.35;min-height:1.3em;margin:0}
  #root .jeongjok .panel{padding:6px 10px}
  #root .jeongjok .sheet{padding:8px 12px;gap:4px}
  #root .jeongjok .sheet h3{font-size:14px;margin:0}
  #root .jeongjok .sheet p,#root .jeongjok .sheet .rule,#root .jeongjok .sheet .quiet,#root .jeongjok .sheet .turn{font-size:12.5px;line-height:1.45;margin:0}
  #root .jeongjok .sheet blockquote{font-size:12.5px;line-height:1.45;margin:0;padding:4px 10px}
  #root .jeongjok .sheet button{padding:6px 16px;font-size:13px;min-height:0}

  /* 서계 (ui/doc-seek.js): 오른쪽은 물음·찾은 수·고른 낱말·단추만. 들머리 글·읽는 법·풀이는 모바일에서 뺀다. */
  #root .seekdoc .wrap{padding:6px 10px;gap:10px;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr)}
  #root .seekdoc .sheet{gap:4px}
  /* 2026-10-11 선생님: 「왼쪽 서계 원문이 잘렸잖아」 — 글자 크기를 화면 높이에 맞춘다(한 글자 21px 은 높이 약 330 부터, 낮으면 줄어든다).
     띠가 접혀(guide-strip.js) 아래쪽 자리도 돌아왔다. */
  #root .seekdoc .paper{padding:4px}
  #root .seekdoc .col{padding:4px 2px;gap:4px}
  #root .seekdoc .unit{padding:2px 2px;border-width:2px}
  #root .seekdoc .unit .h{font-size:clamp(14px,6.4vh,21px);line-height:1.05}
  #root .seekdoc .unit .r{font-size:clamp(8px,2.9vh,9.5px)}
  #root .seekdoc .unit.seal{padding:4px 3px;border-width:3px}
  #root .seekdoc .unit.seal .h{font-size:clamp(11px,4.6vh,15px)}
  #root .seekdoc .unit.join{margin-bottom:-6px}
  #root .seekdoc .src{font-size:9px;line-height:1.3}
  #root .seekdoc .side{gap:6px;overflow:hidden}
  #root .seekdoc h2{font-size:14px;letter-spacing:.04em}
  #root .seekdoc .lead,#root .seekdoc .readnote,#root .seekdoc .trans{display:none}
  #root .seekdoc .q{font-size:15px;line-height:1.4}
  #root .seekdoc .pips{font-size:12px;gap:7px}
  #root .seekdoc .pips i{width:16px;height:16px}
  #root .seekdoc .look{min-height:54px;padding:7px 10px;gap:2px 10px}
  #root .seekdoc .look .han{font-size:26px}
  #root .seekdoc .look .read{font-size:13px}
  #root .seekdoc .look .mean{font-size:12.5px;line-height:1.4}
  #root .seekdoc .look .empty{font-size:12px;line-height:1.4}
  #root .seekdoc button.name{padding:7px 14px;font-size:13px}
  #root .seekdoc .say{min-height:0;font-size:12px;line-height:1.4}
  #root .seekdoc .say:empty{display:none}
  #root .seekdoc .hint{font-size:11px;line-height:1.4}
  #root .seekdoc .hint:empty{display:none}
  #root .seekdoc .after{padding-top:5px;gap:3px}
  #root .seekdoc .after p{font-size:12px;line-height:1.45}
  #root .seekdoc button.close{padding:6px 16px;font-size:13px;margin-top:auto}

  /* 임금의 저울 (ui/weigh.js): 저울은 작게 왼쪽에, 오른쪽 판은 글자를 줄이고 출처 줄은 뺀다(낱말 풀이는 남긴다). */
  /* 2026-10-11 선생님: 「왼쪽 저울은 너무 작고, 오른쪽 글은 한 눈에 안들어와」 — 판의 너비 상한(152vh, 높이 330 이면 500px)을 풀어
     화면을 다 쓰고, 저울과 판을 반반으로, 첫 추에 붙던 들머리 글(.small)은 뺀다. 추·실록의 말·두 읽기·단추는 그대로다. */
  #root .weigh .wrap{max-width:none;padding:6px 12px;gap:4px}
  #root .weigh header{gap:10px}
  #root .weigh h2{font-size:15px;letter-spacing:.12em}
  #root .weigh header .q{font-size:12px}
  #root .weigh header small{font-size:10px}
  #root .weigh .board{grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);gap:14px;align-items:center}
  #root .weigh .scale{max-height:calc(100dvh - 60px)}
  #root .weigh .aside{font-size:10.5px}
  #root .weigh .panel{padding:8px 10px;gap:5px}
  #root .weigh .when{font-size:10px}
  #root .weigh .lead{font-size:13px;line-height:1.5}
  #root .weigh .small{font-size:11.5px;line-height:1.45}
  #root .weigh .panel .small{display:none}
  #root .weigh .origin{font-size:10px;line-height:1.35}
  #root .weigh .panel .origin+.origin{display:none}
  #root .weigh blockquote{padding:5px 10px;font-size:13px;line-height:1.5}
  #root .weigh .tagrow h3{font-size:15px}
  #root .weigh .grade{font-size:10px}
  #root .weigh .progress{font-size:10.5px}
  #root .weigh .label{font-size:10.5px}
  #root .weigh .go{padding:6px 18px;font-size:13px}
  #root .weigh .kingline{padding:4px 9px}
  #root .weigh .kingline b{font-size:10px}
  #root .weigh .kingline p{font-size:12px;line-height:1.45}
  #root .weigh .seats{gap:4px}
  #root .weigh .seat{padding:3px 2px;gap:0}
  #root .weigh .seat .post{font-size:9px}
  #root .weigh .seat .name{font-size:12.5px}
  #root .weigh .speech{min-height:48px;padding:5px 9px}
  #root .weigh .speech b{font-size:10.5px;margin-bottom:1px}
  #root .weigh .speech p{font-size:13px;line-height:1.5}
  #root .weigh .speech.empty p{font-size:12px}
  #root .weigh .ask{gap:5px;padding-top:5px}
  #root .weigh .ask .q{font-size:13px;line-height:1.45}
  #root .weigh .aopt{padding:5px 10px;font-size:12.5px}
  #root .weigh .ask .say{font-size:12px;line-height:1.4}
  #root .weigh .reads{gap:5px}
  #root .weigh .read{padding:5px 9px;font-size:12.5px;line-height:1.4;gap:8px}
  #root .weigh .read .side{font-size:10px;padding:2px 6px}
  #root .weigh .hefts{gap:5px}
  #root .weigh .heft{padding:5px 10px 5px 8px;font-size:12.5px;gap:6px}
  #root .weigh .choices{gap:6px}
  #root .weigh .choice{padding:8px 12px;font-size:14px}
  #root .weigh .remark{font-size:12px}

  /* ── 광성보 안내 판 (ui/gwangseong.js) — 그림을 낮추고 글을 줄인다. 싸움판 자체는 손대지 않는다. ── */
  #root .gwangseong .panel{padding:6px}
  #root .gwangseong .sheet{gap:5px;padding:8px 14px}
  #root .gwangseong .sheet h3{font-size:16px}
  #root .gwangseong .sheet p{font-size:13px;line-height:1.45}
  #root .gwangseong .sheet figure img{max-height:64px}
  #root .gwangseong .sheet figcaption{font-size:9.5px;margin-top:2px}
  #root .gwangseong .sheet .quiet{font-size:10.5px;line-height:1.4}
  #root .gwangseong .sheet .rule{padding-left:9px}
  #root .gwangseong .sheet button{margin-top:2px;padding:6px 20px;font-size:13px}

  /* ── 사료 카드 (ui/dialog.js) — 2026-10-11 선생님: 「이런 모든 사료내용이 한판에 안들어와. 내리기 매우 귀찮아. 한판에 들어오게
     만들어. 폰트 크기를 줄이기보단 꼭 필요하지 않은건 빼는 식으로 하여서. … 이런 식의 것들의 사료에 전체 적용하자.」
     뺀 것: 오른쪽 「기록을 보다」 그림 칸, 낱말 풀이(gloss), 「우리가 붙인 해석」(따져 읽기의 풀이가 그 자리를 한다).
     남긴 것: 제목·출처·기록(원문)·밑줄 긋기·따져 읽기·재구성 알림·닫기. 기록은 왼쪽 칸, 물음은 오른쪽 칸 — 가로 화면을 다 쓴다. ── */
  #root .veil{padding:6px}
  #root .veil .card,#root .veil .card.has-media{max-width:none;width:100%;max-height:calc(100dvh - 12px);padding:8px 14px 8px}
  #root .veil .card.has-media .source-layout{display:block}
  #root .veil .card .historical-figure{display:none}
  #root .veil .card .source-copy{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);column-gap:14px;row-gap:0;align-items:start}
  #root .veil .card .source-copy>*{grid-column:2}
  #root .veil .card .source-copy>h3{grid-column:1 / -1;font-size:15px;line-height:1.3;margin:0 0 1px}
  #root .veil .card .source-copy>.origin{grid-column:1;font-size:10px;line-height:1.35;margin-bottom:4px}
  #root .veil .card .rendered{display:none}
  #root .veil .card .source-copy>.record{grid-column:1;grid-row:3 / span 12;margin:2px 2px 4px;padding:8px 12px 10px}
  #root .veil .card .part-label{font-size:9px;letter-spacing:.12em;margin:0 0 3px}
  #root .veil .card .record::after{width:18px;height:18px;right:8px;top:7px}
  #root .veil .card .record .excerpt{font-size:14px;line-height:1.5;max-width:calc(100% - 22px)}
  #root .veil .card .record .excerpt br+br{display:none}
  /* 150자를 넘는 기록(dialog.js 가 long-record 를 붙인다 — 만인소·미군 장교의 글·회고록 등)은 한 화면에 안 들어온다. 이것만은
     글자를 12.5px 로 줄이고 기록 칸을 넓힌다(구절 단추는 button 이라 inline 으로 흘릴 수 없다). 줄 바꿈 하나는 띄움으로 접는다. */
  #root .veil .card.long-record .source-copy{grid-template-columns:minmax(0,1.3fr) minmax(0,1fr)}
  #root .veil .card.long-record .record .excerpt{white-space:normal;font-size:13.5px;line-height:1.5}
  #root .veil .card.long-record .record .excerpt br{display:none}
  #root .veil .card.long-record .record .part{display:contents;color:inherit}
  #root .veil .card.long-record .record .part::after{content:' '}
  #root .veil .card.long-record .record .part.hit,#root .veil .card.long-record .record .part.glow{color:#a3302a;font-weight:700}
  #root .veil .card .ask{margin:0 0 6px;padding:5px 9px;font-size:13px;line-height:1.45}
  #root .veil .card .ask b{display:inline;margin:0 6px 0 0;font-size:10px}
  #root .veil .card .read-say{min-height:0;margin:0 0 4px;font-size:12px;line-height:1.45}
  #root .veil .card .read-say:empty{display:none}
  #root .veil .card .read-say.found{padding:3px 0 3px 9px;font-size:12.5px}
  #root .veil .card .gloss,#root .veil .card .reading{display:none}
  #root .veil .card .probe{margin:0 0 4px;padding:6px 9px 7px}
  #root .veil .card .probe .kind{font-size:9.5px;margin-bottom:2px}
  #root .veil .card .probe .q{font-size:13px;line-height:1.45;margin:0 0 5px}
  #root .veil .card .probe .opts{gap:4px}
  #root .veil .card .probe .popt{font-size:12.5px;line-height:1.35;padding:4px 8px}
  #root .veil .card .probe .psay{font-size:12px;line-height:1.45;margin-top:5px}
  #root .veil .card .probe.done .psay{font-size:12.5px}
  #root .veil .card .staged,#root .veil .card .rendered{margin-top:4px;padding:4px 8px;font-size:10px;line-height:1.4}
  #root .veil .card .close{margin-top:6px;padding:7px;font-size:12px;background:#e8e2d4}
  #root .veil .card .talktitle{font-size:10px;margin-bottom:6px}
  #root .veil .card .talkline{font-size:13px;line-height:1.5;margin:0 0 6px}

  /* ── 급료 가마 (ui/ration.js) — 2026-10-11 선생님: 「그림이 좀 작아서 모래랑 겨 고르기가 힘들어, 그림 좀 키워봐」「여기도 한 판에
     안들어와」. 그림이 있는 판(장터 그림·가마·낟알판·섬·쌀 그림·군졸의 외침)은 두 칸 — 그림이 왼쪽 칸을 세로로 다 차지하고
     글·단추는 오른쪽 칸에 쌓인다. 손으로 고르는 긴 설명 줄과 「교과서는 이것을 한 줄로 적었다」는 뺀다. ── */
  #root .ration{padding:8px 14px;gap:6px}
  #root .ration h2{font-size:12px;letter-spacing:4px}
  #root .ration p{font-size:14px;line-height:1.5;max-width:none}
  #root .ration .origin,#root .ration .art-note,#root .ration .staged,#root .ration .price-note{font-size:10px;line-height:1.4;max-width:none}
  #root .ration .staged{padding:5px 9px}
  #root .ration button{margin-top:2px;padding:8px 20px;font-size:13px}
  #root .ration button.skip{padding:6px 12px;font-size:12px}
  #root .ration .hand-help{display:none}
  #root .ration .bridge{display:none}
  #root .ration .tray-count,#root .ration .rice-line,#root .ration .wage-line,#root .ration .aside-say{font-size:13px;line-height:1.5;max-width:none;margin-top:0}
  #root .ration .nudge{min-height:16px;font-size:12px}
  #root .ration blockquote{padding:6px 12px;font-size:14px;line-height:1.5;max-width:none}
  #root .ration blockquote.cry{font-size:15px}
  #root .ration blockquote small{font-size:10px;margin-top:3px}
  #root .ration .happened{gap:3px;max-width:none}
  #root .ration .happened p{font-size:14px}
  #root .ration .burst-after{gap:6px;align-items:flex-start}
  #root .ration .burst-opts{justify-content:flex-start}
  #root .ration .months{width:min(620px,96vw);gap:4px}
  #root .ration .months i{font-size:12px}
  #root .ration .month-say{min-height:1.5em}
  #root .ration .chart{gap:3px;max-width:none;margin-top:0}
  #root .ration .row{font-size:12px}
  #root .ration .row .yr{width:150px;white-space:nowrap;font-size:11.5px}
  #root .ration:has(.sack),#root .ration:has(.tray-wrap),#root .ration:has(.grain),#root .ration:has(.seoms),#root .ration:has(.cry),#root .ration:has(.market-art){display:grid;grid-template-columns:auto minmax(0,1fr);grid-auto-rows:max-content;align-content:safe center;align-items:start;justify-content:center;column-gap:16px;row-gap:6px;text-align:left}
  #root .ration:has(.sack)>*,#root .ration:has(.tray-wrap)>*,#root .ration:has(.grain)>*,#root .ration:has(.seoms)>*,#root .ration:has(.cry)>*,#root .ration:has(.market-art)>*{grid-column:2}
  #root .ration .sack,#root .ration .tray-wrap,#root .ration .grain,#root .ration .seoms,#root .ration blockquote.cry,#root .ration .market-art{grid-column:1;grid-row:1 / span 12;align-self:center}
  #root .ration .tray-wrap{width:min(56vw,calc((100dvh - 24px) * 1.61))}
  #root .ration .sack{width:auto;max-width:46vw}
  #root .ration .sack img{display:block;margin:0 auto;width:auto;max-width:100%;max-height:calc(100dvh - 70px)}
  #root .ration .sack span{padding:5px;font-size:12px}
  #root .ration .grain{width:auto;max-width:48vw}
  #root .ration .grain img{display:block;margin:0 auto;width:auto;max-width:100%;max-height:calc(100dvh - 92px)}
  #root .ration .grain figcaption{gap:14px;margin-top:5px;font-size:12px}
  #root .ration .grain figcaption span{font-size:10px;margin-top:2px}
  #root .ration .seoms{width:auto;gap:18px}
  #root .ration .seom{width:min(150px,22vw);gap:5px}
  #root .ration .seom .vessel{height:min(42vh,170px)}
  #root .ration .seom figcaption{font-size:12px;line-height:1.4}
  #root .ration .seom figcaption small{font-size:10px}
  #root .ration blockquote.cry{max-width:42vw}
  #root .ration .market-art{width:min(36vw,300px)}
  #root .ration:has(.market-art) .staged,#root .ration:has(.market-art) .price-note,#root .ration:has(.market-art) h2{display:none}
  #root .ration .row .bar{height:10px}
  #root .ration .market-art img{max-height:calc(100dvh - 60px)}
  #root .ration .market-art figcaption{font-size:9.5px}
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
