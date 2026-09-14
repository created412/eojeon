import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { blockAt } from './helpers/body-of.js'
import { PALACES } from '../src/data/palaces.js'
import { createState } from '../src/core/state.js'
import { step } from '../src/systems/movement.js'
import { visitorSpotFor, kingSpot, walkAt, yawToward } from '../src/systems/audience.js'

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')

function runBlock(prefix, env) {
  const start = source.indexOf(prefix)
  const open = source.indexOf('{', start)
  new Function('env', `with (env) { ${source.slice(start, open)} {${blockAt(source, open)}} }`)(env)
}

it('신하가 도착한 프레임에도 임금이 멈춰 실제 자리와 퇴장 출발점이 일치한다', () => {
  const room = PALACES.changdeok.rooms.find(r => r.id === 'injeongjeon')
  const king = kingSpot(room)
  let npcPosition
  const env = {
    PALACES, visitorSpotFor, walkAt, yawToward, step,
    now: 5000, dt: 80, FIXED_MS: 16, MAX_STEPS: 5, acc: 0,
    tapTarget: null, lastRebukeAt: 0, REBUKE_MS: 3000,
    flow: { phase: 'audience', state: { ...createState(), palace: 'changdeok', room: room.id, control: 'C' } },
    ctx: {
      player: { position: { ...king } },
      placeNpc(id, position) { npcPosition = position },
    },
    audienceBeat: { kind: 'audience', room: room.id }, audienceExitOpen: false,
    input: { tap: () => null },
    inputForStep: () => ({ axis: () => ({ x: 0, z: 1 }), running: () => false }),
    speak: { isOpen: () => false }, dialog: { isOpen: () => false },
    audienceWalk: {
      id: 'hojo', from: { x: 0, z: 0 }, to: visitorSpotFor(room, king), followRoom: room,
      t0: 0, ms: 1000, resolve() {},
    },
  }
  // Promise의 다음 아룀은 프레임이 끝난 뒤 열린다. 그 전에 도착 처리와 입력을 연달아 실행한다.
  const snapshot = source.match(/const audienceWasWalking = [^\r\n]+/)?.[0]
  expect(snapshot).toBeTruthy()
  env.audienceWasWalking = new Function('env', `with (env) { ${snapshot}; return audienceWasWalking }`)(env)
  runBlock('if (audienceWalk) {', env)
  runBlock("if (flow.phase === 'audience' && audienceBeat &&", env)
  expect(env.audienceWalk).toBeNull()
  expect(env.ctx.player.position).toEqual(king)
  expect(npcPosition).toMatchObject(visitorSpotFor(room, env.ctx.player.position))
})
