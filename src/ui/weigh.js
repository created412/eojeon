// 임금의 저울(화면) — 밤의 편전, 책상 위의 저울 하나. 셈은 systems/weigh.js 가 한다.
//
// 선생님(2026-10-06): 「신하들의 의견을 듣고 고종이 치열하게 고민하는 장면을 교육적인 게임으로
// 적용하고 싶어. 이 고민이 정말 게임의 백미가 되었으면 좋겠어.」
//
// 화면은 둘로 나뉜다. 왼쪽은 **저울** — 처음부터 끝까지 떠 있고, 추가 오를 때마다 흔들리다 멎는다.
// 오른쪽은 **지금 손에 든 것** — 대신의 말, 추 한 개, 정할 자리, 실제의 일.
//
// ⚠ 저울은 계기판이 아니다. 숫자를 띄우지 않는다 — 기운 것은 눈으로 본다.
// ⚠ 추마다 읽는 길을 먼저 고르고(어느 쪽에), 그다음 무게를 고른다(얼마나). 두 번 누르면 추 하나가 오른다.
// ⚠ 움직임을 줄이라는 설정(prefers-reduced-motion)이면 저울은 흔들리지 않고 곧장 그 자리에 선다.
import { installTypeVars } from './type-css.js'
import { SCENE_ART } from './scene-art-data.js'
import {
  initialWeigh, begin, hear, allHeard, answerAsk, askHint, sit, currentWeight, readingOf, place,
  onPan, setAside, tilt, ownLean, heaviest, decide, currentStep, actualSteps, next, sealed, liftedOf,
  weighSummary, weighRecord, HEFTS, HEFT_LABEL,
} from '../systems/weigh.js'

export const GRADE_LABEL = { source: '기록에 적힌 것', memory: '당신이 지나온 일', hindsight: '뒷날의 눈' }
const SIDE_LABEL = { shut: '닫는 쪽에 올린다', open: '여는 쪽에 올린다', none: '저울에 올리지 않는다' }

// 저울의 치수(viewBox 단위).
const VB = { w: 700, h: 470 }
const PIVOT = { x: 350, y: 72 }
const ARM = 218          // 받침점에서 접시 끈까지
const DROP = 164         // 끈의 길이
const MAX_DEG = 14
const DEG_PER_HEFT = 2.3
const WEIGHT_W = 78
const HEFT_H = { 1: 27, 2: 39, 3: 53 }
const PER_ROW = 3

