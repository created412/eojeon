import {it,expect} from 'vitest'
import {PALACES} from '../../src/data/palaces.js'
import {step} from '../../src/systems/movement.js'
import {createState} from '../../src/core/state.js'
import {hallObstacles,collides,safePosition,BODY_RADIUS} from '../../src/data/hall-geometry.js'
import {NPCS} from '../../src/data/npcs.js'
it('실제 72% 크기 벽에 몸이 닿기 전에 멈춘다',()=>{
 const ctx={player:{position:{x:0,z:12}}},input={axis:()=>({x:1,z:0}),running:()=>true}
 step(ctx,input,{...createState(),control:'A'},1000)
 expect(ctx.player.position.x).toBeLessThan(22*.72/2-BODY_RADIUS)
 expect(collides(PALACES.changdeok,ctx.player.position)).toBeFalsy()
})
it('큰 프레임에서도 건물 하나를 통째로 관통하지 않는다',()=>{
 const ctx={player:{position:{x:-12,z:12}}}
 step(ctx,{axis:()=>({x:1,z:0}),running:()=>true},{...createState(),control:'A'},1000)
 expect(ctx.player.position.x).toBeLessThan(-22*.72/2)
})
it('앞면 열린 문 중앙으로 입장하고 문 건물은 앞뒤로 통과한다',()=>{
 for(const z of [24,40]){const ctx={player:{position:{x:0,z}}};step(ctx,{axis:()=>({x:0,z:-1}),running:()=>false},{...createState(),control:'A'},1000);expect(ctx.player.position.z).toBeLessThan(z-6)}
})
it('모든 신하의 기본 배치가 실제 벽과 기둥에서 떨어져 있다',()=>{
 for(const n of NPCS)expect(collides(PALACES[n.palace],n),n.id).toBeFalsy()
})
it('벽 안의 좌표는 가까운 안전 지점으로 복구한다',()=>{
 const def=PALACES.changdeok,p={x:7.9,z:12};expect(collides(def,p)).toBeTruthy();expect(collides(def,safePosition(def,p))).toBeFalsy()
 expect(hallObstacles(def).length).toBeGreaterThan(def.rooms.length*3)
})
