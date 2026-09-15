import { riceLabel, RICE_NOTE } from '../systems/prices.js'
import { royalIcon } from './royal-icons.js'
import { installRoyalInterface } from './royal-interface.js'

export function createCinematicHud(root, { onCodex = () => {}, onRotate = () => {}, onResetView = () => {}, onObjective = () => {}, onEscape = () => {} } = {}) {
  installRoyalInterface()
  const el = document.createElement('div')
  el.className = 'cinema-hud'
  el.hidden = true
  el.innerHTML = `<div class="cinema-top"><div class="cinema-brand"><span class="hud-seal">御前</span><div><small class="cinema-date"></small><div class="cinema-location"></div></div></div><div class="cinema-chapter"><span class="chapter-dots" aria-hidden="true"></span><span class="chapter-label"></span></div><button class="cinema-codex">${royalIcon('book')}<span>사초함<small class="cinema-collection"></small></span><kbd>Q</kbd></button></div><div class="cinema-objective"><div class="objective-title">${royalIcon('compass')}<small>지금의 여정</small></div><div class="cinema-task"></div><div class="cinema-go">▶ 눌러서 그곳으로 걸어가기</div><div class="cinema-resource"><span class="budget-pips" aria-hidden="true"></span><span class="cinema-budget"></span></div></div><div class="cinema-danger" hidden><div><strong></strong><span></span></div><progress max="1" value="1"></progress><div class="cinema-go danger-go">▶ 이 판을 누르면 목적지로 달아납니다</div><small>시간과 이동 경로는 학습을 위한 재구성입니다.</small></div><div class="cinema-keyboard"><span><kbd>W A S D</kbd> 이동</span><span><kbd>Shift</kbd> 달리기</span><span>우클릭 드래그 · 둘러보기</span></div>`
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
    style.textContent = `.cinema-hud{position:fixed;inset:0;pointer-events:none;z-index:20;color:#eee8d8;text-shadow:0 2px 4px #0009}.cinema-top{display:flex;justify-content:space-between;align-items:flex-start;padding:26px 32px;background:linear-gradient(#09131dcc,transparent)}.cinema-date{font-size:12px;color:#ead3aa;letter-spacing:1px}.cinema-location{font:24px/1.8 Batang,serif;letter-spacing:3px}.cinema-codex{pointer-events:auto;border:1px solid #b29a6866;background:#102330cf;color:#f6e5c2;padding:12px 18px;font-size:14px}.cinema-codex kbd{margin-left:14px;border:1px solid #9b8d6c;padding:2px 5px}.cinema-objective{position:absolute;left:32px;top:120px;max-width:320px;padding:14px 18px;border-left:2px solid #cfac66;background:linear-gradient(90deg,#091b29dd,#091b2966);line-height:1.7}.cinema-objective small{color:#c6b18b;font-size:11px}.cinema-task{font-size:15px;margin:4px 0}.cinema-objective{pointer-events:auto;cursor:pointer;touch-action:manipulation}.cinema-go{font-size:12px;color:#e0a23a;letter-spacing:1px}.cinema-budget{color:#b9c6ce;font-size:12px}.cinema-danger{pointer-events:auto;cursor:pointer;touch-action:manipulation;position:absolute;bottom:32px;left:50%;transform:translateX(-50%);width:min(530px,70vw);background:#2a1419ed;padding:16px 22px;border-top:2px solid #db8f63}.cinema-danger[hidden],.cinema-objective[hidden]{display:none}.cinema-danger>div{display:flex;justify-content:space-between;gap:20px}.cinema-danger span{font-variant-numeric:tabular-nums;color:#ffe0a3}.cinema-danger progress{width:100%;height:5px;margin-top:12px;accent-color:#d68854}.cinema-danger small{display:block;font-size:11px;color:#d1bdb0;margin-top:7px}.cinema-hud[hidden]{display:none}@media(max-width:760px){.cinema-top{padding:18px}.cinema-location{font-size:19px}.cinema-objective{left:18px;top:100px;max-width:230px;padding:10px 12px}.cinema-task{font-size:13px}.cinema-danger{bottom:78px;width:85vw;box-sizing:border-box}.cinema-codex{padding:10px}.cinema-codex kbd{margin-left:5px}}`
    document.head.appendChild(style)
  }
  const find = c => el.querySelector(c)
  find('.cinema-codex').addEventListener('click', onCodex)
  // 태블릿에서 3D 바닥을 여러 번 짚어 문을 찾기는 번거롭다(2026-09-14) — 여정 판을 누르면 그곳으로 걸어간다.
  find('.cinema-objective').addEventListener('click', onObjective)
  // 촉박 장면도 태블릿에서 쉽게(2026-09-15) — 붉은 판을 누르면 목적지로 달아난다.
  find('.cinema-danger').addEventListener('click', onEscape)
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
      find('.cinema-task').textContent = view.objective ?? '궁궐을 둘러보고 신하의 보고를 들으십시오.'
      find('.cinema-objective').hidden = view.phase !== 'day'
      find('.cinema-budget').textContent = view.dayLeft == null ? '' : `보고 여유 ${view.dayLeft} · ${riceLabel(view.riceIndex ?? 100)}`
      find('.budget-pips').innerHTML = Array.from({length:Math.min(12,view.dayTotal??view.dayLeft??0)},(_,i)=>`<i class="${i<(view.dayLeft??0)?'available':''}"></i>`).join('')
      find('.cinema-budget').title = view.riceIndex == null ? '' : `${riceLabel(view.riceIndex)} — ${RICE_NOTE}`
    },
    showRush({ remainMs, totalMs, label }) {
      find('.cinema-danger').hidden = false
      find('.cinema-danger strong').textContent = label
      find('.cinema-danger span').textContent = `${Math.max(0,Math.ceil(remainMs / 1000))}초`
      find('.cinema-danger progress').value = totalMs > 0 ? Math.max(0,Math.min(1,remainMs / totalMs)) : 0
    },
    hideRush() { find('.cinema-danger').hidden = true },
    dispose() { el.remove() },
  }
}
