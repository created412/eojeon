import { expect, it } from 'vitest'
import { interactionCue } from '../../src/systems/interaction-cues.js'

it('uses a restrained cue for a nearby document', () => {
  expect(interactionCue({ kind: 'document', label: '강화도 조약', distance: 3, urgent: false }))
    .toEqual({ label: '강화도 조약 · E 읽기', tone: 'gold', pulse: false, visible: true })
})

it('uses red only for an urgent route target', () => {
  expect(interactionCue({ kind: 'door', label: '대조전', distance: 8, urgent: true })).toMatchObject({
    tone: 'red', pulse: true, visible: true,
  })
})

it('hides a normal target that is too distant to investigate', () => {
  expect(interactionCue({ kind: 'person', label: '신하', distance: 40, urgent: false }).visible).toBe(false)
})
