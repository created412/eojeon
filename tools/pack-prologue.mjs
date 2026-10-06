// 오프닝 영상·연속 음악을 HTML 안에 싣는다.
//
//   node tools/pack-prologue.mjs
//
// 입력 : assets/video/eojeon-prologue-v23-web.mp4          (원본 V23 을 H.264 CRF 28 · 720p · 무음으로 다시 담은 것, 4.9MB)
//        assets/video/eojeon-prologue-continuous-web.m4a   (연속 사운드트랙 AAC 80kbps, 1.3MB)
// 출력 : src/ui/prologue-media-data.js                      (base64 — 실행 때 Blob URL 로 푼다, ui/prologue.js)
//
// 선생님(2026-10-06): 「오프닝 영상을 html에 넣고」. 그동안 영상은 HTML 곁의 파일이었다 — HTML 만
// 건네면 오프닝이 안 떴다. 이제 파일 하나다.
// 왜 다시 담는가: 원본(25.6MB, 12.9Mbps)을 그대로 넣으면 base64 로 34MB 가 붙어 HTML 이 50MB 를 넘고,
// Cloudflare Pages 의 파일 하나 상한(25MiB)을 넘는다. CRF 28 은 720p 화면에서 원본과 구별이 안 된다
// (한 프레임을 나란히 놓고 봤다). 원본은 assets/video/ 에 그대로 둔다 — 다시 담을 때 그것에서 담는다.
//
// 다시 담기(imageio-ffmpeg 의 ffmpeg):
//   ffmpeg -i assets/video/eojeon-prologue-v23.mp4 -an -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart assets/video/eojeon-prologue-v23-web.mp4
//   ffmpeg -i assets/video/eojeon-prologue-continuous.m4a -c:a aac -b:a 80k -movflags +faststart assets/video/eojeon-prologue-continuous-web.m4a
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VIDEO = join(ROOT, 'assets', 'video', 'eojeon-prologue-v23-web.mp4')
const AUDIO = join(ROOT, 'assets', 'video', 'eojeon-prologue-continuous-web.m4a')
const OUT = join(ROOT, 'src', 'ui', 'prologue-media-data.js')

const video = readFileSync(VIDEO)
const audio = readFileSync(AUDIO)
const sha = b => createHash('sha256').update(b).digest('hex')

const js = `// 자동 생성 — tools/pack-prologue.mjs. 손으로 고치지 않는다.
// 영상 ${video.length} 바이트 sha256 ${sha(video)}
// 음악 ${audio.length} 바이트 sha256 ${sha(audio)}
export const PROLOGUE_VIDEO_MIME = 'video/mp4'
export const PROLOGUE_AUDIO_MIME = 'audio/mp4'
export const PROLOGUE_VIDEO_BYTES = ${video.length}
export const PROLOGUE_AUDIO_BYTES = ${audio.length}
export const PROLOGUE_VIDEO_B64 = '${video.toString('base64')}'
export const PROLOGUE_AUDIO_B64 = '${audio.toString('base64')}'
`
writeFileSync(OUT, js)
console.log(`prologue-media-data.js  영상 ${(video.length / 1024).toFixed(0)} KB · 음악 ${(audio.length / 1024).toFixed(0)} KB → ${(js.length / 1024).toFixed(0)} KB`)
