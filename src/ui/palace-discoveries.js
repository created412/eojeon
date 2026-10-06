import { artifactById } from '../data/artifacts.js'
import { PALACE_LIFE_IDS, palaceLifeProgress } from '../systems/palace-discoveries.js'

const marks = {
  'life-towel': '<path d="M9 15h28v20H9zM9 28h28M13 19h20M14 31v4M20 31v4M26 31v4M32 31v4"/>',
  'life-brush': '<path d="m12 35 5-12L33 7l8 8-16 16-13 4ZM17 23l8 8M29 11l8 8M9 40h30"/>',
  'life-cloth': '<path d="M7 14h23v23H7zM11 18h15v15H11zM34 16h8v20h-8zM32 18h12M32 33h12M30 26h14M19 37c0 6 19 6 19-1"/>',
}
const icon = id => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${marks[id] ?? ''}</svg>`
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))

export function installDiscoveryStyle(doc = globalThis.document) {
  if (!doc?.head || doc.getElementById('palace-discovery-style')) return
  const style = doc.createElement('style')
  style.id = 'palace-discovery-style'
  style.textContent = `
  .palace-discovery-art{display:flex;justify-content:center;gap:14px;flex-wrap:wrap;margin:8px 0 18px}
  .palace-discovery-piece{display:flex;flex-direction:column;align-items:center;gap:7px;min-width:90px;max-width:160px;color:#75572f;font-size:15px;text-align:center}
  .palace-discovery-piece svg{width:68px;height:68px;padding:10px;border:1px solid #99794a77;border-radius:50%;background:#d7cba744}
  .palace-discovery-piece.unknown{color:#867e6c}.palace-discovery-piece.unknown svg{opacity:.35}
  .palace-discovery-collection{border-top:1px solid #9f927666;padding-top:12px;margin-top:12px}
  .palace-discovery-collection p{font-size:16px;line-height:1.6;text-align:center}
  .palace-discovery-collection .palace-discovery-open{display:block;margin:8px auto;min-height:44px;padding:10px 22px;font:inherit;cursor:pointer}
  .card.lore:has(.palace-discovery-art){font-family:var(--face-body,system-ui,'Malgun Gothic',sans-serif);text-align:center}
  .card.lore:has(.palace-discovery-art) h3{font-family:inherit;letter-spacing:0;font-size:26px;line-height:1.4}
  .card.lore:has(.palace-discovery-art) h3 small{display:block;letter-spacing:0;font-size:14px;margin-top:3px}
  .card.lore:has(.palace-discovery-art) .talkline{font-size:19px;line-height:1.6;text-wrap:balance}
  .card.lore:has(.palace-discovery-art) .rendered{font-size:13px;line-height:1.5;margin-top:6px;padding:5px}
  @media(max-height:560px){
    .card.lore:has(.palace-discovery-art){padding:12px 22px}
    .card.lore:has(.palace-discovery-art) h3{font-size:23px}
    .card.lore:has(.palace-discovery-art) h3 small{font-size:12px}
    .card.lore:has(.palace-discovery-art) .palace-discovery-art{margin:6px 0 10px}
    .card.lore:has(.palace-discovery-art) .palace-discovery-piece{font-size:13px;gap:3px}
    .card.lore:has(.palace-discovery-art) .palace-discovery-piece svg{width:45px;height:45px;padding:7px}
    .card.lore:has(.palace-discovery-art) .talkline{font-size:17px;line-height:1.5;margin-bottom:8px}
    .card.lore:has(.palace-discovery-art) .close{position:static;margin-top:8px;padding:8px;box-shadow:none}
  }
  `
  doc.head.appendChild(style)
}

// 물건 설명 앞에 놓는 간단한 기호. 실제 유물 사진이나 사료 그림으로 제시하지 않는다.
export function discoveryDecoration(artifact) {
  const ids = artifact?.collection ? PALACE_LIFE_IDS : PALACE_LIFE_IDS.filter(id => id === artifact?.id)
  if (!ids.length) return ''
  installDiscoveryStyle()
  return `<div class="palace-discovery-art">${ids.map(id => `<div class="palace-discovery-piece">${icon(id)}<span>${escape(artifactById(id).name)}</span></div>`).join('')}</div>`
}

// Q 아래 별도 발견모음. 첫 발견 전에는 존재를 드러내지 않고, 미발견 장소도 안내하지 않는다.
export function palaceCollectionHtml(state) {
  const progress = palaceLifeProgress(state)
  if (!progress.found.length) return ''
  installDiscoveryStyle()
  return `<div class="palace-discovery-collection"><p>궁살림의 흔적 · ${progress.found.length} / ${PALACE_LIFE_IDS.length}</p>
    <div class="palace-discovery-art">${PALACE_LIFE_IDS.map(id => {
      const found = progress.found.includes(id)
      return `<div class="palace-discovery-piece${found ? '' : ' unknown'}">${icon(id)}<span>${found ? escape(artifactById(id).name) : '아직 만나지 않은 손길'}</span></div>`
    }).join('')}</div>
    ${progress.unlocked ? '<button class="palace-discovery-open" data-palace-collection>궁을 움직이는 손길 다시 보기</button>' : '<p>다른 방에도 누군가 다녀간 흔적이 남아 있다.</p>'}
    <p>궁살림을 상상한 재구성 · 역사 사료와는 별도로 모읍니다.</p></div>`
}
