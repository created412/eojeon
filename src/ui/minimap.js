import { roomProgressAt, remainingMs } from '../core/countdown.js'
import { isRoomOpen } from '../core/control.js'

const SIZE = 168

export function createMinimap(root, def) {
  const wrap = document.createElement('div')
  wrap.className = 'game-map'
  wrap.style.cssText =
    `position:fixed;right:10px;bottom:10px;width:${SIZE}px;z-index:20;pointer-events:none`
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  canvas.style.cssText = 'width:100%;background:#0f1113cc;border:1px solid #3a3f45;border-radius:3px'
  const clock = document.createElement('div')
  clock.style.cssText = 'text-align:center;font:13px monospace;color:#d2503a;padding-top:4px;min-height:18px'
  wrap.append(canvas, clock)
  root.appendChild(wrap)

  const g = canvas.getContext('2d')
  const sx = SIZE / def.ground.w
  const sz = SIZE / def.ground.d
  const px = (x) => SIZE / 2 + x * sx
  const pz = (z) => SIZE / 2 + z * sz

  return {
    update(view) {
      g.clearRect(0, 0, SIZE, SIZE)
      g.strokeStyle='#9eaf8850';g.lineWidth=.7
      g.strokeRect(3,3,SIZE-6,SIZE-6)
      g.fillStyle='#ded5af';g.font='9px system-ui, sans-serif';g.textBaseline='top'
      g.fillText('북',SIZE-17,7)

      const progress = view.rush ? roomProgressAt(view.rush, view.now) : null
      const filledOf = (id) => progress?.find(p => p.id === id)?.filled ?? 0

      for (const r of def.rooms) {
        const x = px(r.x - r.w / 2)
        const y = pz(r.z - r.d / 2)
        const w = r.w * sx
        const h = r.d * sz
        g.fillStyle = isRoomOpen(view.control, r) ? '#52776b' : '#29483f'
        g.fillRect(x, y, w, h)
        const f = filledOf(r.id)
        if (f > 0) {
          g.fillStyle = 'rgba(210,80,58,0.75)'
          g.fillRect(x, y, w * f, h)
        }
        g.strokeStyle = '#aec0a055'
        g.strokeRect(x, y, w, h)

        // 방 이름을 지도에 직접 적는다 — 교사가 "규장각으로 가세요" 라고 하면
        // 학생이 걸어 들어가 보지 않고도 미니맵에서 어디인지 알 수 있어야 한다
        // (2단계 최종 리뷰, 가독성 항목 1)
        if (w >= 14 && h >= 10) {
          g.fillStyle = '#f0e9cc'
          g.font = '8px system-ui, sans-serif'
          g.textBaseline = 'top'
          g.fillText(r.name, x + 2, y + 2, w - 4)
        }
      }

      if (view.pickups) {
        g.fillStyle = '#a8e1bd'
        for (const p of view.pickups) {
          g.beginPath()
          g.arc(px(p.x), pz(p.z), 2.5, 0, Math.PI * 2)
          g.fill()
        }
      }

      g.fillStyle = '#efcb79'
      g.beginPath()
      g.arc(px(view.playerX), pz(view.playerZ), 3.5, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle='#fff0bd';g.lineWidth=1.2;g.stroke()

      if (view.rush) {
        const s = Math.ceil(remainingMs(view.rush, view.now) / 1000)
        clock.textContent = `${s}초`
      } else {
        clock.textContent = ''
      }
    },
    dispose() { wrap.remove() },
  }
}
