import { SOURCES } from '../data/sources.js'
import { isRead, isLost } from '../systems/codex.js'
import { lossLabel } from '../systems/loss-log.js'
import { sourceMedia, mediaFigure, installHistoricalMedia, bindMedia } from './historical-media.js'
import { INQUIRIES } from '../data/inquiries.js'
import { inquiryHtml, bindInquiry, installInquiryStyle } from './source-inquiry.js'
import { seenArtifacts } from '../systems/artifacts.js'
import { artifactById } from '../data/artifacts.js'
import { discoveryDecoration, palaceCollectionHtml } from './palace-discoveries.js'
import { PALACE_LIFE_COLLECTION } from '../systems/palace-discoveries.js'
import { RUMOR_NOTICE } from './grade-notice.js'
import {
  readFor, partsOf, initialRead, underline, readDone, readComplete, readHint, readRecord, READ_LINES,
  probeOf, answerProbe, probeHint, PROBE_TYPES,
} from '../systems/source-read.js'
export { RUMOR_NOTICE }

const CSS = `
.veil{position:fixed;inset:0;background:#0f1113cc;z-index:40;display:flex;
  align-items:center;justify-content:center;padding:20px}
/* 사료 카드는 한지 위에 앉는다 — 학생이 손에 쥐는 것은 문서이지 흰 카드가 아니다.
   var(--hanji) 가 없으면 이 줄만 무효가 되고 예전의 단색이 그대로 남는다(ui/paper-css.js). */
.card{max-width:min(660px,94vw);width:100%;max-height:86vh;overflow:auto;background:#e8e2d4;color:var(--ink-strong,#23201a);
  background-image:var(--hanji);background-size:cover;background-position:center;
  border-radius:3px;border:1px solid #6b5a3e;padding:26px 30px;line-height:var(--read-lh-body,1.7);
  word-break:keep-all;
  box-shadow:0 12px 40px #000a, inset 0 0 70px #b39a6a2b}
.card h3{margin:0 0 6px;font-family:var(--face-display,serif);font-size:var(--read-title,20px);
  line-height:var(--read-lh-title,1.4);letter-spacing:var(--read-track,1px);color:#2b2317}
.card .origin{font-size:var(--read-small,13px);color:var(--ink-quiet,#5e5849);margin-bottom:16px;
  line-height:var(--read-lh-small,1.6)}
/* ── 기록과 해석을 눈으로 가른다 ────────────────────────────────────────
   선생님(2026-09-30, 두 번째): 「기록에 적힌 것이랑 해석이 구분이 안 된다고.
   종이 질감 옛날 거로 기록에 적힌 것을 눈에 보이게 만들어.」

   첫 번째 손질(이름표·글꼴·옅은 바탕)로는 모자랐다. 까닭이 분명하다 —
   **카드 전체가 이미 한지 바탕**이다. 종이 위에 종이를 올려 놓았으니 구분이
   될 리가 없었다. 그래서 이번에는 **물건을 둘로 나눈다**:

     기록  카드 위에 **따로 놓인 한 장의 옛 종이**. 더 누렇고, 얼룩이 앉았고,
           세 번 접힌 자국이 있고, 그림자를 드리우고, 살짝 비뚤다. 붉은 도장이 찍혀 있다.
     해석  **종이가 아니다.** 질감도 그림자도 없는 납작한 자리에 적은 우리 메모다.

   이제 둘은 「글씨체가 다른 두 문단」이 아니라 **다른 물건**이다.
   ⚠ 종이는 CSS 로만 짓는다 — 그림을 새로 싣지 않는다(용량이 한 바이트도 안 는다).

   옛 장계 그림(assets/paper/janggye-open.png)의 결을 본떴다: 누런 닥종이,
   번진 얼룩, 가로 접힌 자국 셋, 모서리의 붉은 인장. */
.card .part-label{display:block;font-size:var(--read-caption,11px);letter-spacing:.18em;
  color:var(--ink-quiet,#6b5a3e);margin:0 0 6px}

/* 기록 — 카드 위에 놓인 낱장 */
.card .record{position:relative;margin:0 2px 20px;padding:20px 22px 22px;
  border-radius:1px;transform:rotate(-.35deg);
  color:#2a2418;
  /* 누런 닥종이 + 번진 얼룩 + 가로 접힌 자국 셋 */
  background-color:#ded0ab;
  background-image:
    linear-gradient(180deg,#0000 0 32%,#8a6a4426 32.4%,#0000 33%),
    linear-gradient(180deg,#0000 0 63%,#8a6a441f 63.4%,#0000 64%),
    radial-gradient(60% 40% at 18% 22%,#a8854c2e,#0000 70%),
    radial-gradient(45% 35% at 82% 72%,#9c7c4428,#0000 70%),
    radial-gradient(30% 25% at 62% 12%,#8a6a4426,#0000 70%);
  box-shadow:0 6px 16px #3a2d1a33, 0 1px 0 #fff6, inset 0 0 40px #b8985e2b;
  /* 손으로 자른 가장자리 — 네 변이 조금씩 다르게 들어간다 */
  clip-path:polygon(0.4% 1.2%,99.3% 0%,100% 98.6%,0.7% 100%)}
/* 붉은 인장 — 옛 장계 그림의 모서리에 찍혀 있던 그것이다. 글자를 지어 넣지
   않는다(무슨 도장이었는지 모른다). 눌러 찍은 자국처럼 가장자리만 고르지 않게. */
.card .record::after{content:'';position:absolute;right:15px;top:13px;width:27px;height:27px;
  border:2.5px solid #9e2f1cb0;border-radius:2px;background:#9e2f1c1a;
  box-shadow:inset 0 0 0 3px #ded0ab, inset 0 0 0 5.5px #9e2f1c8c;
  opacity:.85;transform:rotate(3deg)}
.card .record .excerpt{margin:0;padding:0;border:none;
  font-family:var(--face-display,serif);color:#241d12;
  font-size:var(--read-lead,17.5px);line-height:var(--read-lh-body,1.95);
  white-space:pre-wrap;word-break:keep-all;max-width:calc(100% - 34px)}
.card .record .part-label{color:#6b5530}

/* 해석 — 종이가 아니다. 납작하고, 그림자가 없고, 결도 없다. */
.card .reading{margin:0;padding:14px 16px 12px;border-left:3px solid #6b6558;
  background:#5e58480f}
.card .reading .part-label{color:#5e5849}
.card .meaning{font-size:var(--read-body,15px);line-height:var(--read-lh-body,1.75);
  color:#413c31}
.card .gloss{font-size:var(--read-small,13px);color:var(--ink-quiet,#6b6558);margin:0 0 16px;
  padding-left:2px;line-height:var(--read-lh-small,1.6)}
/* ── 밑줄 긋기 (2026-10-06) ─────────────────────────────────────────────
   선생님: 「애들이 이걸 절대로 안 읽고 그냥 넘어갈 거 같아.」 문서를 처음 손에 쥘 때
   물음 하나가 뜨고, 답이 되는 구절을 **기록에서 찾아 눌러** 밑줄을 긋는다. 긋기 전에는
   해석이 가려져 있고 문서를 덮을 수 없다(systems/source-read.js). */
.card .ask{margin:0 0 12px;padding:10px 14px;border-left:4px solid #a3302a;background:#a3302a12;
  font-size:var(--read-body,16px);line-height:1.6;color:#3a1c16;word-break:keep-all}
.card .ask b{display:block;font-size:var(--read-caption,12px);letter-spacing:.14em;color:#a3302a;font-weight:600;margin-bottom:2px}
.card .record .part{font:inherit;color:inherit;background:transparent;border:0;border-bottom:2px dotted #8a6a4499;
  padding:1px 1px 0;margin:0;cursor:pointer;text-align:left;border-radius:2px 2px 0 0;
  -webkit-box-decoration-break:clone;box-decoration-break:clone}
.card .record .part:hover{background:#8a6a4422}
.card .record .part:focus-visible{outline:2px solid #a3302a;outline-offset:2px}
.card .record .part.no{animation:card-no .3s}
@keyframes card-no{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.card .record .part.glow{background:#e0a23a44;animation:card-glow 1s ease-in-out infinite}
@keyframes card-glow{50%{background:#e0a23a22}}
.card .record.read-done .part{cursor:default;border-bottom-color:transparent}
.card .record.read-done .part:hover{background:transparent}
.card .record.read-done .part.hit{border-bottom:3px solid #a3302a;background:#a3302a1c}
.card .read-say{min-height:1.5em;margin:0 0 12px;font-size:var(--read-small,14px);line-height:1.6;color:#7a3a22;word-break:keep-all}
.card .read-say.found{color:#2a2418;border-left:4px solid #a3302a;padding:6px 0 6px 12px;font-size:var(--read-body,15.5px)}
/* ── 따져 읽기 (2026-10-06) — 밑줄을 그은 뒤에 오는 물음 하나. 사료마다 따지는 것이 다르다. */
.card .probe{margin:14px 0 4px;padding:12px 14px 14px;border:1px solid #3c5a6666;border-left:4px solid #3c5a66;background:#3c5a6612}
.card .probe[hidden]{display:none}
.card .probe .kind{display:block;font-size:var(--read-caption,12px);letter-spacing:.12em;color:#2f4a55;font-weight:600;margin-bottom:3px}
.card .probe .q{margin:0 0 10px;font-size:var(--read-body,16px);line-height:1.6;color:#1d2a30;word-break:keep-all}
.card .probe .opts{display:flex;flex-direction:column;gap:7px}
.card .probe .popt{font:inherit;font-size:var(--read-body,15.5px);line-height:1.5;text-align:left;padding:9px 13px;background:#fbf7ea;
  border:1px solid #8a9aa2;border-radius:3px;color:#1d2a30;cursor:pointer;word-break:keep-all}
.card .probe .popt:hover:not(:disabled){border-color:#3c5a66;background:#fff}
.card .probe .popt:focus-visible{outline:2px solid #3c5a66;outline-offset:2px}
.card .probe .popt.no{animation:card-no .3s;opacity:.55}
.card .probe .popt.glow{border-color:#b0701a;box-shadow:0 0 0 3px #e0a23a55}
.card .probe .popt.picked{border-color:#3c5a66;background:#3c5a6622;font-weight:600}
.card .probe .popt:disabled{cursor:default}
.card .probe.done .popt:not(.picked){display:none}
.card .probe .psay{min-height:1.4em;margin:9px 0 0;font-size:var(--read-small,14.5px);line-height:1.6;color:#7a3a22;word-break:keep-all}
.card .probe.done .psay{color:#1d2a30;font-size:var(--read-body,15.5px)}
/* 긋기 전의 해석 — 가려 둔다. 있다는 것은 보이되 읽히지는 않는다. */
.card.reading-locked .reading{position:relative;min-height:64px}
.card.reading-locked .reading .meaning{filter:blur(6px);opacity:.35;user-select:none;max-height:3.6em;overflow:hidden}
.card.reading-locked .reading::after{content:'밑줄을 그으면 펴진다';position:absolute;inset:auto 0 14px 0;text-align:center;
  font-size:var(--read-small,13px);color:#5e5849;letter-spacing:.06em}
.card.reading-locked .gloss{visibility:hidden}
.card .close:disabled{opacity:.45;cursor:not-allowed}
@media(prefers-reduced-motion:reduce){.card .record .part.no,.card .record .part.glow{animation:none}}
.codex .sub{font-size:var(--read-small,13px);color:var(--ink-quiet,#5e5849);margin:-8px 0 14px}
.card .staged{margin-top:18px;border:1px dashed #8a6a44;padding:11px 14px;
  font-size:var(--read-small,13px);line-height:var(--read-lh-small,1.6);color:var(--ink-quiet,#5e5849)}
.card .rendered{margin-top:18px;padding:7px 12px;font-size:var(--read-small,12px);color:var(--ink-quiet,#7a7462)}
/* 종이 위의 단추다 — 회색 판을 얹으면 문서가 아니라 웹 양식으로 보인다. */
.card .close{margin-top:22px;width:100%;padding:13px;border:1px solid #8a6a44;
  background:#00000008;color:#5e4a2c;border-radius:2px;font-size:var(--read-label,14px);letter-spacing:2px;cursor:pointer}
.card .close:hover{background:#8a6a4418}
.codex h3{margin:0 0 12px}
.codex .grp{margin-bottom:14px}
.codex .grp b{font-size:var(--read-label,13px);color:var(--ink-quiet,#6b6558);display:block;margin-bottom:6px}
.codex .row{padding:7px 2px;border-bottom:1px solid #6b5a3e33;font-size:var(--read-small,14px)}
.codex .row.gone{color:#8d8571;text-decoration:line-through}
.codex .row .tag{float:right;font-size:var(--read-caption,11px);color:#9b4a25;text-decoration:none}
.card .talktitle{font-size:var(--read-small,13px);color:var(--ink-quiet,#5e5849);margin-bottom:16px}
.card .talkline{margin:0 0 12px;font-size:var(--read-body,15px);line-height:var(--read-lh-body,1.7);color:var(--ink-strong,#23201a)}
/* 물건 카드는 사료 카드와 한눈에 갈려야 한다 — 사초함에 쌓이는 것이 아니기 때문이다.
   같은 한지 위에 앉지만 제목 옆에 「물건」이라 적고 본문에 인용 줄(excerpt)을 두지 않는다. */
.card.lore h3 small{font-size:var(--read-caption,11px);color:var(--ink-quiet,#6b6558);letter-spacing:.18em;
  margin-left:10px;vertical-align:middle}
@media(max-width:760px){.card{padding:20px 17px}}
/* ── 가로로 누운 손전화 (2026-09-27) ──────────────────────────────────────
   844x390 가로에서 재 보니 사료 카드의 **「닫기」가 화면 밖**에 있었다. 카드는
   max-height 86vh 안에서 스스로 스크롤하는데, 닫는 단추가 그 아래에 묻힌다.
   사료를 열고 못 닫으면 학생은 거기서 갇힌다 — E 키가 없는 기기에서는 유일한 길이다.
   짧은 화면에서는 카드를 넓히고 「닫기」를 바닥에 붙인다. */
@media(max-height:560px){
  .veil{padding:8px}
  .card{max-height:96vh;padding:14px 16px}
  .card .close{position:sticky;bottom:0;margin-top:12px;background:#e8e2d4;z-index:2}
}
`

