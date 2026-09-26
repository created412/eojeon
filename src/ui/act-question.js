import { ACT_QUESTION_ART, ART_NOTE } from './act-question-data.js'
import { installTypeVars } from './type-css.js'

// 막마다 하나씩 놓이는 질문 화면 — 막을 열 때 한 번, 막을 닫을 때 다시 한 번.
//
// 왜 전면인가: 2026-09-26 선생님 「막마다 질문은 **전체화면**으로, 힉스필드를
// 활용해서 **정말 질문을 고민하게 만들어야 해.**」 띠(banner)로 얹으면 학생은
// 그것을 읽지 않는다 — 옆에 지도가 있고 아래에 단추가 있고 위에 남은 시간이 있으면,
// 눈은 언제나 움직이는 쪽으로 간다. 그래서 이 화면은 경쟁자를 다 치운다: 그림 하나,
// 질문 한 줄, 단추 하나. 그 셋 말고는 아무것도 없다.
//
// 왜 두 번인가: 질문은 열 때 던져지고 닫을 때 돌아온다. 돌아올 때 같은 그림을
// 어둡게 깔고 같은 질문을 그대로 다시 적는다 — 그 사이에 학생이 무엇을 보았는지
// 몇 줄(evidence)만 곁들인다. **답을 적지 않는다.** 적어 주면 그 순간 이 화면은
// 질문이 아니라 요약이 되고, 학생은 자기가 생각한 것을 지우고 우리 문장을 옮겨 적는다.
// 점수도 매기지 않는다 — 셈하는 것이 붙으면 학생은 질문이 아니라 셈을 본다.
// (같은 판단이 ui/act-end.js 의 finalLead 에도 있다: 세는 일은 학생에게 남긴다.)
//
// ── 부르는 쪽이 넘기는 것(view) ─────────────────────────────────────────
// 필수
//   question  string   질문 한 줄. 화면에서 가장 큰 글씨다.
// 선택
//   mode      'open'|'close'   기본 'open'. 'close' 면 그림이 어두워지고 evidence 가 나온다.
//   act       number|string    막 번호. 「제3막」으로 적힌다. 없으면 그 줄이 통째로 빠진다.
//   actLabel  string   막 이름. 「친정」
//   year      string   막의 해. 「1873~76」
//   image     string|{src,alt,caption}
//            · 문자열이면 act-question-data.js 의 열쇠다('act1'…'act5').
//            · 통째로 넘겨도 된다 — {src:'data:image/webp;base64,…', alt, caption}
//            · 없거나 열쇠가 비면 그림 없이 뜬다(먹빛 바탕에 빛 한 줄). 화면은 부러지지 않는다.
//   evidence  string[]  mode:'close' 에서만 쓴다. **학생이 이 막에서 실제로 본 것**을
//                       한 줄씩. 답이 아니라 본 것이다 — 「척화비를 세웠다」는 되고,
//                       「그래서 문을 닫았다」는 안 된다. 없거나 [] 면 그 칸이 빠진다.
//   openLabel  string  기본 '생각하며 들어간다'
//   closeLabel string  기본 '다음 막으로'
//   note      string   그림 고지 한 줄. 없으면 그림 자신의 caption, 그것도 없으면 ART_NOTE.
//
// open(view) → Promise<void>
//   단추를 누르면 화면을 걷고 한 번만 resolve 한다(두 번 눌러도 한 번이다).
//   화면을 걷는 일과 resolve 는 이 모듈 안에서 끝난다 — 부르는 쪽은 await 만 하면 된다.
//
// 쓰는 꼴:
//   const actq = createActQuestion(root)
//   await actq.open({ act:1, actLabel:'즉위', year:'1863', image:'act1',
//                     question:'열두 살에 임금이 되면, 누가 나라를 다스리는가?' })
//   …막을 진행…
//   await actq.open({ act:1, mode:'close', image:'act1',
//                     question:'열두 살에 임금이 되면, 누가 나라를 다스리는가?',
//                     evidence:['대왕대비가 수렴청정을 시작했다', '흥선대원군이 정사를 맡았다'] })

const DEFAULT_OPEN_LABEL = '생각하며 들어간다'
const DEFAULT_CLOSE_LABEL = '다음 막으로'

