// 음성으로 만들 대사 목록을 뽑는다 — 대화판(ui/speak.js)에 뜨는 줄 가운데 「」 가 있는 줄.
//   node tools/voice-lines.mjs  → tools/voice/lines.json
// 대화판에 줄이 들어오는 길은 둘뿐이다: 알현 방문자(beat.visitors[].lines, 없으면 npc.lines)와
// 탐색 중 말 걸기(npc.lines). 둘을 모두 걷는다.
import { writeFileSync, mkdirSync } from 'node:fs'
import { ACTS } from '../src/data/acts.js'
import { NPCS } from '../src/data/npcs.js'
import { CAST, VOICES, spokenText, voiceKey } from '../src/data/voice-cast.js'

const out = new Map()
const add = (npc, lines) => {
  for (const line of lines ?? []) {
    const text = spokenText(line)
    if (!text) continue
    const voice = CAST[npc]
    if (!voice) throw new Error(`목소리가 정해지지 않은 인물: ${npc} — ${line}`)
    out.set(voiceKey(npc, line), { key: voiceKey(npc, line), npc, voice, voiceId: VOICES[voice], line, text })
  }
}
for (const act of ACTS) for (const b of act.beats) for (const v of b.visitors ?? []) {
  add(v.npc, v.lines ?? NPCS.find(n => n.id === v.npc)?.lines)
}
for (const n of NPCS) add(n.id, n.lines)
mkdirSync(new URL('./voice/', import.meta.url), { recursive: true })
const list = [...out.values()]
writeFileSync(new URL('./voice/lines.json', import.meta.url), JSON.stringify(list, null, 1))
console.log(list.length, 'lines,', list.reduce((s, l) => s + l.text.length, 0), 'chars')
