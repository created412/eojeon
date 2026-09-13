import { isRead } from './codex.js'
import { sourceById } from '../data/sources.js'

export function evaluateChoices(state, council) {
  return council.choices.map(choice => {
    const missing = (choice.requires ?? [])
      .filter(id => !isRead(state, id))
      .map(id => sourceById(id)?.title ?? id)
    return { id: choice.id, text: choice.text, unlocked: missing.length === 0, missing }
  })
}
