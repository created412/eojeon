import { SOURCES } from '../data/sources.js'
import { isRead, isLost } from '../systems/codex.js'
import { lossLabel } from '../systems/loss-log.js'
import { sourceMedia, mediaFigure, installHistoricalMedia, bindMedia } from './historical-media.js'
import { INQUIRIES } from '../data/inquiries.js'
import { inquiryHtml, bindInquiry, installInquiryStyle } from './source-inquiry.js'
import { seenArtifacts } from '../systems/artifacts.js'
import { artifactById } from '../data/artifacts.js'
import { RUMOR_NOTICE } from './grade-notice.js'
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
   선생님(2026-09-30): 「사료는 원문이고 그에 대한 설명이 밑에 있잖아. 둘이
   구분이 안 간다는 말이었어.」

   이것은 꾸밈 문제가 아니다. 이 게임의 뼈대가 **사료 / 해석 / 재구성**을 나누는
   것인데, 정작 사료 카드에서 그 둘이 한 덩어리로 읽히고 있었다. 학생이
   「기록에 그렇게 적혀 있다」와 「우리가 그렇게 읽는다」를 구별하지 못하면,
   이 카드는 구분을 가르치는 것이 아니라 흐리는 것이 된다.

   그래서 셋을 다르게 한다 — **이름표 · 바탕 · 글꼴**.
     기록  제목용 글꼴, 짙은 먹, 왼쪽에 굵은 줄, 종이 그대로
     해석  본문 글꼴, 옅은 먹, 가로줄 아래 한 칸 들어간 자리
   ⚠ 예전에는 해석이 오히려 **더 컸다**(--read-lead > --read-body). 기록보다
     우리 말이 커 보이면 학생은 우리 말을 기록으로 읽는다. 뒤집어 둔다. */
.card .part-label{display:block;font-size:var(--read-caption,11px);letter-spacing:.18em;
  color:var(--ink-quiet,#6b6558);margin:0 0 6px}
.card .excerpt{border-left:4px solid #8a6a44;padding:4px 0 6px 18px;margin:0 0 6px;
  font-family:var(--face-display,serif);color:var(--ink-strong,#23201a);
  font-size:var(--read-lead,17px);line-height:var(--read-lh-body,1.9);
  white-space:pre-wrap;word-break:keep-all}
.card .gloss{font-size:var(--read-small,13px);color:var(--ink-quiet,#6b6558);margin:0 0 18px;
  padding-left:22px;line-height:var(--read-lh-small,1.6)}
.card .reading{margin:0 0 4px;padding:14px 16px 2px;border-top:1px solid #8a6a4433;
  background:#8a6a440d;border-radius:2px}
.card .meaning{font-size:var(--read-body,15px);line-height:var(--read-lh-body,1.75);
  color:var(--ink-quiet,#4a453a)}
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
export function createDialog(root, { onClose: onAnyClose, getInquiry=()=>({}), onInquirySave=()=>{} } = {}) {
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
      veil.querySelector('.inquiry-status').textContent='근거를 표시하고 해석을 기록한 뒤, 해설과 비교해 주세요.'
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

  return {
    isOpen: () => veil !== null,
    close,
    showCard(card, onClose) {
      const notice = noticeFor(card)
      // gloss 는 원문(excerpt) 곁에 붙이는 말풀이다 — meaning(「이 문서가 말하는 것」)과
      // 다르다: gloss 는 낱말 뜻을, meaning 은 그 낱말 없이도 통하는 안전망 문장을 낸다.
      // 하우스 룰(가독성 검수 5장) — "분해 아니면 교체, 중간은 없다."
      const gloss = card.gloss ? `<div class="gloss">${card.gloss}</div>` : ''
      const media = sourceMedia(card.id)
      open(`<div class="card${media ? ' has-media' : ''}${INQUIRIES[card.id]?' has-inquiry':''}">
        <div class="source-layout"><div class="source-copy">
        <h3>${card.title}</h3>
        <div class="origin">${card.origin}</div>
        <span class="part-label">${RECORD_LABEL}</span>
        <p class="excerpt">${card.excerpt}</p>
        ${gloss}
        <div class="reading">
          <span class="part-label">${READING_LABEL}</span>
          <div class="meaning">${card.meaning}</div>
        </div>
        ${notice}
        ${inquiryHtml(card.id)}
        </div>${mediaFigure(media)}</div>
        <button class="close">닫기 (E)</button>
      </div>`, onClose)
      inquiry=bindInquiry(veil,card.id,{initial:getInquiry(card.id),onSave:record=>onInquirySave(card.id,record),onReady:ready=>{veil.querySelector('.close').disabled=!ready}})
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
        <button class="close">닫기 (Q)</button>
      </div>`, onClose)
      const readCards=held.filter(c=>isRead(state,c.id))
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
        <h3>${artifact.name}<small>물건</small></h3>
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
