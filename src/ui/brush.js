import {
  coverage, isTraced, HIT_RADIUS, DONE_RATIO, CHEOKHWABI_REST, CHEOKHWABI_PARTIAL_NOTE,
  inkMsOf, isInkTimed, inkRatio, inkLabel, inkSeconds, inkDried, inkDryNote, inkReport,
  inkLevel, inkPressLine, inkPassLine, inkDryness, inkPaperColor, inkStrokeColor,
  inkGuideAlpha, inkWashColor, INK_WARN, INK_CRIT,
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
/* 먹 — 마르기까지. 띠의 너비는 매 프레임 JS 가 직접 정한다(transition 을 걸지 않는다):
   남은 시간을 보여 주는 띠에 0.3초 뒤늦은 움직임을 붙이면 「0초」와 화면이 어긋나고,
   prefers-reduced-motion 을 켠 학생에게 끌 수단도 없어진다. 줄이는 쪽은 JS 가
   초 단위로만 고쳐 그린다(createBrush 의 drawInk).

   2026-09-26 — 「타임어택이 잘 눈에 안보여」. 7픽셀 띠와 12픽셀 글씨를 종이 아래에
   두었으니 당연했다. 이제 종이와 시계가 **한 줄에 나란히** 선다: 왼쪽에 종이, 그
   바로 오른쪽에 66픽셀 숫자. 좁은 화면에서는 flex-wrap 이 시계를 종이 아래로
   내리는데, 그래도 종이에서 한 손가락 거리다. 그리고 종이 자신이 마른다(paint). */
.brush .ink{max-width:92vw;display:flex;flex-direction:column;gap:8px}
.brush .desk{display:flex;align-items:flex-start;justify-content:center;gap:16px;flex-wrap:wrap}
.brush .sheet{display:flex;flex-direction:column;gap:6px;text-align:left}
.brush .inkword{font-size:12px;color:#8f8a7c;letter-spacing:2px}
/* 띠를 12픽셀로 키우고 종이 바로 밑에 붙인다 — 종이와 띠가 한 덩이로 보여야
   「저 띠가 이 종이의 남은 먹」임이 설명 없이 읽힌다. */
.brush .inkbar{height:12px;background:#23282c;border:1px solid #3a4248;border-radius:4px;overflow:hidden}
.brush .inkfill{height:100%;width:100%;background:#6a5230}
/* 시계. 숫자는 눈이 종이에서 떠나지 않을 거리에, 글자 크기로 이긴다. */
.brush .clock{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:96px;padding-top:2px}
.brush .clockface{display:flex;align-items:baseline;gap:4px}
.brush .clocknum{font-size:66px;line-height:.9;color:#e8e2d4;letter-spacing:-2px;
  font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
.brush .clockunit{font-size:16px;color:#8f8a7c;letter-spacing:2px}
/* 자리를 미리 비워 둔다(min-height) — 6초에 한 줄이 생기면서 종이가 위로 밀리면
   학생의 손이 긋던 획이 어긋난다. 압박을 주려다 손맛을 깎는 자리다. */
.brush .clocknote{font-size:14px;color:#c9a06a;letter-spacing:1px;line-height:1.5;min-height:2.6em;max-width:104px}
/* ── 단계 (6초 · 3초) ──────────────────────────────────────────────
   숫자 빛깔 · 종이 테두리 · 띠의 숨. 흔들지 않고, 소리를 내지 않고, 넓은 면을
   번쩍이지 않는다 — 숨쉬는 것은 12픽셀 띠 하나뿐이고 1초에 한 번을 넘지 않는다. */
.brush .ink.warn .clocknum{color:#e0a23a}
.brush .ink.warn .clockunit{color:#c9a06a}
.brush .ink.warn .inkword{color:#e0a23a}
.brush .ink.warn .paper{border-color:#b8562f}
.brush .ink.warn .inkfill{background:#b8562f;animation:brushbreath 1.1s ease-in-out infinite}
.brush .ink.crit .clocknum{color:#d4552a}
.brush .ink.crit .clockunit{color:#d4552a}
.brush .ink.crit .clocknote{color:#e0a23a}
.brush .ink.crit .inkword{color:#d4552a}
.brush .ink.crit .paper{border-color:#d4552a;box-shadow:0 0 0 3px rgba(212,85,42,.5)}
.brush .ink.crit .inkfill{background:#d4552a;animation:brushbreath .8s ease-in-out infinite}
/* 마르기 전에 끝냈을 때. 경고색을 쓰지 않는다 — 여기만 다른 계열의 빛깔이라
   학생이 「이건 다른 소식이다」를 색으로 먼저 안다. */
.brush .ink.pass .clocknum{color:#a9ba8d}
.brush .ink.pass .inkword{color:#a9ba8d;font-size:13px}
.brush .ink.pass .inkfill{background:#6f7f55}
@keyframes brushbreath{0%,100%{opacity:1}50%{opacity:.52}}
/* 움직임을 줄여 달라고 한 학생: 숨을 끈다. 숫자와 빛깔의 단계는 그대로 바뀐다 —
   재는 시간도 그대로다. 보이는 방식만 초 단위 계단이 된다(drawInk 의 stepped). */
@media (prefers-reduced-motion: reduce){
  .brush .ink.warn .inkfill,.brush .ink.crit .inkfill{animation:none}
}
.brush .inknote{font-size:13px;color:#c9a06a;letter-spacing:1px;min-height:1.3em;
  max-width:480px;margin:0 auto;line-height:1.6}
.brush .inkreport{font-size:14px;color:#b9b2a1;max-width:560px;line-height:1.8}
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
  // 먹 띠는 시간을 재는 비트에서만 생긴다(ink 를 실은 비트 — F1 척화비). 여기에
  // 실리는 글은 「먹이 마르기까지 몇 초」뿐이다: 반전은 한 조각도 지나가지 않는다.
  // 그래서 판정 R96 은 이 칸이 늘어도 그대로 선다 — 아래 검사가 그것을 못 박는다.
  const inkMs = inkMsOf(view)
  const paper = `<canvas class="paper" width="${S}" height="${S}"></canvas>`
  // 시간을 재는 화면에서는 종이가 시계 안으로 들어간다 — 종이·띠·큰 숫자가 한
  // 덩이가 되어야 「이 종이의 먹이 마르는 중」임이 한눈에 읽힌다(2026-09-26).
  // 안 재는 화면(4막 친필)에서는 종이만 예전 그대로 놓인다: 그 장면에는 시계가 없고,
  // 여기에 빈 껍데기라도 만들어 두면 「먹」이라는 낱말이 그 화면에 나간다.
  const paperBlock = inkMs > 0 ? `
          <div class="ink">
            <div class="desk">
              <div class="sheet">
                ${paper}
                <div class="inkbar"><div class="inkfill"></div></div>
                <div class="inkword">${inkLabel(null, 0, inkMs)}</div>
              </div>
              <div class="clock">
                <div class="clockface"><span class="clocknum">${inkSeconds(null, 0, inkMs)}</span><span class="clockunit">초</span></div>
                <div class="clocknote"></div>
              </div>
            </div>
            <div class="inknote"></div>
          </div>` : paper
  return `
          <h2>${view.title ?? ''}</h2>
          ${view.givenText ? `<div class="meaning">척화비에 새길 비문을 쓰고 있습니다. ${view.givenText} (${view.givenGloss ?? ''})은 이미 새겨져 있습니다.<br>이어지는 마지막 ${view.glyphs?.length ?? 0}글자 「${(view.glyphs ?? []).join('')}」를 안내선을 따라 써 주세요.</div>` : ''}
          <div class="line"></div>
          ${paperBlock}
          <div class="count"></div>
          ${note ? `<div class="partial">${note}</div>` : ''}
          <div class="meaning">${view.meaning ?? ''}</div>
          ${origin ? `<div class="origin">${origin}</div>` : ''}
          <div class="row"><button class="reset">다시 쓰기</button><button class="next" disabled>다음 글자로</button></div>`
}

// 붓을 놓은 뒤에 뜨는 판. 「나머지」를 여기서 보여 준다 — 척화비에서는 비문의
// 뒷부분이고(F1), 「日使來衛」에서는 함께 전하는 다른 표기들이다(F2). 앞에 붙는
// 문장만 달라진다 — 학생이 쓴 것이 전부가 아님을 밝히는 자리라는 뜻은 둘 다 같다.
// regrinds 를 view 에 실어 보내지 않고 둘째 인자로 받는다 — 이것은 비트가 들고 있는
// 데이터가 아니라 **이 학생이 방금 한 일**이고, view 에 슬쩍 얹으면 다음 사람이
// 「비트에 적힌 값」으로 읽는다. 시간을 안 재는 비트에서는 줄 자체가 없다.
export function finishHtml(view, regrinds = 0) {
  const partial = view.partial ?? CHEOKHWABI_PARTIAL_NOTE
  const rest = view.rest ?? CHEOKHWABI_REST
  const lead = view.restLead ?? '이 열두 자 뒤에 비석은 이렇게 이어진다.'
  const restHtml = rest.length
    ? `<div class="rest">${lead}<br><br>` +
      rest.map(r => `<b>${r.text}</b> — ${r.gloss}`).join('<br>') +
      `<br><br>${partial}</div>`
    : ''
  const report = isInkTimed(view)
    ? `<div class="inkreport">${inkReport(regrinds, view.glyphs?.length ?? 4)}</div>`
    : ''
  return `
            <h2>${view.title ?? ''}</h2>
            <div class="after">${(view.afterLines ?? []).join('\n')}${restHtml}</div>
            ${report}
            <div class="origin">${view.origin ?? ''}</div>
            <div class="row"><button class="go">붓을 놓는다</button></div>`
}

// 붓 화면(F1) — 양이침범은 제시하고 나머지 여덟 글자를 손으로 따라 쓴다.
// 마우스·펜·손가락 모두 포인터 이벤트로 받고 도달률 75% 이상이면 다음 단추를 켠다.
// 자동으로 넘어가지 않아 완성한 글자를 충분히 살펴볼 수 있다.
// 다 쓰고 나면 비문의 나머지(戒我萬年子孫·丙寅作 辛未立)를
// 뜻풀이와 함께 보여준다 — 열두 자가 발췌라는 사실을 숨기지 않는다.
// 태블릿: 획을 긋고 곧바로 단추를 누르면 브라우저가 앞 획과 이어진 두 번 탭으로 보고 click 을 만들지 않는 일이 있다
// (2026-09-15 아이패드 흉내 점검). 손가락은 떼는 순간(pointerup)에 바로 누른 것으로 치고, 뒤따르는 click 은 한 번 거른다.
function onTap(button, fn) {
  if (!button) return
  let touchedAt = -Infinity
  button.addEventListener('pointerup', e => {
    if (e.pointerType === 'mouse' || button.disabled) return
    touchedAt = e.timeStamp
    fn()
  })
  button.addEventListener('click', e => {
    if (e.timeStamp - touchedAt < 700) return
    fn()
  })
}

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

        // ── 먹이 마른다 ────────────────────────────────────────────────
        // 재는 방식은 brush-trace.js 의 순수 함수들이 정한다. 이 아래는 배선뿐이다 —
        // 「언제 시작하고 언제 멈추는가」와 「누가 프레임을 지우는가」.
        const inkMs = inkMsOf(view)
        const inkEl = el.querySelector('.ink')
        const inkFill = el.querySelector('.inkfill')
        const inkWord = el.querySelector('.inkword')
        const inkNote = el.querySelector('.inknote')
        const clockNum = el.querySelector('.clocknum')
        const clockNote = el.querySelector('.clocknote')
        // 종이가 얼마나 말랐는가 — 0 은 가득, 1 은 다 말랐다. paint() 가 이 값으로
        // 바탕·먹빛·안내점을 고른다. 시간을 안 재는 화면에서는 끝까지 0 이다.
        let dryness = 0
        let level = ''
        // 움직임을 줄여 달라고 한 학생에게는 띠를 매 프레임 흘리지 않고 초 단위로만
        // 고쳐 그린다. 재는 시간은 똑같다 — 보이는 방식만 계단이 된다.
        const stepped = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true
        let inkStartedAt = null   // null = 아직 첫 획을 안 그었다(그래서 안 마른다)
        let regrinds = 0
        let inkFrame = 0
        let shownSecond = -1

        const nowMs = () => globalThis.performance?.now?.() ?? Date.now()

        // 타이머를 지우는 자리는 이 함수 하나뿐이다 — 글자를 새로 열 때, 말랐을 때,
        // 통과했을 때, 붓을 놓을 때가 모두 여기로 모인다. 새는 프레임을 만들지 않는다.
        function stopInk() {
          if (inkFrame) cancelAnimationFrame(inkFrame)
          inkFrame = 0
        }

        function drawInk(now) {
          if (!inkEl) return
          const second = inkSeconds(inkStartedAt, now, inkMs)
          if (stepped && second === shownSecond) return
          shownSecond = second
          dryness = inkDryness(inkStartedAt, now, inkMs)
          level = inkLevel(inkStartedAt, now, inkMs)
          inkFill.style.width = `${inkRatio(inkStartedAt, now, inkMs) * 100}%`
          inkWord.textContent = inkLabel(inkStartedAt, now, inkMs)
          clockNum.textContent = String(second)
          clockNote.textContent = inkPressLine(inkStartedAt, now, inkMs)
          inkEl.classList.toggle(INK_WARN, level === INK_WARN)
          inkEl.classList.toggle(INK_CRIT, level === INK_CRIT)
          // 종이 자신이 마른다. 캔버스는 CSS 가 아니라 붓질이 그리므로, 시계가 도는
          // 동안에는 여기서 다시 칠해야 바탕이 함께 가라앉는다. 움직임을 줄여 달라고
          // 한 학생에게는 위의 이른 반환이 이것을 초 단위 계단으로 만든다.
          paint()
        }

        // 마르면 그 글자만 처음부터 다시 쓴다. 지는 일은 없고 횟수 제한도 없다 —
        // 학생이 갇히는 상태를 만들지 않는 것이 이 장면에서 가장 중요하다.
        function dryOut() {
          stopInk()
          regrinds++
          view.onDry?.()          // 무슨 소리를 낼지는 부른 쪽이 정한다. 이 화면은 소리를 모른다.
          loadGlyph()
          if (inkNote) inkNote.textContent = inkDryNote(regrinds)
        }

        function tickInk() {
          inkFrame = requestAnimationFrame(tickInk)
          const now = nowMs()
          // 이미 다 쓴 글자를 시간이 지웠다면 그것은 게임이 아니라 사고다.
          // 마르기 전에 먼저 도달률을 본다.
          if (isTraced(guides, marks.filter(m => !m.break))) { passInk(); return }
          if (inkDried(inkStartedAt, now, inkMs)) { dryOut(); return }
          drawInk(now)
        }

        function startInk() {
          if (!inkEl || inkStartedAt !== null) return
          inkStartedAt = nowMs()
          shownSecond = -1
          drawInk(inkStartedAt)
          stopInk()
          inkFrame = requestAnimationFrame(tickInk)
        }

        // 남은 시간을 그대로 얼려 둔다 — 숫자가 9 에서 멈춘 채 빛깔만 바뀌면 그것이
        // 곧 「9초를 남기고 썼다」는 상장이다. 0 으로 되돌리면 잘한 일이 사라진다.
        function passInk() {
          stopInk()
          if (!inkEl) return
          inkEl.classList.remove(INK_WARN)
          inkEl.classList.remove(INK_CRIT)
          inkEl.classList.add('pass')
          inkWord.textContent = inkPassLine(inkStartedAt, nowMs(), inkMs)
          clockNote.textContent = ''
        }

        function paint() {
          // 마를수록 바탕이 메마르고, 먹빛이 검정에서 갈색으로 뜨고, 안내점은 오히려
          // 또렷해진다. 순서가 약속이다 — 물자국(남은 초)을 가장 먼저 칠하고 그 위에
          // 안내점, 그 위에 학생의 획. 안내점이 숫자에 덮이는 일이 생길 수 없다.
          g.fillStyle = inkPaperColor(dryness)
          g.fillRect(0, 0, S, S)
          if (inkMs > 0 && shownSecond >= 0) {
            g.save()
            g.fillStyle = inkWashColor(level)
            g.font = `${Math.round(S * 0.58)}px ${HANJA_FONT}`
            g.textAlign = 'center'
            g.textBaseline = 'middle'
            g.fillText(String(shownSecond), S / 2, S / 2)
            g.restore()
          }
          // 안내점
          g.fillStyle = `rgba(138,106,68,${inkGuideAlpha(dryness).toFixed(3)})`
          for (const p of guides) g.fillRect(p.x * S - 1, p.y * S - 1, 3, 3)
          // 학생의 획
          g.strokeStyle = inkStrokeColor(dryness)
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
          // 시계는 글자마다 새로 선다. 「다시 쓰기」로 들어와도 마찬가지다 — 다만
          // 그것은 먹을 간 것으로 세지 않는다(마른 것이 아니라 학생이 고른 것이다).
          stopInk()
          inkStartedAt = null
          shownSecond = -1
          dryness = 0
          if (inkNote) inkNote.textContent = ''
          // 마무리 빛깔은 손으로 지운다 — drawInk 는 단계(warn·crit)만 맡는다.
          inkEl?.classList.remove('pass')
          drawInk(nowMs())
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
          // 먹은 붓이 닿는 순간부터 마른다 — 화면이 열리는 순간이 아니다.
          // 안내문을 읽는 시간은 재지 않는다.
          startInk()
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
          // 도달률을 넘긴 순간 먹은 더 안 마른다. 다음 글자로 넘길 때까지 화면을
          // 들여다보는 시간에 시계가 돌면, 완성한 글자를 살펴보는 일이 벌이 된다.
          if (ready) passInk()
          countEl.textContent=`${index+1} / ${view.glyphs.length} 자 · 도달률 ${Math.floor(coverage(guides,written)*100)}% · ${ready?'완료했습니다. 다음 글자로를 눌러 주세요.':`${DONE_RATIO * 100}% 이상까지 안내선을 더 따라 써 주세요.`}`
        })
        canvas.addEventListener('pointercancel',()=>{drawing=false;pointer=null})
        canvas.addEventListener('lostpointercapture',()=>{drawing=false;pointer=null})

        onTap(el.querySelector('.next'), nextGlyph)
        onTap(el.querySelector('.reset'), loadGlyph)

        function finish() {
          stopInk()
          el.innerHTML = finishHtml(view, regrinds)
          onTap(el.querySelector('.go'), () => { stopInk(); el.remove(); resolve() })
        }

        loadGlyph()
      })
    },
  }
}
