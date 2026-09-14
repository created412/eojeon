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
// 고종의 1인칭 독백만 읽는다 — 행렬 장면의 줄(「그는 알고 왔을까」 따위).
// 글 화면·대화 사이 지문 같은 안내 문장은 읽지 않는다(2026-09-14 선생님: 「안내문구의 음성은 모두 제거」).
for (const act of ACTS) for (const beat of act.beats) {
  if (beat.kind === 'procession') for (const line of beat.lines ?? []) add(line)
}
mkdirSync('tools/voice/narration', { recursive: true })
writeFileSync('tools/voice/narration/lines.json', JSON.stringify([...lines.values()], null, 2))
console.log(`${lines.size} narration lines`)
