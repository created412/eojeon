// 마당에 놓는 물건 GLB 를 게임에 실을 수 있게 줄이고 묶는다.
//
//   node tools/pack-props.mjs
//
// 입력 : assets/props/*.glb       (Higgsfield image_to_3d 가 낸 원본, 개당 4MB 안팎)
// 출력 : assets/props/opt/*.glb   (최적화본, 개당 100KB 안팎)
//        src/render/props-data.js (base64 data URI)
//
// 인물 모델(tools/pack-glb.mjs)과 같은 길이지만 더 세게 줄인다 — 마당 물건은 화면에서
// 인물보다 작게, 멀리 보인다. 텍스처 512, 단순화 오차 0.01.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'assets', 'props')
const OUT = join(SRC, 'opt')
const JS = join(ROOT, 'src', 'render', 'props-data.js')

const ARGS = [
  '--texture-size', '256',
  '--texture-compress', 'webp',
  '--compress', 'meshopt',
  '--simplify-error', '0.015',
]

mkdirSync(OUT, { recursive: true })
const files = readdirSync(SRC).filter(f => f.endsWith('.glb')).sort()
if (!files.length) throw new Error('assets/props 에 GLB 가 없다')

const entries = []
let total = 0
for (const file of files) {
  const id = basename(file, '.glb')
  const from = join(SRC, file), to = join(OUT, file)
  execFileSync('npx', ['gltf-transform', 'optimize', from, to, ...ARGS],
    { cwd: ROOT, stdio: 'pipe', shell: process.platform === 'win32' })
  const bytes = readFileSync(to)
  total += bytes.length
  console.log(`  ${id.padEnd(12)} ${(statSync(from).size / 1048576).toFixed(2)} MB → ${(bytes.length / 1024).toFixed(0)} KB`)
  entries.push([id, 'data:model/gltf-binary;base64,' + bytes.toString('base64')])
}

console.log(`합계 ${(total / 1024).toFixed(0)} KB · base64 로 약 ${Math.round(total * 4 / 3 / 1024)} KB`)
writeFileSync(JS,
  '// 자동 생성 — 손으로 고치지 마라. `node tools/pack-props.mjs` 로 다시 만든다.\n' +
  `// 원본: assets/props/*.glb · meshopt + webp512 · 합계 ${(total / 1024).toFixed(0)} KB\n` +
  'export const PROP_MODELS = {\n' +
  entries.map(([id, uri]) => `  ${id}: ${JSON.stringify(uri)},`).join('\n') +
  '\n}\n', 'utf8')
console.log(`-> src/render/props-data.js (${(statSync(JS).size / 1024).toFixed(0)} KB)`)
