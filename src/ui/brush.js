import {
  coverage, isTraced, HIT_RADIUS, DONE_RATIO, CHEOKHWABI_REST, CHEOKHWABI_PARTIAL_NOTE,
} from '../systems/brush-trace.js'
import { BRUSH_GUIDES } from './brush-guides-data.js'

const S = 320
const HANJA_FONT = '"Batang","BatangChe","Gungsuh","SimSun","MS Mincho","Noto Serif CJK KR",serif'

const CSS = `
.brush{position:fixed;inset:0;z-index:56;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:safe center;gap:12px;padding:22px;text-align:center;overflow:auto}
.brush h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:4px;font-weight:400}
.brush .line{font-size:22px;color:#e8e2d4;letter-spacing:10px}
.brush .line b{color:#e0a23a;font-weight:400}
.brush .paper{background:#efe6cf;border:1px solid #8a6a44;border-radius:2px;touch-action:none;cursor:crosshair;max-width:88vw;height:auto}
.brush button:disabled{opacity:.45;cursor:not-allowed}
.brush .count{font-size:12px;color:#8f8a7c;letter-spacing:2px}
.brush .partial{font-size:12px;color:#8f8a7c;border:1px dashed #6a5230;border-radius:3px;
  padding:6px 12px;max-width:520px;line-height:1.6}
.brush .rest{max-width:520px;text-align:left;font-size:14px;color:#6b6558;line-height:1.9;
  border-top:1px solid #cfc4a8;padding-top:12px;margin-top:4px}
.brush .rest b{color:#23201a;font-weight:400;letter-spacing:4px}
.brush .meaning{font-size:14px;color:#b9b2a1;max-width:520px;line-height:1.8}
.brush .origin{font-size:12px;color:#6b6558}
.brush .row{display:flex;gap:10px}
.brush button{padding:10px 22px;background:#23282c;border:1px solid #3a4248;color:#e8e2d4;
  border-radius:3px;font-size:14px;cursor:pointer}
.brush button.go{background:#3a2d20;border-color:#6a5230;color:#e0a23a}
.brush .after{max-width:560px;background:#e8e2d4;color:#23201a;border-radius:4px;padding:20px 22px;
  line-height:1.9;font-size:16px;text-align:left;white-space:pre-wrap}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// 안내점은 글자를 캔버스에 그려서 검은 픽셀을 뽑아 만든다. 획 데이터를 손으로 적지 않아도
// 되고, 파일도 늘지 않는다(전역 제약: 외부 리소스 0건).
function glyphGuides(ch, want = 90) {
  const c = document.createElement('canvas')
  const N = 96
  c.width = c.height = N
  const g = c.getContext('2d', { willReadFrequently: true })
  g.fillStyle = '#fff'
  g.fillRect(0, 0, N, N)
  g.fillStyle = '#000'
  g.font = `${Math.round(N * 0.82)}px ${HANJA_FONT}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(ch, N / 2, N / 2 + N * 0.04)

  const data = g.getImageData(0, 0, N, N).data
  const dark = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (data[(y * N + x) * 4] < 128) dark.push({ x: x / N, y: y / N })
    }
  }
  if (dark.length < 20) return []          // 안내선이 없으면 완료 판정을 보류한다.
  const stride = Math.max(1, Math.floor(dark.length / want))
  const out = []
  for (let i = 0; i < dark.length; i += stride) out.push(dark[i])
  return out
}

// ── 판정 R96 · 설계서 §5.F2 — 반전은 붓을 놓은 뒤에 온다 ──────────────
//
// 이 두 함수가 갈라 놓는 것은 「무엇을 보여주는가」가 아니라 **「언제 보여주는가」**다.
// 이 장면의 교육적 핵심이 그 순서 하나에 걸려 있다: 학생이 네 글자를 직접 쓰고
// **그 다음에야** 「이 문구를 전하는 기록은 김옥균의 『갑신일록』 하나뿐이고 학계가
// 그 내용을 의심한다」를 알아야 한다. 미리 알면 학생은 그냥 안 쓴다. 쓰고 나서
// 알아야 「내가 방금 한 것이 무엇이었나」가 생기고, 그것이 사료 비판을 가르치는 길이다.
//
// 한때 붓 아래 고지(partial)와 출처(origin)가 첫 획을 긋기 전부터 떠 있었다. 그 두
// 줄의 내용이 다 쓴 뒤 뜨는 afterLines 와 같았다 — 반전이 통째로 새어 나오고 있었다.
//
// DOM 을 안 만드는 순수 함수로 뺀 까닭: 시험이 「소스에 이런 글자가 있나」를 넘겨짚지
// 않고, 화면에 실제로 나가는 마크업 그대로를 받아 훑을 수 있어야 하기 때문이다
// (tests/systems/brush-trace.test.js).

