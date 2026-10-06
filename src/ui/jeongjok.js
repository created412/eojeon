// 정족산성 — 기다렸다가 쏜다(화면). 셈은 systems/jeongjok.js 가 한다.
//
// 밤의 산길 둘(동문 · 남문). 왼쪽이 성문, 오른쪽이 산 아래다. 프랑스군 무리가 오른쪽에서
// 올라오고, 성문 앞의 밝은 띠가 「화승총이 닿는 곳」이다. 띠 안에 들었을 때 그 문을 누르면
// (W · S, 또는 길을 누른다) 물러난다.
//
// ⚠ 화면에 사람 수 · 거리의 숫자를 적지 않는다 — 몇 무리가 어느 문으로 왔는지는 재구성이다.
// ⚠ 한 화면에 들어온다. 길의 높이는 화면 높이를 따라 준다.
import { installTypeVars } from './type-css.js'
import { SCENE_ART } from './scene-art-data.js'
import { BATTLE_ART } from './battle-art-data.js'
import { drawInfantry } from './battle-painter.js'
import {
  LANES, REACH, FEINT_MS, createBattle, tick, fire, frontSquad, inReach, reloadRatio, totalSquads, resolved,
  battleResult, BATTLE_LINES,
} from '../systems/jeongjok.js'

