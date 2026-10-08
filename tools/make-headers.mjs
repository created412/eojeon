// Cloudflare Pages 응답 헤더(_headers)를 만든다 — 도름스 보안 체크리스트(마크)용.
//
//   node tools/make-headers.mjs        (build.mjs 가 빌드 끝에 부른다)
//
// 선생님(2026-10-08): 「마크도 받게 헤더 설정 해줘」.
// 「명부」·「독립군의 별」에서 배운 것(2026-09-02):
//   · 검사기는 응답 헤더만 읽는다(<meta http-equiv> 는 안 본다) — 그래서 Cloudflare Pages 의 _headers.
//   · CSP 의 script-src 에 'unsafe-inline' 은 거부된다. 인라인 스크립트의 **SHA-256 해시**를 넣는다.
//     이 게임은 HTML 한 장에 인라인 <script> 가 **하나**다(index.html 의 /*__BUNDLE__*/ 자리) — 그 본문의 해시다.
//   · 해시와 'unsafe-inline' 을 같이 넣으면 검사기는 통과하지만 브라우저는 해시가 있으면 'unsafe-inline' 을
//     무시한다 — 여기서는 애초에 안 넣는다.
//   · Cloudflare 가 정적 자산에 붙이는 Access-Control-Allow-Origin: * 가 cors.policy 관문을 막는다 → `! ` 로 지운다.
// ⚠ 빌드가 바뀌면 해시가 바뀐다. 그래서 손으로 적지 않고 빌드 때마다 다시 센다(tests/build.test.js 가 대조한다).
//
// 게임이 쓰는 것과 CSP 의 대응:
//   img/font/model  base64 data:        → img-src data: · font-src data: · connect-src data:(GLTFLoader 가 fetch 로 읽는다)
//   오프닝 영상·음악 Blob URL          → media-src blob:
//   바깥 요청 0건                       → default-src 'self' 로 충분하다
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

export function inlineScriptHashes(html) {
  const out = []
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/g
  let m
  while ((m = re.exec(html)) !== null) out.push('sha256-' + createHash('sha256').update(m[1], 'utf8').digest('base64'))
  return out
}

export function headersText(hashes) {
  // ⚠ 'wasm-unsafe-eval' 을 넣지 않는다. 처음에는 넣었다 — 인물 GLB 의 meshopt 디코더가 WebAssembly 라
  //   그것 없이는 사람이 한 명도 서지 않았다(2026-10-08 공개본). 그런데 도름스 검사기는 script-src 에
  //   'self'·해시·호스트 말고는 전부 「검증할 수 없는 출처」로 떨어뜨린다(CSP 는 high·gate). 그래서 WASM 쪽을
  //   걷었다: GLB 를 meshopt 대신 quantize 로 싣는다(tools/pack-glb.mjs · pack-props.mjs).
  const scriptSrc = ["'self'", ...hashes.map(h => `'${h}'`)].join(' ')
  return [
    '/*',
    `  Content-Security-Policy: default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
    '  X-Frame-Options: DENY',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Cross-Origin-Resource-Policy: same-origin',
    '  ! Access-Control-Allow-Origin',
    '',
  ].join('\n')
}

export function makeHeaders(htmlPath = join(ROOT, 'dist', '어전.html'), outPath = join(ROOT, 'dist', '_headers')) {
  const html = readFileSync(htmlPath, 'utf8')
  const hashes = inlineScriptHashes(html)
  if (hashes.length !== 1) throw new Error(`인라인 스크립트가 하나여야 한다 — 지금 ${hashes.length}개`)
  const text = headersText(hashes)
  writeFileSync(outPath, text, 'utf8')
  return { hashes, text }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { hashes } = makeHeaders()
  console.log(`dist/_headers  script-src ${hashes.join(' ')}`)
}
