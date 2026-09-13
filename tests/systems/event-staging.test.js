import { expect,it } from 'vitest'
import { stageEvent } from '../../src/systems/event-staging.js'

it('uses the countdown front to place the crowd between actual palace rooms',()=>{
  const rush={track:['a','b'],startedAt:0,totalMs:1000}
  const palace={rooms:[{id:'a',x:0,z:10},{id:'b',x:0,z:0}]}
  expect(stageEvent({actId:'imo',beat:{fire:false},rush,palace,now:500})).toMatchObject({type:'crowd',x:0,z:5})
  expect(stageEvent({actId:'gapsin',beat:{fire:false},rush,palace,now:2000})).toMatchObject({type:'soldiers',x:0,z:0})
})

it('does not spawn an advancing force during a hold without a countdown',()=>{
  expect(stageEvent({actId:'imo',beat:{kind:'hold'},rush:null})).toBe(null)
})
