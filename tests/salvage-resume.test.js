import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { bodyOf } from './helpers/body-of.js'
import { ACTS } from '../src/data/acts.js'
import { createState, serialize, deserialize } from '../src/core/state.js'
import { recordPreservation } from '../src/systems/preservation.js'

it('playSalvage는 초안을 안전한 체크포인트에 저장하고 다시 열 때 전달한다', async () => {
  const beat=ACTS.flatMap(a=>a.beats).find(b=>b.id==='great-fire')
  const draft={selected:['eopil','busin'],reason:'다시 만들 수 없는 기록과 증표를 꺼낸다.'}
  const checkpoint={...createState(),beatIndex:7}
  let saved=serialize(recordPreservation(checkpoint,beat.id,draft))
  const flow={state:{...deserialize(saved),beatIndex:8},setPhase(){}}
  let view
  const salvage={open(v){view=v;return new Promise(()=>{})}}
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
  const play=new AsyncFunction('beat','flow','hint','salvage','recordPreservation','loadGame','saveGame',
    bodyOf(readFileSync('src/main.js','utf8'),'playSalvage'))
  play(beat,flow,{},salvage,recordPreservation,()=>deserialize(saved),s=>{saved=serialize(s);return true})
  expect(view.initial).toEqual(draft)
  const updated={selected:['daebo','busin'],reason:'명령이 진짜임을 증명한다.'}
  expect(view.onSave(updated)).toBe(true)
  expect(deserialize(saved).preservation[beat.id]).toEqual(updated)
  expect(deserialize(saved).beatIndex).toBe(7)
  expect(flow.state.preservation[beat.id]).toEqual(updated)
})
