// 경복궁을 짓는다 — 손으로 하는 판(화면). 셈은 systems/rebuild.js 가 한다.
//
// 선생님(2026-10-06): 「경복궁 중건을 위한 원납전, 당백전 게임을 … 좀 더 재미있게 구성해 봐.」
//
// ── 화면에 있는 것이 전부 실제 물건이다 ──────────────────────────────────
//
//   공사판   돈이 있는 동안 일꾼들이 **저절로** 올린다. 올라가는 띠가 보인다. 돈이 떨어지면 선다.
//   고을     여덟 곳. 누르면 걷힌다. 걷을 때마다 원성의 띠가 차고, 두면 천천히 가라앉는다.
//            가득 찬 채로 또 걷으면 돌아선다(怨) — 그림이 바뀌고 다시는 눌리지 않는다.
//   주전소   누르면 바로 큰돈이 나온다. 그 순간 **한 채 값이 오른다** — 수가 그 자리에서 커진다.
//   날       머리의 띠가 1865 에서 1868 로 간다. 다 가기 전에 열 채를 올려야 한다.
//
// ── 읽는 동안에는 시계가 서 있다 ──────────────────────────────────────────
//
// 판은 「시작」을 눌러야 흐른다. 규칙을 읽는 데에는 시간을 걸지 않는다(게임 재제작 실패 패턴:
// 압박은 결정에 걸고 읽기에는 걸지 않는다).
//
// ── 화면 안에 들어온다 ────────────────────────────────────────────────────
//
// ⚠ 높이를 화면에 맞추고 안에서 나눈다(height:100%, 두 칸). 좁으면 한 칸으로 내려간다.
import { installTypeVars } from './type-css.js'
import { SCENE_ART } from './scene-art-data.js'
import {
  initialBoard, tick, levy, mint, price, canLevy, levyYield, wouldTurn, isWorking, isDone, timeRatio, yearAt,
  villageState, nudgeFor, summaryLine, priceTimes, boardResult,
  BAYS, VILLAGES, YEAR_FROM, YEAR_TO, RECON_NOTE, WONNAP_GLOSS, DANGBAEK_GLOSS, START_LINE,
} from '../systems/rebuild.js'

const VILLAGE_ART = { calm: 'village-calm', levied: 'village-levied', empty: 'village-empty' }

