// 여정 판의 선택 목록. 세계의 시간과 이동은 main이 멈추며, 여기서는 클릭 의도만 전달한다.
export function createActivityBoard(root, { onChoose, onLeave, onClose = () => {} }) {
  const style = document.createElement('style')
  style.textContent = `.activity-board{position:fixed;inset:0;z-index:90;background:#101c24ee;color:#f1e5cd;overflow:auto;padding:20px;box-sizing:border-box;font:16px/1.6 system-ui,'Malgun Gothic',sans-serif;touch-action:pan-y}.activity-board[hidden]{display:none}.activity-board .activity-body{max-width:660px;margin:auto}.activity-board h2{margin:0 0 8px}.activity-board p{font-size:14px}.activity-board button{display:block;box-sizing:border-box;width:100%;min-height:48px;text-align:left;margin:10px 0;padding:12px 16px;border:1px solid #aa8b59;border-radius:5px;background:#213341;color:#fff0d5;font:inherit;touch-action:manipulation;cursor:pointer}.activity-board button:disabled{opacity:.6;cursor:default}.activity-board small{display:block;color:#d4c4a8}.activity-board .activity-leave{background:#4a3521}.activity-board .activity-close{text-align:center}`
  document.head.appendChild(style)
  const el = document.createElement('section')
  el.className = 'activity-board'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-label', '지금 고를 일')
  el.hidden = true
  root.appendChild(el)
  function close() { el.hidden = true; onClose() }
  return {
    isOpen: () => !el.hidden,
    close,
    show({ title, dayLeft, free, options }) {
      el.replaceChildren()
      const body = document.createElement('div'); body.className = 'activity-body'
      const heading = document.createElement('h2'); heading.textContent = '지금 고를 일'
      const note = document.createElement('p')
      note.textContent = `${title} · ${free ? '자유롭게 둘러보는 시간' : `남은 해 ${dayLeft}칸`}. 방문 순서를 고르세요. 하지 않은 일도 기록에 남습니다. 사건의 연도와 결과는 바뀌지 않습니다.`
      body.append(heading, note)
      for (const option of options) {
        const b = document.createElement('button'); b.type = 'button'; b.dataset.activity = option.id
        b.disabled = option.disabled
        b.append(document.createTextNode(option.label))
        const detail = document.createElement('small')
        detail.textContent = `${option.place} · ${option.cost ? `해 ${option.cost}칸` : '해 칸을 쓰지 않음'} · ${option.done ? '이미 한 일' : option.blocked ?? (option.disabled ? '남은 해가 모자람' : '눌러서 걸어가기 · 도착하면 한 번 더 눌러 시작')}`
        b.appendChild(detail)
        b.addEventListener('click', () => { close(); onChoose(option.id) })
        body.appendChild(b)
      }
      const leave = document.createElement('button'); leave.type = 'button'; leave.className = 'activity-leave'
      leave.textContent = '이만 다음 사건으로 — 남은 일은 하지 않은 것으로 기록'
      leave.addEventListener('click', () => { close(); onLeave() })
      const back = document.createElement('button'); back.type = 'button'; back.className = 'activity-close'
      back.textContent = '닫고 자유롭게 걷기'; back.addEventListener('click', close)
      body.append(leave, back); el.appendChild(body); el.hidden = false
      back.focus()
    },
    dispose() { el.remove(); style.remove() },
  }
}
