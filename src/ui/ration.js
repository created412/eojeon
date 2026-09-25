import { RICE_NOTE } from '../systems/prices.js'
import {
  TRAY_W, TRAY_H, MIX_NOTE, RICE_NUDGE,
  createTray, hitAt, pick as pickGrain, pickAll, isSorted, countLabel, wageLine,
} from '../systems/grain-tray.js'
import { FEEDBACK_MEDIA } from './feedback-media-data.js'
import { SCENE_ART } from './scene-art-data.js'

const CSS = `
.ration{position:fixed;inset:0;z-index:56;background:#12100d;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:14px;padding:26px;text-align:center;overflow:auto}
.ration h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:5px;font-weight:400}
.ration p{margin:0;font-size:18px;color:#e8e2d4;line-height:1.8;max-width:620px}
.ration .chart{width:100%;max-width:460px;display:flex;flex-direction:column;gap:7px;margin-top:4px}
.ration .row{display:flex;align-items:center;gap:10px;font-size:13px;color:#8f8a7c}
.ration .row .yr{width:150px;text-align:right;letter-spacing:1px}
.ration .row .bar{height:13px;background:#e0a23a;border-radius:2px;min-width:3px}
.ration .row.now .yr{color:#e8e2d4}
.ration .row.now .bar{background:#d2503a}
.ration .row .mul{color:#b9b2a1;letter-spacing:1px}
.ration .rice-line{font-size:15px;color:#e0a23a;letter-spacing:2px;margin-top:6px}
.ration .price-note{font-size:12px;color:#6b6558;max-width:520px;line-height:1.7}
.ration .staged{border:1px dashed #6a5230;color:#8f8a7c;font-size:12px;padding:8px 12px;
  border-radius:3px;max-width:520px;line-height:1.7}
.ration .origin{font-size:12px;color:#6b6558}
.ration .sack{display:block;padding:0;margin:0;width:min(620px,90vw);border:1px solid #806442;background:#241b12;cursor:pointer;overflow:hidden}
.ration .sack img,.ration .grain img{display:block;width:100%;max-height:42vh;object-fit:contain}
.ration .sack span{display:block;padding:12px;letter-spacing:2px}
.ration .sack:focus-visible{outline:3px solid #e0a23a;outline-offset:4px}
.ration .grain{width:min(680px,92vw);margin:0}
.ration .grain figcaption{display:flex;justify-content:center;gap:24px;margin-top:12px;color:#e8e2d4;font-size:14px}
.ration .grain figcaption span{display:block;font-size:12px;color:#b9b2a1;margin-top:4px}
.ration .art-note{font-size:11px;color:#aaa08b;max-width:620px;line-height:1.6}
@media(max-width:600px){.ration{padding:20px 14px;gap:10px}.ration p{font-size:16px}.ration .grain figcaption{gap:12px}}
.ration .market-art{margin:0;width:100%;max-width:640px}.ration .market-art img{display:block;width:100%;max-height:30vh;object-fit:cover;border-radius:3px;filter:saturate(.85)}.ration .market-art figcaption{font-size:11px;color:#9c9584;margin-top:3px;text-align:right}
.ration button{margin-top:6px;padding:12px 30px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
.ration button:focus-visible{outline:3px solid #e0a23a;outline-offset:3px}
/* 손으로 골라내는 낟알판. touch-action:none 이 이 화면의 생명줄이다 — 없으면
   태블릿에서 낟알을 쓸려는 손짓이 「화면 넘기기」로 먹혀 한 알도 집히지 않는다. */
.ration .tray-wrap{width:min(620px,92vw);border:1px solid #806442;background:#241b12;border-radius:2px;overflow:hidden;line-height:0}
.ration canvas.tray{display:block;width:100%;height:auto;touch-action:none;cursor:crosshair}
.ration .hand-help{font-size:14px;color:#b9b2a1;line-height:1.7;max-width:560px}
.ration .tray-count{font-size:15px;color:#e0a23a;letter-spacing:2px}
.ration .nudge{min-height:19px;font-size:13px;color:#b9b2a1}
.ration .wage-line{font-size:15px;color:#e8e2d4;letter-spacing:1px;max-width:560px;line-height:1.8}
.ration button.skip{margin-top:2px;padding:9px 18px;background:#241b12;border:1px solid #4a3a2a;color:#b9b2a1;font-size:13px}
@media(max-width:600px){.ration .tray-wrap{width:96vw}.ration .hand-help{font-size:13px}}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

function chartHtml(series) {
  return series.map(r => `
    <div class="row${r.act === series.length ? ' now' : ''}">
      <span class="yr">${r.label}</span>
      <span class="bar" style="width:${Math.round(r.bar * 62)}%"></span>
      <span class="mul">${r.ratio.toFixed(1)}배</span>
    </div>`).join('')
}

// 낟알을 그린다. 새 그림 파일을 하나도 들이지 않는다 — 이 게임은 바깥으로 아무 요청도
// 보내지 않고 한 장의 html 로 나가므로(zero external requests), 낟알 백서른여덟 알은
// 코드로 그리는 것이 가장 가볍다. 색과 꼴을 둘 다 다르게 한다: 색만 다르면 색을 잘
// 못 가리는 학생에게는 같은 판이 된다.
//   쌀   — 희고 길둥근 알
//   겨   — 누런 껍질, 더 납작하고 테가 있다
//   모래 — 회색 각진 조각
function shade(hex, tone) {
  const n = parseInt(hex.slice(1), 16)
  const k = 0.86 + tone * 0.28
  const c = i => Math.min(255, Math.round(((n >> i) & 255) * k))
  return `rgb(${c(16)},${c(8)},${c(0)})`
}

function paintTray(canvas, tray) {
  const g = canvas.getContext('2d')
  if (!g) return
  const k = canvas.width / TRAY_W
  g.setTransform(k, 0, 0, k, 0, 0)
  g.fillStyle = '#2a2016'
  g.fillRect(0, 0, TRAY_W, TRAY_H)
  for (const grain of tray.grains) {
    if (grain.removed) continue
    g.save()
    g.translate(grain.x, grain.y)
    g.rotate(grain.rot)
    if (grain.kind === 'sand') {
      const r = grain.size * 0.85
      g.fillStyle = shade('#8d8b83', grain.tone)
      g.beginPath()
      g.moveTo(-r, -r * 0.6)
      g.lineTo(r * 0.9, -r * 0.25)
      g.lineTo(r * 0.25, r)
      g.lineTo(-r * 0.8, r * 0.5)
      g.closePath()
      g.fill()
    } else {
      const husk = grain.kind === 'chaff'
      g.fillStyle = shade(husk ? '#bb8f3c' : '#efe8d8', grain.tone)
      g.beginPath()
      g.ellipse(0, 0, grain.size * (husk ? 1.3 : 1.05), grain.size * (husk ? 0.4 : 0.62), 0, 0, Math.PI * 2)
      g.fill()
      if (husk) {
        g.strokeStyle = '#8a6522'
        g.lineWidth = 0.18
        g.stroke()
      }
    }
    g.restore()
  }
  g.setTransform(1, 0, 0, 1, 0, 0)
}

// G 회수(설계서 §5.G) — 두 장면을 잇달아 보여 준다. 종로에서 열여섯 해치 추이를 마주하고,
// 무위영에서 열세 달 만에 나온 급료 가마를 연다.
//
// ⚠ 절대 쌀값은 한 글자도 나가지 않는다(판정 R19). 여기 들어오는 series 에는 지수 값이
//    아예 없고 배수만 있다.
// ⚠ 이 화면에는 시계를 붙이지 않는다. 촉박은 C1·C2·C3 세 번뿐이다.
// ⚠ 임금이 시전과 무위영을 직접 본 기록은 없다 — 장면 자체에 재구성 고지를 붙인다.
//    그러나 학생이 거기서 보는 것(쌀값 추세·겨와 모래)은 재구성이 아니다. 둘을 나눠 적는다.
export function createRation(root) {
  ensureStyle()

  return {
    open(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'ration'
        root.appendChild(el)

        function market() {
          const m = view.market
          el.innerHTML = `
            <h2>${m.title}</h2>
            ${SCENE_ART.market ? `<figure class="market-art"><img src="${SCENE_ART.market.src}" alt="${SCENE_ART.market.alt}"><figcaption>${SCENE_ART.market.caption}</figcaption></figure>` : ''}
            ${m.lines.map(l => `<p>${l}</p>`).join('')}
            <div class="chart">${chartHtml(m.series)}</div>
            <div class="rice-line">${m.riceText}</div>
            <div class="price-note">${RICE_NOTE}</div>
            <div class="staged">${m.stagedNote}</div>
            <div class="origin">${m.origin}</div>
            <button>무위영으로 간다</button>`
          el.querySelector('.market-art img')?.addEventListener('error', e => { e.target.closest('figure').remove() })
          el.querySelector('button').addEventListener('click', sack)
        }

        function sack() {
          const s = view.ration
          el.innerHTML = `
            <h2>${s.title}</h2>
            ${s.lines.map(l => `<p>${l}</p>`).join('')}
            <button class="sack" aria-label="급료 가마 열기">${FEEDBACK_MEDIA.sack ? `<img src="${FEEDBACK_MEDIA.sack}" alt="거친 볏짚을 엮고 새끼줄로 묶은 급료 가마">` : ''}<span>${s.sackLabel} · 눌러서 열기</span></button>
            <div class="art-note">급료 가마를 살펴보는 재구성 그림</div>
            <div class="origin">${s.origin}</div>
            <button class="open-sack">${s.buttonLabel}</button>`
          const open = () => handPick()
          el.querySelector('.sack img')?.addEventListener('error', event => { event.target.style.display = 'none' })
          el.querySelector('.sack').addEventListener('click', open)
          el.querySelector('.open-sack').addEventListener('click', open)
        }

        // 손으로 골라내는 자리(2026-09-25 선생님: 「쌀에서 겨와 모래 골라내기(4막)」).
        // 예전에는 가마를 열면 곧바로 reveal() 이 나와, 학생이 하는 일은 그림을 보고
        // 「돌아간다」를 누르는 것뿐이었다 — 선생님이 「걷고 읽기만 한다」고 하신 그 자리다.
        // 이제 가마를 열면 판이 나오고, 겨와 모래를 제 손으로 집어내야 다음으로 간다.
        //
        // ⚠ 시계가 없다. 늦게 고른다고 잃는 것이 없고, setTimeout 도 쓰지 않는다 —
        //    「그건 쌀이다」 같은 알림이 스스로 사라지게 하려면 타이머가 필요한데, 이
        //    화면에 타이머를 한 번 들이면 다음 사람이 거기에 초를 매달게 된다. 알림은
        //    다음 손짓이 덮어쓴다.
        // ⚠ 비율을 주장하지 않는다 — MIX_NOTE 가 화면에 그대로 나간다(grain-tray.js).
        function handPick() {
          const s = view.ration
          let tray = createTray()
          el.innerHTML = `
            <h2>${s.title}</h2>
            <p>가마를 열었다. 흰 쌀 사이에 누런 겨와 거친 모래가 섞여 있다.</p>
            <p class="hand-help">겨와 모래를 눌러 골라낸다. 손가락으로 쓸어도 되고, 마우스를 누른 채 끌어도 된다. 쌀은 남겨 둔다.</p>
            <div class="tray-wrap"><canvas class="tray" width="${TRAY_W * 8}" height="${TRAY_H * 8}"
              role="img" aria-label="흰 쌀알 사이에 누런 겨와 회색 모래가 섞인 급료 가마의 낟알판"></canvas></div>
            <div class="tray-count" aria-live="polite">${countLabel(tray)}</div>
            <div class="nudge" aria-live="polite"></div>
            <div class="art-note">${MIX_NOTE}</div>
            <div class="origin">${s.origin}</div>
            <button class="skip">손이 불편하면 건너뛴다</button>`

          const canvas = el.querySelector('.tray')
          const count = el.querySelector('.tray-count')
          const nudge = el.querySelector('.nudge')
          paintTray(canvas, tray)

          // 마우스·펜·손가락을 한 길로 받는다(pointer events). 누른 채 끌면 쓸려 나간다 —
          // 같은 알을 두 번 집어도 pick() 이 걸러 주므로 움직임마다 불러도 된다.
          function trayPoint(event) {
            const box = canvas.getBoundingClientRect()
            return {
              x: (event.clientX - box.left) / box.width * TRAY_W,
              y: (event.clientY - box.top) / box.height * TRAY_H,
            }
          }
          function tryPick(event) {
            const p = trayPoint(event)
            const grain = hitAt(tray, p.x, p.y)
            if (!grain) return
            const result = pickGrain(tray, grain.id)
            if (!result.taken) {
              // 쌀을 눌렀다. 벌하지 않는다 — 한 줄 알려 주고 그대로 둔다.
              if (result.kind === 'rice') nudge.textContent = RICE_NUDGE
              return
            }
            tray = result.tray
            nudge.textContent = ''
            count.textContent = countLabel(tray)
            paintTray(canvas, tray)
            view.onPick?.()
            if (isSorted(tray)) picked(true)
          }
          canvas.addEventListener('pointerdown', event => {
            canvas.setPointerCapture?.(event.pointerId)
            tryPick(event)
          })
          canvas.addEventListener('pointermove', event => { if (event.buttons) tryPick(event) })

          el.querySelector('.skip').addEventListener('click', () => {
            tray = pickAll(tray)
            picked(false)
          })

          // 다 골라낸 뒤. 판을 다시 그린다 — 겨와 모래가 빠진 자리가 그대로 구멍으로
          // 남아, 처음보다 눈에 띄게 빈 판이 된다. 그것이 이 장면의 값이다.
          function picked(byHand) {
            el.innerHTML = `
              <h2>${s.title}</h2>
              <div class="tray-wrap"><canvas class="tray" width="${TRAY_W * 8}" height="${TRAY_H * 8}"
                role="img" aria-label="겨와 모래를 골라내고 쌀만 남아 처음보다 비어 보이는 낟알판"></canvas></div>
              <div class="wage-line">${wageLine(tray, byHand)}</div>
              <p>교과서는 이것을 한 줄로 적었다.</p>
              <div class="art-note">${MIX_NOTE}</div>
              <div class="origin">${s.origin}</div>
              <button class="to-reveal">교과서가 적은 것을 본다</button>`
            paintTray(el.querySelector('.tray'), tray)
            const next = el.querySelector('.to-reveal')
            next.addEventListener('click', reveal)
            next.focus?.()
          }
        }

        function reveal() {
          const r = view.ration.reveal
          el.innerHTML = `
            <h2>${view.ration.title}</h2>
            <figure class="grain">${FEEDBACK_MEDIA.grain ? `<img src="${FEEDBACK_MEDIA.grain}" alt="흰 쌀알 사이에 누런 겨와 거친 모래가 섞인 급료의 재구성 그림">` : ''}<figcaption><div>쌀<span>희고 둥근 낟알</span></div><div>겨<span>누런 껍질과 가루</span></div><div>모래<span>거칠고 작은 알갱이</span></div></figcaption></figure>
            <div class="art-note">교과서의 ‘겨와 모래’를 살펴보기 위한 재구성 그림 · 당시 섞인 비율을 나타낸 것은 아닙니다.</div>
            ${r.lines.map(l => `<p>${l}</p>`).join('')}
            <div class="staged">${r.soldierNote}</div>
            <div class="origin">${r.origin}</div>
            <button>돌아간다</button>`
          el.querySelector('.grain img')?.addEventListener('error', event => { event.target.style.display = 'none' })
          el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
        }

        market()
      })
    },
  }
}
