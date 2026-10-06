// 맺음 — 스물한 해를 한 장에 거두고, 그 뒤의 일을 적고, 「끝」을 찍는다.
//
// 선생님(2026-10-06): 「게임의 마무리가 그냥 도망치고 끝나? 뭔가 게임을 끝낸 거 같지 않고 그래.
// 마무리가 게임이 끝난 거 같은 느낌을 주게끔 마무리 다시 해 봐.」
//
// 그 말이 맞았다. 5막은 후원 뒷문으로 달아난 뒤 글 몇 장을 넘기면 곧바로 목록 화면(「오늘은
// 여기까지」)이 떴다 — 임금은 청군의 군영에 선 채였고, 학생은 무엇이 끝났는지 알 길이 없었다.
//
// 이제 끝은 이렇게 온다:
//   ① 궁으로 돌아온다(실록: 10월 23일 「창덕궁으로 환어하였다」).
//   ② 이 막에서 처음으로 **제 발로 걷는다** — 인정전의 어좌까지. 사흘 내내 남이 옮긴 걸음이었다.
//   ③ 어좌에 앉는다. 열두 살에 처음 앉았던 자리다.
//   ④ 맺음(이 파일과 ui/epilogue.js): 「당신이 지나온 스물한 해」 → 「그 뒤」 → 「御前 · 끝」.
//   ⑤ 나의 기록(예전의 목록 화면).
//
// 「당신이 지나온 …」은 학생마다 다르다 — 저울 앞에서, 급료의 보고 앞에서, 정강 앞에서 **무엇을
// 골랐는지**가 그대로 적힌다. 그리고 그 곁에 역사가 간 길이 적힌다. 매기지 않는다.
//
// 이 파일은 셈만 한다. DOM 을 모른다.
import { dilemmaById } from '../data/studies.js'
import { weighById } from '../data/weigh.js'

// state.decisions 에서 그 자리의 마지막 결정을 찾는다(같은 자리를 두 번 치를 일은 없지만 뒤의 것을 쓴다).
function lastDecision(state, prefix) {
  const all = state?.decisions ?? []
  for (let i = all.length - 1; i >= 0; i--) if (all[i].choiceId?.startsWith(prefix)) return all[i]
  return null
}

function dilemmaPick(state, id) {
  const d = lastDecision(state, `dilemma:${id}:`)
  if (!d) return null
  const optionId = d.choiceId.split(':')[2]
  return dilemmaById(id)?.options.find(o => o.id === optionId)?.text ?? null
}

function weighPick(state, id) {
  const d = lastDecision(state, `weigh:${id}:`)
  if (!d) return null
  return weighById(id)?.pans?.[d.choiceId.split(':')[2]]?.label ?? null
}

/**
 * 「당신이 지나온 스물한 해」의 다섯 줄. 막마다 한 줄 — 학생이 고른 것이 있으면 그 말이 들어간다.
 * 돌려주는 것: [{ year, text, yours }] — yours 는 그 줄에 학생의 선택이 실렸는가.
 */
export function epilogueRecap(state) {
  const weigh = weighPick(state, 'open1876')
  const ration = dilemmaPick(state, 'ration')
  const reform = dilemmaPick(state, 'reform')
  return [
    { year: '1863', yours: false,
      text: '열두 살에 남이 댄 가마를 타고 궁에 들어왔다. 고을에서 걷고 돈을 찍어, 아버지가 정한 궁을 지었다.' },
    { year: '1866 · 1871', yours: false,
      text: '정족산성에서는 기다렸다가 쏘아 이겼고, 광성보에서는 닿지 않는 포로 졌다. 아버지의 돌에 넉 자를 썼다.' },
    { year: '1876', yours: !!weigh,
      text: weigh
        ? `아버지가 물러났다. 저울 앞에서 당신은 「${weigh}」를 골랐다. 임금은 문을 열었다.`
        : '아버지가 물러났다. 임금은 혼자 저울 앞에 앉았고, 문을 열었다.' },
    { year: '1882', yours: !!ration,
      text: ration
        ? `열세 달을 기다린 가마를 열어 보았다. 그 보고를 듣고 당신은 「${ration}」를 골랐다. 나흘 뒤 난병이 궁에 들었고, 돌아온 아버지는 끌려갔다.`
        : '열세 달을 기다린 가마를 열어 보았다. 나흘 뒤 난병이 궁에 들었고, 돌아온 아버지는 끌려갔다.' },
    { year: '1884', yours: !!reform,
      text: reform
        ? `정강 열네 조를 읽었다. 당신은 「${reform}」를 골랐다. 정변은 사흘 만에 끝났다.`
        : '정강 열네 조를 읽었다. 정변은 사흘 만에 끝났다.' },
  ]
}

// 맺음의 걸음. 화면(ui/epilogue.js)은 이 차례대로 한 장씩 넘긴다.
export const EPILOGUE_PAGES = ['recap', 'after', 'close']
export function nextPage(page) {
  const i = EPILOGUE_PAGES.indexOf(page)
  return i < 0 || i >= EPILOGUE_PAGES.length - 1 ? null : EPILOGUE_PAGES[i + 1]
}
