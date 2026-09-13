// ── 「내 기록 복사」의 복사 경로 ──────────────────────────────────────────
//
// 이 게임에서 학생의 산출물이 밖으로 나가는 길은 여기 하나다. 한 시간 동안 쓴 글이
// 여기를 지나 활동지로 간다. 그래서 **여기서 조용히 실패하면 회수할 다른 경로가 없다.**
//
// 예전에는 이랬다:
//   try { document.execCommand('copy') } catch { /* 조용히 넘어간다 */ }
//   onDone()          ← 무조건 불린다 → 「복사했습니다」가 무조건 뜬다
// execCommand('copy') 는 막혔을 때 **던지지 않고 false 를 돌려주는** 쪽이 흔하다.
// 그래서 catch 는 안 타고 성공 배너가 그대로 떴다 — 이 게임에서 유일하게 거짓말을
// 할 수 있는 문장이었다. 학생은 붙여넣기를 누르기 전까지 실패를 알 길이 없고,
// 그때는 이미 화면이 넘어가 있다.
//
// 이제 성패를 정직하게 가른다. 그리고 실패하면 **글을 화면에 띄워** 학생이 직접
// 긁어 가게 한다 — 클립보드가 막힌 학교 환경(파일로 연 file:// · 권한이 꺼진 크롬)
// 에서도 산출물이 사라지지 않는다.

// 실행 환경을 인자로 받는다 — Node 에서 두 갈래를 다 시험할 수 있어야 하기 때문이다.
function envOf(env = {}) {
  return {
    nav: env.navigator ?? (typeof navigator !== 'undefined' ? navigator : undefined),
    doc: env.document ?? (typeof document !== 'undefined' ? document : undefined),
  }
}

// 옛 길 — 화면 밖 textarea 를 만들어 execCommand 로 긁는다.
// ⚠ 학생이 쓴 글은 value 로만 넣는다. innerHTML 에 절대 섞지 않는다.
function execCommandCopy(text, doc) {
  if (!doc?.createElement || !doc.execCommand) return false
  const ta = doc.createElement('textarea')
  ta.value = text
  ta.style.cssText = 'position:fixed;left:-9999px;top:0'
  doc.body.appendChild(ta)
  ta.focus?.()
  ta.select?.()
  let ok = false
  // === true 로 본다. execCommand 는 undefined 를 돌려주기도 하는데, 그것은
  // 「되었다」가 아니다 — 모르는 것을 성공으로 세면 예전 결함이 그대로 돌아온다.
  try { ok = doc.execCommand('copy') === true } catch { ok = false }
  ta.remove()
  return ok
}

// 클립보드에 실제로 들어갔는가를 돌려준다. navigator.clipboard 를 먼저 쓴다 —
// 학교 크롬에서 execCommand 가 막히는 일이 있고, 그쪽은 실패를 reject 로 알려 준다.
export async function copyText(text, env = {}) {
  const { nav, doc } = envOf(env)
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text)
      return true
    } catch { /* 막혔다 — 아래 옛 길을 한 번 더 시도한다 */ }
  }
  return execCommandCopy(text, doc)
}

export const COPY_OK = '복사했습니다'
// 실패를 실패라고 말한다. 그리고 곧바로 무엇을 해야 하는지 말한다 —
// 「안 됐다」만 말하고 끝내면 학생은 그 자리에서 기록을 잃는다.
export const COPY_FAILED = '복사가 되지 않았습니다. 아래 글을 직접 복사하세요'

const PANEL =
  'position:fixed;inset:0;z-index:75;background:#0f1113ee;display:flex;flex-direction:column;'
  + 'align-items:center;justify-content:center;gap:12px;padding:22px'
const TITLE = 'font-size:15px;color:#e0a23a;letter-spacing:5px'
const GUIDE = 'font-size:14px;color:#e8e2d4;line-height:1.8;max-width:620px;text-align:center'
const BOX =
  'width:min(680px,92vw);height:46vh;background:#15181b;color:#e8e2d4;border:1px solid #3a4248;'
  + 'border-radius:3px;padding:12px;font-size:14px;line-height:1.7;resize:none'
const CLOSE =
  'padding:12px 30px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;'
  + 'border-radius:3px;font-size:15px;cursor:pointer'

// 실패했을 때의 회수로 — 글을 화면 안에 띄워 학생이 직접 긁어 가게 한다.
// <style> 태그를 만들지 않는다(banner.js 와 같은 이유) — 떴다 사라지는 화면이라
// head 에 스타일을 쌓아 두면 그것이 그대로 누수가 된다.
export function openManualCopy(root, text, env = {}) {
  const { doc } = envOf(env)
  if (!doc?.createElement) return null
  const panel = doc.createElement('div')
  panel.style.cssText = PANEL

  const title = doc.createElement('div')
  title.style.cssText = TITLE
  title.textContent = '내 기록'

  const guide = doc.createElement('div')
  guide.style.cssText = GUIDE
  guide.textContent = '클립보드에 넣지 못했습니다. 아래 글상자를 눌러 전체를 고른 뒤, 복사해서 활동지에 붙여넣으세요.'

  const box = doc.createElement('textarea')
  box.style.cssText = BOX
  box.value = text          // ⚠ 학생이 쓴 글 — value 로만 들어간다
  box.readOnly = true
  box.addEventListener?.('focus', () => box.select?.())
  box.addEventListener?.('click', () => box.select?.())

  const close = doc.createElement('button')
  close.style.cssText = CLOSE
  close.textContent = '닫기'

  const dispose = () => panel.remove()
  close.addEventListener?.('click', dispose)

  panel.append(title, guide, box, close)
  root.appendChild(panel)
  box.focus?.()
  box.select?.()
  return { el: panel, dispose }
}
