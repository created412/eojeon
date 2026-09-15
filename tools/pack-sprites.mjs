// assets/sprites/*.webp(+ .json) → src/render/sprites-data.js (base64 로 싣는다 — 외부 요청 0건).
// 사용: node tools/pack-sprites.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = 'assets/sprites'
const files = readdirSync(DIR).filter(f => f.endsWith('.webp')).sort()
if (!files.length) throw new Error('assets/sprites 에 시트가 없다')
const sprites = {}
let cell = null, frames = null, views = null
for (const f of files) {
  const id = f.replace(/\.webp$/, '')
  const meta = JSON.parse(readFileSync(join(DIR, id + '.json'), 'utf8'))
  const c = JSON.stringify(meta.cell)
  if (cell && (c !== JSON.stringify(cell) || meta.frames !== frames)) throw new Error(`${id}: 칸 크기·프레임 수가 다른 시트와 다르다`)
  cell = meta.cell; frames = meta.frames; views = meta.views
  sprites[id] = { uri: 'data:image/webp;base64,' + readFileSync(join(DIR, f)).toString('base64') }
}
writeFileSync('src/render/sprites-data.js',
  '// 자동 생성 — tools/pack-sprites.mjs 가 assets/sprites 를 싣는다(assets/sprites/README.md). 손으로 고치지 마라.\n' +
  `export const SPRITE_CELL = ${JSON.stringify(cell)}\n` +
  `export const SPRITE_FRAMES = ${frames}\n` +
  `export const SPRITE_VIEWS = ${JSON.stringify(views)}\n` +
  `export const SPRITES = ${JSON.stringify(sprites)}\n`)
console.log(files.length, 'sheets')