const CSS = `
.weigh,.weigh *{box-sizing:border-box}
.weigh{position:fixed;inset:0;z-index:57;overflow-y:auto;color:#ece6d6;font-family:var(--face-body,system-ui,sans-serif);
  background:#0b0d11 center/cover no-repeat;display:flex;justify-content:center}
.weigh::before{content:'';position:fixed;inset:0;pointer-events:none;
  background:linear-gradient(90deg,#07090c70 0%,#07090c59 40%,#07090cd9 100%)}
.weigh .wrap{position:relative;width:100%;max-width:min(1420px,152vh);min-height:100%;display:flex;flex-direction:column;justify-content:safe center;
  gap:clamp(6px,1.4vh,14px);padding:clamp(8px,2.2vh,26px) clamp(14px,2.6vw,32px)}
.weigh .wrap>*{flex:0 0 auto}
.weigh header{display:flex;align-items:baseline;gap:clamp(10px,1.6vw,20px);flex-wrap:wrap}
.weigh header small{font-size:clamp(11.5px,1.8vh,14px);letter-spacing:.12em;color:#b9b2a0}
.weigh h2{margin:0;font-family:var(--face-display,serif);font-weight:400;letter-spacing:.22em;font-size:clamp(19px,3.4vh,30px);color:#f0c469}
.weigh header .q{margin:0;font-size:clamp(14px,2.3vh,18px);color:#fdf6e6;word-break:keep-all}
.weigh .board{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(12px,2.4vw,34px);align-items:start}
.weigh .left{position:sticky;top:0;display:flex;flex-direction:column;gap:6px}
.weigh .scale{width:100%;height:auto;max-height:min(66vh,560px);display:block;overflow:visible}
.weigh .scale text{font-family:var(--face-body,system-ui,sans-serif)}
.weigh .aside{min-height:1.6em;display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:clamp(11.5px,1.75vh,13.5px);color:#9aa3ad}
.weigh .aside[hidden]{display:none}
.weigh .aside b{font-weight:400}
.weigh .aside i{font-style:normal;padding:2px 9px;border:1px dashed #6f7a86;border-radius:3px;color:#c5ccd3}

/* ── 오른쪽: 지금 손에 든 것 ── */
.weigh .panel{display:flex;flex-direction:column;gap:clamp(7px,1.3vh,12px);padding:clamp(12px,2vh,20px) clamp(14px,1.8vw,22px);
  background:#12161bd9;border:1px solid #3a4148;border-radius:5px;backdrop-filter:blur(2px);animation:wg-in .35s ease-out}
@keyframes wg-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.weigh .panel p{margin:0;word-break:keep-all}
.weigh .when{font-size:clamp(11.5px,1.8vh,13.5px);letter-spacing:.06em;color:#e8b45c}
.weigh .lead{font-size:clamp(15px,2.4vh,19px);line-height:1.7;color:#fdf6e6}
.weigh .small{font-size:clamp(12.5px,1.95vh,15px);line-height:1.6;color:#b9b2a0}
.weigh .origin{font-size:clamp(11.5px,1.7vh,13px);line-height:1.5;color:#8f9aa3}
.weigh blockquote{margin:0;padding:clamp(8px,1.5vh,13px) 15px;border-left:3px solid #c9a25a;background:#f3ead414;
  font-family:var(--face-display,serif);font-size:clamp(15px,2.35vh,19px);line-height:1.72;color:#fdf6e6;word-break:keep-all}
.weigh blockquote.memory{border-left-color:#8fb0c9}
.weigh blockquote.hindsight{border-left-color:#9fd0d6;border-left-style:dashed;background:#9fd0d612}
.weigh .tagrow{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.weigh .tagrow h3{margin:0;font-family:var(--face-display,serif);font-weight:400;font-size:clamp(17px,2.9vh,24px);color:#f3ede0}
.weigh .grade{font-size:clamp(11px,1.65vh,12.5px);letter-spacing:.08em;padding:2px 8px;border-radius:9px;border:1px solid #7d6a45;color:#e8c98a}
.weigh .grade.memory{border-color:#5d7a90;color:#a9c6dc}
.weigh .grade.hindsight{border-color:#6ea3a9;color:#a9dbe0;border-style:dashed}
.weigh .progress{margin-left:auto;font-size:clamp(11.5px,1.7vh,13px);color:#8f9aa3}
.weigh .label{font-size:clamp(12px,1.85vh,14px);letter-spacing:.08em;color:#b9b2a0}
.weigh button{font-family:inherit;cursor:pointer}
.weigh button:focus-visible{outline:3px solid #e0a23a;outline-offset:2px}
.weigh .go{align-self:flex-start;padding:clamp(9px,1.7vh,13px) 30px;background:#3a2d20;border:1px solid #6a5230;color:#f0c469;border-radius:3px;font-size:clamp(15px,2.3vh,17.5px)}
.weigh .go[hidden]{display:none}

/* 대신들 */
.weigh .kingline{padding:8px 13px;border-left:3px solid #a3302a;background:#a3302a14}
.weigh .kingline b{display:block;font-weight:400;font-size:clamp(11.5px,1.7vh,13px);letter-spacing:.08em;color:#e8a08f}
.weigh .kingline p{font-family:var(--face-display,serif);font-size:clamp(14px,2.15vh,17px);line-height:1.65;color:#f1ebdc}
.weigh .seats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.weigh .seat{display:flex;flex-direction:column;align-items:center;gap:1px;padding:clamp(6px,1.2vh,10px) 4px;background:#1c2228;border:1px solid #4a545c;border-radius:4px;color:#ece6d6}
.weigh .seat .post{font-size:clamp(10.5px,1.6vh,12.5px);color:#9aa3ad}
.weigh .seat .name{font-size:clamp(14px,2.2vh,17px)}
.weigh .seat.heard{border-color:#6a5230;background:#2a241b}
.weigh .seat.heard .name::after{content:' ✓';color:#e0a23a;font-size:.8em}
.weigh .seat.on{border-color:#e0a23a;box-shadow:0 0 0 2px #e0a23a55}
.weigh .speech{min-height:clamp(74px,13vh,112px);padding:9px 14px;border-left:3px solid #c9a25a;background:#f3ead414}
.weigh .speech b{display:block;font-weight:400;font-size:clamp(11.5px,1.75vh,13.5px);color:#e8c98a;margin-bottom:2px}
.weigh .speech p{font-family:var(--face-display,serif);font-size:clamp(14.5px,2.3vh,18px);line-height:1.7;color:#fdf6e6}
.weigh .speech.empty p{font-family:inherit;color:#8f9aa3;font-size:clamp(13px,2vh,15px)}
.weigh .ask{display:flex;flex-direction:column;gap:7px;padding-top:8px;border-top:1px solid #3a4148}
.weigh .ask[hidden]{display:none}
.weigh .panel.asking .kingline,.weigh .panel.asking .ask-first{display:none}
.weigh .ask .q{font-size:clamp(14.5px,2.3vh,18px);line-height:1.6;color:#fdf6e6}
.weigh .ask .opts{display:flex;gap:7px;flex-wrap:wrap}
.weigh .aopt{padding:8px 16px;background:#1c2228;border:1px solid #55646b;border-radius:3px;color:#ece6d6;font-size:clamp(14px,2.2vh,16.5px)}
.weigh .aopt.no{animation:wg-no .3s;opacity:.55}
.weigh .aopt.glow{border-color:#e0a23a;box-shadow:0 0 0 3px #e0a23a55}
.weigh .aopt.picked{border-color:#e0a23a;background:#33291a;color:#f0c469}
.weigh .aopt:disabled{cursor:default}
.weigh .ask.done .aopt:not(.picked){display:none}
.weigh .ask .say{min-height:1.5em;font-size:clamp(13.5px,2.1vh,16px);line-height:1.6;color:#e8a08f}
.weigh .ask.done .say{color:#fdf6e6}
@keyframes wg-no{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}

/* 추 한 개 */
.weigh .reads{display:flex;flex-direction:column;gap:7px}
.weigh .read{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px;padding:clamp(8px,1.5vh,12px) 14px;text-align:left;
  background:#1c2228;border:1px solid #55646b;border-radius:4px;color:#f3ede0;font-size:clamp(14.5px,2.25vh,17.5px);line-height:1.55;word-break:keep-all}
.weigh .read .side{font-size:clamp(11px,1.65vh,12.5px);letter-spacing:.04em;padding:3px 9px;border-radius:3px;white-space:nowrap}
.weigh .read .side.shut{background:#5a1f1c;color:#ffd9cf}
.weigh .read .side.open{background:#1f3e5a;color:#d3e8fb}
.weigh .read .side.none{background:#30363c;color:#c5ccd3;border:1px dashed #6f7a86}
.weigh .read.picked{border-color:#e0a23a;background:#33291a}
.weigh .reads.chosen .read:not(.picked){opacity:.45}
.weigh .hefts{display:flex;flex-direction:column;gap:7px}
.weigh .hefts[hidden]{display:none}
.weigh .hefts .row{display:flex;gap:8px;flex-wrap:wrap}
.weigh .heft{display:flex;align-items:flex-end;gap:9px;padding:8px 16px 8px 12px;background:#2a241b;border:1px solid #6a5230;border-radius:4px;color:#f0c469;font-size:clamp(14px,2.2vh,16.5px)}
.weigh .heft i{display:block;width:26px;border-radius:3px 3px 2px 2px;background:linear-gradient(90deg,#8a6a2e,#e2c27a 45%,#9c7a38)}
.weigh .heft[data-h="1"] i{height:10px}.weigh .heft[data-h="2"] i{height:17px}.weigh .heft[data-h="3"] i{height:25px}
.weigh .panel.busy{pointer-events:none}

/* 정한다 */
.weigh .choices{display:flex;flex-direction:column;gap:9px}
.weigh .choice{padding:clamp(12px,2.2vh,18px) 20px;text-align:left;border-radius:4px;font-size:clamp(16px,2.6vh,21px);color:#fdf6e6;word-break:keep-all}
.weigh .choice.shut{background:#3a1715;border:1px solid #a3302a}
.weigh .choice.open{background:#15293c;border:1px solid #3f78a8}
.weigh .remark{font-size:clamp(14px,2.2vh,17px);line-height:1.7;color:#f2d79b}
.weigh .cmp{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;font-size:clamp(13.5px,2.1vh,16px);line-height:1.6}
.weigh .cmp dt{color:#9aa3ad}.weigh .cmp dd{margin:0;color:#f3ede0;word-break:keep-all}
.weigh .interp{padding:9px 13px;border:1px dashed #6f7a86;border-radius:4px;font-size:clamp(13px,2.05vh,15.5px);line-height:1.7;color:#d6dbe0}
.weigh .interp b{display:block;font-weight:400;font-size:.86em;letter-spacing:.08em;color:#9fd0d6;margin-bottom:2px}

/* 저울 위의 추 */
.weigh .w.new>g{animation:wg-drop .5s cubic-bezier(.3,1.5,.5,1)}
@keyframes wg-drop{from{transform:translateY(-70px);opacity:0}60%{opacity:1}to{transform:none}}
.weigh .w.gone>g{animation:wg-lift .6s ease-in forwards}
@keyframes wg-lift{to{transform:translateY(-90px);opacity:0}}
.weigh .sealmark.new>g{animation:wg-seal .45s cubic-bezier(.5,0,.9,.4)}
@keyframes wg-seal{from{transform:translateY(-190px);opacity:0}30%{opacity:1}to{transform:none}}

@media (max-width:720px){
  .weigh .board{grid-template-columns:1fr}
  .weigh .left{position:static}
  .weigh .scale{max-height:34vh}
}
@media (prefers-reduced-motion:reduce){.weigh .panel,.weigh .w.new>g,.weigh .w.gone>g,.weigh .sealmark.new>g{animation:none}}
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

// ── 저울 그림 ────────────────────────────────────────────────────────────
function scaleSvg(data) {
  const panLabel = side => `
      <text class="pl" x="0" y="${DROP + 48}" text-anchor="middle" font-size="23" fill="#fdf6e6">${esc(data.pans[side].label)}</text>
      <text x="0" y="${DROP + 70}" text-anchor="middle" font-size="15.5" fill="#cfc8b8">${esc(data.pans[side].sub)}</text>`
  const pan = side => `
    <g class="pan" data-pan="${side}">
      <path d="M0 0 L-108 ${DROP} M0 0 L108 ${DROP} M0 0 L0 ${DROP - 4}" stroke="#b79a5c" stroke-width="1.6" fill="none" opacity=".85"/>
      <circle r="5" fill="#d9bb72"/>
      <g class="load"></g>
      <path d="M-126 ${DROP} Q0 ${DROP + 34} 126 ${DROP} Z" fill="url(#wg-dish)" stroke="#6d5524" stroke-width="1.2"/>
      <ellipse cx="0" cy="${DROP}" rx="126" ry="8" fill="#e7cf8f" stroke="#6d5524" stroke-width="1"/>
      ${panLabel(side)}
    </g>`
  return `<svg class="scale" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="저울">
    <defs>
      <linearGradient id="wg-brass" x1="0" x2="1"><stop offset="0" stop-color="#7d5f27"/><stop offset=".45" stop-color="#e6c981"/><stop offset="1" stop-color="#8d6c2f"/></linearGradient>
      <linearGradient id="wg-dish" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c9a85e"/><stop offset="1" stop-color="#6d5524"/></linearGradient>
      <linearGradient id="wg-ghost" x1="0" x2="1"><stop offset="0" stop-color="#4f7f86"/><stop offset=".5" stop-color="#b7e3e8"/><stop offset="1" stop-color="#5b8d94"/></linearGradient>
      <linearGradient id="wg-seal" x1="0" x2="1"><stop offset="0" stop-color="#7a1712"/><stop offset=".5" stop-color="#c8372c"/><stop offset="1" stop-color="#7a1712"/></linearGradient>
      <radialGradient id="wg-glow"><stop offset="0" stop-color="#f0c46933"/><stop offset="1" stop-color="#f0c46900"/></radialGradient>
    </defs>
    <ellipse cx="${PIVOT.x}" cy="${VB.h - 160}" rx="330" ry="190" fill="url(#wg-glow)"/>
    <path d="M${PIVOT.x - 78} ${VB.h - 8} h156 l-18 -18 h-120 Z" fill="url(#wg-brass)" stroke="#5a4520"/>
    <rect x="${PIVOT.x - 7}" y="${PIVOT.y}" width="14" height="${VB.h - PIVOT.y - 26}" rx="4" fill="url(#wg-brass)" stroke="#5a4520"/>
    <g class="beam">
      <rect x="${-ARM - 12}" y="-6" width="${(ARM + 12) * 2}" height="12" rx="6" fill="url(#wg-brass)" stroke="#5a4520"/>
      <path d="M0 -6 L-7 -30 L7 -30 Z" fill="#e6c981" stroke="#5a4520"/>
    </g>
    <circle cx="${PIVOT.x}" cy="${PIVOT.y}" r="9" fill="#f0d898" stroke="#5a4520" stroke-width="1.5"/>
    ${pan('shut')}${pan('open')}
  </svg>`
}

function weightSvg(w, x, yBottom, extra = '') {
  const h = HEFT_H[w.heft], half = WEIGHT_W / 2, top = half - 7
  const ghost = !!w.hindsight
  const size = w.heft === 1 ? 16 : w.heft === 2 ? 17.5 : 19
  return `<g class="w${extra}" data-w="${esc(w.id)}" transform="translate(${x} ${yBottom})"><g>
    <rect x="-10" y="${-h - 7}" width="20" height="8" rx="2" fill="${ghost ? '#8fc4ca' : '#b3934f'}" stroke="${ghost ? '#3f6a70' : '#5a4520'}"/>
    <path d="M${-half} 0 L${-top} ${-h} L${top} ${-h} L${half} 0 Z" fill="url(#${ghost ? 'wg-ghost' : 'wg-brass'})" stroke="${ghost ? '#3f6a70' : '#5a4520'}" stroke-width="1.2"${ghost ? ' stroke-dasharray="4 3" opacity=".82"' : ''}/>
    <text x="0" y="${-h / 2 + size * .36}" text-anchor="middle" font-size="${size}" fill="${ghost ? '#0f2a2e' : '#33250b'}" font-weight="600">${esc(w.mark ?? w.tag)}</text>
  </g></g>`
}

// 접시 위에 추를 쌓는다 — 한 줄에 셋, 넘치면 그 위에.
export function layoutLoad(weights) {
  const out = []
  let y = DROP - 5
  for (let i = 0; i < weights.length; i += PER_ROW) {
    const row = weights.slice(i, i + PER_ROW)
    row.forEach((w, k) => out.push({ w, x: (k - (row.length - 1) / 2) * (WEIGHT_W + 4), y }))
    y -= Math.max(...row.map(w => HEFT_H[w.heft])) + 8
  }
  return { items: out, top: y }
}

export function weighHtml(data) {
  return `<div class="wrap">
    <header><h2>${esc(data.title)}</h2><p class="q">${esc(data.question)}</p><small>${esc(data.dateLabel ?? '')}</small></header>
    <div class="board">
      <div class="left">
        ${scaleSvg(data)}
        <div class="aside" hidden></div>
      </div>
      <div class="right"></div>
    </div>
  </div>`
}

export function createWeigh(root) {
  ensureStyle()
  return {
    open(data, { onHear = null, onPick = null, onLand = null, onAside = null, onMiss = null, onRight = null, onLift = null, onSeal = null, onDecide = null } = {}) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'weigh'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        const bg = SCENE_ART['night-hall']?.src
        if (bg) el.style.backgroundImage = `url("${bg}")`
        el.innerHTML = weighHtml(data)
        root.appendChild(el)

        const right = el.querySelector('.right')
        const aside = el.querySelector('.aside')
        const beam = el.querySelector('.beam')
        const pans = { shut: el.querySelector('[data-pan="shut"]'), open: el.querySelector('[data-pan="open"]') }
        let state = initialWeigh()
        let closed = false
        const timers = new Set()
        const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!closed) fn() }, ms); timers.add(id) }

        // ── 저울의 흔들림(감쇠 용수철) ──
        const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
        let angle = 0, vel = 0, target = 0, raf = 0, last = 0
        const drawBeam = () => {
          const rad = angle * Math.PI / 180
          beam.setAttribute('transform', `translate(${PIVOT.x} ${PIVOT.y}) rotate(${angle.toFixed(3)})`)
          for (const [side, sign] of [['shut', -1], ['open', 1]]) {
            const x = PIVOT.x + sign * ARM * Math.cos(rad), y = PIVOT.y + sign * ARM * Math.sin(rad)
            pans[side].setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`)
          }
        }
        const tick = now => {
          const dt = Math.min(.05, (now - last) / 1000); last = now
          vel += (-34 * (angle - target) - 4.6 * vel) * dt
          angle += vel * dt
          if (Math.abs(angle - target) < .03 && Math.abs(vel) < .05) { angle = target; vel = 0; raf = 0; drawBeam(); return }
          drawBeam()
          raf = requestAnimationFrame(tick)
        }
        const swing = () => {
          target = Math.max(-MAX_DEG, Math.min(MAX_DEG, tilt(data, state) * DEG_PER_HEFT))
          if (reduced) { angle = target; drawBeam(); return }
          if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick) }
        }

        // 접시를 다시 그린다. fresh 는 방금 오른 추(떨어지는 움직임을 준다).
        const drawPans = (fresh = null, freshSeal = false) => {
          for (const side of ['shut', 'open']) {
            const { items, top } = layoutLoad(onPan(data, state, side))
            let html = items.map(({ w, x, y }) => weightSvg(w, x, y, w.id === fresh ? ' new' : '')).join('')
            if (side === 'open' && sealed(data, state)) {
              html += `<g class="sealmark${freshSeal ? ' new' : ''}" transform="translate(0 ${top})"><g>
                <rect x="-16" y="-78" width="32" height="20" rx="3" fill="#5c0f0b" stroke="#2c0705"/>
                <rect x="-56" y="-60" width="112" height="60" rx="5" fill="url(#wg-seal)" stroke="#2c0705" stroke-width="1.4"/>
                <text x="0" y="-21" text-anchor="middle" font-size="25" fill="#ffe9d6" font-weight="600" letter-spacing="4">조약</text>
              </g></g>`
            }
            pans[side].querySelector('.load').innerHTML = html
          }
          const left = setAside(data, state)
          aside.hidden = left.length === 0
          aside.innerHTML = left.length ? `<b>${esc(data.weighing.asideLabel)}</b>${left.map(w => `<i>${esc(w.tag)}</i>`).join('')}` : ''
          swing()
        }

        const panel = html => {
          right.innerHTML = `<div class="panel">${html}</div>`
          el.scrollTo?.({ top: 0 })
          return right.firstElementChild
        }

        // ── 걸음마다의 화면 ──
        function showIntro() {
          const p = panel(`${data.intro.map(t => `<p class="lead">${esc(t)}</p>`).join('')}
            <button type="button" class="go">${esc(data.introButton)}</button>`)
          p.querySelector('.go').addEventListener('click', () => { state = begin(state); onPick?.(); showHearing() })
          p.querySelector('.go').focus?.()
        }

        function showHearing() {
          const h = data.hearing
          const p = panel(`<small class="when">${esc(h.when)}</small>
            <div class="kingline"><b>${esc(h.kingLabel)}</b><p>${esc(h.king)}</p></div>
            <p class="small ask-first">${esc(h.prompt)}</p>
            <div class="seats">${h.ministers.map(m => `<button type="button" class="seat" data-m="${esc(m.id)}"><span class="post">${esc(m.post)}</span><span class="name">${esc(m.name)}</span></button>`).join('')}</div>
            <div class="speech empty" aria-live="polite"><p>아직 아무도 입을 열지 않았다.</p></div>
            <p class="origin">${esc(h.gloss)}</p>
            <p class="origin">${esc(h.origin)}</p>
            <div class="ask" hidden>
              <p class="q">${esc(h.ask.q)}</p>
              <div class="opts">${h.ask.options.map(o => `<button type="button" class="aopt" data-a="${esc(o.id)}">${esc(o.text)}</button>`).join('')}</div>
              <p class="say" role="status" aria-live="polite"></p>
            </div>
            <button type="button" class="go" hidden>${esc(h.button)}</button>`)
          const speech = p.querySelector('.speech'), ask = p.querySelector('.ask'), go = p.querySelector('.go')
          const seats = [...p.querySelectorAll('.seat')]
          for (const seat of seats) {
            seat.addEventListener('click', () => {
              const m = h.ministers.find(x => x.id === seat.dataset.m)
              state = hear(data, state, m.id)
              onHear?.()
              for (const s of seats) s.classList.toggle('on', s === seat)
              seat.classList.add('heard')
              speech.classList.remove('empty')
              speech.innerHTML = `<b>${esc(m.post)} ${esc(m.name)}</b><p>${esc(m.line)}</p>`
              // 여섯을 다 들으면 물음이 열린다. 한 화면에 들어오게, 처음의 물음과 안내 줄은 접는다.
              if (allHeard(data, state) && ask.hidden) { ask.hidden = false; p.classList.add('asking'); ask.scrollIntoView?.({ block: 'nearest' }) }
            })
          }
          const say = ask.querySelector('.say')
          for (const btn of ask.querySelectorAll('.aopt')) {
            btn.addEventListener('click', () => {
              const r = answerAsk(data, state, btn.dataset.a)
              state = r.state
              say.textContent = r.say
              if (r.ok) {
                onRight?.()
                btn.classList.add('picked')
                ask.classList.add('done')
                for (const b of ask.querySelectorAll('.aopt')) { b.disabled = true; b.classList.remove('glow', 'no') }
                go.hidden = false
                go.scrollIntoView?.({ block: 'nearest' })
                go.focus?.()
                return
              }
              if (onMiss?.(r.say) === true) {
                closed = true
                for (const id of timers) clearTimeout(id)
                if (raf) cancelAnimationFrame(raf)
                return
              }
              btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no')
              const hint = askHint(data, state)
              if (hint) ask.querySelector(`.aopt[data-a="${hint}"]`)?.classList.add('glow')
            })
          }
          go.addEventListener('click', () => { state = sit(data, state); onPick?.(); showWeight(true) })
          seats[0]?.focus?.()
        }

        function showWeight(first = false) {
          const w = currentWeight(data, state)
          if (!w) { showDecide(); return }
          const total = data.weights.length, nth = state.order.length + 1
          const p = panel(`${first ? `<p class="small">${esc(data.weighing.lead)}</p>` : ''}
            <div class="tagrow"><span class="grade ${esc(w.grade)}">${esc(GRADE_LABEL[w.grade] ?? '')}</span><h3>「${esc(w.tag)}」</h3><span class="progress">추 ${nth} / ${total}</span></div>
            <small class="when">${esc(w.when)}</small>
            <blockquote class="${esc(w.grade)}">${esc(w.excerpt)}</blockquote>
            <p class="origin">${esc(w.origin)}</p>
            <p class="label">${esc(data.weighing.readLabel)}</p>
            <div class="reads">${w.readings.map(r => `<button type="button" class="read" data-r="${esc(r.id)}"><span class="side ${esc(r.side)}">${esc(SIDE_LABEL[r.side])}</span><span>${esc(r.text)}</span></button>`).join('')}</div>
            <div class="hefts" hidden><p class="label">${esc(data.weighing.heftLabel)}</p>
              <div class="row">${HEFTS.map(h => `<button type="button" class="heft" data-h="${h}"><i></i>${esc(HEFT_LABEL[h])}</button>`).join('')}</div></div>`)
          const reads = p.querySelector('.reads'), hefts = p.querySelector('.hefts')
          let picked = null
          const land = heft => {
            const reading = readingOf(w, picked)
            state = place(data, state, w.id, picked, heft)
            p.classList.add('busy')
            if (reading.side === 'none') { onAside?.(); drawPans() } else { onLand?.(); drawPans(w.id) }
            later(() => showWeight(), reduced ? 250 : 950)
          }
          for (const btn of reads.querySelectorAll('.read')) {
            btn.addEventListener('click', () => {
              picked = btn.dataset.r
              onPick?.()
              reads.classList.add('chosen')
              for (const b of reads.querySelectorAll('.read')) b.classList.toggle('picked', b === btn)
              if (readingOf(w, picked).side === 'none') { hefts.hidden = true; land(null); return }
              hefts.hidden = false
              hefts.scrollIntoView?.({ block: 'nearest' })
              hefts.querySelector('.heft[data-h="2"]')?.focus?.()
            })
          }
          for (const btn of hefts.querySelectorAll('.heft')) btn.addEventListener('click', () => { if (picked) land(Number(btn.dataset.h)) })
          reads.querySelector('.read')?.focus?.()
        }

        function showDecide() {
          const d = data.decide
          const p = panel(`<p class="remark">${esc(d.lean[ownLean(data, state)])}</p>
            <p class="lead">${esc(d.lead)}</p>
            <div class="choices">
              <button type="button" class="choice shut" data-c="shut">${esc(d.button.shut)}</button>
              <button type="button" class="choice open" data-c="open">${esc(d.button.open)}</button>
            </div>`)
          for (const btn of p.querySelectorAll('.choice')) {
            btn.addEventListener('click', () => {
              state = decide(data, state, btn.dataset.c)
              onDecide?.()
              showActual()
            })
          }
        }

        function showActual() {
          const step = currentStep(data, state)
          if (!step) { showClosing(); return }
          const steps = actualSteps(data, state)
          const p = panel(`<small class="when">${esc(step.when)}</small>
            <blockquote>${esc(step.text)}</blockquote>
            <p class="origin">${esc(step.origin)}</p>
            <p class="remark">${esc(step.note)}</p>
            <button type="button" class="go">${state.step >= steps.length - 1 ? '견주어 본다' : '다음'}</button>`)
          // 이 걸음에서 저울을 떠나는 추 — 먼저 떠오르게 하고, 그다음 접시를 다시 그린다.
          const lifting = (step.lifts ?? []).filter(id => liftedOf(data, state).includes(id))
          const gone = lifting.map(id => el.querySelector(`.w[data-w="${id}"]`)).filter(Boolean)
          if (gone.length && !reduced) {
            // 접시는 아직 그 추를 얹은 채다(직전 걸음의 그림). 떠오른 뒤에 걷는다.
            for (const g of gone) g.classList.add('gone')
            onLift?.()
            later(() => drawPans(), 620)
          } else {
            if (lifting.length) onLift?.()
            if (step.seal) onSeal?.()
            drawPans(null, !!step.seal)
          }
          p.querySelector('.go').addEventListener('click', () => { state = next(data, state); onPick?.(); showActual() })
          p.querySelector('.go').focus?.()
        }

        function showClosing() {
          const c = data.closing
          const heavy = heaviest(data, state).map(w => `「${esc(w.tag)}」`).join(' · ') || '(저울에 올린 것이 없다)'
          const left = setAside(data, state).map(w => `「${esc(w.tag)}」`).join(' · ')
          const p = panel(`<div class="tagrow"><h3>${esc(c.title)}</h3></div>
            <p class="lead">${esc(c.chose[state.choice])} ${esc(c.actual)}</p>
            <dl class="cmp">
              <dt>${esc(c.heaviestLabel)}</dt><dd>${heavy}</dd>
              ${left ? `<dt>${esc(c.asideLabel)}</dt><dd>${left}</dd>` : ''}
            </dl>
            <div class="interp"><b>${esc(c.noteLabel)}</b>${esc(c.note)}</div>
            <button type="button" class="go">${esc(c.button)}</button>`)
          drawPans()
          p.querySelector('.go').addEventListener('click', () => {
            if (closed) return
            state = next(data, state)
            closed = true
            for (const id of timers) clearTimeout(id)
            if (raf) cancelAnimationFrame(raf)
            el.remove()
            resolve({ choice: state.choice, summary: weighSummary(data, state), record: weighRecord(data, state) })
          })
          p.querySelector('.go').focus?.()
        }

        drawBeam()
        drawPans()
        showIntro()
      })
    },
  }
}