// 닫는 화면의 머리말. 「이 막에서 당신이 본 것」 — 본 것이지 알아낸 것이 아니다.
// 이 한 낱말이 화면의 성격을 정한다.
const SEEN_TITLE = '이 막에서 당신이 본 것'

// 질문이 돌아왔을 때 학생에게 건네는 한 줄. 여기서도 답을 주지 않는다 —
// 「생각이 바뀌었는가」만 묻는다. 바뀌지 않았어도 그것대로 대답이다.
const RETURN_LEAD = '같은 질문이 돌아왔다. 처음 읽었을 때와 생각이 같은가?'

const CSS = `
/* 이 화면 안에서는 폭에 테두리와 안여백이 포함된다. 이것이 없으면 width:100% 에
   padding 이 더해져, 390px 손전화에서 글과 칸이 화면 밖으로 20px 씩 밀려나간다 —
   두 번 다 그렇게 부러졌고 두 번 다 찍어 보고서야 보였다. */
.actq,.actq *{box-sizing:border-box}

.actq{position:fixed;inset:0;z-index:60;background:#0b0c0e;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:safe center;
  font-family:var(--face-body,system-ui,sans-serif)}

/* 그림은 판 전체를 채운다. object-fit:cover 라 390px 세로에서도 여백이 생기지 않는다.
   그림이 없으면 이 판은 아예 만들지 않고, 아래 .actq-dark 의 빛 한 줄만 남는다. */
.actq-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  transform:scale(1.06);animation:actq-drift 26s ease-out forwards}
@keyframes actq-drift{from{transform:scale(1.06)}to{transform:scale(1.14)}}

/* 그림이 없을 때의 바탕. 가짜 그림을 지어내지 않는다 — 먹빛 위에 빛 두 줄만 긋는다.
   그림 한 장이 아직 없어도 막은 열려야 한다(어느 막의 그림이 비었는지는
   ui/act-question-data.js 의 머리에 적힌다). */
.actq-dark{position:absolute;inset:0;background:#0b0c0e;
  background-image:
    linear-gradient(103deg,#0000 36%,#9d7c4517 47%,#0000 58%),
    radial-gradient(125% 85% at 58% 22%,#2e2619 0%,#17171d 52%,#0b0c0e 100%)}

/* 글이 그림 위에 얹힌다. 이 막(scrim)이 없으면 밝은 하늘 위의 흰 글씨가 사라진다 —
   교실 프로젝터는 명암이 실제보다 더 뭉개져서, 화면에서 읽히는 정도로는 모자란다.
   ⚠ 그러나 처음에 이 막을 너무 짙게(전면 70~93%) 깔았더니 그림이 통째로 사라졌다 —
   화면을 찍어 보고서야 알았다. 「그림이 학생을 멈춰 세운다」가 이 화면의 절반인데
   그 절반을 스스로 지운 꼴이었다. 그래서 글이 앉는 띠만 옅게 덮고(40%대), 아래로
   내려가며 짙어지게 한다. 읽히는 힘은 여기가 아니라 글자 자신의 그림자가 낸다. */
.actq-scrim{position:absolute;inset:0;
  background:linear-gradient(180deg,#050608a6 0%,#05060866 26%,#05060873 50%,#050608b8 80%,#050608e6 100%)}
/* 그림이 없는 막에서는 막까지 짙으면 먹판 하나가 된다 — 아래쪽만 남긴다. */
.actq-dark+.actq-scrim{background:linear-gradient(180deg,#05060800 0%,#05060859 68%,#050608bf 100%)}

.actq-body{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;
  gap:clamp(18px,3vh,32px);padding:clamp(28px,5vw,64px) clamp(20px,6vw,72px);
  width:100%;max-width:1040px;text-align:center;overflow:auto;max-height:100%}

/* 「제1막 · 즉위 1863」 — 질문보다 먼저 읽히면 안 된다. 작고 조용하게 둔다.
   자간은 .16em 까지만 준다 — 처음 .34em 을 주었더니 「제 1 막」이 세 낱말로 흩어져
   「1863」까지 벌어졌다. 자간이 뜻인 자리는 짧은 표제뿐이다(ui/type-css.js §2). */
.actq-act{margin:0;font-size:var(--read-label,15px);color:#cbbb93;letter-spacing:.16em;
  font-family:var(--face-display,serif);font-weight:400;text-shadow:0 2px 12px #000}
.actq-act span{letter-spacing:.04em;color:var(--paper-quiet,#bdb6a4)}

/* 질문 — 이 화면에서 가장 큰 글씨다. --read-title 을 바닥으로 두고 화면이 넓어지면
   그만큼 커진다(1920px 에서 56px). 뒷줄에서도 읽히라고 그림자를 두 겹 준다. */
.actq-q{margin:0;font-family:var(--face-display,serif);color:#fdf6e6;font-weight:400;
  font-size:clamp(var(--read-title,30px),4.4vw,56px);line-height:1.5;letter-spacing:.015em;
  word-break:keep-all;text-wrap:balance;max-width:22em;
  text-shadow:0 2px 4px #000,0 4px 16px #000,0 0 54px #000c}

.actq-lead{margin:0;font-size:var(--read-body,20px);color:var(--paper-quiet,#bdb6a4);
  line-height:var(--read-lh-body,1.85);word-break:keep-all;text-wrap:balance;
  max-width:min(100%,var(--read-measure,34em));text-shadow:0 2px 8px #000}

/* 본 것 몇 줄. 질문 아래에 놓이되 질문을 넘어서지 않는다 — 글씨가 한 단계 작고,
   왼쪽 맞춤이다(ui/type-css.js §1: 가운데 맞춤은 문단을 외톨이 꼬리로 끊는다).
   ⚠ box-sizing 이 없으면 390px 에서 테두리가 화면 밖으로 17px 씩 밀려나간다 —
   width:100% 에 padding 이 더해지기 때문이다. 찍어 보고서야 보였다. */
.actq-seen{box-sizing:border-box;width:100%;max-width:min(100%,640px);text-align:left;
  background:#0a0b0dad;border:1px solid #ffffff1f;border-radius:3px;
  padding:clamp(14px,2.4vh,20px) clamp(16px,3vw,24px);backdrop-filter:blur(2px)}
.actq-seen-title{margin:0 0 10px;font-size:var(--read-label,15px);color:#cbbb93;letter-spacing:.06em}
.actq-seen-list{margin:0;padding:0;list-style:none}
.actq-seen-list li{font-size:var(--read-body,20px);color:var(--paper-strong,#f2ecdd);
  line-height:var(--read-lh-body,1.85);word-break:keep-all;padding:6px 0 6px 20px;position:relative}
.actq-seen-list li::before{content:'';position:absolute;left:2px;top:.95em;
  width:6px;height:6px;border-radius:50%;background:#c08b3e}

.actq-go{padding:15px 38px;background:#241d15e0;border:1px solid #8a6a38;
  color:#f0c469;border-radius:3px;font-family:inherit;font-size:var(--read-lead,22px);
  letter-spacing:.06em;cursor:pointer;transition:background .18s,border-color .18s}
.actq-go:hover{background:#3a2d1fe0;border-color:#c89a52}
.actq-go:focus-visible{outline:2px solid #f0c469;outline-offset:3px}

/* 재구성 고지. 작은 글씨지만 바닥이 있다(ui/type-css.js §4) — 이 화면의 그림은
   사진이 아니라 그린 것이고, 그 사실이 읽히지 않으면 이 화면은 거짓을 말한 것이 된다. */
.actq-note{margin:0;font-size:var(--read-small,16px);color:#a79f8e;
  line-height:var(--read-lh-small,1.72);word-break:keep-all;text-wrap:balance;
  max-width:min(100%,var(--read-measure,34em));text-shadow:0 1px 6px #000}

/* 닫는 화면 — 같은 그림을 어둡게 깐다. 같은 자리로 돌아왔다는 것이 눈에 먼저 와야 한다.
   ⚠ 어둡게는 하되 지우지는 않는다. brightness(.4) 로 눌렀더니 5막의 새벽 그림처럼
   본래 어두운 장면은 통째로 먹판이 되어, 「같은 그림이 돌아왔다」가 보이지 않았다. */
.actq-close .actq-art{filter:brightness(.52) saturate(.8);animation:none;transform:scale(1.08)}
.actq-close .actq-scrim{background:linear-gradient(180deg,#04050799 0%,#040507ad 42%,#040507d9 100%)}
.actq-close .actq-body{justify-content:flex-start}

@media(max-width:760px){
  .actq-body{gap:16px;padding:26px 20px 34px}
  .actq-q{font-size:clamp(var(--read-title,24px),6.6vw,34px);line-height:1.55}
  .actq-go{width:100%;max-width:340px;padding:14px 20px}
  .actq-act{letter-spacing:.24em}
}

/* 움직임을 줄여 달라고 한 학생에게는 그림이 떠돌지 않는다. 화면은 그대로 뜬다. */
@media(prefers-reduced-motion:reduce){
  .actq-art{animation:none;transform:none}
  .actq-go{transition:none}
}
`