const CSS = `
.rebuild,.rebuild *{box-sizing:border-box}
.rebuild{position:fixed;inset:0;z-index:56;background:#14110d;color:#e8e2d4;overflow:hidden;
  font-family:var(--face-body,system-ui,sans-serif)}
.rebuild .frame{position:relative;height:100%;display:flex;flex-direction:column}
.rebuild .head{flex:0 0 auto;display:flex;align-items:center;gap:clamp(10px,2vw,22px);flex-wrap:wrap;
  padding:clamp(8px,1.6vh,12px) 18px clamp(6px,1.2vh,8px);border-bottom:1px solid #3a2f22}
.rebuild h2{margin:0;font-family:var(--face-display,serif);font-size:clamp(16px,2.8vh,21px);
  letter-spacing:.14em;color:#e8b45c;font-weight:400}

/* 날이 간다 — 1865 → 1868 */
.rebuild .days{flex:1 1 220px;display:flex;align-items:center;gap:8px;font-size:clamp(12px,1.9vh,14px);color:#a79f8e;min-width:180px}
.rebuild .days .bar{position:relative;flex:1;height:10px;border:1px solid #6a5230;border-radius:5px;background:#241c13;overflow:hidden}
.rebuild .days .bar i{position:absolute;left:0;top:0;bottom:0;width:100%;transform-origin:left;transform:scaleX(0);background:linear-gradient(90deg,#8a6a44,#e0a23a)}
.rebuild .days.soon .bar i{background:linear-gradient(90deg,#a3502a,#e0633a)}
.rebuild .days b{font-family:var(--face-display,serif);font-weight:400;color:#f2d79b;white-space:nowrap}
.rebuild .purse{display:flex;align-items:baseline;gap:8px;font-size:clamp(13px,2vh,15px);color:#a79f8e}
.rebuild .purse b{font-family:var(--face-display,serif);font-size:clamp(22px,4vh,30px);font-weight:400;color:#f2d79b;
  min-width:2.2em;text-align:right;font-variant-numeric:tabular-nums}
.rebuild .purse.dry b{color:#e0633a}

/* 두 칸 — 왼쪽은 공사, 오른쪽은 돈이 나오는 곳. 높이는 화면에 맞춘다. */
.rebuild .board{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(260px,38%) 1fr;
  gap:14px;padding:clamp(8px,1.6vh,12px) 18px clamp(8px,1.6vh,14px)}
.rebuild .site,.rebuild .sources{min-height:0;display:flex;flex-direction:column;gap:clamp(6px,1.2vh,10px)}
.rebuild .sources{overflow:auto}

.rebuild .art{position:relative;flex:1 1 auto;min-height:70px;margin:0;border:1px solid #4a3a2a;border-radius:3px;
  overflow:hidden;background:#1d1811}
.rebuild .art img{width:100%;height:100%;object-fit:cover;display:block}
.rebuild .art figcaption{position:absolute;left:0;right:0;bottom:0;padding:5px 8px;
  background:#000000b0;font-size:var(--read-caption,11px);line-height:1.45;color:#cfc8b8}
.rebuild.stalled .art img{filter:grayscale(.7) brightness(.7)}

/* 올린 채 — 열 칸. 채워지는 것이 눈에 보여야 한다. */
.rebuild .bays{display:flex;gap:4px}
.rebuild .bays i{flex:1;height:12px;border:1px solid #6a5230;border-radius:1px;background:#241c13;position:relative;overflow:hidden}
.rebuild .bays i.on{background:#e0a23a;border-color:#e0a23a}
.rebuild .bays i.on.new{animation:rb-pop .5s ease-out}
.rebuild .bays i.now::after{content:'';position:absolute;left:0;top:0;bottom:0;width:calc(var(--progress,0) * 100%);background:#e0a23a99}
@keyframes rb-pop{0%{transform:scaleY(2.2);filter:brightness(1.8)}100%{transform:none;filter:none}}
.rebuild .bayline{display:flex;justify-content:space-between;align-items:baseline;font-size:clamp(13px,2vh,15px);color:#cfc8b8}
.rebuild .bayline b{font-family:var(--face-display,serif);font-weight:400;font-size:1.25em;color:#f2d79b}

/* 일꾼 — 올리는 중인가, 손을 놓았는가. 그리고 한 채 값. */
.rebuild .work{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:clamp(8px,1.5vh,12px) 12px;
  border:1px solid #6a5230;border-radius:3px;background:#241c13}
.rebuild .work .state{font-size:clamp(13.5px,2.2vh,16px);color:#9fd3a7}
.rebuild.stalled .work{border-color:#a3502a;background:#2a1712}
.rebuild.stalled .work .state{color:#f0a48c}
.rebuild .work .cost{display:flex;align-items:baseline;gap:7px;font-size:clamp(12px,1.9vh,14px);color:#a79f8e;white-space:nowrap}
.rebuild .work .cost b{font-family:var(--face-display,serif);font-weight:400;font-size:clamp(20px,3.6vh,27px);color:#f2d79b;font-variant-numeric:tabular-nums}
.rebuild .work .cost b.up{animation:rb-up .7s ease-out}
.rebuild .work .cost em{font-style:normal;color:#e0633a}
@keyframes rb-up{0%{transform:scale(1.7);color:#ff8a5c}100%{transform:none}}

.rebuild button{font-family:inherit;color:inherit;cursor:pointer;touch-action:manipulation}
.rebuild .mint:focus-visible,.rebuild .village:focus-visible,.rebuild .sheet button:focus-visible{
  outline:3px solid #e0a23a;outline-offset:2px}

.rebuild .label{font-size:clamp(12px,1.9vh,14px);color:#a79f8e}
.rebuild .label b{color:#e8b45c;font-weight:400}

/* 고을 여덟 — 그림이 곧 상태다. 아래 띠가 원성이다. */
.rebuild .villages{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.rebuild .village{position:relative;padding:0;background:#1d1811;border:1px solid #4a3a2a;border-radius:3px;
  overflow:hidden;display:flex;flex-direction:column;text-align:left}
.rebuild .village img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.rebuild .village .grudge{height:5px;background:#2a2118}
.rebuild .village .grudge i{display:block;height:100%;width:calc(var(--g,0) * 100%);background:linear-gradient(90deg,#c98a3a,#d2452f)}
.rebuild .village span{display:flex;justify-content:space-between;gap:6px;padding:3px 6px 4px;font-size:clamp(11px,1.7vh,13px);color:#cfc8b8}
.rebuild .village span b{font-weight:400;color:#f2d79b}
.rebuild .village.risk{border-color:#d2452f}
.rebuild .village.risk span{color:#f0a48c}
.rebuild .village:disabled{cursor:not-allowed}
/* ⚠ 怨 은 돌아선 고을에만 뜬다. :disabled 에 걸면 판이 끝나 모든 고을이 잠기는 순간 여덟 곳에
   다 떠 버린다 — 2026-10-06 화면에서 실제로 그랬다(돌아선 고을이 없는 판인데도). */
.rebuild .village.turned img{filter:grayscale(1) brightness(.5)}
.rebuild .village.turned::after{content:'怨';position:absolute;left:0;right:0;top:8%;text-align:center;
  font-family:var(--face-display,serif);font-size:clamp(20px,4.4vh,34px);color:#e0633a;text-shadow:0 2px 6px #000}
.rebuild .village:not(:disabled):hover{border-color:#e0a23a}
.rebuild .village.took{animation:rb-took .3s ease-out}
@keyframes rb-took{0%{transform:scale(.95)}100%{transform:none}}
.rebuild .fly{position:absolute;right:6px;top:4px;font-family:var(--face-display,serif);font-size:clamp(15px,2.6vh,20px);color:#ffe2a0;
  text-shadow:0 1px 4px #000;pointer-events:none;animation:rb-fly .8s ease-out forwards}
@keyframes rb-fly{to{transform:translateY(-26px);opacity:0}}

.rebuild .mint{position:relative;display:flex;gap:10px;align-items:center;padding:8px;background:#1d1811;
  border:1px solid #4a3a2a;border-radius:3px;text-align:left}
.rebuild .mint img{width:84px;height:62px;object-fit:cover;border-radius:2px;flex:0 0 auto}
.rebuild .mint:hover{border-color:#e0a23a}
.rebuild .mint b{display:block;font-size:clamp(14px,2.3vh,17px);color:#e8b45c;font-weight:400}
.rebuild .mint small{font-size:clamp(11.5px,1.8vh,13px);color:#a79f8e;line-height:1.5}
.rebuild .mint.cue{border-color:#e0a23a;box-shadow:0 0 0 3px #e0a23a55}

.rebuild .nudge{flex:0 0 auto;min-height:1.5em;padding:0 18px clamp(4px,1vh,10px);font-size:clamp(13.5px,2.2vh,16px);
  line-height:1.5;color:#e8b45c;word-break:keep-all}
.rebuild .recon{flex:0 0 auto;padding:0 18px clamp(6px,1.2vh,12px);font-size:var(--read-caption,11px);
  line-height:1.5;color:#8f8a7c;word-break:keep-all}

/* 앞 판 · 끝난 뒤 — 같은 판 위에 덮는다 */
.rebuild .cover{position:absolute;inset:0;z-index:5;background:#14110df7;display:flex;align-items:center;
  justify-content:center;padding:clamp(12px,3vh,22px);overflow:auto}
.rebuild .sheet{max-width:660px;margin:auto;display:flex;flex-direction:column;gap:clamp(8px,1.7vh,14px);text-align:center}
.rebuild .sheet h3{margin:0;font-family:var(--face-display,serif);font-size:clamp(20px,3.6vh,27px);
  color:#e8b45c;font-weight:400;letter-spacing:.1em}
.rebuild .sheet p{margin:0;font-size:clamp(14.5px,2.3vh,17px);line-height:1.75;
  color:#e8e2d4;word-break:keep-all}
.rebuild .sheet .rules{display:flex;flex-direction:column;gap:clamp(5px,1.1vh,9px);text-align:left}
.rebuild .sheet .rules p{padding-left:13px;border-left:3px solid #e0a23a}
.rebuild .sheet .rules b{color:#f2d79b;font-weight:400}
.rebuild .sheet blockquote{margin:0;padding:10px 0 10px 16px;border-left:3px solid #8a6a44;
  text-align:left;font-family:var(--face-display,serif);font-size:clamp(14.5px,2.3vh,17px);
  line-height:1.8;color:#cfc8b8}
.rebuild .sheet cite{display:block;margin-top:6px;font-style:normal;font-size:var(--read-small,13px);color:#a79f8e}
.rebuild .sheet .actual{color:#cfc8b8;font-size:clamp(13.5px,2.1vh,15.5px)}
.rebuild .sheet .recon-done{font-size:var(--read-caption,11px);line-height:1.5;color:#8f8a7c;
  text-align:left;word-break:keep-all}
/* 아버지가 뒤집는 말 — 1막의 요점이라 판의 맨 끝에 따로 선다. */
.rebuild .sheet .overturn{border-top:1px solid #4a3a2a;padding-top:12px;text-align:left}
.rebuild .sheet .overturn .who{font-size:var(--read-small,13px);color:#e8b45c;margin-bottom:4px}
.rebuild .sheet .overturn blockquote{border-left-color:#e0a23a;color:#e8e2d4}
.rebuild .sheet .go{padding:clamp(10px,1.9vh,13px) 34px;background:#241d15;border:1px solid #6a5230;color:#f0c469;
  border-radius:3px;font-size:var(--read-label,16px);align-self:center}

/* ⚠ 한 칸으로 내려가는 문턱을 700 으로 둔다. 900 으로 두었더니 손전화 가로
   (844×390)가 여기에 걸려 판이 세로로 쌓였고, 그래서 주전소가 화면 아래로
   밀려났다 — 넓은데 낮은 화면이 가장 위험하다. */
@media(max-width:700px){
  .rebuild .board{grid-template-columns:1fr;overflow:auto}
  .rebuild .site{flex:0 0 auto}
  .rebuild .art{min-height:110px;flex:0 0 110px}
}
@media(max-width:520px){
  .rebuild .head{padding:10px 14px 6px}
  .rebuild .board{padding:10px 14px}
}

/* ⚠ 낮은 화면(태블릿 가로 820, 손전화 가로 390)에서 판이 넘치면 안 된다 —
   선생님(2026-09-30)이 「화면 안에 들어오지도 않아」라고 하신 바로 그것이다.
   고을을 여덟 칸 한 줄로 줄이고 글자를 뺀다. 그림과 띠가 이미 상태를 말하므로
   글자는 없어도 되고, 눈이 못 읽는 사람을 위해 aria-label 은 남는다. */
@media(max-height:620px){
  .rebuild .board{gap:10px}
  .rebuild .villages{grid-template-columns:repeat(8,1fr);gap:5px}
  .rebuild .village span{display:none}
  .rebuild .village img{aspect-ratio:1}
  .rebuild .mint img{width:56px;height:42px}
  .rebuild .mint small{display:none}
  .rebuild .art{min-height:0}
  .rebuild .recon{display:none}          /* 고지는 끝 판에서 다시 뜬다 */
}
@media(prefers-reduced-motion:reduce){
  .rebuild .bays i.on.new,.rebuild .work .cost b.up,.rebuild .village.took,.rebuild .fly{animation:none}
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

// 고을 한 칸의 한 마디. 그림과 띠가 곧 상태라 글은 짧게.
const VILLAGE_WORD = { calm: '걷는다', levied: '원성이 인다', empty: '돌아섰다' }
const RISK_WORD = '더 걷으면 돌아선다'

export function boardHtml(view) {
  const site = art('palace-site')
  const mintArt = art('mint-house')
  return `<div class="frame">
    <div class="head">
      <h2>${esc(view.title ?? '경복궁을 짓는다')}</h2>
      <div class="days" data-days><b>${YEAR_FROM}</b><div class="bar"><i data-daybar></i></div><b>${YEAR_TO}</b></div>
      <div class="purse" data-purse><small>가진 돈</small><b data-coin>0</b></div>
    </div>
    <div class="board">
      <div class="site">
        <div class="bayline"><span><b data-bays>0</b> / ${BAYS} 채</span><span data-year>${YEAR_FROM}년</span></div>
        <div class="bays">${Array.from({ length: BAYS }, () => '<i></i>').join('')}</div>
        <figure class="art" data-site>
          ${site ? `<img src="${site.src}" alt=""><figcaption>${esc(site.caption)}</figcaption>` : ''}
        </figure>
        <div class="work">
          <span class="state" data-state aria-live="polite"></span>
          <span class="cost">한 채 값 <b data-price></b><em data-times></em></span>
        </div>
      </div>
      <div class="sources">
        <div class="label"><b>원납전</b> — ${esc(WONNAP_GLOSS)} · 고을에서 걷는다. 걷을수록 원성이 찬다</div>
        <div class="villages">
          ${Array.from({ length: VILLAGES }, (_, i) => `
            <button type="button" class="village" data-village="${i}">
              <img alt=""><div class="grudge"><i></i></div><span><em></em><b></b></span>
            </button>`).join('')}
        </div>
        <div class="label"><b>당백전</b> — ${esc(DANGBAEK_GLOSS)} · 찍어서 만든다. 찍을수록 값이 오른다</div>
        <button type="button" class="mint" data-mint>
          ${mintArt ? `<img src="${mintArt.src}" alt="">` : ''}
          <span><b>돈을 찍는다 <span data-mintcoin></span></b><small>바로 큰돈이 생긴다 — 대신 한 채 값이 오르고, 내려오지 않는다</small></span>
        </button>
      </div>
    </div>
    <div class="nudge" data-nudge aria-live="polite"></div>
    <div class="recon">${esc(RECON_NOTE)}</div>
  </div>`
}

// 앞 판 — 무엇을 하는 판인지. 여기서는 시계가 서 있다.
export function introHtml(view, tries = 1) {
  const first = tries <= 1
  return `<div class="sheet">
    <h3>${esc(first ? (view.title ?? '경복궁을 짓는다') : '다시 — 경복궁을 짓는다')}</h3>
    ${first ? (view.intro ?? []).map(l => `<p>${esc(l)}</p>`).join('') : ''}
    <div class="rules">
      <p><b>공사는 돈이 있는 동안 저절로 올라간다.</b> 돈이 떨어지면 선다 — 그래도 날은 간다.</p>
      <p><b>고을을 누르면 걷힌다(원납전).</b> 걷을수록 원성이 차고, 가득 찬 채로 또 걷으면 그 고을은 돌아선다.</p>
      <p><b>주전소를 누르면 돈을 찍는다(당백전).</b> 바로 큰돈이 생기지만, 한 채 값이 오른다.</p>
      <p><b>${YEAR_TO}년이 되기 전에 열 채를 올린다.</b></p>
    </div>
    ${tries >= 2 ? '<p class="actual">이번에는 일꾼들의 손이 조금 더 빠르다. 돈이 떨어져 서 있으면 주전소가 빛난다.</p>' : ''}
    <button type="button" class="go start">${esc(first ? (view.startLabel ?? '공사를 시작한다') : '다시 시작한다')}</button>
  </div>`
}

export function doneHtml(view, board) {
  const q = view.quote
  return `<div class="sheet">
    <h3>${esc(view.doneTitle ?? '경 복 궁 이  섰 다')}</h3>
    <p>${esc(summaryLine(board))}</p>
    ${q ? `<blockquote>${esc(q.text)}<cite>${esc(q.origin ?? '')}</cite></blockquote>` : ''}
    ${view.actual ? `<p class="actual">${esc(view.actual)}</p>` : ''}
    ${(view.lines ?? []).map(l => `<p>${esc(l)}</p>`).join('')}
    <div class="recon-done">${esc(RECON_NOTE)}</div>
    ${view.overturn ? `<div class="overturn">${view.overturnBy?.name
      ? `<div class="who">${esc(view.overturnBy.name)}</div>` : ''
      }<blockquote>${esc(view.overturn)}</blockquote></div>` : ''}
    <button type="button" class="go">${esc(view.nextLabel ?? '다음으로')}</button>
  </div>`
}

export function createRebuild(root) {
  ensureStyle()
  return {
    /** 한 판을 연다. 돌려주는 것: systems/rebuild.js 의 boardResult() — { cleared, … } */
    open(view = {}) {
      return new Promise(resolve => {
        const tries = view.tries ?? 1
        let board = initialBoard({ tries })
        const el = document.createElement('div')
        el.className = 'rebuild'
        el.innerHTML = boardHtml(view)
        root.appendChild(el)

        const $ = sel => el.querySelector(sel)
        const frame = $('.frame')
        const coinEl = $('[data-coin]'), purseEl = $('[data-purse]'), baysEl = $('[data-bays]'), priceEl = $('[data-price]'), timesEl = $('[data-times]')
        const mintBtn = $('[data-mint]'), nudgeEl = $('[data-nudge]'), stateEl = $('[data-state]')
        const dayBar = $('[data-daybar]'), daysEl = $('[data-days]'), yearEl = $('[data-year]')
        const siteFig = $('[data-site]')
        const bayPips = [...el.querySelectorAll('.bays i')]
        const villageBtns = [...el.querySelectorAll('[data-village]')]
        $('[data-mintcoin]').textContent = `+${board.ease.mintCoin}`

        let running = false
        let raf = 0
        let last = 0
        let closed = false
        let shownPrice = price(board)
        let stalledFor = 0

        function paint(line) {
          coinEl.textContent = Math.floor(board.coin)
          purseEl.classList.toggle('dry', board.coin <= 0 && running)
          baysEl.textContent = board.bays
          const p = price(board)
          priceEl.textContent = p
          if (p !== shownPrice) { shownPrice = p; priceEl.classList.remove('up'); void priceEl.offsetWidth; priceEl.classList.add('up') }
          timesEl.textContent = board.mints ? `처음의 ${priceTimes(board).toFixed(1)}배` : ''
          bayPips.forEach((pip, i) => {
            const was = pip.classList.contains('on')
            const on = i < board.bays
            pip.classList.toggle('on', on)
            if (on && !was) pip.classList.add('new')
            pip.classList.toggle('now', i === board.bays)
            if (i === board.bays) pip.style.setProperty('--progress', board.progress.toFixed(3))
          })
          const working = isWorking(board)
          el.classList.toggle('stalled', running && !working && !board.over)
          stateEl.textContent = !running ? '' : working ? '일꾼들이 올리는 중' : board.over ? '' : '돈이 떨어져 공사가 섰다'
          // 공사가 시작되면 그림이 바뀐다 — 「터」에서 「올라가는 중」으로.
          const key = board.bays > 0 || board.progress > 0 ? 'palace-rising' : 'palace-site'
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
            const risk = state !== 'empty' && wouldTurn(board, i)
            const word = risk ? RISK_WORD : VILLAGE_WORD[state]
            btn.querySelector('em').textContent = word
            btn.querySelector('b').textContent = state === 'empty' ? '' : `+${levyYield(board, i)}`
            btn.querySelector('.grudge i').style.setProperty('--g', Math.min(1, board.villages[i].grudge).toFixed(3))
            btn.classList.toggle('risk', risk)
            btn.classList.toggle('turned', state === 'empty')
            // 낮은 화면에서는 글자를 감추므로(CSS) 이름표를 따로 단다 —
            // 화면을 못 읽는 학생에게는 이것이 유일한 안내다.
            btn.setAttribute('aria-label', `${i + 1}번째 고을 — ${word}`)
            btn.disabled = !canLevy(board, i)
          })
          dayBar.style.transform = `scaleX(${timeRatio(board).toFixed(4)})`
          daysEl.classList.toggle('soon', timeRatio(board) > 0.8)
          yearEl.textContent = `${yearAt(board)}년`
          // 둘째 판부터, 돈이 떨어져 2초 넘게 서 있으면 주전소가 빛난다.
          mintBtn.classList.toggle('cue', !!board.ease.mintCue && running && !working && stalledFor > 2000)
          if (line) nudgeEl.textContent = line
        }

        function apply(next) {
          const line = nudgeFor(board, next)
          const bayUp = next.bays > board.bays
          const stalledNow = isWorking(board) && !isWorking(next) && !next.over
          board = next
          paint(line)
          if (bayUp) view.onBay?.()
          if (stalledNow) view.onStall?.()
          if (board.over) end()
        }

        function frameStep(now) {
          if (!running) return
          const dt = Math.min(100, now - last)    // 탭을 떠났다 돌아와도 한꺼번에 흐르지 않는다
          last = now
          stalledFor = isWorking(board) ? 0 : stalledFor + dt
          apply(tick(board, dt))
          if (running) raf = requestAnimationFrame(frameStep)
        }

        function fly(btn, text) {
          const f = document.createElement('i')
          f.className = 'fly'
          f.textContent = text
          btn.appendChild(f)
          setTimeout(() => f.remove(), 820)
        }

        for (const [i, btn] of villageBtns.entries()) {
          btn.addEventListener('click', () => {
            if (!running || !canLevy(board, i)) return
            const got = levyYield(board, i)
            apply(levy(board, i))
            fly(btn, `+${got}`)
            btn.classList.remove('took'); void btn.offsetWidth; btn.classList.add('took')
            view.onTap?.('levy')
          })
        }
        mintBtn.addEventListener('click', () => {
          if (!running) return
          apply(mint(board))
          fly(mintBtn, `+${board.ease.mintCoin}`)
          view.onTap?.('mint')
        })

        function stop() {
          running = false
          cancelAnimationFrame(raf)
        }

        function close(result) {
          if (closed) return
          closed = true
          stop()
          el.remove()
          resolve(result)
        }

        function end() {
          stop()
          const result = boardResult(board)
          if (!result.cleared) {
            // 못 올린 판은 잠깐 멈춰 보여 준 뒤 닫는다 — 「아직」 화면은 부른 쪽이 띄운다.
            setTimeout(() => close(result), 1000)
            return
          }
          // 끝 — 무엇을 치렀는지 같은 판 위에 덮어 보여 준다.
          view.onDone?.()
          const cover = document.createElement('div')
          cover.className = 'cover done'
          cover.innerHTML = doneHtml(view, board)
          frame.appendChild(cover)
          const go = cover.querySelector('.go')
          go.addEventListener('click', () => close(result))
          go.focus?.()
        }

        // 앞 판 — 읽는 동안에는 시계가 서 있다.
        const intro = document.createElement('div')
        intro.className = 'cover'
        intro.innerHTML = introHtml(view, tries)
        frame.appendChild(intro)
        const start = intro.querySelector('.start')
        start.addEventListener('click', () => {
          intro.remove()
          running = true
          last = performance.now()
          paint(START_LINE)
          raf = requestAnimationFrame(frameStep)
        })
        paint('')
        start.focus?.()
      })
    },
  }
}
