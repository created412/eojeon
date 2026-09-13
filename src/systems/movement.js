import { PALACES, roomAt, isPassable } from '../data/palaces.js'
import { collides, safePosition } from '../data/hall-geometry.js'
import { canMove, isRoomOpen } from '../core/control.js'

export const WALK = 9    // m/s
export const RUN = 15
const ARRIVE_RADIUS = 1.5   // 탭 목표에 이만큼 가까우면 도착으로 본다

// 태블릿 탭 이동 — 목표를 향한 단위 벡터를 준다. step() 이 기대하는
// input.axis() 와 정확히 같은 모양이라 키보드 입력과 같은 경로를 그대로 탄다.
// 목표 반경 안이면 0 벡터 — step() 은 이를 '입력 없음'으로 보고 그대로 멈춘다.
export function axisToward(px, pz, target) {
  const dx = target.x - px
  const dz = target.z - pz
  const dist = Math.hypot(dx, dz)
  if (dist <= ARRIVE_RADIUS) return { x: 0, z: 0 }
  return { x: dx / dist, z: dz / dist }
}

export function step(ctx, input, state, dtMs) {
  // 조작권이 걸음을 막는 동안에도 앞 장면에서 남은 blocked 는 지운다. 안 지우면
  // 조작권 D 장면(눌러도 안 움직이는 화면) 내내 「임금이 갈 수 있는 곳은 정해져
  // 있다」 배너가 되풀이된다 — 「길이 정해져 있다」와 「아예 못 움직인다」가 섞여,
  // 안 그래도 「고장났나」 싶은 화면에 군더더기가 겹친다(Task 12 리뷰 Minor 4).
  // 남은 것이 없으면 같은 참조를 그대로 돌려준다 — 「한 걸음도 안 간다」는 그대로다.
  if (!canMove(state.control)) return state.blocked ? { ...state, blocked: null } : state
  const a = input.axis()
  // 조작이 없으면 그대로 — 단, 직전 스텝이 잠긴 방 앞에서 거절당해
  // blocked 가 남아 있었다면 여기서 지운다. 안 그러면 키를 뗀 뒤에도
  // 배너가 계속 다시 뜬다
  if (a.x === 0 && a.z === 0) return state.blocked ? { ...state, blocked: null } : state

  const speed = (input.running() ? RUN : WALK) * (Math.min(1000, Math.max(0, dtMs)) / 1000)
  const p = ctx.player.position
  const def = PALACES[state.palace]
  const half = { w: def.ground.w / 2 - 2, d: def.ground.d / 2 - 2 }
  const cx = Math.max(-half.w, Math.min(half.w, p.x + a.x * speed))
  const cz = Math.max(-half.d, Math.min(half.d, p.z + a.z * speed))

  const here = roomAt(def, p.x, p.z)
  const room = roomAt(def, cx, cz)
  // 잠긴 방은 '들어가는 것'만 막는다. 이미 안에 있다면 움직이고 나갈 수 있어야 한다.
  // 거절당했다는 사실은 state.blocked 로 호출자에게 돌려준다 — step() 자신은
  // 배너를 띄우지 않는다. 같은 방을 계속 밀고 있으면 같은 참조를 돌려줘
  // 불필요한 객체 생성을 피한다
  if (room && room.id !== here?.id && (!isRoomOpen(state.control, room) || !isPassable(room))) {
    return state.blocked === room.id ? state : { ...state, blocked: room.id }
  }

  // 벽 — 방의 경계를 넘는 것은 **문으로만** 된다. 문은 방의 앞면(+z) 가운데다
  // (render/palace.js 가 그쪽 벽을 세우지 않는다 — 그림과 판정이 같은 규칙을 쓴다).
  // 예전에는 이 판정이 아예 없어 학생이 벽을 뚫고 다녔다(선생님 지적 9번).
  //
  // 축을 따로 본다. 한 번에 거절하면 벽에 닿는 순간 **아예 못 움직이고**, 큰 걸음
  // (탭 이동·낮은 프레임)에서는 문을 건너뛰어 영영 못 나간다. 축을 나누면 벽을
  // 따라 미끄러지고, 문 앞에 이르면 저절로 빠져나간다.
  // Test the entire motion against the same 72% footprint that is rendered.
  // Substeps are smaller than a wall; splitting axes permits sliding.
  const start=safePosition(def,p)
  let nx=start.x,nz=start.z,wall=null
  const dx=cx-p.x,dz=cz-p.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18))
  const blocksTo=(x,z)=>{
    const from=roomAt(def,nx,nz),to=roomAt(def,x,z)
    if(to&&to.id!==from?.id&&(!isRoomOpen(state.control,to)||!isPassable(to)))return to.id
    return collides(def,{x,z})?.id??null
  }
  for(let i=0;i<n;i++){
    const wx=blocksTo(nx+dx/n,nz)
    if(!wx)nx+=dx/n;else wall=wx
    const wz=blocksTo(nx,nz+dz/n)
    if(!wz)nz+=dz/n;else wall=wall??wz
  }
  if (wall && Math.hypot(nx-p.x,nz-p.z)<.00001) {
    const tag = `wall:${wall}`
    return state.blocked === tag ? state : { ...state, blocked: tag }
  }

  const barelyMoved=Math.hypot(nx-p.x,nz-p.z)<speed*.1
  p.x = nx
  p.z = nz
  const nextRoom = roomAt(def, nx, nz)?.id ?? null
  const blocked=wall&&barelyMoved?`wall:${wall}`:null
  if (state.room === nextRoom && state.blocked===blocked) return state
  return { ...state, room: nextRoom, blocked }
}
