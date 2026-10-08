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

// 2026-10-08 선생님: 「마크도 받게 헤더 설정 해줘」 — 도름스 보안 마크의 CSP 검사는 script-src 에
// 'self'·해시·호스트만 허용한다. meshopt 디코더는 WebAssembly 라 'wasm-unsafe-eval' 이 필요한데 그 토큰은
// 검사기가 「검증할 수 없는 출처」로 떨어뜨린다(dorms-check checks/external/header-policy.js). 그래서
// **meshopt 를 걷고 quantize 만 쓴다** — WASM 없이 three 의 GLTFLoader 가 그대로 읽는다. 지오메트리는 1.7~2배
// 커지지만 텍스처를 한 단계 줄여 메운다.
const ARGS = [
  '--texture-size', '192',
  '--texture-compress', 'webp',
  '--compress', 'quantize',
  '--simplify-error', '0.025',
]

// 사람(난병·청군)은 물건보다 가까이, 얼굴이 보이게 선다 — 텍스처를 한 단계 크게, 덜 깎는다.
// 2026-10-06 선생님: 「임오군란 군병들의 디자인이 거지같아. 힉스필드로 군병들을 제대로 만들어.」
const FIGURE_ARGS = [
  '--texture-size', '384',
  '--texture-compress', 'webp',
  '--compress', 'quantize',
  '--simplify-error', '0.008',
]

mkdirSync(OUT, { recursive: true })
const files = readdirSync(SRC).filter(f => f.endsWith('.glb')).sort()
if (!files.length) throw new Error('assets/props 에 GLB 가 없다')

const entries = []
let total = 0
for (const file of files) {
  const id = basename(file, '.glb')
  const from = join(SRC, file), to = join(OUT, file)
  execFileSync('npx', ['gltf-transform', 'optimize', from, to, ...(id.startsWith('rioter_') || id.startsWith('qing_') ? FIGURE_ARGS : ARGS)],
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
