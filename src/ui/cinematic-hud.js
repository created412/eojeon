import { riceLabel, RICE_NOTE } from '../systems/prices.js'
import { royalIcon } from './royal-icons.js'
import { installRoyalInterface } from './royal-interface.js'
import { isCoarse } from './controls-hint.js'

// ⚠ 2026-10-06 — 「지금의 여정」 판과 촉박의 붉은 판은 **누를 수 없다.** 예전에는 누르면
//   목적지까지 걸어가(달아나) 주었다. 선생님: 「일정은 할 일을 보여 주는 거지 … 자동으로
//   이동시키는 건 막아 버려. 모든 곳에서.」 판은 무엇을 해야 하는지만 말하고, 가는 것은
//   학생이 한다.
export function createCinematicHud(root, { onCodex = () => {}, onRotate = () => {}, onResetView = () => {} } = {}) {
  installRoyalInterface()
  const el = document.createElement('div')
  el.className = 'cinema-hud'
  el.hidden = true
  el.innerHTML = `<div class="cinema-top"><div class="cinema-brand"><span class="hud-seal">御前</span><div><small class="cinema-date"></small><div class="cinema-location"></div></div></div><div class="cinema-chapter"><span class="chapter-dots" aria-hidden="true"></span><span class="chapter-label"></span></div><button class="cinema-codex">${royalIcon('book')}<span>사초함<small class="cinema-collection"></small></span><kbd>Q</kbd></button></div><div class="cinema-objective"><div class="objective-title">${royalIcon('compass')}<small>오늘 할 일</small><b class="task-count"></b></div><ol class="cinema-tasks"></ol><div class="cinema-task"></div><div class="cinema-resource"><span class="budget-pips" aria-hidden="true"></span><span class="cinema-budget"></span></div></div><div class="cinema-danger" hidden><div><strong></strong><span></span></div><progress max="1" value="1"></progress><small>시간과 이동 경로는 학습을 위한 재구성입니다.</small></div><div class="cinema-keyboard"><span><kbd>W A S D</kbd> 이동</span><span><kbd>Shift</kbd> 달리기</span><span>우클릭 드래그 · 둘러보기</span></div>`
  root.appendChild(el)
  const viewControls=document.createElement('div')
  viewControls.className='cinema-view-controls'
  viewControls.setAttribute('role','group');viewControls.setAttribute('aria-label','카메라 시점')
  for(const [label,mark,callback] of [
    ['왼쪽으로 둘러보기','↶',()=>onRotate(-1)],
    ['시점 초기화',royalIcon('compass'),onResetView],
    ['오른쪽으로 둘러보기','↷',()=>onRotate(1)],
  ]) {
    const button=document.createElement('button');button.setAttribute('aria-label',label);button.title=label;button.innerHTML=mark
    button.addEventListener('click',callback);viewControls.appendChild(button)
  }
  el.appendChild(viewControls)
  if (!document.getElementById('cinema-hud-style')) {
    const style = document.createElement('style'); style.id = 'cinema-hud-style'
    style.textContent = `.cinema-hud{position:fixed;inset:0;pointer-events:none;z-index:20;color:#eee8d8;text-shadow:0 2px 4px #0009}.cinema-top{display:flex;justify-content:space-between;align-items:flex-start;padding:26px 32px;background:linear-gradient(#09131dcc,transparent)}.cinema-date{font-size:12px;color:#ead3aa;letter-spacing:1px}.cinema-location{font:24px/1.8 Batang,serif;letter-spacing:3px}.cinema-codex{pointer-events:auto;border:1px solid #b29a6866;background:#102330cf;color:#f6e5c2;padding:12px 18px;font-size:14px}.cinema-codex kbd{margin-left:14px;border:1px solid #9b8d6c;padding:2px 5px}.cinema-objective{position:absolute;left:32px;top:120px;max-width:320px;padding:14px 18px;border-left:2px solid #cfac66;background:linear-gradient(90deg,#091b29dd,#091b2966);line-height:1.7}.cinema-objective small{color:#c6b18b;font-size:11px}.cinema-task{font-size:15px;margin:4px 0}.cinema-objective{pointer-events:auto;cursor:pointer;touch-action:manipulation}.cinema-go{font-size:12px;color:#e0a23a;letter-spacing:1px}.cinema-budget{color:#d8cdb4;font-size:13px;line-height:1.7;letter-spacing:0}.cinema-danger{pointer-events:auto;cursor:pointer;touch-action:manipulation;position:absolute;bottom:32px;left:50%;transform:translateX(-50%);width:min(530px,70vw);background:#2a1419ed;padding:16px 22px;border-top:2px solid #db8f63}.cinema-danger[hidden],.cinema-objective[hidden]{display:none}.cinema-danger>div{display:flex;justify-content:space-between;gap:20px}.cinema-danger span{font-variant-numeric:tabular-nums;color:#ffe0a3}.cinema-danger progress{width:100%;height:5px;margin-top:12px;accent-color:#d68854}.cinema-danger small{display:block;font-size:11px;color:#d1bdb0;margin-top:7px}.cinema-hud[hidden]{display:none}@media(max-width:760px){.cinema-top{padding:18px}.cinema-location{font-size:19px}.cinema-objective{left:18px;top:100px;max-width:230px;padding:10px 12px}.cinema-task{font-size:13px}.cinema-danger{bottom:78px;width:85vw;box-sizing:border-box}.cinema-codex{padding:10px}.cinema-codex kbd{margin-left:5px}}`
    document.head.appendChild(style)
  }
  const find = c => el.querySelector(c)
  find('.cinema-codex').addEventListener('click', onCodex)
  // 할 일 판의 꼴 — 한 줄 한 가지. 한 일은 금빛 표와 함께 흐려지고, 남은 일은 또렷하다.
  // 글씨는 15px 이다(예전 14px 한 줄은 프로젝터 뒷줄에서 읽히지 않았다).
  const taskStyle = document.createElement('style')
  taskStyle.textContent = `
  .eojeon .cinema-objective{pointer-events:none;cursor:default;width:340px;max-width:340px;padding:14px 16px 12px;
    background:#0f2f30f5;border:1px solid #e2c79366;border-left:5px solid #e0b25e}
  .eojeon .cinema-objective .objective-title small{font-size:13px;letter-spacing:.08em;color:#f0d9a6;font-weight:600}
  .cinema-objective .task-count{margin-left:auto;font-size:13px;font-weight:600;color:#f0d9a6;font-variant-numeric:tabular-nums}
  .cinema-tasks{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-direction:column;gap:7px}
  .cinema-tasks:empty{display:none}
  .cinema-tasks li{display:grid;grid-template-columns:22px 1fr;gap:8px;align-items:start;font-size:15px;line-height:1.5;
    color:#fbf6e6;word-break:keep-all}
  .cinema-tasks li i{width:20px;height:20px;margin-top:1px;border:2px solid #e0b25e;border-radius:4px;display:grid;place-items:center;
    font-style:normal;font-size:14px;line-height:1;color:#0f2f30}
  .cinema-tasks li b{display:block;font-weight:600;color:#f0d9a6;font-size:12.5px;letter-spacing:.02em}
  .cinema-tasks li.done{color:#9fb5ab}
  .cinema-tasks li.done i{background:#e0b25e}
  .cinema-tasks li.done b{color:#9fb5ab}
  .cinema-tasks li.done span{text-decoration:line-through;text-decoration-color:#9fb5ab88}
  .cinema-tasks li.blocked{color:#c9a59a}
  .cinema-tasks li.blocked i{border-style:dashed;border-color:#c9a59a}
  .eojeon .cinema-objective .cinema-task{margin:10px 0 9px;font-size:15px;font-weight:600;color:#ffe9b8}
  .eojeon .cinema-objective .cinema-task:empty{display:none}
  .eojeon .cinema-objective .cinema-task.exit{padding:8px 10px;border:1px solid #e0b25e;border-radius:4px;background:#e0b25e22}
  .eojeon .cinema-danger{pointer-events:none;cursor:default}
  @media(max-width:760px){
    .eojeon .cinema-objective{width:min(250px,62vw);max-width:min(250px,62vw);padding:10px 11px}
    .cinema-tasks{gap:5px;margin-top:7px}
    .cinema-tasks li{font-size:13px;grid-template-columns:18px 1fr;gap:6px}
    .cinema-tasks li i{width:16px;height:16px;font-size:11px}
    .cinema-tasks li b{font-size:11px}
    .eojeon .cinema-objective .cinema-task{font-size:13px;margin:7px 0 6px}
  }
  @media(max-height:480px){
    .cinema-tasks li.done{display:none}
    .cinema-tasks li b{display:inline;margin-right:4px}
  }
  /* 손가락 기기(2026-10-09 선생님, 휴대전화 가로·세로 화면): 「엄청나게 많은 선택지와 창들로 게임 진행이 안됨. 지금 할 일과
     오늘 할 일이 겹쳐서 진행이 어려움. 오늘 할 일만 남겨두고 그것도 모바일이나 패드에서는 하나씩 달성할때마다 다음것이 뜨도록」.
     · 할 일은 **지금 할 하나만**(one-task — update() 가 목록을 하나로 줄인다), 세는 수는 그대로 「1 / 3」.
     · 위쪽 「사초함」 단추는 뺀다 — 오른쪽 아래 「Q 사초」 손가락 단추가 같은 일을 한다(멈춤 단추와 겹쳐 있었다).
     · 쌀값·아버지 줄도 뺀다. 「지금 할 일」 띠는 guide-strip.js 가 낮 동안(html.hud-day) 숨긴다. */
  @media(pointer:coarse){
    .eojeon .cinema-codex{display:none}
    .cinema-hud.one-task .cinema-resource{display:none}
    .cinema-hud.one-task .cinema-tasks li b{display:inline;margin-right:5px}
  }
  /* 가로로 눕힌 휴대전화(높이 480 이하): E·Q 손가락 단추(main.js attachControls, bottom:210px)가 위쪽 「멈춤」·시점
     단추와 겹쳤다. 아래로 내려 한 줄로 놓고, 접힌 안내도는 그 왼쪽에 둔다. */
  @media(pointer:coarse) and (max-height:480px){
    .eojeon .game-controls{right:12px!important;bottom:12px!important;flex-direction:row!important}
    .eojeon .game-map{right:12px!important;bottom:70px!important;width:150px!important}
  }`
  document.head.appendChild(taskStyle)
  let last = ''
  return {
    update(view) {
      el.hidden = view.hidden === true
      viewControls.hidden = view.phase !== 'day' && view.phase !== 'rush'
      const key = JSON.stringify(view)
      if (key === last) return
      last = key
      find('.cinema-date').textContent = view.dateLabel ?? ''
      find('.cinema-location').textContent = [view.palaceName, view.roomName].filter(Boolean).join(' · ')
      find('.chapter-label').textContent = `${(view.actIndex ?? 0)+1}막 · ${view.actTitle ?? '즉위'}`
      find('.chapter-dots').innerHTML = Array.from({length:5},(_,i)=>`<i class="${i===(view.actIndex??0)?'active':i<(view.actIndex??0)?'complete':''}"></i>`).join('')
      find('.cinema-collection').textContent = `읽은 사료 ${view.readCount ?? 0}장`
      // 할 일 목록 — 낮에만. 다 했으면 「어디로 가서 E」 한 줄이 테를 두르고 선다.
      const tasks = view.phase === 'day' ? (view.tasks ?? []) : []
      const list = find('.cinema-tasks')
      list.textContent = ''
      // 손가락 기기에서는 하나씩 — 아직 안 한 것 가운데 첫째(막힌 것은 뒤로). 하나를 마치면 다음 것이 그 자리에 선다.
      const oneTask = isCoarse()
      el.classList.toggle('one-task', oneTask)
      const shown = oneTask ? [tasks.find(t => !t.done && !t.blocked) ?? tasks.find(t => !t.done)].filter(Boolean) : tasks
      for (const t of shown) {
        const li = document.createElement('li')
        li.className = t.done ? 'done' : t.blocked ? 'blocked' : ''
        const mark = document.createElement('i'); mark.textContent = t.done ? '✓' : ''
        const body = document.createElement('div')
        const where = document.createElement('b'); where.textContent = t.where
        const what = document.createElement('span'); what.textContent = t.blocked ? `${t.label} — ${t.blocked}` : t.label
        body.append(where, what)
        li.append(mark, body)
        list.appendChild(li)
      }
      const open = tasks.filter(t => !t.done && !t.blocked).length
      find('.task-count').textContent = tasks.length ? `${tasks.filter(t => t.done).length} / ${tasks.length}` : ''
      const line = find('.cinema-task')
      // 목록이 있으면 한 줄은 「다 했다 — 어디로」일 때만 쓴다. 목록이 없는 낮(할 일이 없는 날)은 예전처럼 한 줄.
      line.textContent = tasks.length && open > 0 ? '' : (view.objective ?? '궁궐을 둘러보고 신하의 보고를 들으십시오.')
      line.classList.toggle('exit', tasks.length > 0 && open === 0)
      find('.cinema-objective').hidden = view.phase !== 'day'
      // 「지금 할 일」 띠(guide-strip)가 낮에 손가락 기기에서 비키도록 알린다.
      document.documentElement.classList.toggle('hud-day', !el.hidden && view.phase === 'day')
      find('.cinema-budget').textContent = [
        view.riceIndex == null ? '' : riceLabel(view.riceIndex),
        view.fatherLine ?? '',
      ].filter(Boolean).join('  ·  ')
      find('.budget-pips').innerHTML = ''
      find('.cinema-budget').title = view.riceIndex == null ? '' : `${riceLabel(view.riceIndex)} — ${RICE_NOTE}`
    },
    showRush({ remainMs, totalMs, label }) {
      find('.cinema-danger').hidden = false
      find('.cinema-danger strong').textContent = label
      find('.cinema-danger span').textContent = `${Math.max(0,Math.ceil(remainMs / 1000))}초`
      find('.cinema-danger progress').value = totalMs > 0 ? Math.max(0,Math.min(1,remainMs / totalMs)) : 0
    },
    hideRush() { find('.cinema-danger').hidden = true },
    dispose() { document.documentElement.classList.remove('hud-day'); el.remove() },
  }
}