// 쓰는 동안 붓 아래에 뜨는 판. 반전을 담지 않은 것만 둔다 — 무엇을 쓰는 중인지,
// 몇 자 중 몇 째인지 같은 것. noteWhileWriting·originWhileWriting 을 안 주면
// 예전과 똑같이 partial·origin 이 그대로 온다(F1 척화비가 그렇다 — 「열두 자는
// 비문의 앞부분」은 미리 알아도 잃을 것이 없고, 사료 검증 C 1항이 그것을 요구한다).
export function writingHtml(view) {
  const note = view.noteWhileWriting ?? view.partial ?? CHEOKHWABI_PARTIAL_NOTE
  const origin = view.originWhileWriting ?? view.origin ?? ''
  return `
          <h2>${view.title ?? ''}</h2>
          ${view.givenText ? `<div class="meaning">${view.givenText} (${view.givenGloss ?? ''})은 주어져 있습니다.<br>비전즉화·주화매국 여덟 글자를 이어 써 주세요.</div>` : ''}
          <div class="line"></div>
          <canvas class="paper" width="${S}" height="${S}"></canvas>
          <div class="count"></div>
          ${note ? `<div class="partial">${note}</div>` : ''}
          <div class="meaning">${view.meaning ?? ''}</div>
          ${origin ? `<div class="origin">${origin}</div>` : ''}
          <div class="row"><button class="reset">다시 쓰기</button><button class="next" disabled>다음 글자로</button></div>`
}

// 붓을 놓은 뒤에 뜨는 판. 「나머지」를 여기서 보여 준다 — 척화비에서는 비문의
// 뒷부분이고(F1), 「日使來衛」에서는 함께 전하는 다른 표기들이다(F2). 앞에 붙는
// 문장만 달라진다 — 학생이 쓴 것이 전부가 아님을 밝히는 자리라는 뜻은 둘 다 같다.
export function finishHtml(view) {
  const partial = view.partial ?? CHEOKHWABI_PARTIAL_NOTE
  const rest = view.rest ?? CHEOKHWABI_REST
  const lead = view.restLead ?? '이 열두 자 뒤에 비석은 이렇게 이어진다.'
  const restHtml = rest.length
    ? `<div class="rest">${lead}<br><br>` +
      rest.map(r => `<b>${r.text}</b> — ${r.gloss}`).join('<br>') +
      `<br><br>${partial}</div>`
    : ''
  return `
            <h2>${view.title ?? ''}</h2>
            <div class="after">${(view.afterLines ?? []).join('\n')}${restHtml}</div>
            <div class="origin">${view.origin ?? ''}</div>
            <div class="row"><button class="go">붓을 놓는다</button></div>`
}

