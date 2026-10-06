// 막을 열기 전 — 연표의 빈칸을 채우는 한 판.
//
// 선생님(2026-09-30): 「1막의 역사적 내용을 … 배경지식을 설명해 주면 좋을 것 같아.」
// 선생님(2026-10-06): 「막이 시작하기 전 교과서 내용 정리가 게임에 방해가 되네. 그래도
// 필요한 건 맞아. … 한 판에 들어오는 연표하고 빈칸 채우기 문제로 넣는 건 어떨까.」
//
// 선생님(2026-10-06): 「여기에 기존에 있던 사진이나 그림들 어디 갔어? 포함해서 다시 한 판에
// 들어오게 만들어.」
//
// 예전 판은 사진 다섯 장과 글 열 줄을 아래로 굴려 읽는 화면이었다 — 길었고, 읽으라고만
// 했다. 이 판은 **굴리지 않는다.** 연표 다섯 줄과 낱말 여덟 개가 한 화면에 들어오고,
// 빈칸을 다 채우면 막이 열린다. 셈은 systems/cloze.js 가 한다. 여기서는 그리기만 한다.
//
// 사진은 줄마다 오른쪽에 한 장씩 선다(data/act-background.js 의 media). 누르면 크게 뜬다.
// **설명은 그 줄의 빈칸을 다 채운 뒤에 열린다** — 설명에 답이 적혀 있기 때문이다. 채우기
// 전의 사진은 단서다: 얼굴과 동전과 비석을 보고 낱말을 고른다.
//
// ⚠ 문장은 교과서의 것이다(data/act-background.js 가 쪽수를 적는다). 출처 줄을 지우지 않는다.
// ⚠ 한 화면에 들어와야 한다 — 글씨와 틈을 화면 **높이**에 맞춰 줄인다(clamp + vh).
//   넓은데 낮은 화면(손전화 가로 844×390)이 가장 위험하다. 거기서도 넘치면 판 안에서만
//   구른다(바깥 화면은 구르지 않는다).
import { installTypeVars } from './type-css.js'
import { makeBoard, initialState, place, focusBlank, isDone, hintChip, lineFor } from '../systems/cloze.js'
import { HISTORICAL_MEDIA } from './historical-media-data.js'
import { installHistoricalMedia, openMediaViewer } from './historical-media.js'

