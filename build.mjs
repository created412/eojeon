import { build, context } from 'esbuild'
import { readFile, writeFile, mkdir, rename, unlink, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, 'dist', '어전.html')
const MARKER = '/*__BUNDLE__*/'

async function bundle() {
  const result = await build({
    entryPoints: [join(here, 'src', 'main.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2022',
    write: false,
    legalComments: 'none',
  })
  return result.outputFiles[0].text
}

// Windows에서 브라우저가 HTML을 읽는 중이어도 기존 완성본을 먼저 비우지 않는다.
async function writeHtml(path, html) {
  const temporary = `${path}.${process.pid}.tmp`
  try {
    await writeFile(temporary, html, 'utf8')
    await rename(temporary, path)
  } finally {
    await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
  }
}

async function emit() {
  const [shell, js] = await Promise.all([
    readFile(join(here, 'index.html'), 'utf8'),
    bundle(),
  ])
  if (!shell.includes(MARKER)) throw new Error('index.html에 ' + MARKER + ' 자리가 없다')
  // </script> 가 문자열 안에 있으면 HTML 파서가 스크립트를 끊는다 — 대문자 섞인 표기도 잡는다
  const safe = js.replace(/<\/script/gi, '<\\/script')
  // 문자열 replace 는 치환문에서 $& 같은 특수 패턴을 해석한다 —
  // 번들 안에 우연히 $&가 나타나면 내용이 깨진다. 함수 치환으로 우회한다.
  const html = shell.replace(MARKER, () => safe)
  await mkdir(join(here, 'dist'), { recursive: true })
  const emitted = await Promise.allSettled([
    writeHtml(OUT, html),
    writeHtml(join(here, '어전.html'), html),
  ])
  const failed = emitted.find(result => result.status === 'rejected')
  if (failed) throw failed.reason
  // 영상·연속 음악은 HTML 안에 있다(ui/prologue-media-data.js ← tools/pack-prologue.mjs).
  // 선생님(2026-10-06): 「오프닝 영상을 html에 넣고」. 예전에 곁에 복사해 두던 폴더는 걷는다 —
  // 남아 있으면 「HTML 하나면 된다」가 거짓이 된다.
  await rm(join(here, 'dist', 'assets'), { recursive: true, force: true })
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)
  console.log(`어전.html + dist/어전.html  ${kb} KB`)
}

if (process.argv.includes('--watch')) {
  const ctx = await context({ entryPoints: [join(here, 'src', 'main.js')], bundle: true, write: false })
  await ctx.watch()
  setInterval(emit, 1000)
} else {
  await emit()
}
