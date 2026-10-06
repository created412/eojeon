// 광성보 — 닿지 않는 포(화면). 셈은 systems/gwangseong.js 가 한다.
//
// 한 장의 그림이다. 왼쪽 언덕 위에 광성보의 성벽과 장수의 깃발(수자기), 가운데가 강화 해협,
// 오른쪽 물 위에 미국의 배 두 척. 아래 띠가 저들이 뭍으로 올라 걸어오는 길이다.
//
//   포격  [쏴라] → 우리 포탄이 포물선을 그리다 배에 못 미쳐 물에 떨어진다(「닿지 않는다」).
//         저들의 포탄은 성벽에 닿는다. 「우리 포가 닿는 곳」이 물 위에 점선으로 그어져 있다.
//   상륙  [쏴라] → 화승총. 밝은 띠 안에 든 무리만 물러난다. 다시 재는 동안 다음 무리가 온다.
//   끝    성벽이 뚫리고, 깃발이 내려진다. 손댈 것이 없다.
//
// ⚠ 화면에 사람 수 · 거리의 숫자를 적지 않는다 — 몇 번 쏘고 몇 무리가 왔는지는 재구성이다.
// ⚠ 이길 수 없는 판이다. 「아직 — 다시」를 띄우지 않는다. 끝난 뒤의 글이 까닭을 말한다.
// ⚠ 한 화면에 들어온다. 그림은 캔버스 한 장이고, 화면 크기를 따라 줄어든다.
import { installTypeVars } from './type-css.js'
import { SCENE_ART } from './scene-art-data.js'
import { BATTLE_ART } from './battle-art-data.js'
import { drawInfantry, drawBlast, drawCover } from './battle-painter.js'
import {
  createStand, tick, fire, isOver, weaponOf, cannonRatio, gunRatio, frontSquad, inGunReach, standResult,
  CANNON_REACH, GUN_REACH, SHIP_AT, WALL_MAX, LAST_MS, STAND_LINES,
} from '../systems/gwangseong.js'

// 그림의 치수(캔버스 안쪽 단위). 화면 픽셀은 CSS 가 맞춘다.
const W = 1600, H = 720
const WALL_X = 430            // 성벽의 바깥 끝 — 자리 0
const FAR_X = 1560            // 자리 1
const SEA_Y = 330             // 물 위 포격 자리(배경 해안선보다 위)
const PATH_Y = 628            // 저들이 걸어오는 길
const WALL_TOP = 300
const px = p => WALL_X + (FAR_X - WALL_X) * p

