// One physical footprint for rendering, movement and character placement.
export const ROOM_SHRINK = .72
export const WALL_THICKNESS = .45
export const BODY_RADIUS = .55
const cache=new WeakMap()
export function hallObstacles(def){
 if(!def)return []
 if(cache.has(def))return cache.get(def)
 const out=[]
 for(const r of def.rooms){
  const w=r.w*ROOM_SHRINK,d=r.d*ROOM_SHRINK,t=WALL_THICKNESS
  const box=(x,z,bw,bd)=>out.push({id:r.id,x0:x-bw/2,x1:x+bw/2,z0:z-bd/2,z1:z+bd/2})
  if(!r.burnt){
   box(r.x-w/2+t/2,r.z,t,d);box(r.x+w/2-t/2,r.z,t,d)
   if(!r.gate)box(r.x,r.z-d/2+t/2,w,t)
  }
  const bays=r.w>24?7:5
  for(let b=0;b<=bays;b++){
   const x=-w/2+w*b/bays
   if(!r.gate||Math.abs(x)>w*.2)box(r.x+x,r.z-d/2,1.24,1.24)
   if(Math.abs(x)>w*.2)box(r.x+x,r.z+d/2,1.24,1.24)
  }
 }
 // The courtyard galleries also have visible side walls.
 const c=def.yard?.colonnade
 if(c){for(const s of [-1,1]){const x=s*(c.halfW+1.4);out.push({id:'gallery',x0:x-.2,x1:x+.2,z0:c.z0,z1:c.z1})}}
 cache.set(def,out);return out
}
export function collides(def,p,radius=BODY_RADIUS){
 return hallObstacles(def).find(b=>{
  const x=Math.max(b.x0,Math.min(b.x1,p.x)),z=Math.max(b.z0,Math.min(b.z1,p.z))
  return Math.hypot(p.x-x,p.z-z)<radius
 })??null
}
export function safePosition(def,p,radius=BODY_RADIUS){
 if(!collides(def,p,radius))return {x:p.x,z:p.z}
 // Rescue legacy spawns without moving a character through another obstacle.
 for(let distance=.15;distance<8;distance+=.15)for(let i=0;i<32;i++){
  const a=i*Math.PI/16,q={x:p.x+Math.cos(a)*distance,z:p.z+Math.sin(a)*distance}
  if(Math.abs(q.x)>def.ground.w/2-radius||Math.abs(q.z)>def.ground.d/2-radius)continue
  if(!collides(def,q,radius))return q
 }
 return {...def.spawn}
}