const CSS = `
.actbg,.actbg *{box-sizing:border-box}
.actbg{position:fixed;inset:0;z-index:58;overflow:hidden;background:#efe7d2;
  color:var(--ink-strong,#23201a);font-family:var(--face-body,system-ui,sans-serif);
  background-image:var(--hanji);background-size:cover;background-position:center;
  display:flex;justify-content:center}
.actbg .wrap{width:100%;max-width:1240px;height:100%;display:flex;flex-direction:column;
  gap:clamp(6px,1.6vh,16px);padding:clamp(10px,3vh,34px) clamp(14px,3vw,32px) clamp(10px,2.4vh,26px)}

.actbg .top{flex:0 0 auto;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px}
.actbg h2{margin:0;font-family:var(--face-display,serif);letter-spacing:.1em;
  font-size:clamp(19px,3.6vh,30px);line-height:1.3;color:#4f3d21;font-weight:400}
.actbg .src{font-size:clamp(11.5px,1.7vh,14px);color:var(--ink-quiet,#6b5a3e)}

/* 연표 — 왼쪽에 해, 오른쪽에 문장. 세로 줄 하나가 해들을 꿴다. */
.actbg .rows{flex:1 1 auto;min-height:0;overflow-y:auto;margin:0;padding:0;list-style:none;
  display:flex;flex-direction:column;justify-content:space-evenly;gap:clamp(4px,1.2vh,12px);
  position:relative}
.actbg .rows::before{content:'';position:absolute;left:calc(clamp(64px,9vw,104px) + 17px);top:10px;bottom:10px;
  width:2px;background:#8a6a4455}
.actbg .rows li{display:grid;grid-template-columns:clamp(64px,9vw,104px) 12px minmax(0,1fr) auto;gap:0 12px;align-items:center}
.actbg .rows li>.yr,.actbg .rows li>.dot,.actbg .rows li>p{align-self:start}

/* 사진 — 줄마다 한 장. 설명은 그 줄을 채운 뒤에 열린다. 자리는 처음부터 잡아 둔다(글이 밀리지 않게). */
.actbg .shot{margin:0;display:grid;grid-template-columns:auto clamp(120px,15vw,210px);gap:10px;align-items:center}
.actbg .shot.none{visibility:hidden}
.actbg .thumb{position:relative;display:block;padding:0;border:1px solid #8a6a44;border-radius:3px;background:#d9cfb6;
  width:clamp(72px,16vh,210px);height:clamp(46px,10.3vh,134px);overflow:hidden;cursor:zoom-in;box-shadow:0 2px 6px #3a2d1a33}
.actbg .thumb img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 22%}
.actbg .thumb::after{content:'⤢';position:absolute;right:3px;bottom:2px;font-size:12px;line-height:1;color:#fff;text-shadow:0 0 4px #000}
.actbg .thumb:hover{border-color:#b0701a}
.actbg .thumb:focus-visible{outline:3px solid #b0701a;outline-offset:2px}
.actbg .cap{margin:0;font-size:clamp(11px,1.65vh,13px);line-height:1.45;color:var(--ink-quiet,#5e4a2c);word-break:keep-all;
  display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.actbg .cap.wait{color:#8a7a5c88}
.actbg .rows li.full .cap{animation:actbg-cap .5s ease-out}
@keyframes actbg-cap{from{opacity:0}to{opacity:1}}
.actbg .yr{font-family:var(--face-display,serif);font-size:clamp(14px,2.5vh,20px);color:#8a3b22;
  text-align:right;line-height:1.6;white-space:nowrap}
.actbg .dot{width:12px;height:12px;border-radius:50%;background:#efe7d2;border:2px solid #8a3b22;
  margin-top:.55em;position:relative;z-index:1}
.actbg .rows li.full .dot{background:#8a3b22}
.actbg .rows p{margin:0;font-size:clamp(14.5px,2.55vh,20px);line-height:1.72;word-break:keep-all}

/* 빈칸 — 낱말 길이만큼 벌어져 있다. 지금 채울 칸은 테두리가 선다. */
.actbg .blank{display:inline-block;vertical-align:baseline;margin:0 2px;padding:0 .5em;
  min-width:calc(var(--n,2) * 1em + 1em);height:1.5em;line-height:1.4;
  font:inherit;color:#4f3d21;background:#00000010;border:0;border-bottom:2px solid #8a6a44;
  border-radius:2px 2px 0 0;cursor:pointer;text-align:center}
.actbg .blank.on{background:#e0a23a33;border-bottom-color:#b0701a;outline:2px solid #b0701a;outline-offset:1px}
.actbg .blank.done{background:transparent;border-bottom-color:transparent;color:#8a3b22;
  font-weight:600;cursor:default;min-width:0;padding:0 1px;outline:none}
.actbg .blank.pop{animation:actbg-pop .32s ease-out}
@keyframes actbg-pop{from{transform:scale(1.25);background:#e0a23a66}to{transform:scale(1)}}

/* 낱말 — 누르면 지금 칸에 놓인다. */
.actbg .tray{flex:0 0 auto;display:flex;flex-wrap:wrap;justify-content:center;
  gap:clamp(6px,1.2vh,10px) 10px;padding:clamp(6px,1.4vh,12px) 0 0;border-top:1px solid #8a6a4440}
.actbg .chip{padding:clamp(6px,1.3vh,10px) clamp(12px,1.8vw,18px);background:#fbf5e4;
  border:1px solid #8a6a44;border-radius:3px;font:inherit;font-size:clamp(14.5px,2.5vh,19px);
  color:#3a2d1a;cursor:pointer;box-shadow:0 2px 0 #8a6a4466;transition:transform .12s}
.actbg .chip:hover{transform:translateY(-2px)}
.actbg .chip:active{transform:translateY(1px);box-shadow:none}
.actbg .chip.used{visibility:hidden}
.actbg .chip.left{opacity:.45;cursor:default;box-shadow:none}
.actbg .chip.no{animation:actbg-no .3s}
@keyframes actbg-no{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.actbg .chip.glow{border-color:#b0701a;background:#ffe9b8;animation:actbg-glow 1s ease-in-out infinite}
@keyframes actbg-glow{50%{box-shadow:0 0 0 5px #e0a23a55}}
.actbg .chip:focus-visible,.actbg .blank:focus-visible,.actbg .go:focus-visible{
  outline:3px solid #b0701a;outline-offset:2px}

.actbg .say{flex:0 0 auto;min-height:1.5em;text-align:center;font-size:clamp(12.5px,2vh,15.5px);
  color:var(--ink-quiet,#5e4a2c);word-break:keep-all}

.actbg .foot{flex:0 0 auto;display:flex;align-items:center;gap:14px;flex-wrap:wrap;justify-content:space-between}
.actbg .ahead{flex:1 1 320px;margin:0;font-size:clamp(12.5px,2vh,15.5px);line-height:1.55;
  color:var(--ink-strong,#23201a);word-break:keep-all}
.actbg .go{flex:0 0 auto;padding:clamp(9px,1.8vh,14px) clamp(22px,3vw,40px);background:#3a2d20;
  border:1px solid #6a5230;color:#f0c469;border-radius:3px;font-family:inherit;
  font-size:clamp(14.5px,2.3vh,17px);letter-spacing:.06em;cursor:pointer}
.actbg .go:disabled{background:#00000014;border-color:#8a6a4455;color:#8a7a5c;cursor:not-allowed}
.actbg .go:not(:disabled):hover{background:#4a3a2a}
.actbg .go.ready{animation:actbg-ready .5s ease-out}
@keyframes actbg-ready{from{transform:scale(1.12)}to{transform:scale(1)}}

/* 좁거나 낮은 화면에서는 설명 줄을 접는다 — 사진을 누르면 크게 뜨고 거기에 설명이 있다. */
@media(max-width:980px),(max-height:560px){
  .actbg .shot{grid-template-columns:auto}
  .actbg .cap{display:none}
}
@media(max-height:560px){
  .actbg .thumb{width:58px;height:36px}
}
@media(max-width:620px){
  .actbg .rows li{grid-template-columns:54px 12px minmax(0,1fr) auto;gap:0 8px}
  .actbg .thumb{width:56px;height:40px}
  .actbg .rows::before{left:67px}
  .actbg .go{width:100%}
}
@media(prefers-reduced-motion:reduce){
  .actbg .blank.pop,.actbg .chip.no,.actbg .chip.glow,.actbg .go.ready,.actbg .rows li.full .cap{animation:none}
  .actbg .chip{transition:none}
}
.actbg .actbg-task{margin:0;font-size:clamp(17px,2.8vh,23px);font-weight:600;color:#45371e;text-align:center;line-height:1.45}
.actbg .rows li{padding:10px 8px;border:1px solid #8a6a4430;border-radius:8px;background:#fffaf040}
.actbg .rows li.actbg-active{background:#fff8e4;border-color:#ad7d30;box-shadow:inset 4px 0 #ad7d30}
.actbg .rows li.full{opacity:.72}
.actbg .ahead{font-size:14px}
@media(max-height:560px){.actbg .rows li{padding:7px 4px}.actbg .actbg-task{font-size:17px}.actbg .rows p{font-size:17px;line-height:1.6}}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  installHistoricalMedia()      // 사진을 크게 띄우는 창의 모양(.historical-viewer)을 함께 쓴다
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export const CAPTION_WAIT = '빈칸을 채우면 설명이 열립니다.'

// 줄 옆의 사진 한 장. **설명(이름 · 관계)은 여기에 싣지 않는다** — 빈칸의 답이 적혀 있다.
// 줄을 다 채운 뒤에 화면이 채워 넣는다(captionOf).
export function shotHtml(source, index) {
  const media = source?.media ? HISTORICAL_MEDIA[source.media] : null
  if (!media) return '<figure class="shot none" aria-hidden="true"></figure>'
  return `<figure class="shot">
    <button type="button" class="thumb" data-shot="${index}" aria-label="관련 자료를 크게 본다"><img src="${media.src}" alt="" decoding="async"></button>
    <figcaption class="cap wait" data-cap="${index}">${esc(CAPTION_WAIT)}</figcaption>
  </figure>`
}

// 줄을 다 채운 뒤에 사진 곁에 열리는 설명 — 이 자료가 이 줄과 어떤 사이인가.
// 자료의 이름 · 소장처 · 출처는 사진을 눌러 크게 띄운 창에 있다(좁은 자리에 다 적으면 잘린다).
export function captionOf(source) {
  return source?.media && HISTORICAL_MEDIA[source.media] ? (source.relation ?? '') : ''
}

// 연표 한 줄. 빈칸은 단추다 — 눌러서 「지금 채울 칸」으로 고를 수 있다.
// source 는 data/act-background.js 의 그 줄(사진을 들고 있다). 없으면 사진 자리 없이 그린다.
export function rowHtml(row, board, source = null, index = 0) {
  const body = row.parts.map(part => {
    if (part.blank == null) return esc(part.text)
    const answer = board.blanks.find(b => b.id === part.blank)?.answer ?? ''
    return `<button type="button" class="blank" data-blank="${part.blank}" style="--n:${[...answer].length}" aria-label="빈칸"></button>`
  }).join('')
  return `<li data-row="${index}"><span class="yr">${esc(row.year)}</span><i class="dot"></i><p>${body}</p>${source ? shotHtml(source, index) : ''}</li>`
}

export function backgroundHtml(view, board = makeBoard(view.rows, view.extra)) {
  return `<div class="wrap">
    <div class="top">
      <h2>${esc(view.title)}</h2>
      ${view.origin ? `<span class="src">출처 — ${esc(view.origin)}</span>` : ''}
    </div>
    <p class="actbg-task">빛나는 빈칸에 들어갈 낱말을 고르세요.</p>
    <ol class="rows">${board.rows.map((r, i) => rowHtml(r, board, view.rows?.[i] ?? {}, i)).join('')}</ol>
    <div class="tray">${board.chips.map(c =>
      `<button type="button" class="chip" data-chip="${c.id}">${esc(c.word)}</button>`).join('')}</div>
    <div class="say" aria-live="polite"></div>
    <div class="foot">
      ${view.ahead ? `<p class="ahead">${esc(view.ahead)}</p>` : '<span></span>'}
      <button type="button" class="go" disabled>${esc(view.buttonLabel ?? '막을 시작한다')}</button>
    </div>
  </div>`
}

export function createActBackground(root) {
  ensureStyle()
  return {
    open(view) {
      return new Promise(resolve => {
        const board = makeBoard(view.rows, view.extra)
        let state = initialState(board)
        const el = document.createElement('div')
        el.className = 'actbg'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.innerHTML = backgroundHtml(view, board)
        root.appendChild(el)

        const go = el.querySelector('.go')
        const say = el.querySelector('.say')
        const blankEls = new Map([...el.querySelectorAll('[data-blank]')].map(b => [b.dataset.blank, b]))
        const chipEls = new Map([...el.querySelectorAll('[data-chip]')].map(c => [c.dataset.chip, c]))

        function paint(lastOk = null) {
          const done = isDone(board, state)
          const hint = hintChip(board, state)
          for (const [id, b] of blankEls) {
            const word = state.filled[id]
            b.classList.toggle('done', !!word)
            b.classList.toggle('on', !done && state.active === id)
            if (word) { b.textContent = word; b.disabled = true; b.setAttribute('aria-label', word) }
          }
          for (const li of el.querySelectorAll('.rows li')) {
            const ids = [...li.querySelectorAll('[data-blank]')].map(b => b.dataset.blank)
            const full = ids.length > 0 && ids.every(id => state.filled[id])
            li.classList.toggle('full', full)
            li.classList.toggle('actbg-active', ids.includes(state.active) && !done)
            // 줄을 다 채웠으면 사진의 설명이 열린다.
            const cap = li.querySelector('.cap.wait')
            if (full && cap) { cap.textContent = captionOf(view.rows?.[Number(li.dataset.row)]); cap.classList.remove('wait') }
          }
          for (const [id, c] of chipEls) {
            c.classList.toggle('used', !!state.used[id])
            c.classList.toggle('glow', hint === id)
            // 다 채운 뒤 남은 낱말은 흐려 둔다 — 「이 연표에는 들어가지 않는다」.
            c.classList.toggle('left', done && !state.used[id])
            c.disabled = done || !!state.used[id]
          }
          say.textContent = lineFor(board, state, lastOk)
          if (done && go.disabled) {
            go.disabled = false
            go.classList.add('ready')
            go.focus?.()
          }
        }

        for (const [id, b] of blankEls) {
          b.addEventListener('click', () => { state = focusBlank(board, state, id); paint() })
        }
        // 사진을 누르면 크게 뜬다. 그 줄을 아직 못 채웠으면 사진만 뜨고 설명은 잠겨 있다.
        for (const thumb of el.querySelectorAll('[data-shot]')) {
          thumb.addEventListener('click', () => {
            const index = Number(thumb.dataset.shot)
            const source = view.rows?.[index]
            const media = HISTORICAL_MEDIA[source?.media]
            if (!media) return
            const open = el.querySelector(`li[data-row="${index}"]`)?.classList.contains('full')
            openMediaViewer(open
              ? { ...media, kind: 'historical', relation: source.relation ?? '' }
              : { src: media.src, kind: 'historical', caption: '관련 자료', relation: CAPTION_WAIT }, thumb)
          })
        }
        for (const [id, c] of chipEls) {
          c.addEventListener('click', () => {
            const active = state.active
            const r = place(board, state, id)
            state = r.state
            if (r.ok) {
              view.onPlace?.()
              const b = blankEls.get(active)
              b?.classList.remove('pop'); void b?.offsetWidth; b?.classList.add('pop')
            } else {
              view.onMiss?.()
              c.classList.remove('no'); void c.offsetWidth; c.classList.add('no')
            }
            paint(r.ok)
          })
        }

        // 두 번 눌러도 한 번이다 — 다른 화면에서 한 번 났던 일이다.
        let closed = false
        go.addEventListener('click', () => {
          if (closed || go.disabled) return
          closed = true
          el.remove()
          resolve({ misses: Object.values(state.misses).reduce((a, n) => a + n, 0) })
        })

        paint()
        el.querySelector('.chip')?.focus?.()
      })
    },
  }
}
