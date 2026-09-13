import { frontAt } from '../core/countdown.js'

export function stageEvent({ actId, beat, rush, palace, now }) {
  if (!rush || !beat || !palace) return null
  const track = rush.track.map(id => palace.rooms.find(r => r.id === id)).filter(Boolean)
  if (!track.length) return null
  const front = Math.min(track.length-1,frontAt(rush,now))
  const a = track[Math.floor(front)], b = track[Math.min(track.length-1,Math.floor(front)+1)]
  const t = front - Math.floor(front)
  return {
    type: beat.fire ? 'fire' : actId === 'gapsin' ? 'soldiers' : 'crowd',
    x: a.x + (b.x-a.x)*t,
    z: a.z + (b.z-a.z)*t,
    yaw: Math.atan2(b.x-a.x,b.z-a.z),
  }
}