// 붓 화면(F1) — 양이침범은 제시하고 나머지 여덟 글자를 손으로 따라 쓴다.
// 마우스·펜·손가락 모두 포인터 이벤트로 받고 도달률 75% 이상이면 다음 단추를 켠다.
// 자동으로 넘어가지 않아 완성한 글자를 충분히 살펴볼 수 있다.
// 다 쓰고 나면 비문의 나머지(戒我萬年子孫·丙寅作 辛未立)를
// 뜻풀이와 함께 보여준다 — 열두 자가 발췌라는 사실을 숨기지 않는다.
export function createBrush(root) {
  ensureStyle()

  return {
    open(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'brush'
        // 두 판을 여기서 조립하지 않는다 — 위의 순수 함수가 만든다. 그래야 시험이
        // 「쓰기 전 판에 반전이 안 새는가」를 실제 마크업으로 확인할 수 있다(판정 R96).
        el.innerHTML = writingHtml(view)
        root.appendChild(el)

        const canvas = el.querySelector('canvas')
        const g = canvas.getContext('2d')
        const lineEl = el.querySelector('.line')
        const countEl = el.querySelector('.count')

        let index = 0
        let guides = []
        let marks = []
        let drawing = false
        let pointer = null
        const nextButton=el.querySelector('.next')

        function paint() {
          g.fillStyle = '#efe6cf'
          g.fillRect(0, 0, S, S)
          // 안내점
          g.fillStyle = 'rgba(138,106,68,0.28)'
          for (const p of guides) g.fillRect(p.x * S - 1, p.y * S - 1, 3, 3)
          // 학생의 획
          g.strokeStyle = '#1b1a17'
          g.lineWidth = 11
          g.lineCap = 'round'
          g.lineJoin = 'round'
          g.beginPath()
          let pen = false
          for (const m of marks) {
            if (m.break) { pen = false; continue }
            if (!pen) { g.moveTo(m.x * S, m.y * S); pen = true }
            else g.lineTo(m.x * S, m.y * S)
          }
          g.stroke()
        }

        function loadGlyph() {
          guides = BRUSH_GUIDES[view.glyphs[index]] ?? glyphGuides(view.glyphs[index])
          marks = []
          drawing=false;pointer=null;nextButton.disabled=true
          lineEl.innerHTML = (view.givenText ? `${view.givenText} ` : '') + view.glyphs
            .map((ch, i) => (i === index ? `<b>${ch}</b>` : ch))
            .join('')
          countEl.textContent = `${index + 1} / ${view.glyphs.length} 자` +
            (guides.length === 0 ? '  ·  안내선을 불러오지 못했습니다. 다시 쓰기를 눌러 주세요.' : `  ·  안내선 도달률 ${DONE_RATIO * 100}% 이상이면 통과합니다. 완료 후 직접 넘깁니다.`)
          paint()
        }

        function nextGlyph() {
          if(!isTraced(guides,marks.filter(m=>!m.break)))return
          index++
          if (index >= view.glyphs.length) { finish(); return }
          loadGlyph()
        }

        function at(ev) {
          const r = canvas.getBoundingClientRect()
          return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }
        }

        canvas.addEventListener('pointerdown', (ev) => {
          if(pointer!==null || (ev.pointerType==='mouse'&&ev.button!==0))return
          pointer=ev.pointerId
          drawing = true
          // 획 하나에 한 번. 붓을 대는 순간에만 알린다 — 무슨 소리를 낼지는
          // 부른 쪽(main.js)이 정한다. 이 화면은 소리를 모른다.
          view.onStroke?.()
          canvas.setPointerCapture(ev.pointerId)
          marks.push({ break: true })
          marks.push(at(ev))
          paint()
        })
        canvas.addEventListener('pointermove', (ev) => {
          if (!drawing || ev.pointerId!==pointer) return
          const to=at(ev),from=marks[marks.length-1]
          const n=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/.01))
          for(let j=1;j<=n;j++)marks.push({x:from.x+(to.x-from.x)*j/n,y:from.y+(to.y-from.y)*j/n})
          paint()
        })
        canvas.addEventListener('pointerup', (ev) => {
          if(ev.pointerId!==pointer)return
          drawing = false
          pointer=null
          const written=marks.filter(m=>!m.break),ready=isTraced(guides,written,HIT_RADIUS)
          nextButton.disabled=!ready
          countEl.textContent=`${index+1} / ${view.glyphs.length} 자 · 도달률 ${Math.floor(coverage(guides,written)*100)}% · ${ready?'완료했습니다. 다음 글자로를 눌러 주세요.':`${DONE_RATIO * 100}% 이상까지 안내선을 더 따라 써 주세요.`}`
        })
        canvas.addEventListener('pointercancel',()=>{drawing=false;pointer=null})
        canvas.addEventListener('lostpointercapture',()=>{drawing=false;pointer=null})

        el.querySelector('.next').addEventListener('click', nextGlyph)
        el.querySelector('.reset').addEventListener('click',loadGlyph)

        function finish() {
          el.innerHTML = finishHtml(view)
          el.querySelector('.go').addEventListener('click', () => { el.remove(); resolve() })
        }

        loadGlyph()
      })
    },
  }
}
