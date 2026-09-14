import { writeFileSync, mkdirSync } from 'node:fs'
import { ACTS } from '../src/data/acts.js'
import { NPCS } from '../src/data/npcs.js'
import { voiceKey, spokenText } from '../src/data/voice-cast.js'

const lines = new Map()
function add(line) {
  if (!line?.trim()) return
  const key = voiceKey('gojong-narrator', line)
  lines.set(key, { key, line, text: line.replace(/<[^>]+>/g, '').replace(/[「」『』─]/g, ' ').trim() })
}
for (const act of ACTS) for (const beat of act.beats) {
  if (['note', 'procession'].includes(beat.kind)) {
    for (const line of [...(beat.lines ?? []), ...(beat.afterLines ?? [])]) add(line)
  }
  for (const visitor of beat.visitors ?? []) {
    for (const line of visitor.lines ?? []) if (!spokenText(line)) add(line)
  }
}
for (const npc of NPCS) for (const line of npc.lines ?? []) if (!spokenText(line)) add(line)
mkdirSync('tools/voice/narration', { recursive: true })
writeFileSync('tools/voice/narration/lines.json', JSON.stringify([...lines.values()], null, 2))
console.log(`${lines.size} narration lines`)
