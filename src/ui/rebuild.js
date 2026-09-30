// 경복궁을 짓는다 — 손으로 하는 판.
//
// 선생님(2026-09-30): 「전혀 재미없고 화면 안에 들어오지도 않아. 무슨 게임 하는
// 건지도 모르겠어. 더 직관적으로 게임을 다시 만들어 봐 새롭게.」
//
// 셈은 systems/rebuild.js 가 한다. 여기서는 그리기만 한다.
//
// ── 화면에 있는 것이 전부 실제 물건이다 ──────────────────────────────────
//
// 예전 판은 「칸」·「지레」·「결승선」이었다 — 전부 비유라서, 학생은 자기가 무엇을
// 만지는지 몰랐다. 이 판에는 비유가 없다:
//
//   공사판   경복궁이 한 채씩 올라간다. 그림이 터 → 올라가는 중으로 바뀐다.
//   고을     여덟 곳. 누르면 걷힌다. 그림이 평온 → 걷힘 → 비었다로 바뀐다.
//   주전소   누르면 돈이 나온다. 그 순간 **올리는 값이 오른다.**
//
// 값이 오르는 것을 **단추에 적힌 수가 그 자리에서 커지는 것**으로 보여 준다.
// 이 판이 가르치려는 것이 그 한 장면이라, 다른 장치를 두지 않았다.
//
// ── 화면 안에 들어온다 ────────────────────────────────────────────────────
//
// ⚠ 예전 판이 창의 3.6배로 늘어나 태블릿 가로에서 단추가 화면 밖으로 밀렸다.
//   그래서 이 판은 **높이를 화면에 맞추고 안에서 나눈다**(height:100%, 두 칸).
//   좁으면 한 칸으로 내려가고, 고을 줄은 그 안에서만 넘친다 — 판 전체가 아니라.
import { installTypeVars } from './type-css.js'
import { SCENE_ART } from './scene-art-data.js'
import {
  initialBoard, levy, mint, raise, price, canLevy, canRaise, isDone,
  villageState, emptyVillages, nudgeFor, summaryLine, priceTimes,
  BAYS, VILLAGES, RECON_NOTE, WONNAP_GLOSS, DANGBAEK_GLOSS, NEED_MORE_LINE,
} from '../systems/rebuild.js'

const VILLAGE_ART = { calm: 'village-calm', levied: 'village-levied', empty: 'village-empty' }

