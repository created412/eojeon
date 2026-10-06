// 선생님(2026-10-06): 「선택지마다 그림을 만들어 힉스필드로」.
// 각 보기의 뜻을 그린 재구성이다. 정오 정보는 이미지 선택에 사용하지 않는다.
import { CHOICE_ART } from './choice-art-data.js'

export const choiceArtKey = (kind, id, step, option) =>
  kind === 'dilemma' ? `d:${id}:${option}` : kind === 'word' ? `w:${option}` : `s:${id}:${step}:${option}`

export function choiceArtHtml(key, caption = '선택지를 그린 재구성') {
  const src = CHOICE_ART[key]
  if (!src) return ''
  // 닫힌 문 앞에 놓인 서계는 그림 아래쪽에 있다. 가로 카드에서도 봉투를 잘라 버리지 않는다.
  const focus = key === 'd:seogye:refuse' ? '50% 100%' : '50% 50%'
  return `<span class="choice-art"><img src="${src}" alt="" decoding="async" style="object-position:${focus}"><small>${caption}</small></span>`
}

export const CHOICE_ART_CSS = `
.choice-art{display:block;position:relative;overflow:hidden;background:#242a2b}
.choice-art img{display:block;width:100%;height:100%;object-fit:cover}
.choice-art small{position:absolute;right:7px;bottom:6px;color:#f4efe3;background:#151b20d9;padding:2px 6px;border-radius:3px;font:11px/1.5 system-ui,sans-serif;letter-spacing:0}
`