// 등급이 하는 말은 두 가지가 다르다 —
// 'staged' 는 "기록이 없어 지어냈다", 'source'/'textbook' + 우리말 옮김은
// "기록은 있으나 오늘날 말로 옮겼다". 같은 문구로 뭉뚱그리면 실재하는 기록마저 지어낸 것처럼 읽힌다.
// 카드 위의 두 이름표. 누가 쓴 글인지를 학생에게 곧바로 말한다.
// 「해석」이라는 낱말을 그대로 쓴다 — 이 게임이 처음부터 쓰는 말이고(사료·해석·재구성),
// 여기서 그 말을 만나야 다른 화면의 같은 말도 읽힌다.
export const RECORD_LABEL = '기록에 적힌 것'
export const READING_LABEL = '우리가 붙인 해석'

export function noticeFor(card) {
  if (card.grade === 'rumor') return `<div class="staged rumor">${RUMOR_NOTICE}</div>`
  if (card.grade === 'staged') {
    return `<div class="staged">※ 이 대목은 기록에 남아 있지 않습니다. 게임이 지어내 채운 장면입니다. 이런 것을 「재구성」이라고 합니다.</div>`
  }
  if ((card.grade === 'source' || card.grade === 'textbook') && card.rendering === '우리말 옮김') {
    return `<div class="rendered">※ 기록의 내용을 오늘날 말로 옮겼습니다</div>`
  }
  return ''
}

