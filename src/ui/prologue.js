// 2026-10-05: 첫 화면은 V23 영상이다. 마지막 6초는 시작을 누를 때까지 반복한다.
// 2026-10-06 선생님: 「오프닝 영상을 html에 넣고」. 영상·연속 음악은 base64 로 HTML 안에 있다
// (ui/prologue-media-data.js ← tools/pack-prologue.mjs). 실행 때 Blob URL 로 풀어 <video> 에 건다 —
// data: URL 은 수 MB 에서 되감기(49초로 돌아가기)가 느리거나 막히는 브라우저가 있다.
// 아래 파일 경로는 자료가 비어 있을 때(시험이 자료 모듈을 비워 끼운다)의 예비 길이다.
import { PROLOGUE_VIDEO_B64, PROLOGUE_AUDIO_B64, PROLOGUE_VIDEO_MIME, PROLOGUE_AUDIO_MIME } from './prologue-media-data.js'
export const PROLOGUE_SRC = './assets/video/eojeon-prologue-v23.mp4'
export const PROLOGUE_AUDIO_SRC = './assets/video/eojeon-prologue-continuous.m4a'
export const PROLOGUE_EMBEDDED = PROLOGUE_VIDEO_B64.length > 0

// base64 → Blob URL. 한 번에 푼다(5MB 에 수십 ms). 못 풀면 null — 파일 경로로 간다.
function mediaUrl(b64, mime) {
  if (!b64) return null
  try {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return URL.createObjectURL(new Blob([bytes], { type: mime }))
  } catch { return null }
}
export const PROLOGUE_MUSIC_LOOP_START = 59
export const PROLOGUE_TAIL_SECONDS = 6
const CSS = `
.prologue{position:fixed;inset:0;z-index:110;background:#080b0c;color:#f3ead9;display:flex;
 align-items:center;justify-content:center;opacity:1;transition:opacity .65s ease}
.prologue.prologue-leaving{opacity:0;pointer-events:none}
.prologue video{width:100%;height:100%;object-fit:contain;display:block}
.prologue .prologue-bar{position:absolute;inset:0 0 auto;display:flex;align-items:center;justify-content:space-between;
 gap:16px;padding:16px 24px;background:linear-gradient(#000b,transparent)}
.prologue .prologue-note{font-size:12px;line-height:1.6;text-shadow:0 1px 4px #000}
.prologue .prologue-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.prologue button{font:inherit;font-size:13px;color:#f3ead9;background:#10282de6;border:1px solid #c9b88e77;
 border-radius:4px;padding:10px 14px;min-height:44px;cursor:pointer;touch-action:manipulation}
.prologue button:hover,.prologue button:focus-visible{background:#34504c;outline:2px solid #ddc89d;outline-offset:2px}
.prologue .prologue-entry{position:absolute;right:max(24px,env(safe-area-inset-right));bottom:max(28px,env(safe-area-inset-bottom));
 display:flex;flex-direction:column;align-items:flex-end;gap:10px;max-width:min(520px,calc(100% - 48px))}
.prologue .prologue-start{font-size:20px;font-weight:700;letter-spacing:.08em;padding:17px 34px;
 min-width:210px;color:#17282b;background:#d4bb83;border:1px solid #f1dcaa;box-shadow:0 3px 28px #0008}
.prologue .prologue-start:hover,.prologue .prologue-start:focus-visible{background:#efdaa6}
.prologue .prologue-notice{margin:0;font-size:13px;line-height:1.65;background:#0b121be8;padding:12px 16px;border-radius:4px}
.prologue .prologue-status{position:absolute;left:20px;right:20px;top:46%;text-align:center;font-size:14px;text-shadow:0 2px 5px #000}
.prologue .prologue-wait{position:absolute;left:50%;top:56%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px}
.prologue .prologue-wait-resume{font-size:14px;padding:10px 18px}
.prologue .prologue-info{position:absolute;left:20px;bottom:24px;max-width:min(520px,calc(100% - 260px));font-size:11px}
.prologue .prologue-info summary{cursor:pointer;min-height:44px;display:flex;align-items:center;text-shadow:0 1px 4px #000}
.prologue .prologue-info p{margin:0;padding:10px;background:#081116eb;line-height:1.6}
.prologue[hidden],.prologue [hidden]{display:none}
@media(max-width:600px){.prologue .prologue-bar{padding:10px;gap:6px;flex-wrap:wrap}
 .prologue .prologue-actions{margin-left:auto;gap:5px}.prologue .prologue-note{font-size:10px}
 .prologue .prologue-entry{right:16px;bottom:24px;max-width:calc(100% - 32px)}
 .prologue .prologue-start{min-width:170px;font-size:18px;padding:13px 23px}
 .prologue .prologue-info{left:12px;bottom:18px;max-width:calc(100% - 210px)}
 .prologue .prologue-info[open]{bottom:95px;max-width:calc(100% - 24px)}}
/* 선생님(2026-10-09, 휴대전화 화면): 「모바일이나 패드사용시 일시정지를 눌러야 재생이 됌. 소리와 함께 재생을 눌러야
   재생되도록 해야하며, 저 선택지들이 너저분하게 널려있어서 영상시청에 방해가 됌」.
   · 자동 재생이 막힌 동안(prologue-waiting)에는 단추 띠·안내를 모두 숨기고 **「소리와 함께 재생」 하나만** 크게 둔다.
     영상을 짚어도 같은 일이 난다(재생 중에 짚으면 멈추고, 다시 짚으면 잇는다).
   · 손가락 기기(pointer:coarse)·좁은 화면에서는 「일시 정지」「조작 안내」를 띠에서 뺀다 — 멈춤은 영상을 짚는 것으로
     되고, 조작 안내는 게임 안의 「?」 단추에 있다. 남는 것은 소리·건너뛰기·(저장이 있으면) 이어서 하기 한 줄뿐이다. */
.prologue.prologue-waiting .prologue-bar,.prologue.prologue-waiting .prologue-info{display:none}
.prologue .prologue-retry{font-size:18px;font-weight:700;letter-spacing:.06em;padding:16px 30px;min-width:220px;
 color:#17282b;background:#d4bb83;border:1px solid #f1dcaa;box-shadow:0 3px 28px #0008}
.prologue .prologue-retry:hover,.prologue .prologue-retry:focus-visible{background:#efdaa6}
@media(pointer:coarse),(max-width:600px){
 .prologue .prologue-pause,.prologue .prologue-help{display:none}
 .prologue .prologue-bar{flex-direction:column;align-items:stretch;gap:6px;padding:10px 12px}
 .prologue .prologue-actions{flex-wrap:nowrap;justify-content:flex-end;gap:6px}
 .prologue .prologue-actions button{font-size:12px;padding:8px 10px;min-height:40px;white-space:nowrap}}
@media(prefers-reduced-motion:reduce){.prologue{transition:none}}
`
let styled = false
export function createPrologue(root) {
  let cancel = null
  function close() { cancel?.(); cancel = null }
  return {
    close,
    isOpen: () => cancel !== null,
    open({ audio = null, onDone, onResume, hasSave = false, notice = '', onHelp } = {}) {
      close()
      if (!styled) { const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style); styled = true }
      const el = document.createElement('section')
      el.className = 'prologue'; el.setAttribute('aria-label', '어전 프롤로그')
      const video = document.createElement('video')
      const videoUrl = mediaUrl(PROLOGUE_VIDEO_B64, PROLOGUE_VIDEO_MIME)
      const audioUrl = mediaUrl(PROLOGUE_AUDIO_B64, PROLOGUE_AUDIO_MIME)
      video.src = videoUrl ?? PROLOGUE_SRC; video.preload = 'auto'; video.playsInline = true
      video.setAttribute('playsinline', ''); video.setAttribute('aria-label', '어전 — 폭풍과 왕의 맹세')
      // 영상의 6초 반복과 음악의 시간을 분리한다. 대사도 이 사운드트랙에 그대로 있다.
      video.muted = true
      const soundtrack = document.createElement('audio')
      soundtrack.src = audioUrl ?? PROLOGUE_AUDIO_SRC; soundtrack.preload = 'auto'
      soundtrack.muted = audio?.isMuted() ?? false
      const bar = document.createElement('div'); bar.className = 'prologue-bar'
      const note = document.createElement('span'); note.className = 'prologue-note'
      note.textContent = 'AI 재구성 영상 · 실제 인물의 모습과 당시 기록 영상이 아닙니다.'
      const actions = document.createElement('div'); actions.className = 'prologue-actions'
      function button(text, parent = actions) { const b = document.createElement('button'); b.textContent = text; parent.appendChild(b); return b }
      const sound = button(''), pause = button('일시 정지'), skip = button('영상 건너뛰기')
      pause.className = 'prologue-pause'
      const resume = hasSave ? button('이어서 하기') : null
      const help = onHelp ? button('조작 안내') : null
      if (help) help.className = 'prologue-help'
      const entry = document.createElement('div'); entry.className = 'prologue-entry'; entry.hidden = true
      if (notice) { const p = document.createElement('p'); p.className = 'prologue-notice'; p.textContent = notice; entry.appendChild(p) }
      const start = button('게임 시작  →', entry); start.className = 'prologue-start'; start.setAttribute('aria-label', '게임 시작')
      const restartCheck = document.createElement('div'); restartCheck.hidden = true
      const restartNote = document.createElement('p'); restartNote.className = 'prologue-notice'
      // 선생님(2026-10-06): 「게임 시작할 때 기록유지해도 유지한 상태에서 시작이 안돼. 어차피 기록을
      // 지우고 시작만 실제로는 작동하게 되어있어.」 예전의 「기록 유지」는 물음을 닫고 「게임 시작」
      // 단추로 되돌아갈 뿐이었다 — 아무것도 시작하지 않았다. 이제 기록을 유지하면 그 기록으로
      // **이어서 들어간다**(위쪽 「이어서 하기」와 같은 길).
      restartNote.textContent = '저장된 기록이 있습니다. 기록을 유지하고 이어서 할까요, 지우고 새로 시작할까요?'
      restartCheck.appendChild(restartNote)
      const keepSave = button('기록을 유지하고 이어서 하기', restartCheck), restart = button('기록을 지우고 새로 시작', restartCheck)
      entry.appendChild(restartCheck)
      // 막힌 동안 보이는 상자 — 「소리와 함께 재생」 하나, 저장이 있으면 그 아래 「이어서 하기」(영상을 틀지 않고도
      // 들어갈 수 있어야 한다 — 지난 차시 학생은 영상을 다시 볼 까닭이 없다).
      const waitBox = document.createElement('div'); waitBox.className = 'prologue-wait'; waitBox.hidden = true
      const retry = button('소리와 함께 재생', waitBox); retry.className = 'prologue-retry'
      const resumeWait = hasSave ? button('이어서 하기', waitBox) : null
      if (resumeWait) resumeWait.className = 'prologue-wait-resume'
      const status = document.createElement('div'); status.className = 'prologue-status'; status.setAttribute('role', 'status')
      status.hidden = true
      const info = document.createElement('details'); info.className = 'prologue-info'
      info.innerHTML = '<summary>안내 · 출처</summary><p>이어폰이 없으면 소리를 끄고 하세요.<br>음악: Suno · 「폭풍과 왕의 맹세」와 어전을 위해 만든 장면별 연주곡.<br>본문 글꼴: Pretendard(Kil Hyung-jin), 게임에 쓰이는 글자만 포함 · SIL Open Font License 1.1.</p>'
      bar.append(note, actions); el.append(video, soundtrack, bar, status, waitBox, entry, info); root.appendChild(el)
      let finished = false, removed = false, ready = false, tailRequested = false, failed = false, fadeTimer = null, fadeFrame = null
      let pictureLoop = false, wantsPlayback = false
      const tailStart = () => Math.max(0, video.duration - PROLOGUE_TAIL_SECONDS)
      function release() {
        if (removed) return
        removed = true; cancel = null; clearTimeout(fadeTimer); cancelAnimationFrame(fadeFrame)
        for (const media of [video, soundtrack]) { media.pause(); media.removeAttribute('src'); media.load() }
        for (const url of [videoUrl, audioUrl]) if (url) URL.revokeObjectURL(url)   // 푼 영상의 메모리를 돌려준다
        el.remove()
      }
      cancel = () => { finished = true; release() }
      function finish(callback) {
        if (finished) return
        finished = true; video.pause()
        try { audio?.unlock()?.catch?.(() => {}) } catch { /* 영상 소리 없이도 시작한다 */ }
        bar.hidden = true; entry.hidden = true; waitBox.hidden = true; status.hidden = true; info.hidden = true
        el.classList.add('prologue-leaving')
        // 1막 음악이 올라오는 동안 오프닝 음악을 천천히 내린다.
        const began = performance.now(), volume = soundtrack.volume
        const fade = now => {
          if (removed) return
          const progress = Math.max(0, Math.min(1, (now - began) / 1400))
          soundtrack.volume = volume * (1 - progress)
          if (progress < 1) fadeFrame = requestAnimationFrame(fade)
          else release()
        }
        fadeFrame = requestAnimationFrame(fade); fadeTimer = setTimeout(release, 1600)
        callback?.()
      }
      function showEntry() { if (finished) return; ready = true; entry.hidden = false; skip.hidden = true }
      function mediaError() {
        if (finished) return
        failed = true; wantsPlayback = false; video.pause(); soundtrack.pause(); video.hidden = true; pause.hidden = true; waitBox.hidden = true
        status.hidden = false; status.textContent = '영상을 불러오지 못했습니다. 게임 시작을 누르면 진행할 수 있습니다.'
        showEntry()
      }
      function paintSound() { sound.textContent = soundtrack.muted ? '소리 켜기' : '소리 끄기'; sound.setAttribute('aria-pressed', String(!soundtrack.muted)) }
      function play() {
        if (finished || failed) return
        wantsPlayback = true; waitBox.hidden = true; el.classList.remove('prologue-waiting')
        const denied = error => {
          if (finished || error.name === 'AbortError') return
          if (error.name !== 'NotAllowedError') { mediaError(); return }
          wantsPlayback = false; video.pause(); soundtrack.pause()
          retry.textContent = soundtrack.muted ? '영상 재생' : '소리와 함께 재생'
          waitBox.hidden = false; status.hidden = true
          // 막힌 동안에는 이 단추 하나만 보인다 — 띠와 안내는 CSS 가 숨긴다(prologue-waiting).
          el.classList.add('prologue-waiting')
        }
        try {
          // 소리가 허용되기 전에는 화면만 무음으로 흘려보내지 않는다.
          Promise.resolve(soundtrack.play()).then(() => {
            if (!finished && wantsPlayback) video.play()?.catch(denied)
          }).catch(denied)
        } catch(error) { denied(error) }
      }
      paintSound()
      sound.addEventListener('click', () => {
        const muted = !soundtrack.muted
        if (audio && audio.isMuted() !== muted) audio.toggleMuted()
        soundtrack.muted = muted; paintSound()
        if (!muted) { try { audio?.unlock()?.catch?.(() => {}) } catch { /* 사용자 조작 때 재시도 */ } }
        if (!waitBox.hidden) play()
      })
      retry.addEventListener('click', () => play())
      function pauseBoth() { wantsPlayback = false; video.pause(); soundtrack.pause(); pause.textContent = '계속 재생' }
      // 영상을 짚으면 재생/멈춤 — 손가락 기기에서는 「일시 정지」 단추가 없다(위 CSS 주석).
      video.addEventListener('click', () => { if (finished || failed) return; if (!wantsPlayback) play(); else pauseBoth() })
      pause.addEventListener('click', () => { if (!wantsPlayback) play(); else pauseBoth() })
      function seekTail(skipAhead = false) {
        if (finished || failed) return
        showEntry(); tailRequested = true
        if (Number.isFinite(video.duration)) {
          video.currentTime = tailStart(); tailRequested = false; pictureLoop = true
          if (skipAhead && soundtrack.currentTime < tailStart()) soundtrack.currentTime = tailStart()
          play()
        }
      }
      skip.addEventListener('click', () => seekTail(true))
      start.addEventListener('click', () => {
        if (!ready) return
        if (hasSave) { restartCheck.hidden = false; start.hidden = true; keepSave.focus(); return }
        finish(onDone)
      })
      keepSave.addEventListener('click', () => finish(onResume))
      restart.addEventListener('click', () => finish(onDone))
      resume?.addEventListener('click', () => finish(onResume))
      resumeWait?.addEventListener('click', () => finish(onResume))
      help?.addEventListener('click', async () => {
        const wasPlaying = wantsPlayback
        pauseBoth(); el.hidden = true
        try { await onHelp() } finally { if (!finished) { el.hidden = false; if (wasPlaying) play(); help.focus() } }
      })
      video.addEventListener('loadedmetadata', () => { if (tailRequested) seekTail(true) })
      video.addEventListener('timeupdate', () => { if (Number.isFinite(video.duration) && video.currentTime >= tailStart()) showEntry() })
      video.addEventListener('playing', () => { if (finished) return; status.hidden = true; waitBox.hidden = true; el.classList.remove('prologue-waiting'); pause.textContent = '일시 정지' })
      video.addEventListener('ended', () => seekTail())
      // 최초 55초의 입 모양·대사는 같은 시각을 따른다. 끝 장면 반복에서는 음악을 되감지 않는다.
      soundtrack.addEventListener('timeupdate', () => {
        if (finished || failed || pictureLoop || !wantsPlayback || video.seeking) return
        if (soundtrack.currentTime >= 55) { seekTail(); return }
        if (Math.abs(video.currentTime - soundtrack.currentTime) > .3) video.currentTime = soundtrack.currentTime
      })
      soundtrack.addEventListener('ended', () => {
        if (finished || failed || !wantsPlayback) return
        soundtrack.currentTime = PROLOGUE_MUSIC_LOOP_START; play()
      })
      soundtrack.addEventListener('error', mediaError)
      video.addEventListener('error', mediaError)
      play()
    },
  }
}