const CSS = `
.rebuild,.rebuild *{box-sizing:border-box}
.rebuild{position:fixed;inset:0;z-index:56;background:#14110d;color:#e8e2d4;overflow:hidden;
  font-family:var(--face-body,system-ui,sans-serif);display:flex;flex-direction:column}
.rebuild .head{flex:0 0 auto;display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;
  padding:12px 18px 8px;border-bottom:1px solid #3a2f22}
.rebuild h2{margin:0;font-family:var(--face-display,serif);font-size:var(--read-title,20px);
  letter-spacing:.14em;color:#e8b45c;font-weight:400}
.rebuild .purse{margin-left:auto;display:flex;align-items:center;gap:8px;
  font-size:var(--read-lead,18px);color:#f2d79b}
.rebuild .purse b{font-family:var(--face-display,serif);font-size:var(--read-display,26px);font-weight:400}
.rebuild .purse small{font-size:var(--read-small,13px);color:#a79f8e}

/* 두 칸 — 왼쪽은 공사, 오른쪽은 돈이 나오는 곳. 높이는 화면에 맞춘다. */
.rebuild .board{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(260px,38%) 1fr;
  gap:14px;padding:12px 18px 14px}
.rebuild .site,.rebuild .sources{min-height:0;display:flex;flex-direction:column;gap:10px}
.rebuild .sources{overflow:auto}

.rebuild .art{position:relative;flex:1 1 auto;min-height:90px;border:1px solid #4a3a2a;border-radius:3px;
  overflow:hidden;background:#1d1811}
.rebuild .art img{width:100%;height:100%;object-fit:cover;display:block}
.rebuild .art figcaption{position:absolute;left:0;right:0;bottom:0;padding:5px 8px;
  background:#000000b0;font-size:var(--read-caption,11px);line-height:1.45;color:#cfc8b8}

/* 올린 채 — 열 칸. 채워지는 것이 눈에 보여야 한다. */
.rebuild .bays{display:flex;gap:4px}
.rebuild .bays i{flex:1;height:10px;border:1px solid #6a5230;border-radius:1px;background:#241c13}
.rebuild .bays i.on{background:#e0a23a;border-color:#e0a23a}
.rebuild .bayline{font-size:var(--read-small,13px);color:#cfc8b8}

.rebuild button{font-family:inherit;color:inherit;cursor:pointer}
.rebuild .raise{padding:12px 14px;background:#5a4324;border:1px solid #e0a23a;color:#f2d79b;
  border-radius:3px;font-size:var(--read-body,16px);display:flex;justify-content:space-between;
  align-items:center;gap:10px}
.rebuild .raise:disabled{background:#241c13;border-color:#4a3a2a;color:#8f8a7c;cursor:not-allowed}
.rebuild .raise .cost{font-family:var(--face-display,serif);font-size:var(--read-lead,19px)}
.rebuild .raise:focus-visible,.rebuild .mint:focus-visible,.rebuild .village:focus-visible{
  outline:3px solid #e0a23a;outline-offset:2px}

.rebuild .label{font-size:var(--read-small,13px);color:#a79f8e}
.rebuild .label b{color:#e8b45c;font-weight:400}

/* 고을 여덟 — 그림이 곧 상태다 */
.rebuild .villages{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.rebuild .village{padding:0;background:#1d1811;border:1px solid #4a3a2a;border-radius:3px;
  overflow:hidden;display:flex;flex-direction:column;text-align:left}
.rebuild .village img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.rebuild .village span{padding:4px 6px;font-size:var(--read-caption,11px);color:#cfc8b8}
.rebuild .village:disabled{opacity:.55;cursor:not-allowed}
.rebuild .village:not(:disabled):hover{border-color:#e0a23a}

.rebuild .mint{display:flex;gap:10px;align-items:center;padding:8px;background:#1d1811;
  border:1px solid #4a3a2a;border-radius:3px;text-align:left}
.rebuild .mint img{width:84px;height:62px;object-fit:cover;border-radius:2px;flex:0 0 auto}
.rebuild .mint:hover{border-color:#e0a23a}
.rebuild .mint b{display:block;font-size:var(--read-body,15px);color:#e8b45c;font-weight:400}
.rebuild .mint small{font-size:var(--read-caption,12px);color:#a79f8e;line-height:1.5}

.rebuild .nudge{flex:0 0 auto;min-height:1.5em;padding:0 18px 10px;font-size:var(--read-small,14px);
  line-height:var(--read-lh-small,1.6);color:#e8b45c;word-break:keep-all}
.rebuild .recon{flex:0 0 auto;padding:0 18px 12px;font-size:var(--read-caption,11px);
  line-height:1.5;color:#8f8a7c;word-break:keep-all}

/* 끝난 뒤 — 같은 판 위에 덮는다 */
.rebuild .done{position:absolute;inset:0;background:#14110de8;display:flex;align-items:center;
  justify-content:center;padding:22px;overflow:auto}
.rebuild .done .sheet{max-width:640px;display:flex;flex-direction:column;gap:14px;text-align:center}
.rebuild .done h3{margin:0;font-family:var(--face-display,serif);font-size:var(--read-display,26px);
  color:#e8b45c;font-weight:400;letter-spacing:.1em}
.rebuild .done p{margin:0;font-size:var(--read-body,16px);line-height:var(--read-lh-body,1.8);
  color:#e8e2d4;word-break:keep-all}
.rebuild .done blockquote{margin:0;padding:10px 0 10px 16px;border-left:3px solid #8a6a44;
  text-align:left;font-family:var(--face-display,serif);font-size:var(--read-body,16px);
  line-height:1.85;color:#cfc8b8}
.rebuild .done cite{display:block;margin-top:6px;font-style:normal;font-size:var(--read-small,13px);color:#a79f8e}
.rebuild .done .actual{color:#cfc8b8;font-size:var(--read-small,15px)}
.rebuild .done .recon-done{font-size:var(--read-caption,11px);line-height:1.5;color:#8f8a7c;
  text-align:left;word-break:keep-all}
/* 아버지가 뒤집는 말 — 1막의 요점이라 판의 맨 끝에 따로 선다. */
.rebuild .done .overturn{border-top:1px solid #4a3a2a;padding-top:12px;text-align:left}
.rebuild .done .overturn .who{font-size:var(--read-small,13px);color:#e8b45c;margin-bottom:4px}
.rebuild .done .overturn blockquote{border-left-color:#e0a23a;color:#e8e2d4}
.rebuild .done .go{padding:13px 34px;background:#241d15;border:1px solid #6a5230;color:#f0c469;
  border-radius:3px;font-size:var(--read-label,16px);align-self:center}

/* ⚠ 한 칸으로 내려가는 문턱을 700 으로 둔다. 900 으로 두었더니 손전화 가로
   (844×390)가 여기에 걸려 판이 세로로 쌓였고, 그래서 주전소가 화면 아래로
   밀려났다 — 넓은데 낮은 화면이 가장 위험하다. */
@media(max-width:700px){
  .rebuild .board{grid-template-columns:1fr;overflow:auto}
  .rebuild .site{flex:0 0 auto}
  .rebuild .art{min-height:120px;flex:0 0 120px}
}
@media(max-width:520px){
  .rebuild .head{padding:10px 14px 6px}
  .rebuild .board{padding:10px 14px}
}

/* ⚠ 낮은 화면(태블릿 가로 820, 손전화 가로 390)에서 판이 넘치면 안 된다 —
   선생님(2026-09-30)이 「화면 안에 들어오지도 않아」라고 하신 바로 그것이다.
   고을을 여덟 칸 한 줄로 줄이고 글자를 뺀다. 그림이 이미 상태를 말하므로
   글자는 없어도 되고, 눈이 못 읽는 사람을 위해 aria-label 은 남는다. */
@media(max-height:620px){
  .rebuild .head{padding:8px 14px 6px}
  .rebuild h2{font-size:var(--read-body,16px)}
  .rebuild .purse b{font-size:var(--read-title,20px)}
  .rebuild .board{padding:8px 14px 10px;gap:10px}
  .rebuild .villages{grid-template-columns:repeat(8,1fr);gap:5px}
  .rebuild .village span{display:none}
  .rebuild .village img{aspect-ratio:1}
  .rebuild .mint img{width:56px;height:42px}
  .rebuild .mint small{display:none}
  .rebuild .art{min-height:0}
  .rebuild .recon{display:none}          /* 고지는 끝 판에서 다시 뜬다 */
  .rebuild .nudge{padding-bottom:6px}
}
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

function art(key) {
  const a = SCENE_ART[key]
  return a?.src ? { src: a.src, caption: a.caption ?? '' } : null
}

// 고을 한 칸. 그림이 곧 상태라 글은 짧게 — 「걷는다 / 조금 남았다 / 비었다」.
const VILLAGE_WORD = { calm: '걷는다', levied: '조금 남았다', empty: '비었다' }

export function boardHtml(view) {
  const site = art('palace-site')
  const mintArt = art('mint-house')
  return `
    <div class="head">
      <h2>${esc(view.title ?? '경복궁을 짓는다')}</h2>
      <div class="purse"><small>가진 돈</small><b data-coin>0</b></div>
    </div>
    <div class="board">
      <div class="site">
        <div class="bayline"><b data-bays>0</b> / ${BAYS} 채</div>
        <div class="bays">${Array.from({ length: BAYS }, () => '<i></i>').join('')}</div>
        <figure class="art" data-site>
          ${site ? `<img src="${site.src}" alt=""><figcaption>${esc(site.caption)}</figcaption>` : ''}
        </figure>
        <button class="raise" data-raise>
          <span>한 채 올린다</span><span class="cost" data-price></span>
        </button>
      </div>
      <div class="sources">
        <div class="label"><b>원납전</b> — ${esc(WONNAP_GLOSS)} · 고을에서 걷는다</div>
        <div class="villages">
          ${Array.from({ length: VILLAGES }, (_, i) => `
            <button class="village" data-village="${i}">
              <img alt=""><span></span>
            </button>`).join('')}
        </div>
        <div class="label"><b>당백전</b> — ${esc(DANGBAEK_GLOSS)} · 찍어서 만든다</div>
        <button class="mint" data-mint>
          ${mintArt ? `<img src="${mintArt.src}" alt="">` : ''}
          <span><b>돈을 찍는다</b><small>바로 돈이 생긴다 — 대신 한 채를 올리는 값이 오른다</small></span>
        </button>
      </div>
    </div>
    <div class="nudge" data-nudge aria-live="polite"></div>
    <div class="recon">${esc(RECON_NOTE)}</div>`
}

export function createRebuild(root) {
  ensureStyle()
  return {
    open(view = {}) {
      return new Promise(resolve => {
        let board = initialBoard()
        const el = document.createElement('div')
        el.className = 'rebuild'
        el.innerHTML = boardHtml(view)
        root.appendChild(el)

        const $ = sel => el.querySelector(sel)
        const coinEl = $('[data-coin]'), baysEl = $('[data-bays]'), priceEl = $('[data-price]')
        const raiseBtn = $('[data-raise]'), mintBtn = $('[data-mint]'), nudgeEl = $('[data-nudge]')
        const siteFig = $('[data-site]')
        const bayPips = [...el.querySelectorAll('.bays i')]
        const villageBtns = [...el.querySelectorAll('[data-village]')]

        function paint(line) {
          coinEl.textContent = board.coin
          baysEl.textContent = board.bays
          priceEl.textContent = price(board)
          raiseBtn.disabled = !canRaise(board)
          bayPips.forEach((p, i) => p.classList.toggle('on', i < board.bays))
          // 공사가 시작되면 그림이 바뀐다 — 「터」에서 「올라가는 중」으로.
          const key = board.bays > 0 ? 'palace-rising' : 'palace-site'
          const a = art(key)
          if (a && siteFig.dataset.key !== key) {
            siteFig.dataset.key = key
            siteFig.innerHTML = `<img src="${a.src}" alt=""><figcaption>${esc(a.caption)}</figcaption>`
          }
          villageBtns.forEach((btn, i) => {
            const state = villageState(board, i)
            const a2 = art(VILLAGE_ART[state])
            const img = btn.querySelector('img')
            if (a2 && img.dataset.key !== state) { img.dataset.key = state; img.src = a2.src }
            btn.querySelector('span').textContent = VILLAGE_WORD[state]
            // 낮은 화면에서는 글자를 감추므로(CSS) 이름표를 따로 단다 —
            // 화면을 못 읽는 학생에게는 이것이 유일한 안내다.
            btn.setAttribute('aria-label', `${i + 1}번째 고을 — ${VILLAGE_WORD[state]}`)
            btn.disabled = !canLevy(board, i)
          })
          if (line !== undefined) nudgeEl.textContent = line ?? ''
          // 걷을 곳이 다 떨어졌는데 아직 못 올렸으면, 무엇이 남았는지 말해 준다.
          if (!canRaise(board) && !isDone(board) && villageBtns.every(b => b.disabled)) {
            nudgeEl.textContent = NEED_MORE_LINE
          }
        }

        function step(next) {
          const line = nudgeFor(board, next)
          board = next
          paint(line)
          view.onTap?.()
          if (isDone(board)) finish()
        }

        for (const [i, btn] of villageBtns.entries()) {
          btn.addEventListener('click', () => step(levy(board, i)))
        }
        mintBtn.addEventListener('click', () => step(mint(board)))
        raiseBtn.addEventListener('click', () => step(raise(board)))

        // 끝 — 무엇을 치렀는지 같은 판 위에 덮어 보여 준다.
        let done = false
        function finish() {
          if (done) return
          done = true
          const sheet = document.createElement('div')
          sheet.className = 'done'
          const q = view.quote
          sheet.innerHTML = `<div class="sheet">
            <h3>${esc(view.doneTitle ?? '경 복 궁 이  섰 다')}</h3>
            <p>${esc(summaryLine(board))}</p>
            ${q ? `<blockquote>${esc(q.text)}<cite>${esc(q.origin ?? '')}</cite></blockquote>` : ''}
            ${view.actual ? `<p class="actual">${esc(view.actual)}</p>` : ''}
            ${(view.lines ?? []).map(l => `<p>${esc(l)}</p>`).join('')}
            <div class="recon-done">${esc(RECON_NOTE)}</div>
            ${view.overturn ? `<div class="overturn">${view.overturnBy?.name
              ? `<div class="who">${esc(view.overturnBy.name)}</div>` : ''
              }<blockquote>${esc(view.overturn)}</blockquote></div>` : ''}
            <button class="go">${esc(view.nextLabel ?? '다음으로')}</button>
          </div>`
          el.appendChild(sheet)
          const go = sheet.querySelector('.go')
          go.addEventListener('click', () => {
            el.remove()
            resolve({
              bays: board.bays,
              mints: board.mints,
              emptied: emptyVillages(board),
              priceTimes: Number(priceTimes(board).toFixed(2)),
              cleared: true,
              summary: summaryLine(board),
            })
          })
          go.focus?.()
        }

        paint('')
        raiseBtn.focus?.()
      })
    },
  }
}