let styled = false
function ensureStyle() {
  if (styled) return
  installTypeVars()
  const style = document.createElement('style')
  style.id = 'eojeon-actq-style'
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

// image 는 열쇠로도, 통째로도 받는다. 열쇠가 데이터에 없으면 null 을 돌려주고
// 화면은 그림 없이 뜬다 — 그림 하나가 빠졌다고 막이 안 열려서는 안 된다.
export function resolveArt(image, table = ACT_QUESTION_ART) {
  if (!image) return null
  if (typeof image === 'string') return table?.[image] ?? null
  return image.src ? image : null
}

// 「제3막 · 친정 1873~76」. 빠진 조각은 조용히 건너뛴다.
export function actLine(view) {
  const head = view.act == null ? '' : `제${view.act}막`
  const tail = [view.actLabel, view.year].filter(Boolean).join(' ')
  if (!head) return tail
  return tail ? `${head} <span>· ${tail}</span>` : head
}

export function createActQuestion(root) {
  ensureStyle()

  return {
    open(view = {}) {
      return new Promise(resolve => {
        const close = view.mode === 'close'
        const art = resolveArt(view.image)

        const el = document.createElement('div')
        el.className = close ? 'actq actq-close' : 'actq'
        el.setAttribute('role', 'dialog')
        el.setAttribute('aria-modal', 'true')
        el.setAttribute('aria-label', view.question ?? '막의 질문')

        const line = actLine(view)
        el.innerHTML = `
          ${art ? `<img class="actq-art" src="${art.src}" alt="${art.alt ?? ''}">` : '<div class="actq-dark"></div>'}
          <div class="actq-scrim"></div>
          <div class="actq-body">
            ${line ? `<h2 class="actq-act">${line}</h2>` : ''}
            <p class="actq-q">${view.question ?? ''}</p>
            ${close ? `<p class="actq-lead">${RETURN_LEAD}</p>` : ''}
          </div>`

        const body = el.querySelector('.actq-body')

        // 본 것 몇 줄 — 닫는 화면에서만, 그리고 실제로 넘어온 것이 있을 때만.
        // 글은 textContent 로만 넣는다(ui/act-end.js 의 reason 과 같은 규칙).
        const evidence = close ? (view.evidence ?? []).filter(Boolean) : []
        if (evidence.length) {
          const box = document.createElement('div')
          box.className = 'actq-seen'
          const title = document.createElement('div')
          title.className = 'actq-seen-title'
          title.textContent = SEEN_TITLE
          const list = document.createElement('ul')
          list.className = 'actq-seen-list'
          for (const seen of evidence) {
            const li = document.createElement('li')
            li.textContent = seen
            list.appendChild(li)
          }
          box.append(title, list)
          body.appendChild(box)
        }

        const go = document.createElement('button')
        go.className = 'actq-go'
        go.textContent = close
          ? (view.closeLabel ?? DEFAULT_CLOSE_LABEL)
          : (view.openLabel ?? DEFAULT_OPEN_LABEL)

        // 두 번 눌러도 한 번이다. 학생이 조급하게 두 번 누르면 막이 둘 지나간다 —
        // 실제로 다른 화면에서 한 번 났던 일이라 여기서는 처음부터 막는다.
        let done = false
        go.addEventListener('click', () => {
          if (done) return
          done = true
          el.remove()
          resolve()
        })
        body.appendChild(go)

        // 그림이 있을 때만 고지를 낸다 — 없는 그림에 대한 고지는 거짓말이다.
        if (art) {
          const note = document.createElement('p')
          note.className = 'actq-note'
          note.textContent = view.note ?? art.caption ?? ART_NOTE
          body.appendChild(note)
        }

        root.appendChild(el)
        go.focus?.()
      })
    },
  }
}
