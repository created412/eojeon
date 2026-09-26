// Shared visual language for the title and the in-world interface.
const CSS = `
.eojeon{--jade:#153e3d;--gold:#dcc08a;--paper:#f3eddd;--quiet:#b6c5bd}
.eojeon .opening{padding:120px 6vw 210px;gap:0;justify-content:center;background:linear-gradient(90deg,#102e31fa 0%,#102e31f2 24%,#102e31b3 41%,#102e310d 70%)!important}
.eojeon .opening::before{background:linear-gradient(0deg,#10282dec 0%,#10282d00 33%,#10282d00 78%,#10282d66 100%)}
.eojeon .opening .opening-mast{position:absolute;top:34px;left:6vw;right:5vw;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#e2e7d9}
.opening-brand{display:flex;align-items:center;gap:12px;letter-spacing:1px}.opening-brand svg{color:#dcc08a;width:27px;height:27px}
.opening-edition{color:#d2ded7;font-size:11px;background:#14373780;padding:9px 14px;border-radius:20px;border:1px solid #dce5dc20}
.eojeon .opening .opening-name{display:flex;align-items:center;gap:24px;font-family:Batang,'Times New Roman',serif;font-size:clamp(72px,8vw,112px);font-weight:400;letter-spacing:.1em;line-height:1.2;color:#f5edda;text-shadow:none;margin-left:-5px}
.opening-seal{display:inline-flex;align-items:center;justify-content:center;border:1px solid #c09171;outline:1px solid #c0917144;outline-offset:4px;background:#8c4437;font-size:20px;line-height:1.2;letter-spacing:0;padding:8px 9px;color:#f6dec1;transform:rotate(-3deg)}
.eojeon .opening .opening-years{font-size:11px;letter-spacing:.4em;color:#c9b893;margin:15px 0 30px;text-shadow:none}
.opening-invitation{font:26px/1.55 Batang,serif;letter-spacing:-.04em;color:#f3eddf;margin-bottom:16px}
.eojeon .opening .opening-lines{margin:0;gap:4px;max-width:410px}
.eojeon .opening .opening-lines div{font-size:13px;line-height:1.9;color:#bbc9c1;text-shadow:none;letter-spacing:-.03em}
.eojeon .opening .opening-lines div:last-child{color:#ddc99e}
.eojeon .opening .opening-buttons{margin-top:30px;gap:10px}
.eojeon .opening .opening-buttons button{background:#ddc89d;color:#1e3937;border:1px solid #e8d7b3;padding:17px 26px;min-width:226px;display:flex;justify-content:space-between;gap:40px;align-items:center;border-radius:4px;font-size:15px;font-weight:700;box-shadow:0 5px 18px #091b2440}
.eojeon .opening .opening-buttons button::after{content:'→';font-size:21px;line-height:1}
.eojeon .opening .opening-buttons button:hover{background:#efe0bb;transform:translateY(-1px)}
.eojeon .opening .opening-buttons button.opening-second{background:#234644;color:#d1d9ca;border-color:#93b0a43d;min-width:142px;gap:20px}
.eojeon .opening .opening-sound{font-size:10px;gap:8px;color:#a9bcb3;margin-top:18px}
.eojeon .opening .opening-sound button{background:#ffffff09;border-color:#a7bca336;color:#dbe3d6;border-radius:20px;padding:5px 12px;font-size:10px}
.eojeon .opening .opening-vista{position:absolute;right:5vw;top:51%;display:flex;align-items:center;gap:12px;color:#f7f4e7;text-shadow:0 2px 6px #183632}
.opening-vista svg{width:32px;height:32px;color:#f5e0b0}.opening-vista strong{font:23px Batang,serif;display:block;letter-spacing:.12em}.opening-vista span{font-size:10px;color:#ebeedf;display:block;margin-top:6px}.opening-vista .vista-line{height:1px;width:45px;background:#ece7bf80}
.eojeon .opening .opening-chapters{position:absolute;bottom:78px;left:6vw;right:6vw;display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid #d4dfd338;padding-top:22px;gap:24px}
.opening-chapters>div{display:flex;align-items:center;gap:14px;color:#acbfb6}.chapter-count{font:21px Georgia,serif;color:#90a79e}.opening-chapters>div:first-child .chapter-count{color:#e5c894}.opening-chapters strong{font-size:13px;font-weight:400;color:#dfe6d8;display:block;margin-bottom:7px}.opening-chapters small{font-size:10px;color:#97aaa1;letter-spacing:1px}
.eojeon .opening .opening-footer{position:absolute;bottom:26px;left:6vw;right:6vw;font-size:10px;color:#859f97;line-height:1.7}
.eojeon .cinema-top{padding:22px 28px;background:linear-gradient(#112d32d9,#112d3222,transparent);align-items:flex-start;min-height:110px;gap:16px}
.cinema-brand{display:flex;align-items:center;gap:15px}.hud-seal{font:17px/1.35 Batang,serif;writing-mode:vertical-rl;letter-spacing:2px;border:1px solid #decca385;border-radius:3px;padding:7px 5px;background:#143b3b99;color:#f2e4bf}
.eojeon .cinema-date{font-size:10px;color:#d6d8bf;letter-spacing:.04em}.eojeon .cinema-location{font:21px/1.8 Batang,serif;letter-spacing:.04em;color:#fff8e8}
.cinema-chapter{display:flex;flex-direction:column;align-items:center;gap:8px;margin:5px 0 0}.chapter-dots{display:flex;align-items:center;gap:9px}.chapter-dots i{width:5px;height:5px;border:1px solid #bdd3c38c;transform:rotate(45deg)}.chapter-dots i.active{width:8px;height:8px;background:#e0c38b;border-color:#eed9af}.chapter-dots i.complete{background:#bed0bd}.chapter-label{font-size:10px;color:#e4e8d2}
.eojeon .cinema-codex{display:flex;align-items:center;gap:13px;background:#133d3be8;border:1px solid #c8d2b646;border-radius:6px;padding:10px 13px;color:#ecdfbd;text-shadow:none;box-shadow:0 3px 15px #0c292820}
.cinema-codex>span{text-align:left;font-size:12px}.cinema-collection{display:block;font-size:9px;color:#b4cbb8;margin-top:4px}.eojeon .cinema-codex kbd{border-radius:3px;border-color:#aabd9a66;font-size:10px;padding:3px 5px;margin-left:6px;color:#d3dbbb}
.eojeon .cinema-objective{left:28px;top:112px;width:284px;max-width:284px;padding:17px 18px 14px;border:1px solid #c2cba936;border-radius:7px;background:#153c3cef;box-shadow:0 8px 25px #0a272126;text-shadow:none;backdrop-filter:blur(12px)}
.objective-title{display:flex;align-items:center;gap:9px;color:#e2c793}.objective-title svg{width:17px;height:17px}.eojeon .cinema-objective small{color:#e2c793;font-size:10px;letter-spacing:.1em}
.eojeon .cinema-task{font-size:14px;font-weight:500;line-height:1.7;margin:13px 0;color:#f0edda;word-break:keep-all}
.cinema-resource{padding-top:11px;border-top:1px solid #d0ddbd24}.eojeon .cinema-budget{display:block;font-size:10px;color:#b8cbb9;line-height:1.6}.budget-pips{display:flex;gap:4px;margin-bottom:8px}.budget-pips:empty{display:none}.budget-pips i{width:16px;height:3px;border-radius:1px;background:#79978a40}.budget-pips i.available{background:#dcc087}
.eojeon .cinema-view-controls{position:absolute;top:94px;right:28px;display:flex;gap:3px;background:#173f3bd9;border:1px solid #d4d9b038;border-radius:5px;padding:4px;pointer-events:auto}.eojeon .cinema-view-controls[hidden]{display:none}.cinema-view-controls button{display:grid;place-items:center;width:33px;height:33px;border:0;background:transparent;color:#e8ddb5;font-size:23px;border-radius:3px}.cinema-view-controls button:hover{background:#93b59533}.cinema-view-controls svg{width:17px;height:17px}
.eojeon .cinema-keyboard{position:absolute;left:28px;bottom:27px;display:flex;gap:18px;align-items:center;font-size:10px;color:#e8efdd;padding:11px 14px;background:#183c38cf;border-radius:5px;border:1px solid #bdcbb02b;text-shadow:none}.cinema-keyboard span{display:flex;align-items:center;gap:7px}.cinema-keyboard kbd{font:9px 'Malgun Gothic',sans-serif;color:#ede4be;border:1px solid #d3d8ad55;padding:3px 5px;border-radius:3px}
.eojeon .game-controls{right:26px!important;bottom:252px!important;gap:7px!important}.eojeon .game-controls button{border-radius:7px!important;background:#173f3bed!important;border:1px solid #ccd3ac66!important;box-shadow:0 3px 12px #122d3333;color:#ede1bd!important;width:61px!important;height:46px!important;font-size:12px!important;font-weight:400!important}.eojeon .game-controls button:first-child{background:#dac69a!important;border-color:#efdeb9!important;color:#203d36!important;font-weight:700!important}
.eojeon .game-map{right:26px!important;bottom:26px!important;width:188px!important;background:#153c3cee;padding:12px 10px 0;border:1px solid #bdc7a44d;border-radius:9px;opacity:1;box-shadow:0 6px 24px #0d29282c}.eojeon .game-map::before{content:'궁궐 안내도';display:block;color:#d8d5ae;font-size:10px;margin:0 0 9px 4px}.eojeon .game-map canvas{background:#173734!important;border:0!important;border-radius:3px!important}
.eojeon .interaction-hint{bottom:85px!important;max-width:min(580px,65vw);border:1px solid #d4c29188!important;border-radius:6px;background:#133a38f2!important;padding:12px 22px!important;color:#f5e8bd!important;font-size:13px!important;box-shadow:0 8px 24px #15383144}
.eojeon button[aria-label='조작 안내']{left:28px!important;bottom:84px!important;width:30px!important;height:30px!important;font-size:12px!important;color:#d7dfbb!important;background:#21443be6!important;border-color:#b9cda65c!important}
.eojeon .cinema-danger{border-radius:7px;background:#512b29f2;bottom:28px;width:min(510px,64vw);border:1px solid #e4ba8959;border-top:3px solid #e4b278;padding:15px 20px;text-shadow:none}.eojeon .cinema-danger small{font-size:10px}
.eojeon:has(.note,.howto,.move,.veil,.speak,.pause,.codex,.hold) .cinema-keyboard{display:none}
.eojeon .speak .panel{background:#123733f2;border:1px solid #c3c39959;border-radius:9px;bottom:30px;padding:22px 28px}.eojeon .speak .name{background:#e0c79b;color:#203a31;border-radius:3px;border:0;letter-spacing:0}.eojeon .speak .line{font-size:17px}
.eojeon .note .sheet{background-color:#f0ecd9f5;border-top:3px solid #477a66;border-radius:7px}
/* .note button 전부를 칠하면 그림의 「크게 보기」 단추까지 초록으로 덮여, 사진 위에
   띠가 하나 얹힌다. 화면을 넘기는 단추만 고른다(.note-next). */
.eojeon .note button.note-next{background:#25584c;color:#f3e5bf;border-color:#477a66;border-radius:4px}
.eojeon .council{background:linear-gradient(90deg,#123734f5,#123734d9 55%,#12373444)}.eojeon .council h2{color:#dfcba0}.eojeon .council button.opt{background:#ece6d2;border-radius:5px;border-left:4px solid #92b095;box-shadow:0 3px 10px #081c2033}.eojeon .council button.opt:hover{border-left-color:#e2be70;background:#fbf3da}.eojeon .council .go{background:#dcc79a;color:#213d34;border:1px solid #ecdcb7;border-radius:4px}
@media(min-width:761px) and (max-height:780px){.eojeon .opening{padding-top:85px;padding-bottom:165px}.eojeon .opening .opening-name{font-size:72px}.eojeon .opening .opening-years{margin:8px 0 16px}.opening-invitation{font-size:23px;margin-bottom:10px}.eojeon .opening .opening-buttons{margin-top:18px}.eojeon .opening .opening-chapters{bottom:55px;padding-top:14px}.eojeon .opening .opening-footer{bottom:15px}}
@media(max-width:1000px){.opening-edition{display:none}.eojeon .opening .opening-vista{right:5vw;top:44%}.cinema-chapter{display:none}.cinema-keyboard span:last-child{display:none}}
@media(max-width:760px){
 .eojeon .opening{padding:100px 7vw 115px;justify-content:center;background:linear-gradient(90deg,#153636f0,#153636b3 60%,#15363655)!important;min-height:100%;gap:0}
 .eojeon .opening .opening-mast{top:23px;left:7vw;right:7vw;font-size:10px}.opening-brand svg{width:23px;height:23px}.eojeon .opening .opening-name{font-size:74px;gap:20px}.opening-seal{font-size:16px}
 .eojeon .opening .opening-years{font-size:10px;margin:12px 0 22px}.opening-invitation{font-size:24px}.eojeon .opening .opening-lines{max-width:330px}.eojeon .opening .opening-lines div{font-size:12px}
 .eojeon .opening .opening-buttons{margin-top:23px;gap:8px}.eojeon .opening .opening-buttons button{min-width:170px;padding:14px 18px;font-size:14px}.eojeon .opening .opening-buttons button.opening-second{min-width:110px;gap:8px}
 .eojeon .opening .opening-sound{flex-wrap:wrap;max-width:330px;font-size:9px;margin-top:15px}.eojeon .opening .opening-vista{display:none}
 .eojeon .opening .opening-chapters{left:7vw;right:7vw;bottom:48px;gap:7px;padding-top:13px}.opening-chapters>div{display:block}.chapter-count{display:none}.opening-chapters strong{font-size:11px;margin-bottom:4px}.opening-chapters small{font-size:8px}.eojeon .opening .opening-footer{bottom:12px;left:7vw;right:7vw;font-size:8px;max-width:310px}
 .eojeon .cinema-top{padding:15px 14px;gap:8px;min-height:90px}.hud-seal{display:none}.eojeon .cinema-location{font-size:16px;line-height:1.6;letter-spacing:0}.eojeon .cinema-date{font-size:9px}.eojeon .cinema-codex{padding:8px;gap:7px}.cinema-codex>span{font-size:11px}.eojeon .cinema-codex kbd{display:none}.cinema-collection{font-size:8px}
 .eojeon .cinema-objective{top:84px;left:14px;width:222px;max-width:222px;padding:12px 14px}.eojeon .cinema-task{font-size:12px;margin:8px 0}.eojeon .cinema-budget{font-size:9px}.eojeon .cinema-keyboard{display:none}
 .eojeon .cinema-view-controls{top:84px;right:14px;flex-direction:column;padding:3px}.cinema-view-controls button{width:34px;height:34px}
 .eojeon .game-map{right:12px!important;bottom:94px!important;width:130px!important;padding:9px 7px 0;border-radius:7px}.eojeon .game-map::before{font-size:9px;margin-bottom:5px}
 .eojeon .game-controls{right:12px!important;bottom:19px!important;flex-direction:row!important;gap:8px!important}.eojeon .game-controls button{width:58px!important;height:47px!important}
 .eojeon .interaction-hint{bottom:255px!important;max-width:calc(100vw - 28px);width:max-content;white-space:normal;font-size:11px!important;padding:10px 13px!important}.eojeon .cinema-danger{bottom:255px;width:calc(100vw - 28px);padding:12px 14px}.eojeon .cinema-danger>div{font-size:12px;gap:8px}
 .eojeon button[aria-label='조작 안내']{left:14px!important;bottom:23px!important}.eojeon .speak .panel{bottom:0;border-radius:8px 8px 0 0;width:100%;padding:20px}.eojeon .speak .line{font-size:15px}
}
@media(max-height:620px){.eojeon .opening{justify-content:flex-start;display:block;padding-top:70px;padding-bottom:30px}.eojeon .opening .opening-name{font-size:60px}.eojeon .opening .opening-chapters,.eojeon .opening .opening-footer{position:relative;inset:auto;margin-top:25px}.eojeon .opening .opening-lines{display:none}.eojeon .opening .opening-years{margin-bottom:12px}.opening-invitation{font-size:20px}.eojeon .opening .opening-sound{margin-top:10px}}
@media(pointer:coarse){.eojeon .cinema-keyboard{display:none}}
@media(prefers-reduced-motion:reduce){.eojeon .opening .opening-buttons button:hover{transform:none}}
`
export function installRoyalInterface(){
  if(document.getElementById('royal-interface-style')) return
  // Slate lacquer, aged brass and ivory tie the interface to the film lighting.
  const palette={
    '#153e3d':'#202a32','#153c3c':'#172029','#173f3b':'#172129',
    '#153636':'#111a22','#102e31':'#111c26','#10282d':'#0c141d',
    '#123733':'#152028','#133d3b':'#1a252e','#183c38':'#19252f',
    '#153c3b':'#19232c','#173734':'#1b272e','#133a38':'#17232b',
    '#123734':'#17232b','#234644':'#26343d','#143737':'#202b32',
    '#ddc89d':'#c9b48c','#dac69a':'#c9b48c','#21443b':'#26343d',
  }
  const film=CSS.replace(/#[a-f0-9]{6}/gi,hex=>palette[hex]??hex)
  const style=document.createElement('style');style.id='royal-interface-style';style.textContent=film;document.head.appendChild(style)
}
