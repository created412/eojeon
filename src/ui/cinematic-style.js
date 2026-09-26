// One scoped art direction; the narrative screens keep their own behavior.
import { installTypeVars } from './type-css.js'

const CSS = `
.eojeon{--royal-gold:#d6a64c;--royal-ink:#10130f;color:#eee6d3;font-family:var(--face-body,'Malgun Gothic',sans-serif)}
.eojeon button{cursor:pointer;touch-action:manipulation;transition:background .18s,border-color .18s}
.eojeon button:focus-visible,.eojeon textarea:focus-visible{outline:3px solid #f6cf7b;outline-offset:4px}
.eojeon button:disabled{cursor:not-allowed}
.eojeon:has(.council) .game-map,.eojeon:has(.council) .game-controls{visibility:hidden}
.eojeon::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:10;box-shadow:inset 0 0 110px #08101b44}
.eojeon .opening{align-items:flex-start;text-align:left;padding:8vh 8vw;gap:20px;background:linear-gradient(90deg,#07131cf0, #07131c70 50%,transparent) !important}
.eojeon .opening::before{background:linear-gradient(0deg,#07111adb,transparent 50%)}
.eojeon .opening .opening-name{font-family:Batang,serif;font-size:clamp(42px,6vw,84px);letter-spacing:.12em;color:#f0d5a0}
.eojeon .opening .opening-years{font-size:18px;letter-spacing:.22em;color:#c6d9df}
.eojeon .opening .opening-lines{margin:20px 0;gap:10px}
.eojeon .opening .opening-lines div{color:#e4e0d4;font-size:18px}
.eojeon .opening .opening-buttons{justify-content:flex-start}
.eojeon .opening .opening-buttons button{border:1px solid #dfb767;background:#753027;color:#fff0ca;min-width:210px;padding:18px 30px;border-radius:0}
.eojeon .opening .opening-sound{justify-content:flex-start;color:#d3cbbb}
.eojeon .note,.eojeon .move,.eojeon .howto{background-image:none !important;background-color:#08131b73;backdrop-filter:blur(3px)}
.eojeon .note .sheet{max-width:780px;border-radius:0;border:0;border-top:3px solid #c59b54;padding:38px 44px;background-image:none !important;background-color:#efe3cceF;box-shadow:0 24px 90px #0008}
/* 크기·자간·얼굴은 ui/type-css.js 의 변수 하나를 부른다 — 여기서 숫자를 다시 적으면
   화면마다 값이 갈린다(그것이 2026-09-26 가독성 지적의 뿌리였다). */
.eojeon .note p{font-size:var(--read-body,17px);line-height:var(--read-lh-body,1.85)}
.eojeon .note .origin{font-size:var(--read-small,12px);line-height:var(--read-lh-small,1.7)}
.eojeon .note h2{font-family:var(--face-display,Batang,serif);letter-spacing:var(--read-track,.12em);font-size:var(--read-title,25px)}
/* button 만 걸면 그림의 「크게 보기」 단추(.media-zoom)까지 붉게 칠해진다 — 그림 위에
   덧칠된 띠가 그것이었다. 화면을 넘기는 단추만 고른다. */
.eojeon .note button.note-next{background:#732d26;color:#fff0d0;border-color:#a57648;letter-spacing:1px}
.eojeon .speak .panel{bottom:32px;width:min(840px,84vw);background-image:none !important;background:#0b161eee;color:#eee8d9;border:0;border-top:2px solid #b49251;border-radius:0;padding:25px 30px;box-shadow:0 16px 60px #0008}
.eojeon .speak .panel::after{display:none}
.eojeon .speak .name{background:#752d27;border:1px solid #bd9851;color:#ffe9bb;letter-spacing:2px}
.eojeon .speak .line{color:#f1ebde;font-size:18px;line-height:1.85}
.eojeon .speak .next{color:#e4bd72;animation:none}
.eojeon .veil{background:#08131c75;backdrop-filter:blur(3px)}
.eojeon .veil .card{border-radius:0;border-top:4px solid #923e30;max-width:min(720px,94vw);padding:32px 38px;box-shadow:0 22px 85px #0009}
.eojeon .card h3{font-family:var(--face-display,Batang,serif);font-size:var(--read-title,27px);margin-bottom:12px}
.eojeon .card .excerpt{font-size:var(--read-body,17px);line-height:var(--read-lh-body,1.95)}
.eojeon .council{background:linear-gradient(90deg,#07131bee,#07131bbb 70%,#07131b40);align-items:flex-start;padding:5vh 7vw;gap:18px}
.eojeon .council h2{color:#ddbb77;letter-spacing:.25em}
.eojeon .council .q{font-family:Batang,serif;text-align:left;font-size:clamp(24px,3vw,36px);max-width:740px;line-height:1.6}
.eojeon .council .list{max-width:690px;gap:12px}
.eojeon .council button.opt{background:#e9dec6;color:#27241c;border:0;border-left:4px solid #a87639;border-radius:0;padding:20px 26px;line-height:1.65;font-size:17px;box-shadow:4px 4px 0 #58462d55}
.eojeon .council button.opt:hover{background:#fff0cd;border-left-color:#a7372b}
.eojeon .council .locked{background:#0c1b26aa;color:#c0c9cd;border:1px solid #73828a66;border-radius:0;padding:16px 24px}
.eojeon .council .locked small{color:#c6bbb0}
.eojeon .council .read{color:#d8d0bd}
.eojeon .council .actual,.eojeon .council .reading{max-width:740px;box-sizing:border-box}
.eojeon .council textarea{max-width:700px;min-height:90px;font-size:17px;padding:14px;background:#0a1825}
.eojeon .council .go{background:#81352b;color:#ffe5aa;padding:14px 30px}
.eojeon .interaction-hint{bottom:33px !important;max-width:70vw;line-height:1.65;text-align:center;border:1px solid #c6a35b88 !important;background:#0c1925ed !important;color:#f3ddae !important;padding:12px 24px !important;letter-spacing:0 !important}
.eojeon .game-controls{right:25px !important;bottom:218px !important;gap:9px !important}
.eojeon .game-controls button{border-radius:6px !important;width:58px !important;height:48px !important;background:#102331ef !important;color:#f1d59f !important;border:1px solid #ad935f88 !important;font-size:14px !important}
.eojeon .game-map{right:24px !important;bottom:22px !important;opacity:.9}
.eojeon .game-map canvas{border-color:#b2956088 !important;background:#091923db !important;border-radius:50% !important}
@media(max-width:760px){
 .eojeon .opening{padding:7vh 7vw}.eojeon .opening .opening-lines div{font-size:16px}
 .eojeon .council{padding:65px 20px 28px}.eojeon .council .q{font-size:24px}
 .eojeon .council button.opt{font-size:15px;padding:15px 18px}
 .eojeon .speak .panel{width:100%;bottom:0;padding:24px 22px}.eojeon .speak .line{font-size:16px}
 .eojeon .note .sheet{padding:26px 20px}.eojeon .note p{font-size:var(--read-body,16px)}
 .eojeon .veil{padding:12px}.eojeon .veil .card{padding:24px}
 .eojeon .game-map{width:115px !important;right:12px !important;bottom:100px !important}
 .eojeon .game-controls{flex-direction:row !important;right:12px !important;bottom:16px !important}
 .eojeon .interaction-hint{bottom:75px !important;max-width:85vw;width:max-content;font-size:12px !important}
}
@media(prefers-reduced-motion:reduce){.eojeon *{animation:none !important;transition:none !important;scroll-behavior:auto !important}}
`
export function installCinematicStyle(root) {
  root.classList.add('eojeon')
  // 활자 변수가 먼저 깔려야 아래 규칙의 var(...) 가 제 값을 받는다.
  installTypeVars()
  if (document.getElementById('eojeon-cinematic-style')) return
  const style = document.createElement('style')
  style.id = 'eojeon-cinematic-style'; style.textContent = CSS
  document.head.appendChild(style)
}