const CSS = `
.gwangseong,.gwangseong *{box-sizing:border-box}
.gwangseong{position:fixed;inset:0;z-index:57;overflow:hidden;color:#ece6d6;user-select:none;-webkit-user-select:none;
  font-family:var(--face-body,system-ui,sans-serif);background:#10151c}
.gwangseong .stage{position:relative;height:100%}
.gwangseong .wrap{height:100%;max-width:1320px;margin:0 auto;display:grid;grid-template-rows:auto minmax(0,1fr) auto;
  gap:clamp(5px,1.2vh,12px);padding:clamp(8px,1.8vh,20px) clamp(10px,2vw,26px)}
.gwangseong .head{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap}
.gwangseong h2{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.3em;font-size:clamp(20px,3.6vh,30px);color:#f0c469}
.gwangseong .sub{font-size:clamp(12px,1.9vh,15px);color:#aab3c2}
.gwangseong .meters{margin-left:auto;display:flex;gap:clamp(12px,2vw,26px);align-items:center;font-size:clamp(12.5px,1.9vh,15px);color:#c9d0db}
.gwangseong .meter{display:flex;align-items:center;gap:8px}
.gwangseong .pips{display:flex;gap:4px}
.gwangseong .pips i{width:clamp(12px,1.5vw,18px);height:clamp(9px,1.3vh,12px);background:#cbb98f;border:1px solid #6d5c38;border-radius:1px}
.gwangseong .pips i.out{background:#0000;border-style:dashed;border-color:#6b5d50}
.gwangseong .field{position:relative;min-height:0;display:flex;align-items:center;justify-content:center}
.gwangseong canvas{display:block;max-width:100%;max-height:100%;width:auto;height:auto;aspect-ratio:${W}/${H};border:1px solid #39424e;border-radius:3px;background:#1a2330;touch-action:manipulation;cursor:pointer}
.gwangseong .foot{display:grid;grid-template-columns:1fr auto;gap:clamp(10px,2vw,22px);align-items:center}
.gwangseong .say{margin:0;min-height:1.5em;font-size:clamp(14.5px,2.4vh,19px);line-height:1.5;color:#fdf6e6;word-break:keep-all}
.gwangseong .src{grid-column:1/-1;font-size:clamp(10.5px,1.55vh,12.5px);color:#7f8ba0;line-height:1.45;word-break:keep-all}
.gwangseong .firebtn{position:relative;overflow:hidden;min-width:clamp(150px,22vw,250px);padding:clamp(10px,1.9vh,15px) 22px;background:#3a2d20;border:1px solid #a47c3c;border-radius:4px;
  color:#f0c469;font-family:inherit;font-size:clamp(16px,2.6vh,21px);letter-spacing:.08em;cursor:pointer}
.gwangseong .firebtn .fill{position:absolute;inset:0;background:#0009;transform-origin:left center;transform:scaleX(0);pointer-events:none}
.gwangseong .firebtn span{position:relative}
.gwangseong .firebtn kbd{margin-left:10px;font:inherit;font-size:.72em;padding:1px 7px;border:1px solid #a47c3c88;border-radius:3px;color:#d9b97a}
.gwangseong .firebtn:disabled{opacity:.4;cursor:default}
.gwangseong .firebtn.wait{animation:gs-wait .25s}
.gwangseong .firebtn.now{box-shadow:0 0 0 3px #e0a23a88}
@keyframes gs-wait{25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
@media(prefers-reduced-motion:reduce){.gwangseong .firebtn.wait{animation:none}}
.gwangseong .firebtn:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}

.gwangseong .panel{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;background:#0a0d12d9;padding:clamp(10px,2vh,24px);overflow-y:auto}
.gwangseong .sheet{width:100%;max-width:760px;display:flex;flex-direction:column;gap:clamp(7px,1.3vh,12px);padding:clamp(14px,2.6vh,28px) clamp(16px,2.6vw,32px);
  background:#151b23;border:1px solid #46505c;border-radius:5px;margin:auto}
.gwangseong .sheet h3{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.08em;font-size:clamp(20px,3.4vh,28px);color:#f0c469}
.gwangseong .sheet p{margin:0;font-size:clamp(15px,2.35vh,18.5px);line-height:1.7;color:#fdf6e6;word-break:keep-all}
.gwangseong .sheet figure{margin:0}
.gwangseong .sheet figure img{display:block;width:100%;max-height:clamp(90px,24vh,230px);object-fit:cover;border-radius:3px}
.gwangseong .sheet figcaption{font-size:clamp(10.5px,1.55vh,12.5px);color:#8f9aa3;margin-top:3px}
.gwangseong .sheet .rule{padding-left:13px;border-left:3px solid #c9a25a;color:#f2d79b}
.gwangseong .sheet .quiet{font-size:clamp(12px,1.85vh,14px);color:#98a2b0;line-height:1.6}
.gwangseong .sheet .label{font-size:clamp(11.5px,1.8vh,13.5px);letter-spacing:.14em;color:#e8b45c}
.gwangseong .sheet .turn{color:#f2d79b}
.gwangseong .sheet button{align-self:flex-start;margin-top:4px;padding:clamp(9px,1.7vh,13px) 30px;background:#3a2d20;border:1px solid #6a5230;color:#f0c469;border-radius:3px;
  font-family:inherit;font-size:clamp(15px,2.3vh,17.5px);cursor:pointer}
.gwangseong .sheet button:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}
@media(max-width:760px){.gwangseong .firebtn kbd{display:none}.gwangseong .meters{margin-left:0;width:100%}}
.gwangseong .wrap{max-width:1600px;padding:16px 24px;gap:10px}
.gwangseong .head{padding:0 4px 10px;border-bottom:1px solid #bcab7938;align-items:center}
.gwangseong .field{overflow:hidden;border:1px solid #bba67855;border-radius:4px;background:#18232c;box-shadow:0 15px 50px #0006}
.gwangseong canvas{width:100%;height:100%;max-width:none;max-height:none;object-fit:fill;border:0;border-radius:0;background:#0d151b}
.gwangseong .firebtn{min-height:48px;background:linear-gradient(135deg,#745637,#34291e);border-color:#c9a564;box-shadow:inset 0 1px #ffe2a33d,0 5px 15px #0004}
.gwangseong .foot{column-gap:20px;row-gap:6px}
.gwangseong .say{padding-left:12px;border-left:2px solid #bf9e61}
.gwangseong .gs-phase{position:absolute;left:16px;top:14px;z-index:1;pointer-events:none;padding:7px 12px;background:#101a20dc;border-left:2px solid #d7b87c;color:#e8d7b4;font-size:clamp(12px,1.7vh,16px);letter-spacing:.12em}
@media(max-height:500px){.gwangseong .wrap{padding:8px 14px;gap:6px}.gwangseong .head{padding-bottom:5px;gap:10px}.gwangseong .sub{display:none}.gwangseong .firebtn{min-height:44px;padding:8px 14px;font-size:16px}.gwangseong .say{font-size:14px}.gwangseong .src{font-size:10px}.gwangseong .gs-phase{top:8px;left:8px;padding:4px 8px}.gwangseong .foot{row-gap:4px}}
@media(max-width:640px){.gwangseong .wrap{padding:10px}.gwangseong .foot{gap:8px}.gwangseong .firebtn{min-width:125px;padding:10px}.gwangseong .meters{font-size:12px}}
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
const pips = n => Array.from({ length: n }, () => '<i></i>').join('')

export function standHtml(view) {
  return `<div class="stage"><div class="wrap">
    <div class="head">
      <h2>${esc(view.title ?? '광 성 보')}</h2>
      <span class="sub">${esc(view.sub ?? '')}</span>
      <div class="meters"><div class="meter"><span>성벽</span><span class="pips wall-left">${pips(WALL_MAX)}</span></div></div>
    </div>
    <div class="field"><span class="gs-phase">해협 너머의 포성</span><canvas width="${W}" height="${H}" role="img" aria-label="${esc(view.canvasLabel ?? '광성보의 성벽과 강화 해협, 물 위의 미국 군함')}"></canvas></div>
    <div class="foot">
      <p class="say" aria-live="polite"></p>
      <button type="button" class="firebtn" disabled><div class="fill"></div><span class="lbl">쏴라</span><kbd>Space</kbd></button>
      <div class="src">${esc(view.origin ?? '')}</div>
    </div>
  </div></div>`
}

export function standIntroHtml(view) {
  const art = SCENE_ART[view.art]
  return `<div class="sheet">
    <h3>${esc(view.introTitle ?? view.title ?? '')}</h3>
    ${art ? `<figure><img src="${art.src}" alt="${esc(art.alt)}"><figcaption>${esc(art.caption)}</figcaption></figure>` : ''}
    ${(view.intro ?? []).map(l => `<p>${esc(l)}</p>`).join('')}
    ${(view.rules ?? []).map(l => `<p class="rule">${esc(l)}</p>`).join('')}
    ${view.note ? `<p class="quiet">${esc(view.note)}</p>` : ''}
    <button type="button" class="start">${esc(view.startLabel ?? '성벽에 선다')}</button>
  </div>`
}

export function standResultHtml(view) {
  return `<div class="sheet">
    <h3>${esc(view.resultTitle ?? '성이 무너졌다')}</h3>
    ${(view.after ?? []).map(l => `<p>${esc(l)}</p>`).join('')}
    <span class="label">실 제 로 는</span>
    <p>${esc(view.actual ?? '')}</p>
    <p class="quiet">${esc(view.actualOrigin ?? '')}</p>
    ${(view.bridge ?? []).map(l => `<p class="turn">${esc(l)}</p>`).join('')}
    <button type="button" class="next">${esc(view.nextLabel ?? '다음으로')}</button>
  </div>`
}

// ── 그림 ────────────────────────────────────────────────────────────────
function drawShip(g, x, y, scale, t, flash) {
  g.save()
  g.translate(x, y + Math.sin(t / 900 + x) * 2.5)
  g.scale(scale, scale)
  g.fillStyle = '#142b3040'; g.beginPath(); g.ellipse(2, 21, 144, 12, 0, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#d6e4df66'; g.lineWidth = 2
  g.beginPath(); g.moveTo(-151, 17); g.quadraticCurveTo(-80, 27, 137, 20); g.stroke()
  // 연기
  for (let i = 0; i < 5; i++) {
    const k = ((t / 1400 + i / 5) % 1)
    g.fillStyle = `rgba(40,42,48,${0.42 * (1 - k)})`
    g.beginPath(); g.arc(-6 - k * 90, -96 - k * 46, 10 + k * 22, 0, Math.PI * 2); g.fill()
  }
  // 돛대
  g.strokeStyle = '#1b1d22'; g.lineWidth = 4
  for (const mx of [-70, 62]) { g.beginPath(); g.moveTo(mx, -6); g.lineTo(mx, -120); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(mx - 26, -88); g.lineTo(mx + 26, -88); g.stroke(); g.lineWidth = 4 }
  // Rigging, furled canvas and deck rails give the hull a readable silhouette.
  g.strokeStyle = '#252c2b99'; g.lineWidth = 1
  for (const mx of [-70, 62]) {
    for (const dx of [-40, -20, 20, 40]) { g.beginPath(); g.moveTo(mx, -119); g.lineTo(mx + dx, -22); g.stroke() }
    g.strokeStyle = '#b4b29e'; g.lineWidth = 5; g.beginPath(); g.moveTo(mx - 25, -88); g.quadraticCurveTo(mx, -83, mx + 24, -88); g.stroke(); g.strokeStyle = '#252c2b99'; g.lineWidth = 1
  }
  g.fillStyle = '#605e4e'; g.fillRect(-96, -29, 186, 8)
  g.fillStyle = '#b2aa88'; g.fillRect(-37, -43, 67, 15)
  g.fillStyle = '#263536'; for (let i = 0; i < 5; i++) g.fillRect(-30 + i * 12, -39, 7, 6)
  // 굴뚝
  g.fillStyle = '#23262c'; g.fillRect(-14, -84, 22, 62)
  // 선체
  const hull = g.createLinearGradient(0, -22, 0, 18)
  hull.addColorStop(0, '#555a55'); hull.addColorStop(.25, '#252d2e'); hull.addColorStop(1, '#101b21')
  g.fillStyle = hull
  g.beginPath(); g.moveTo(-128, -22); g.lineTo(132, -22); g.lineTo(108, 16); g.lineTo(-112, 16); g.closePath(); g.fill()
  g.fillStyle = '#5a2620'; g.fillRect(-112, 10, 220, 6)
  g.fillStyle = '#d8d2c2'; for (let i = -84; i <= 84; i += 28) g.fillRect(i, -12, 9, 6)
  g.strokeStyle = '#aaa58c'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-126, -24); g.lineTo(130, -24); g.stroke()
  for (let i = -110; i < 120; i += 15) { g.beginPath(); g.moveTo(i, -24); g.lineTo(i, -33); g.stroke() }
  // 깃발
  g.fillStyle = '#b9c3d6'; g.fillRect(62, -138, 30, 18); g.fillStyle = '#7c2d2a'; for (let i = 0; i < 3; i++) g.fillRect(62, -136 + i * 6, 30, 2.5); g.fillStyle = '#27375a'; g.fillRect(62, -138, 12, 9)
  if (flash > 0) {
    g.fillStyle = `rgba(255,214,140,${flash})`
    g.beginPath(); g.arc(-134, -8, 26 * flash + 8, 0, Math.PI * 2); g.fill()
  }
  g.restore()
}

function drawFigure(g, x, y, s, coat, hat, bob) {
  drawInfantry(g, x, y, s, { side: coat === '#e9e4d6' ? 'korean' : 'american', facing: coat === '#e9e4d6' ? 1 : -1, phase: bob, held: coat === '#e9e4d6' })
}

export function createGwangseong(root, { clock = null } = {}) {
  ensureStyle()
  return {
    /** 한 판을 연다. 돌려주는 것: { fallen:true, stats, summary } — 끝은 누구에게나 같다. */
    open(view = {}) {
      return new Promise(resolve => {
        let state = createStand()
        const el = document.createElement('div')
        el.className = 'gwangseong'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.innerHTML = standHtml(view)
        root.appendChild(el)

        const stage = el.querySelector('.stage')
        const canvas = el.querySelector('canvas')
        const g = canvas.getContext('2d')
        const landscape = new Image()
        landscape.src = BATTLE_ART.gwangseong
        landscape.addEventListener('load', () => { if (!running && !closed) paint() }, { once: true })
        const phaseLabel = el.querySelector('.gs-phase')
        const say = el.querySelector('.say')
        const btn = el.querySelector('.firebtn')
        const btnFill = btn.querySelector('.fill')
        const btnLabel = btn.querySelector('.lbl')
        const wallPips = [...el.querySelectorAll('.wall-left i')]
        const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false

        let running = false, closed = false, raf = 0, last = 0, now = 0
        let shake = 0, flagDrop = 0, idleSaid = false, lastShotAt = 0
        const fx = []            // { kind, t0, dur, ... } — 날아가는 것 · 터지는 것 · 뜨는 글
        const shipFlash = [0, 0]
        const routed = []        // 물러나는 무리(그림만)

        const add = o => { fx.push({ t0: now, ...o }) }
        const text = (x, y, str, color = '#fdf6e6') => add({ kind: 'text', dur: 1500, x, y, str, color })

        function handle(events) {
          for (const e of events) {
            if (e.type === 'short') {
              const n = state.cannonShots
              add({ kind: 'blast', dur: 420, x: WALL_X - 26, y: WALL_TOP - 16, r: 22 })
              add({ kind: 'ball', dur: 1050, x0: WALL_X - 40, y0: WALL_TOP - 18, x1: px(e.at) + (n % 2 ? 26 : -18), y1: SEA_Y + 34, arc: 190, color: '#2a2622', then: 'splash' })
              say.textContent = n > 1 ? STAND_LINES.shortAgain : STAND_LINES.short
              lastShotAt = now
              view.onShot?.('short')
            } else if (e.type === 'shell') {
              const i = e.howitzer ? -1 : SHIP_AT.indexOf(e.from)
              if (i >= 0) shipFlash[i] = 1
              const x0 = e.howitzer ? px(e.from) : px(e.from) - 130, y0 = e.howitzer ? PATH_Y - 40 : SEA_Y - 30
              add({ kind: 'ball', dur: e.howitzer ? 650 : 900, x0, y0, x1: WALL_X - 60 - Math.random() * 180, y1: WALL_TOP + 8, arc: e.howitzer ? 150 : 120, color: '#f3c27a', then: 'blast' })
              if (!e.howitzer || !state.squads.length) say.textContent = e.howitzer ? STAND_LINES.howitzer : STAND_LINES.shell
              view.onShot?.('shell')
            } else if (e.type === 'stage') {
              if (e.stage === 'landing') { say.textContent = STAND_LINES.landing; view.onStage?.('landing') }
              if (e.stage === 'last') { view.onStage?.('last') }
            } else if (e.type === 'hit') {
              add({ kind: 'volley', dur: 300, x1: px(GUN_REACH * .6) })
              routed.push({ t0: now, x: lastFrontX })
              say.textContent = STAND_LINES.hit
              view.onShot?.('hit')
            } else if (e.type === 'early' || e.type === 'empty') {
              add({ kind: 'volley', dur: 300, x1: px(GUN_REACH) })
              text(px(GUN_REACH) + 30, PATH_Y - 70, '닿지 않는다', '#e8a08f')
              say.textContent = STAND_LINES[e.type]
              view.onShot?.('early')
            } else if (e.type === 'notready') {
              // 재는 동안 누른 것은 글을 덮지 않는다(단추만 흔들린다) — 「닿지 않는다」가 읽혀야 한다.
              btn.classList.remove('wait'); void btn.offsetWidth; btn.classList.add('wait')
              view.onShot?.('notready')
            } else if (e.type === 'breach') {
              add({ kind: 'blast', dur: 620, x: WALL_X - 20, y: PATH_Y - 40, r: 60 })
              shake = 1
              say.textContent = STAND_LINES.breach
              view.onShot?.('breach')
            } else if (e.type === 'fallen') {
              shake = 1
              say.textContent = STAND_LINES.fallen
              btn.disabled = true
            } else if (e.type === 'ready') {
              view.onShot?.('ready')
            } else if (e.type === 'over') {
              end()
            }
          }
        }

        let lastFrontX = px(GUN_REACH)
        function paint() {
          const t = now
          g.save()
          if (shake > 0 && !reduced) g.translate((Math.random() - .5) * 10 * shake, (Math.random() - .5) * 8 * shake)
          // Higgsfield 전장. 그림은 재구성이며 포·병력의 실제 판정은 별도로 그린다.
          g.fillStyle = '#72848a'; g.fillRect(0, 0, W, H)
          drawCover(g, landscape, W, H)
          const shade = g.createLinearGradient(0, 0, 0, H)
          shade.addColorStop(0, '#07101c18'); shade.addColorStop(.65, '#11181a00'); shade.addColorStop(1, '#09121866')
          g.fillStyle = shade; g.fillRect(0, 0, W, H)
          // Moving highlights stay on the water; the shoreline remains visible.
          g.strokeStyle = '#e0ece91c'; g.lineWidth = 1.5
          for (let i = 0; i < 22; i++) { const wx = 600 + (i * 137 + (reduced ? 0 : t / 70)) % 1020, wy = SEA_Y + 10 + i % 5 * 24; g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + 24, wy); g.stroke() }

          // 우리 포가 닿는 곳(물 위의 점선)
          if (state.stage === 'bombard') {
            const rx = px(CANNON_REACH)
            g.setLineDash([12, 10]); g.strokeStyle = '#f0c469cc'; g.lineWidth = 3
            g.beginPath(); g.moveTo(rx, SEA_Y + 6); g.lineTo(rx, PATH_Y - 78); g.stroke(); g.setLineDash([])
            g.fillStyle = '#f0c469'; g.font = '600 24px sans-serif'; g.textAlign = 'center'
            g.fillText('우리 포가 닿는 곳', rx - 118, SEA_Y + 120)
            g.fillStyle = '#f0c46922'; g.fillRect(WALL_X, SEA_Y, rx - WALL_X, PATH_Y - 78 - SEA_Y)
          }
          // 배
          SHIP_AT.forEach((p, i) => { drawShip(g, px(p), SEA_Y + 30 + i * 26, 1.02 - i * .08, reduced ? 0 : t, shipFlash[i]); shipFlash[i] = Math.max(0, shipFlash[i] - .05) })

          // 상륙로는 전장 그림 위의 사거리 표시로만 구분한다.
          if (state.stage === 'landing') {
            g.fillStyle = '#f0c46933'; g.fillRect(WALL_X, PATH_Y - 64, px(GUN_REACH) - WALL_X, 92)
            g.fillStyle = '#f7dca0'; g.font = '600 22px sans-serif'; g.textAlign = 'left'
            g.fillText('화승총이 닿는 곳', WALL_X + 14, PATH_Y + 52)
          }

          // 원화의 성벽을 가리지 않고 손상 흔적과 잔해만 겹친다.
          const seg = (WALL_X - 30) / WALL_MAX
          for (let i = state.wall; i < WALL_MAX; i++) {
            const x = 20 + i * seg
            g.fillStyle = '#292924a8'; g.beginPath(); g.moveTo(x, WALL_TOP - 24); g.lineTo(x + seg * .4, WALL_TOP + 32); g.lineTo(x + seg, WALL_TOP - 18); g.lineTo(x + seg, WALL_TOP + 55); g.lineTo(x, WALL_TOP + 55); g.fill()
            for (let j = 0; j < 6; j++) { g.fillStyle = j % 2 ? '#6d7163' : '#929082'; g.beginPath(); g.moveTo(x + j * 13, WALL_TOP + 42 + j % 2 * 8); g.lineTo(x + j * 13 + 14, WALL_TOP + 36); g.lineTo(x + j * 13 + 20, WALL_TOP + 60); g.closePath(); g.fill() }
          }
          // 성벽 위의 군사와 포
          const men = Math.max(0, state.wall)
          for (let i = 0; i < men; i++) drawFigure(g, 44 + i * ((WALL_X - 100) / WALL_MAX), WALL_TOP - 1, 1.35, '#e9e4d6', '#1d1c1a', 0)
          if (state.wall > 0) { g.fillStyle = '#2b2a27'; g.fillRect(WALL_X - 96, WALL_TOP - 20, 62, 12); g.beginPath(); g.arc(WALL_X - 86, WALL_TOP - 6, 10, 0, Math.PI * 2); g.fill() }
          // 수자기
          const poleX = 150, poleTop = WALL_TOP - 196
          g.strokeStyle = '#3a2f22'; g.lineWidth = 6; g.beginPath(); g.moveTo(poleX, WALL_TOP); g.lineTo(poleX, poleTop); g.stroke()
          const fy = poleTop + 6 + flagDrop * 170, wave = reduced ? 0 : Math.sin(t / 380) * 6
          g.fillStyle = '#d9c89a'
          g.beginPath(); g.moveTo(poleX + 3, fy); g.lineTo(poleX + 118, fy + wave); g.lineTo(poleX + 118, fy + 104 + wave); g.lineTo(poleX + 3, fy + 104); g.closePath(); g.fill()
          g.fillStyle = '#17140f'; g.font = '700 74px serif'; g.textAlign = 'center'; g.fillText('帥', poleX + 60, fy + 80 + wave / 2)

          // 뭍에 오른 무리
          for (const q of state.squads) {
            const x = px(q.p)
            for (let i = 0; i < 6; i++) drawFigure(g, x + (i % 3) * 20, PATH_Y + Math.floor(i / 3) * 22, 1.75, '#27375a', '#e9e4d6', reduced ? 0 : t / 130 + i + x / 30)
          }
          const front = frontSquad(state)
          if (front) lastFrontX = px(front.p)
          for (let i = routed.length - 1; i >= 0; i--) {
            const r = routed[i], k = (t - r.t0) / 900
            if (k >= 1) { routed.splice(i, 1); continue }
            g.globalAlpha = 1 - k
            for (let j = 0; j < 6; j++) drawFigure(g, r.x + k * 150 + (j % 3) * 22, PATH_Y + Math.floor(j / 3) * 22, 1.75, '#27375a', '#e9e4d6', 0)
            g.globalAlpha = 1
          }

          // 날아가는 것 · 터지는 것 · 뜨는 글
          for (let i = fx.length - 1; i >= 0; i--) {
            const f = fx[i], k = (t - f.t0) / f.dur
            if (k >= 1) {
              fx.splice(i, 1)
              if (f.then === 'splash') { add({ kind: 'splash', dur: 720, x: f.x1, y: f.y1 }); text(f.x1, f.y1 - 60, '닿지 않는다', '#fdf6e6') }
              if (f.then === 'blast') { add({ kind: 'blast', dur: 560, x: f.x1, y: f.y1, r: 54 }); shake = Math.max(shake, .7) }
              continue
            }
            if (f.kind === 'ball') {
              const x = f.x0 + (f.x1 - f.x0) * k, y = f.y0 + (f.y1 - f.y0) * k - Math.sin(Math.PI * k) * f.arc
              g.fillStyle = f.color; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill()
            } else if (f.kind === 'splash') {
              drawBlast(g, f.x, f.y, 74, k, true)
            } else if (f.kind === 'blast') {
              drawBlast(g, f.x, f.y, f.r ?? 50, k)
            } else if (f.kind === 'volley') {
              g.strokeStyle = `rgba(255,236,190,${1 - k})`; g.lineWidth = 4
              for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(WALL_X - 30, PATH_Y - 52 + j * 13); g.lineTo(f.x1, PATH_Y - 36 + j * 12); g.stroke() }
            } else if (f.kind === 'text') {
              g.font = '600 26px sans-serif'; g.textAlign = 'center'
              g.fillStyle = `rgba(10,12,16,${.55 * (1 - k)})`; g.fillRect(f.x - 86, f.y - 26 - k * 30, 172, 36)
              g.globalAlpha = 1 - k * k; g.fillStyle = f.color; g.fillText(f.str, f.x, f.y - k * 30); g.globalAlpha = 1
            }
          }
          // 끝 — 연기가 덮인다
          if (state.stage === 'last' || isOver(state)) {
            const k = isOver(state) ? 1 : Math.min(1, state.stageT / LAST_MS)
            g.fillStyle = `rgba(22,22,24,${.5 * k})`; g.fillRect(0, 0, W, H)
          }
          g.restore()

          phaseLabel.textContent = state.stage === 'bombard' ? '해협 너머의 포성' : state.stage === 'landing' ? '성벽 아래 · 상륙' : '끝까지 남은 깃발'
          // 단추 · 성벽 눈금
          const weapon = weaponOf(state)
          const ratio = weapon === 'cannon' ? cannonRatio(state) : weapon === 'gun' ? gunRatio(state) : 0
          btnFill.style.transform = `scaleX(${ratio.toFixed(3)})`
          btnLabel.textContent = weapon === 'gun' ? '화승총 — 쏴라' : weapon === 'cannon' ? '포 — 쏴라' : '…'
          const front2 = frontSquad(state)
          btn.classList.toggle('now', weapon === 'gun' && !!front2 && inGunReach(front2) && ratio === 0)
          wallPips.forEach((p, i) => p.classList.toggle('out', i >= state.wall))
        }

        function frame(time) {
          if (!running) return
          if (clock?.isPaused()) { raf = requestAnimationFrame(frame); return }
          time = clock?.now() ?? time
          const dt = Math.min(80, time - last)   // 탭을 떠났다 돌아와도 한꺼번에 흐르지 않는다
          last = time; now += dt
          const r = tick(state, dt)
          state = r.state
          handle(r.events)
          // 포격 내내 한 번도 쏘지 않고 기다리는 학생에게 — 정족산성의 손이 여기서는 통하지 않는다.
          if (state.stage === 'bombard' && !idleSaid && state.cannonShots === 0 && state.stageT > 6500) { idleSaid = true; say.textContent = STAND_LINES.idle }
          if (state.stage === 'last') {
            const k = Math.min(1, state.stageT / LAST_MS)
            flagDrop = Math.max(0, (k - .35) / .65)
            if (k > .35 && say.textContent !== STAND_LINES.flag) say.textContent = STAND_LINES.flag
          }
          shake = Math.max(0, shake - dt / 380)
          paint()
          if (running) raf = requestAnimationFrame(frame)
        }

        function shoot() {
          if (clock?.isPaused() || !running || !weaponOf(state)) return
          const r = fire(state)
          state = r.state
          handle(r.events)
        }

        function onKey(e) {
          if (!running || clock?.isPaused() || e.repeat) return
          const k = e.key.toLowerCase()
          if (!(k === ' ' || k === 'enter' || k === 'w' || k === 's' || k === 'ㅈ' || k === 'ㄴ' || k === 'arrowup')) return
          e.preventDefault(); e.stopPropagation()
          shoot()
        }
        // 글쇠로 누른 것(detail 0)은 아래 onKey 가 이미 받았다 — 두 번 쏘지 않는다.
        btn.addEventListener('click', e => { if (e.detail !== 0) shoot() })
        canvas.addEventListener('pointerdown', e => { e.preventDefault(); shoot() })
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
          paint()
          const result = standResult(state)
          view.onFall?.()
          ;(clock?.delay ?? setTimeout)(() => {
            if (closed) return
            const panel = document.createElement('div')
            panel.className = 'panel'
            panel.innerHTML = standResultHtml(view)
            stage.appendChild(panel)
            const next = panel.querySelector('.next')
            next.addEventListener('click', () => finish(result))
            next.focus?.()
          }, 700)
        }

        // 앞 판 — 무엇을 하는 판인지 읽고 시작한다.
        paint()
        const intro = document.createElement('div')
        intro.className = 'panel'
        intro.innerHTML = standIntroHtml(view)
        stage.appendChild(intro)
        const start = intro.querySelector('.start')
        start.addEventListener('click', () => {
          intro.remove()
          running = true
          btn.disabled = false
          say.textContent = STAND_LINES.bombard
          last = clock?.now() ?? performance.now()
          raf = requestAnimationFrame(frame)
          btn.focus?.()
        })
        start.focus?.()
      })
    },
  }
}
