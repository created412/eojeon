// 생성된 인물 GLB 여섯을 게임에 실을 수 있게 줄이고 묶는다.
//
//   node tools/pack-glb.mjs
//
// 입력 : assets/models/*.glb        (image_to_3d 가 낸 원본, 개당 9MB 안팎)
// 출력 : assets/models/opt/*.glb    (최적화본, 개당 400KB 안팎)
//        src/render/models-data.js  (base64 data URI + 인물별 키)
//
// 왜 meshopt 인가: draco 는 브라우저가 별도 디코더 파일을 **내려받아야** 해서
// 이 게임의 「외부 요청 0건」을 깬다. meshopt 의 디코더는 three 에 동봉돼 있어
// (three/examples/jsm/libs/meshopt_decoder.module.js) 번들에 그대로 들어간다.
//
// 수치(어른 고종 기준): 원본 9.34MB → meshopt+webp1024 409KB (23배).
// 여섯이면 약 2.5MB — 예산 8MB 안에 들어온다.

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'assets', 'models')
const OUT = join(SRC, 'opt')
const JS = join(ROOT, 'src', 'render', 'models-data.js')

// 게임 코드가 쓰는 이름 → 원본 파일명. sprite-person.js 의 RANK_SPECS 와 같은 이름이다.
const CAST = [
  ['king_child', 'king-child.glb'],
  ['king_adult', 'king-adult.glb'],
  ['regent',     'regent.glb'],
  ['senior',     'senior.glb'],
  ['mid',        'mid.glb'],
  ['messenger',  'messenger.glb'],
]

// 텍스처를 1024 로 줄이고 webp 로 바꾼다. simplify-error 0.002 는 실루엣이
// 눈에 띄게 무너지지 않는 선 — 화면에서 인물은 높이 200px 안팎이다.
const ARGS = [
  '--texture-size', '1024',
  '--texture-compress', 'webp',
  '--compress', 'meshopt',
  '--simplify-error', '0.002',
]

mkdirSync(OUT, { recursive: true })

const missing = CAST.filter(([, f]) => !existsSync(join(SRC, f))).map(([, f]) => f)
if (missing.length) {
  console.error('원본 GLB 가 없다:', missing.join(', '))
  process.exit(1)
}

const entries = []
let total = 0
for (const [id, file] of CAST) {
  const from = join(SRC, file)
  const to = join(OUT, file)
  execFileSync('npx', ['gltf-transform', 'optimize', from, to, ...ARGS],
    { cwd: ROOT, stdio: 'pipe', shell: process.platform === 'win32' })
  const bytes = readFileSync(to)
  total += bytes.length
  console.log(`  ${id.padEnd(12)} ${(statSync(from).size / 1048576).toFixed(2)} MB → ${(bytes.length / 1024).toFixed(0)} KB`)
  entries.push([id, 'data:model/gltf-binary;base64,' + bytes.toString('base64')])
}

const b64 = Math.round(total * 4 / 3 / 1024)
console.log(`합계 ${(total / 1024).toFixed(0)} KB · base64 로 약 ${b64} KB`)

writeFileSync(JS,
  '// 자동 생성 — 손으로 고치지 마라. `node tools/pack-glb.mjs` 로 다시 만든다.\n' +
  `// 원본: assets/models/*.glb · meshopt + webp1024 · 합계 ${(total / 1024).toFixed(0)} KB\n` +
  '// 외부 요청 0건을 지키려고 base64 로 소스에 싣는다. meshopt 디코더는 three 에 동봉돼 있다.\n' +
  'export const MODELS = {\n' +
  entries.map(([id, uri]) => `  ${id}: ${JSON.stringify(uri)},`).join('\n') +
  '\n}\n',
  'utf8')

console.log(`-> src/render/models-data.js (${(statSync(JS).size / 1024).toFixed(0)} KB)`)