// onClose — 이 화면이 닫힐 때마다 한 번 불린다(어떻게 닫히든). 이 모듈은 소리를
// 모른다: 무슨 소리를 낼지는 부르는 쪽(main.js)이 정한다 — ui/brush.js 의 onStroke 와
// 같은 모양이다. 화면 안 「닫기」 단추가 유일한 길인 기기(태블릿)에서도 이 알림은 온다.
export function createDialog(root, { onClose: onAnyClose, getInquiry=()=>({}), onInquirySave=()=>{}, onRead=()=>{}, onReadTap=()=>{}, onReadMiss=()=>{} } = {}) {
  installHistoricalMedia()
  installInquiryStyle()
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  let veil = null
  // 열려 있는 화면이 넘겨준 onClose — 어떻게 닫히든(단추 클릭이든, E 키로 close() 를
  // 직접 부르든) 정확히 한 번 불린다. 신하와의 대화(showNpc)가 여기 기댄다: 대화를
  // 닫은 뒤에야 그 신하가 건네는 문서를 손에 쥐여 준다(main.js) — E 로 닫아도 그
  // 뒤를 이어야 하므로, 단추 클릭에만 걸려 있던 예전 방식으로는 모자랐다.
  let pendingOnClose = null
  let inquiry = null

  function close(force = false) {
    if (!veil) return
    if(!force && inquiry && !inquiry.ready()) {
      const status = veil.querySelector('.inquiry-status')
      if (status) status.textContent = inquiry.blockLine ?? '근거를 표시하고 해석을 기록한 뒤, 해설과 비교해 주세요.'
      return
    }
    inquiry = null
    veil.remove()
    veil = null
    const cb = pendingOnClose
    pendingOnClose = null
    onAnyClose?.()   // 이 화면이 닫혔다 — 단추로든 E·Q 로든 여기 한 자리를 지난다
    cb?.()
  }

  function open(html, onClose) {
    close(true)
    veil = document.createElement('div')
    veil.className = 'veil'
    veil.innerHTML = html
    pendingOnClose = onClose ?? null
    veil.querySelector('.close').addEventListener('click', () => close())
    root.appendChild(veil)
    bindMedia(veil)
  }

  // 밑줄 긋기를 카드에 건다. 긋기 전에는 닫히지 않는다(close 가 inquiry.ready 를 본다).
  function bindRead(card, spec) {
    let state = initialRead()
    const cardEl = veil.querySelector('.card')
    const record = veil.querySelector('.record')
    const say = veil.querySelector('.read-say')
    const closeBtn = veil.querySelector('.close')
    const parts = [...veil.querySelectorAll('.record .part')]
    closeBtn.disabled = true
    const probe = probeOf(spec)
    const probeEl = veil.querySelector('.probe')
    inquiry = { ready: () => readComplete(spec, state),
      get blockLine() { return readDone(state) ? READ_LINES.probeBlocked : READ_LINES.blocked } }
    // 따져 읽기 — 밑줄을 그은 뒤에 열린다. 답해야 문서를 덮을 수 있다.
    if (probe && probeEl) {
      const psay = probeEl.querySelector('.psay')
      for (const btn of probeEl.querySelectorAll('.popt')) {
        btn.addEventListener('click', () => {
          const r = answerProbe(spec, state, btn.dataset.opt)
          const missed = r.state.probeMisses > state.probeMisses
          state = r.state
          onReadTap(r.ok)
          if (missed && onReadMiss(r.say) === true) return
          psay.textContent = r.say
          if (r.ok) {
            btn.classList.add('picked')
            probeEl.classList.add('done')
            for (const b of probeEl.querySelectorAll('.popt')) { b.disabled = true; b.classList.remove('glow', 'no') }
            closeBtn.disabled = false
            onRead(card.id, readRecord(spec, state))
            closeBtn.focus?.()
            return
          }
          btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no')
          const hint = probeHint(spec, state)
          if (hint) probeEl.querySelector(`.popt[data-opt="${hint}"]`)?.classList.add('glow')
        })
      }
    }
    for (const btn of parts) {
      btn.addEventListener('click', () => {
        if (readDone(state)) return
        const i = Number(btn.dataset.part)
        const r = underline(spec, state, i)
        state = r.state
        onReadTap(r.ok)
        if (!r.ok && onReadMiss(READ_LINES.miss) === true) return
        if (r.ok) {
          btn.classList.add('hit')
          for (const p of parts) p.classList.remove('glow', 'no')
          record.classList.add('read-done')
          cardEl.classList.remove('reading-locked')
          veil.querySelector('.ask')?.remove()
          say.textContent = spec.found
          say.classList.add('found')
          onRead(card.id, readRecord(spec, state))
          if (probe && probeEl) {
            // 밑줄은 그었다 — 이제 따져 읽는다. 문서는 아직 덮이지 않는다.
            probeEl.hidden = false
            probeEl.scrollIntoView?.({ block: 'nearest' })
            probeEl.querySelector('.popt')?.focus?.()
            return
          }
          closeBtn.disabled = false
          closeBtn.focus?.()
          return
        }
        btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no')
        const hint = readHint(spec, state)
        if (hint != null) parts[hint]?.classList.add('glow')
        say.textContent = hint != null ? READ_LINES.hint : READ_LINES.miss
      })
    }
  }

  return {
    // 再시작은 닫기 완료가 아니다. 대기 중인 카드 지급·다음 장면을 실행하지 않는다.
    dispose() { pendingOnClose = null; inquiry = null; veil?.remove(); veil = null; style.remove() },
    isOpen: () => veil !== null,
    close,
    showCard(card, onClose) {
      const notice = noticeFor(card)
      // gloss 는 원문(excerpt) 곁에 붙이는 말풀이다 — meaning(「이 문서가 말하는 것」)과
      // 다르다: gloss 는 낱말 뜻을, meaning 은 그 낱말 없이도 통하는 안전망 문장을 낸다.
      // 하우스 룰(가독성 검수 5장) — "분해 아니면 교체, 중간은 없다."
      const gloss = card.gloss ? `<div class="gloss">${card.gloss}</div>` : ''
      const media = sourceMedia(card.id)
      // 밑줄 긋기 — 이 문서에 물음이 있고 아직 긋지 않았으면, 기록의 구절이 단추가 된다.
      // 이미 그은 문서(사초함에서 다시 여는 것)는 그은 자리를 보여 주기만 한다.
      const readSpec = INQUIRIES[card.id] ? null : readFor(card.id)
      const prior = readSpec ? getInquiry(card.id) : null
      const solvedBefore = !!prior?.compared
      const readParts = readSpec ? partsOf(readSpec) : []
      const priorHit = solvedBefore ? readParts.find(p => p.text.trim() === prior.selected?.[0])?.i ?? readSpec.pick : null
      const excerptHtml = readSpec
        ? readParts.map(p => `<button type="button" class="part${priorHit === p.i ? ' hit' : ''}" data-part="${p.i}">${p.text}</button>${'<br>'.repeat(p.breaks)}`).join('')
        : card.excerpt
      const askHtml = readSpec && !solvedBefore
        ? `<p class="ask"><b>밑줄 긋기</b>${readSpec.q}</p>` : ''
      // 따져 읽기 — 처음에는 숨어 있다가 밑줄을 그으면 열린다. 이미 읽은 문서는 고른 답과 풀이를 보여 준다.
      const probe = readSpec ? probeOf(readSpec) : null
      const probeHtml = !probe ? '' : `<div class="probe${solvedBefore ? ' done' : ''}"${solvedBefore ? '' : ' hidden'}>
          <span class="kind">따져 읽기 · ${PROBE_TYPES[probe.type] ?? ''}</span>
          <p class="q">${probe.ask}</p>
          <div class="opts">${probe.options.map(o => `<button type="button" class="popt${solvedBefore && o.id === probe.answer ? ' picked' : ''}" data-opt="${o.id}"${solvedBefore ? ' disabled' : ''}>${o.text}</button>`).join('')}</div>
          <p class="psay" role="status" aria-live="polite">${solvedBefore ? (probe.ok ?? '') : ''}</p>
        </div>`
      open(`<div class="card${media ? ' has-media' : ''}${INQUIRIES[card.id]?' has-inquiry':''}${readSpec && !solvedBefore ? ' reading-locked' : ''}">
        <div class="source-layout"><div class="source-copy">
        <h3>${card.title}</h3>
        <div class="origin">${card.origin}</div>
        ${askHtml}
        <div class="record${solvedBefore ? ' read-done' : ''}">
          <span class="part-label">${RECORD_LABEL}</span>
          <p class="excerpt">${excerptHtml}</p>
        </div>
        ${readSpec ? `<p class="read-say inquiry-status${solvedBefore ? ' found' : ''}" role="status" aria-live="polite">${solvedBefore ? readSpec.found : ''}</p>` : ''}
        ${gloss}
        <div class="reading">
          <span class="part-label">${READING_LABEL}</span>
          <div class="meaning">${card.meaning}</div>
        </div>
        ${probeHtml}
        ${notice}
        ${inquiryHtml(card.id)}
        </div>${mediaFigure(media)}</div>
        <button class="close">닫기 (E)</button>
      </div>`, onClose)
      inquiry=bindInquiry(veil,card.id,{initial:getInquiry(card.id),onSave:record=>onInquirySave(card.id,record),onReady:ready=>{veil.querySelector('.close').disabled=!ready}})
      if (readSpec && !solvedBefore) bindRead(card, readSpec)
    },
    showCodex(state, onClose) {
      const row = (c) => {
        if (isLost(state, c.id)) {
          return `<div class="row gone">${c.title}<span class="tag">${lossLabel(state, c.id)}</span></div>`
        }
        if (isRead(state, c.id)) return `<div class="row">${c.title}</div>`
        return `<div class="row">${c.title}<span class="tag">아직 안 읽음</span></div>`
      }
      const held = SOURCES.filter(c => state.sources.held.includes(c.id))
      const gone = SOURCES.filter(c => state.sources.lost.includes(c.id))
      // 사료와 같은 목록에 섞지 않는다 — 문서 칸 아래에 따로 선다(showArtifact 머리말).
      const seenNames = seenArtifacts(state).map(id => artifactById(id)?.name ?? id)
      open(`<div class="card codex">
        <h3>사초함</h3>
        <div class="sub">내가 읽은 문서를 모아 두는 곳</div>
        <div class="grp"><b>가지고 있는 문서 ${held.length}</b>${held.map(row).join('') || '<div class="row">아직 없다</div>'}</div>
        <div class="grp"><b>잃어버린 문서 ${gone.length}</b>${gone.map(row).join('') || '<div class="row">아직 없다</div>'}</div>
        <div class="grp"><b>본 물건 ${seenNames.length}</b>${seenNames.map(n => `<div class="row">${n}</div>`).join('') || '<div class="row">아직 없다 — 궁을 걸어 다니며 물건 앞에서 E 를 눌러 보라</div>'}</div>
        ${palaceCollectionHtml(state)}
        <button class="close">닫기 (Q)</button>
      </div>`, onClose)
      const readCards=held.filter(c=>isRead(state,c.id))
      veil.querySelector('[data-palace-collection]')?.addEventListener('click',()=>{
        pendingOnClose=null
        this.showArtifact(PALACE_LIFE_COLLECTION,PALACE_LIFE_COLLECTION.lines,()=>this.showCodex(state,onClose))
      })
      veil.querySelectorAll('.row').forEach(row=>{
        const card=readCards.find(c=>row.textContent===c.title)
        if(!card)return
        row.setAttribute('role','button');row.tabIndex=0;row.style.cursor='pointer'
        const reopen=()=>{pendingOnClose=null;this.showCard(card,()=>this.showCodex(state,onClose))}
        row.addEventListener('click',reopen)
        row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();reopen()}})
      })
    },
    // 궁 안의 물건(data/artifacts.js) — 걸어가 E 를 누르면 뜨는 해설 카드.
    //
    // 사료 카드(showCard)와 **일부러** 다르게 생겼다: 인용 줄이 없고, 등급도 출처도
    // 붙지 않으며, 제목 옆에 「물건」이라 적힌다. 이것은 사료가 아니라 해설이고,
    // 사초함에 쌓이지 않는다(systems/artifacts.js 머리말). 학생이 두 카드를 같은
    // 것으로 보면 「무엇을 근거로 아는가」가 흐려진다.
    //   lines — 이미 막에 따라 걸러진 줄 목록(data/artifacts.js 의 artifactLines)
    showArtifact(artifact, lines = [], onClose) {
      const hanja = artifact.hanja ? `<div class="gloss">${artifact.hanja}</div>` : ''
      open(`<div class="card lore">
        <h3>${artifact.name}<small>${artifact.collection?'발견 모음 · 재구성':artifact.discovery?'궁살림 · 재구성':'물건'}</small></h3>
        ${discoveryDecoration(artifact)}
        ${hanja}
        ${lines.map(l => `<p class="talkline">${l}</p>`).join('')}
        <div class="rendered">※ ${artifact.note}</div>
        <button class="close">닫기 (E)</button>
      </div>`, onClose)
    },
    // 신하와의 대화 — 이름·직함·짧은 대사를 보여준다. cardId 가 있는 신하면
    // 이 화면을 닫는 순간(단추든 E 든) main.js 가 그 문서를 손에 쥐여 준다 —
    // 그 판정은 여기서 하지 않는다(onClose 콜백 하나로 넘긴다).
    showNpc(npc, onClose) {
      const title = npc.title ? `<div class="talktitle">${npc.title}</div>` : ''
      const lines = (npc.lines ?? []).map(l => `<p class="talkline">${l}</p>`).join('')
      open(`<div class="card">
        <h3>${npc.name}</h3>
        ${title}
        ${lines}
        <button class="close">${(npc.cardId || npc.cardIds?.length) ? '받는다 (E)' : '닫기 (E)'}</button>
      </div>`, onClose)
    },
  }
}