const CSS = `
.jeongjok,.jeongjok *{box-sizing:border-box}
.jeongjok{position:fixed;inset:0;z-index:57;overflow:hidden;color:#e9e4d6;user-select:none;-webkit-user-select:none;
  font-family:var(--face-body,system-ui,sans-serif);
  background:radial-gradient(120% 90% at 78% 0%,#27344a 0%,#141b29 46%,#0a0d14 100%)}
.jeongjok .stage{position:relative;height:100%}
.jeongjok .wrap{height:100%;max-width:1240px;margin:0 auto;display:grid;grid-template-rows:auto minmax(0,1fr) auto;
  gap:clamp(6px,1.4vh,14px);padding:clamp(8px,2vh,22px) clamp(10px,2vw,26px)}

.jeongjok .head{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap}
.jeongjok h2{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.3em;font-size:clamp(20px,3.6vh,30px);color:#f0c469}
.jeongjok .sub{font-size:clamp(12px,1.9vh,15px);color:#aab3c2}
.jeongjok .meters{margin-left:auto;display:flex;gap:clamp(12px,2vw,26px);align-items:center;font-size:clamp(12.5px,1.9vh,15px);color:#c9d0db}
.jeongjok .meter{display:flex;align-items:center;gap:8px}
.jeongjok .pips{display:flex;gap:4px}
.jeongjok .pips i{width:11px;height:11px;border-radius:50%;background:#3a4558}
.jeongjok .hunters-left i{background:#e0a23a}
.jeongjok .hunters-left i.out{background:#3a4558}
.jeongjok .done i.on{background:#8fbf9a}
.jeongjok .done i.lost{background:#b0584e}

/* ── 산길 둘 ── */
.jeongjok .field{min-height:0;display:grid;grid-template-rows:1fr 1fr;gap:clamp(8px,1.8vh,18px)}
.jeongjok .lane{position:relative;min-height:0;display:grid;grid-template-columns:clamp(108px,15vw,168px) minmax(0,1fr);
  border:1px solid #2f3b50;border-radius:6px;overflow:hidden;cursor:pointer;background:#0d121c;touch-action:manipulation}
.jeongjok .lane:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}
.jeongjok .gate{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(4px,1vh,10px);
  background:linear-gradient(90deg,#3d3a35,#57524a 70%,#3d3a35);border-right:4px solid #23201c;
  background-image:repeating-linear-gradient(0deg,#0000 0 17px,#00000038 17px 19px),linear-gradient(90deg,#3d3a35,#57524a 70%,#3d3a35)}
.jeongjok .gate b{font-family:var(--face-display,serif);font-weight:400;font-size:clamp(20px,3.6vh,30px);letter-spacing:.14em;color:#f4ead2}
/* 숨은 포수들 — 화승(불 붙인 심지)의 불씨만 보인다. 다시 재는 동안은 꺼져 있다. */
.jeongjok .embers{display:flex;gap:clamp(6px,1vw,11px)}
.jeongjok .embers i{width:5px;height:5px;border-radius:50%;background:#ff9b3d;box-shadow:0 0 7px 2px #ff7a1a99;animation:jj-ember 1.7s ease-in-out infinite}
.jeongjok .embers i:nth-child(2){animation-delay:.4s}
.jeongjok .embers i:nth-child(3){animation-delay:.9s}
.jeongjok .embers i:nth-child(4){animation-delay:1.3s}
.jeongjok .lane.loading .embers i{background:#4a4038;box-shadow:none;animation:none}
@keyframes jj-ember{50%{opacity:.45}}
.jeongjok .firebtn{pointer-events:none;position:relative;width:86%;padding:clamp(6px,1.3vh,10px) 4px;border:1px solid #c89a52;border-radius:4px;
  background:#2a2015;color:#f6d38a;font-size:clamp(13px,2.1vh,17px);text-align:center;overflow:hidden}
.jeongjok .firebtn kbd{font:inherit;opacity:.7;margin-left:4px}
.jeongjok .firebtn .fill{position:absolute;inset:0;background:#0b0e14cc;transform-origin:right;transform:scaleX(0)}
.jeongjok .firebtn span{position:relative}
.jeongjok .lane.loading .firebtn{border-color:#55504a;color:#8d8778}
.jeongjok .track{position:relative;min-width:0;
  background:
    linear-gradient(180deg,#0000 0 46%,#1c2433 46% 54%,#0000 54%),
    radial-gradient(60% 120% at 100% 50%,#18212f 0%,#0000 70%)}
.jeongjok .track::after{content:'';position:absolute;inset:0;pointer-events:none;
  background:repeating-linear-gradient(90deg,#0000 0 46px,#ffffff06 46px 47px)}
.jeongjok .reach{position:absolute;left:0;top:0;bottom:0;width:calc(var(--reach) * 100%);
  background:linear-gradient(90deg,#e0a23a40,#e0a23a14);border-right:2px dashed #e0a23a99}
.jeongjok .reach small{position:absolute;left:8px;top:6px;font-size:clamp(11px,1.7vh,13.5px);color:#f2d79b;white-space:nowrap}
.jeongjok .far{position:absolute;right:8px;top:6px;font-size:clamp(11px,1.7vh,13.5px);color:#7f8ba0}
.jeongjok .lane.now .reach{background:linear-gradient(90deg,#f0c46988,#e0a23a33);box-shadow:inset 0 0 0 2px #f0c469}
.jeongjok .cue{position:absolute;left:calc(var(--reach) * 50%);top:50%;transform:translate(-50%,-160%);display:none;
  font-family:var(--face-display,serif);font-size:clamp(18px,3.4vh,28px);color:#fff3cf;text-shadow:0 0 12px #e0a23a}
.jeongjok .lane.now .cue{display:block}

/* 프랑스군 무리 — 생김새는 본뜬 것이 아니라 표다. */
.jeongjok .squad{position:absolute;top:50%;left:calc(var(--p) * 100%);transform:translate(-20%,-50%);display:grid;
  grid-template-columns:repeat(3,auto);gap:3px 5px;transition:opacity .2s}
.jeongjok .squad i{width:clamp(8px,1.5vh,12px);height:clamp(15px,2.9vh,23px);border-radius:4px 4px 2px 2px;
  background:linear-gradient(#e6c9a2 0 20%,#22345e 20% 64%,#8a8f9c 64% 100%);box-shadow:0 2px 0 #0008}
.jeongjok .squad.held i{height:clamp(11px,2.1vh,17px);margin-top:clamp(4px,.8vh,6px)}
.jeongjok .squad.exposed::after{content:'';position:absolute;left:-10px;top:50%;width:9px;height:9px;border-radius:50%;
  background:#dfe9ff;box-shadow:0 0 10px 4px #9db7ff;animation:jj-blink .32s steps(2) infinite}
.jeongjok .squad.routed{animation:jj-rout .7s ease-in forwards}
.jeongjok .squad.breached{animation:jj-breach .5s ease-out forwards}
@keyframes jj-blink{50%{opacity:0}}
@keyframes jj-rout{to{transform:translate(140px,-50%);opacity:0}}
@keyframes jj-breach{to{transform:translate(-80%,-50%);opacity:0}}

/* 쏜 자국 */
.jeongjok .shot{position:absolute;left:0;top:50%;height:3px;margin-top:-1px;width:calc(var(--to) * 100%);pointer-events:none;
  background:linear-gradient(90deg,#fff6d0,#f0c46900);transform-origin:left;animation:jj-shot .34s ease-out forwards}
.jeongjok .shot.short{background:linear-gradient(90deg,#c9b98a,#c9b98a00)}
.jeongjok .shot.back{left:auto;right:calc(100% - var(--from) * 100%);width:calc(var(--from) * 100%);
  background:linear-gradient(270deg,#dfe9ff,#9db7ff00);transform-origin:right}
@keyframes jj-shot{0%{transform:scaleX(0);opacity:1}60%{transform:scaleX(1);opacity:1}100%{transform:scaleX(1);opacity:0}}
.jeongjok .puff{position:absolute;top:50%;left:calc(var(--at) * 100%);transform:translate(-50%,-150%);pointer-events:none;white-space:nowrap;
  font-size:clamp(12px,1.9vh,15px);color:#d8cba8;animation:jj-puff .9s ease-out forwards}
@keyframes jj-puff{to{transform:translate(-50%,-260%);opacity:0}}
.jeongjok .gate.flash{animation:jj-flash .22s ease-out}
.jeongjok .gate.hurt{animation:jj-hurt .4s}
@keyframes jj-flash{0%{filter:brightness(2.4)}100%{filter:none}}
@keyframes jj-hurt{0%,100%{transform:none}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}

.jeongjok .foot{display:flex;flex-direction:column;gap:4px;min-height:clamp(44px,8vh,66px)}
.jeongjok .say{margin:0;min-height:1.6em;font-size:clamp(14.5px,2.4vh,19px);line-height:1.5;color:#f2d79b;word-break:keep-all}
.jeongjok .src{font-size:clamp(11px,1.6vh,12.5px);line-height:1.45;color:#7f8ba0;word-break:keep-all}

/* ── 앞 · 뒤 판 ── */
.jeongjok .panel{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;padding:clamp(10px,3vh,28px);
  background:#070a10d9;overflow-y:auto}
.jeongjok .sheet{width:100%;max-width:720px;margin:auto;display:flex;flex-direction:column;gap:clamp(8px,1.7vh,14px);
  padding:clamp(16px,3.4vh,32px) clamp(16px,3vw,34px);background:#141a26;border:1px solid #3a4558;border-radius:6px;box-shadow:0 18px 60px #000a}
.jeongjok .sheet h3{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.12em;font-size:clamp(20px,3.6vh,29px);color:#f0c469}
.jeongjok .sheet p{margin:0;font-size:clamp(14.5px,2.3vh,18px);line-height:1.7;color:#e3dece;word-break:keep-all}
.jeongjok .sheet figure{margin:0}
.jeongjok .sheet figure img{display:block;width:100%;height:clamp(64px,16vh,150px);object-fit:cover;border-radius:3px}
.jeongjok .sheet .gone-art img{height:clamp(110px,28vh,280px);object-position:50% 45%;border:1px solid #6a5230}
.jeongjok .sheet figcaption{margin-top:4px;font-size:clamp(11px,1.6vh,12.5px);color:#7f8ba0}
.jeongjok .sheet .rule{padding-left:14px;border-left:3px solid #e0a23a;color:#fdf6e6}
.jeongjok .sheet .quiet{font-size:clamp(12.5px,1.9vh,14.5px);line-height:1.6;color:#98a2b3}
.jeongjok .sheet blockquote{margin:0;padding:clamp(10px,2vh,16px) 18px;background:#efe4c8;color:#241d12;border-radius:3px;
  font-family:var(--face-display,serif);font-size:clamp(16px,2.7vh,21px);line-height:1.7;word-break:keep-all}
.jeongjok .sheet blockquote small{display:block;margin-top:6px;font-family:var(--face-body,system-ui,sans-serif);font-size:.66em;color:#6b5530}
.jeongjok .sheet .label{font-size:clamp(12px,1.8vh,14px);letter-spacing:.14em;color:#e8b45c}
.jeongjok .sheet .turn{color:#fdf6e6;font-family:var(--face-display,serif);font-size:clamp(16px,2.7vh,21px)}
.jeongjok .sheet button{align-self:center;margin-top:4px;padding:clamp(10px,1.9vh,14px) 38px;background:#3a2d20;border:1px solid #6a5230;color:#f0c469;
  border-radius:3px;font-family:inherit;font-size:clamp(15px,2.3vh,17px);cursor:pointer}
.jeongjok .sheet button:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}

@media(max-width:640px){
  .jeongjok .meters{margin-left:0;width:100%}
  .jeongjok .firebtn kbd{display:none}
}
@media(prefers-reduced-motion:reduce){
  .jeongjok .squad.exposed::after,.jeongjok .gate.flash,.jeongjok .gate.hurt,.jeongjok .embers i{animation:none}
}
/* 선생님(2026-10-06): 「힉스필드를 이용해서 진짜 게임같이」.
   한 전장 위 두 접근로. 밝은 경계와 성문 조작만 남기고 격자와 네모 병사를 걷었다. */
.jeongjok{background:#0b1015}
.jeongjok .wrap{max-width:1600px;gap:10px;padding:16px 24px}
.jeongjok .head{padding:0 4px 10px;border-bottom:1px solid #bcab7938;align-items:center}
.jeongjok .field{position:relative;display:block;isolation:isolate;overflow:hidden;border:1px solid #bba67855;border-radius:4px;background:#18232c center/cover no-repeat;box-shadow:0 15px 50px #0006}
.jeongjok .field::before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,#080e1720 20%,#080d1630 60%,#080d16a6),linear-gradient(90deg,#07101755,transparent 50%)}
.jeongjok .lane{position:absolute;left:1.5%;right:1.5%;top:49%;height:24%;grid-template-columns:clamp(90px,12vw,154px) minmax(0,1fr);background:none;border:0;border-radius:0;overflow:visible}
.jeongjok .lane[data-lane=south]{top:75%}
.jeongjok .gate{background:linear-gradient(115deg,#172026ec,#10171dc9);border:1px solid #b99b6099;border-left:3px solid #d8b579;border-radius:3px;gap:3px;box-shadow:0 8px 20px #0007;align-self:center;height:90%;max-height:142px;min-height:58px}
.jeongjok .gate b{font-size:clamp(18px,3vh,28px)}
.jeongjok .firebtn{padding:7px 4px;min-height:32px;background:linear-gradient(#75563255,#322619aa);border-color:#b89356;color:#ffdf9d}
.jeongjok .track{background:linear-gradient(180deg,transparent 38%,#61513a55 52%,#95836350 60%,#29291e66 74%,transparent 95%);border-bottom:1px solid #d5bc7918}
.jeongjok .track::after{background:none}
.jeongjok .reach{top:34%;bottom:12%;border-right:2px solid #e8c681bb;background:linear-gradient(90deg,#e0a23a08,#e0a23a28);transform:skewY(2deg);box-shadow:1px 0 12px #ffc36540}
.jeongjok .reach small{top:-26px;left:10px;padding:3px 7px;background:#11191dd9;border:1px solid #bfa16755;border-radius:2px;transform:skewY(-2deg);font-size:clamp(11px,1.65vh,14px)}
.jeongjok .far{top:auto;bottom:4px;color:#d9dbc8;text-shadow:0 1px 5px #000}
.jeongjok .squad{top:63%;width:clamp(100px,15vh,155px);height:clamp(64px,11vh,110px);display:block;transform:translate(-20%,-72%);filter:drop-shadow(0 2px 2px #0009)}
.jeongjok .squad canvas{display:block;width:100%;height:100%}
.jeongjok .cue{z-index:4;text-shadow:0 2px 4px #000,0 0 12px #f0ba55}
.jeongjok .shot{z-index:5;box-shadow:0 0 10px #ffd48a99}
.jeongjok .battle-smoke{position:absolute;left:-28px;top:20%;width:130px;height:70px;pointer-events:none;background:radial-gradient(ellipse,#e1d9bb88,transparent 66%);animation:jj-smoke 1s ease-out forwards;z-index:4}
@keyframes jj-smoke{from{transform:scale(.4);opacity:.8}to{transform:translate(55px,-20px) scale(1.8);opacity:0}}
.jeongjok.battle-paused *{animation-play-state:paused!important}
.jeongjok .foot{min-height:0;padding:0 4px}
@media(max-height:500px){.jeongjok .wrap{padding:8px 14px;gap:6px}.jeongjok .head{gap:10px;padding-bottom:5px}.jeongjok .sub{display:none}.jeongjok .meters{font-size:12px}.jeongjok .gate{gap:1px}.jeongjok .embers{display:none}.jeongjok .firebtn{padding:4px;min-height:28px}.jeongjok .reach small{top:-21px;padding:2px 5px}.jeongjok .say{font-size:14px}.jeongjok .src{font-size:10px}}
@media(max-width:640px){.jeongjok .wrap{padding:10px}.jeongjok .meters{font-size:11px;gap:10px}.jeongjok .pips{gap:2px}.jeongjok .pips i{width:8px;height:8px}.jeongjok .reach small{white-space:normal;line-height:1.15}.jeongjok .far{display:none}}
@media(prefers-reduced-motion:reduce){.jeongjok .battle-smoke{animation:none;opacity:.25}.jeongjok .squad.routed,.jeongjok .squad.breached{animation:none;opacity:.25}}
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
const pips = (n, cls = '') => Array.from({ length: n }, () => `<i${cls ? ` class="${cls}"` : ''}></i>`).join('')

export function battleHtml(view, state) {
  return `<div class="stage"><div class="wrap">
    <div class="head">
      <h2>${esc(view.title ?? '정 족 산 성')}</h2>
      <span class="sub">${esc(view.sub ?? '')}</span>
      <div class="meters">
        <div class="meter"><span>버티는 포수</span><span class="pips hunters-left">${pips(state.ease.hurtLimit)}</span></div>
        <div class="meter"><span>올라온 무리</span><span class="pips done">${pips(totalSquads(state))}</span></div>
      </div>
    </div>
    <div class="field" style="--reach:${REACH}">
      ${LANES.map(lane => `<div class="lane" data-lane="${lane.id}" role="button" tabindex="0" aria-label="${esc(lane.name)}의 포수에게 쏘라고 한다">
        <div class="gate"><b>${esc(lane.name)}</b>
          <div class="embers" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <div class="firebtn"><div class="fill"></div><span>쏴라<kbd>${esc(lane.key)}</kbd></span></div>
        </div>
        <div class="track">
          <div class="reach"><small>화승총이 닿는 곳</small></div>
          <span class="far">산 아래 ▸</span>
          <span class="cue">${esc(BATTLE_LINES.cue)}</span>
        </div>
      </div>`).join('')}
    </div>
    <div class="foot">
      <p class="say" aria-live="polite"></p>
      <div class="src">${esc(view.origin ?? '')}</div>
    </div>
  </div></div>`
}

export function introHtml(view, tries = 1) {
  const first = tries <= 1
  const lines = first ? (view.intro ?? []) : []
  const art = first ? SCENE_ART[view.art] : null
  return `<div class="sheet">
    <h3>${esc(first ? (view.introTitle ?? view.title ?? '') : '다시 — 정족산성')}</h3>
    ${art ? `<figure><img src="${art.src}" alt="${esc(art.alt)}"><figcaption>${esc(art.caption)}</figcaption></figure>` : ''}
    ${lines.map(l => `<p>${esc(l)}</p>`).join('')}
    ${(view.rules ?? []).map(l => `<p class="rule">${esc(l)}</p>`).join('')}
    ${tries >= 3 ? '<p class="rule">이번에는 저들이 닿는 곳에 들면 「지금 —」이 뜬다.</p>' : ''}
    ${first && view.note ? `<p class="quiet">${esc(view.note)}</p>` : ''}
    <button type="button" class="start">${esc(first ? (view.startLabel ?? '포수들을 숨긴다') : '다시 숨는다')}</button>
  </div>`
}

export function resultHtml(view) {
  // 선생님(2026-10-06): 「이것도 물러간 그림이 있어야지, 힉스필드로 만들어넣어」 — 물러가는 프랑스군(재구성).
  const gone = SCENE_ART[view.resultArt ?? 'retreat-1866']
  return `<div class="sheet">
    <h3>${esc(view.resultTitle ?? '저들이 물러갔다')}</h3>
    ${gone ? `<figure class="gone-art"><img src="${gone.src}" alt="${esc(gone.alt)}"><figcaption>${esc(gone.caption)}</figcaption></figure>` : ''}
    <blockquote>${esc(view.quote ?? '')}<small>${esc(view.quoteBy ?? '')}</small></blockquote>
    <span class="label">실 제 로 는</span>
    <p>${esc(view.actual ?? '')}</p>
    <p class="quiet">${esc(view.actualOrigin ?? '')}</p>
    ${view.bridge ? `<p class="turn">${esc(view.bridge)}</p>` : ''}
    <button type="button" class="next">${esc(view.nextLabel ?? '다음으로')}</button>
  </div>`
}

export function createJeongjok(root, { clock = null } = {}) {
  ensureStyle()
  return {
    /**
     * 한 판을 연다. 돌려주는 것: { cleared, stats, summary? , reason? }
     * view.tries 가 몇 번째 판인지 정한다(거듭할수록 거든다 — systems/jeongjok.js easeFor).
     */
    open(view = {}) {
      return new Promise(resolve => {
        const tries = view.tries ?? 1
        let state = createBattle({ tries })
        const el = document.createElement('div')
        el.className = 'jeongjok'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.innerHTML = battleHtml(view, state)
        root.appendChild(el)
        el.querySelector('.field').style.backgroundImage = `url("${BATTLE_ART.jeongjok}")`
        const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
        const later = (fn, ms) => (clock?.delay ?? setTimeout)(() => { if (!closed) fn() }, ms)

        const say = el.querySelector('.say')
        const stage = el.querySelector('.stage')
        const lanes = new Map([...el.querySelectorAll('.lane')].map(l => [l.dataset.lane, {
          el: l, gate: l.querySelector('.gate'), track: l.querySelector('.track'), fill: l.querySelector('.fill'),
        }]))
        const hunterPips = [...el.querySelectorAll('.hunters-left i')]
        const donePips = [...el.querySelectorAll('.done i')]
        const squadEls = new Map()
        let doneCount = 0
        let raf = 0
        let last = 0
        let running = false
        let closed = false

        const fx = (track, cls, vars, ms = 900) => {
          const node = document.createElement('div')
          node.className = cls
          for (const [k, v] of Object.entries(vars)) node.style.setProperty(k, v)
          track.appendChild(node)
          later(() => node.remove(), ms)
          return node
        }
        const pulse = (node, cls) => {
          node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls)
          if (cls === 'flash') fx(node.parentElement.querySelector('.track'), 'battle-smoke', {}, 1000)
        }
        const markDone = cls => { donePips[doneCount++]?.classList.add(cls) }

        function handle(events) {
          for (const e of events) {
            const lane = e.lane ? lanes.get(e.lane) : null
            if (e.type === 'spawn') {
              const node = document.createElement('div')
              node.className = 'squad'
              node.innerHTML = '<canvas width="280" height="176" aria-hidden="true"></canvas>'
              node._g = node.firstChild.getContext('2d')
              node.style.setProperty('--p', '1')
              lane.track.appendChild(node)
              squadEls.set(e.id, node)
            } else if (e.type === 'feint') {
              say.textContent = BATTLE_LINES.feint
            } else if (e.type === 'hit') {
              const node = squadEls.get(e.id)
              const at = node?.style.getPropertyValue('--p') ?? '0.2'
              fx(lane.track, 'shot', { '--to': at }, 400)
              pulse(lane.gate, 'flash')
              node?.classList.add('routed')
              later(() => node?.remove(), 720)
              squadEls.delete(e.id)
              markDone('on')
              say.textContent = BATTLE_LINES.hit
              view.onVolley?.('hit')
            } else if (e.type === 'early') {
              const node = squadEls.get(e.id)
              const from = node?.style.getPropertyValue('--p') ?? '0.6'
              fx(lane.track, 'shot short', { '--to': String(REACH) }, 400)
              fx(lane.track, 'puff', { '--at': String(REACH) }).textContent = '닿지 않는다'
              pulse(lane.gate, 'flash')
              node?.classList.add('exposed')
              later(() => { fx(lane.track, 'shot back', { '--from': from }, 400); pulse(lane.gate, 'hurt') }, 360)
              say.textContent = BATTLE_LINES.early
              view.onVolley?.('early')
            } else if (e.type === 'empty') {
              fx(lane.track, 'shot short', { '--to': String(REACH) }, 400)
              pulse(lane.gate, 'flash')
              say.textContent = BATTLE_LINES.empty
              view.onVolley?.('empty')
            } else if (e.type === 'notready') {
              say.textContent = BATTLE_LINES.notready
              view.onVolley?.('notready')
            } else if (e.type === 'breach') {
              const node = squadEls.get(e.id)
              node?.classList.add('breached')
              later(() => node?.remove(), 520)
              squadEls.delete(e.id)
              pulse(lane.gate, 'hurt')
              markDone('lost')
              say.textContent = BATTLE_LINES.breach
              view.onVolley?.('breach')
            } else if (e.type === 'ready') {
              view.onVolley?.('ready')
            } else if (e.type === 'won' || e.type === 'lost') {
              end()
            }
          }
        }

        function paint() {
          for (const s of state.squads) {
            const node = squadEls.get(s.id)
            if (!node) continue
            node.style.setProperty('--p', s.p.toFixed(4))
            node.classList.toggle('held', s.pause > 0 || (s.feint && s.held > 0 && s.held < FEINT_MS))
            const g = node._g
            g.clearRect(0, 0, 280, 176)
            for (let i = 0; i < 6; i++) drawInfantry(g, 50 + i % 3 * 66, 96 + Math.floor(i / 3) * 48, 1.8, {
              phase: reduced ? 0 : last / 130 + i * 1.6, held: node.classList.contains('held'),
            })
            if (s.pause <= 0) node.classList.remove('exposed')
          }
          for (const [id, lane] of lanes) {
            const r = reloadRatio(state, id)
            lane.fill.style.transform = `scaleX(${r.toFixed(3)})`
            lane.el.classList.toggle('loading', r > 0)
            const front = frontSquad(state, id)
            lane.el.classList.toggle('now', !!state.ease.cue && !!front && inReach(front) && r === 0)
          }
          hunterPips.forEach((p, i) => p.classList.toggle('out', i >= state.ease.hurtLimit - state.hurt))
        }

        function frame(now) {
          if (!running) return
          const paused = !!clock?.isPaused()
          el.classList.toggle('battle-paused', paused)
          if (paused) { raf = requestAnimationFrame(frame); return }
          now = clock?.now() ?? now
          const dt = Math.min(80, now - last)   // 탭을 떠났다 돌아와도 한꺼번에 흐르지 않는다
          last = now
          const r = tick(state, dt)
          state = r.state
          handle(r.events)
          paint()
          if (running) raf = requestAnimationFrame(frame)
        }

        function shoot(laneId) {
          if (clock?.isPaused() || !running) return
          const r = fire(state, laneId)
          state = r.state
          handle(r.events)
          paint()
        }

        function onKey(e) {
          if (!running || clock?.isPaused() || e.repeat) return
          const k = e.key.toLowerCase()
          const lane = k === 'w' || k === 'arrowup' || k === '1' || k === 'ㅈ' ? 'east'
            : k === 's' || k === 'arrowdown' || k === '2' || k === 'ㄴ' ? 'south' : null
          if (!lane) return
          e.preventDefault(); e.stopPropagation()
          shoot(lane)
        }

        for (const [id, lane] of lanes) {
          lane.el.addEventListener('pointerdown', e => { e.preventDefault(); shoot(id) })
          lane.el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); shoot(id) } })
        }
        window.addEventListener('keydown', onKey, true)

        function cleanup() {
          running = false
          cancelAnimationFrame(raf)
          window.removeEventListener('keydown', onKey, true)
        }

        function finish(result) {
          if (closed) return
          closed = true
          cleanup()
          el.remove()
          resolve(result)
        }

        function end() {
          running = false
          cancelAnimationFrame(raf)
          const result = battleResult(state, tries)
          if (!result.cleared) {
            // 못 버틴 판은 잠깐 멈춰 보여 준 뒤 닫는다 — 「아직」 화면은 부른 쪽이 띄운다.
            (clock?.delay ?? setTimeout)(() => finish(result), 1100)
            return
          }
          view.onWin?.()
          ;(clock?.delay ?? setTimeout)(() => {
            if (closed) return
            const panel = document.createElement('div')
            panel.className = 'panel'
            panel.innerHTML = resultHtml(view)
            stage.appendChild(panel)
            const next = panel.querySelector('.next')
            next.addEventListener('click', () => finish(result))
            next.focus?.()
          }, 900)
        }

        // 앞 판 — 무엇을 하는 판인지 읽고 시작한다.
        const intro = document.createElement('div')
        intro.className = 'panel'
        intro.innerHTML = introHtml(view, tries)
        stage.appendChild(intro)
        const start = intro.querySelector('.start')
        start.addEventListener('click', () => {
          intro.remove()
          running = true
          last = clock?.now() ?? performance.now()
          paint()
          raf = requestAnimationFrame(frame)
        })
        start.focus?.()
      })
    },
  }
}
