import { expect, it } from 'vitest'
import { cinematicDirective, interpolateCameraShot } from '../../src/render/cinematic.js'

it('stages the Gapsin rush as a night danger shot', () => {
  expect(cinematicDirective({ actId: 'gapsin', phase: 'rush', control: 'B', rush: { fire: false } }))
    .toMatchObject({ mood: 'night', cue: 'gunfire', camera: { mode: 'danger' } })
})

it('keeps a normal Yangyo exploration shot calm and playable', () => {
  expect(cinematicDirective({ actId: 'yangyo', phase: 'day', control: 'A', rush: null }))
    .toMatchObject({ mood: 'day', cue: null, camera: { mode: 'follow' } })
})

it('interpolates a camera target without overshoot', () => {
  expect(interpolateCameraShot({ x: 0, y: 4, z: 0, lookY: 2 }, { x: 10, y: 6, z: -8, lookY: 3 }, .5))
    .toEqual({ x: 5, y: 5, z: -4, lookY: 2.5 })
})

it('does not turn a restricted hold into a timed crisis', () => {
  expect(cinematicDirective({ actId: 'imo', phase: 'rush', rush: null }).camera.mode).toBe('follow')
})

it('does not illuminate the entire personal-rule act as a fire', () => {
  expect(cinematicDirective({ actId: 'chinjeong', phase: 'day' }).mood).toBe('day')
  expect(cinematicDirective({ actId: 'chinjeong', phase: 'beat', beat: { kind: 'rush', fire: true } }).mood).toBe('fire')
})
