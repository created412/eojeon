// ── switch 의 case 라벨을 훑는 한 벌 ─────────────────────────────────────
//
// 두 벌이 갈려 있었다.
//   tests/systems/audio-wiring.test.js  /case '([a-z]+)':/     ← 홑따옴표·소문자만
//   tests/full-run.test.js              case ['"`]…['"`] :     ← 세 따옴표 다
//
// 앞의 것은 「게임이 재생하는 모든 비트 종류가 바닥 소리 표에 적혀 있다」를
// 증명하는 목록을 만든다. 그런데 `case "hold":`(겹따옴표)나 `case 'actEnd':`
// (대문자 섞임)는 그 목록에서 **조용히 빠진다** — 바닥 소리를 아무도 안 정한 채
// 초록불이 된다. 목록이 통째로 비면 가드가 잡지만, 한두 개가 새는 것은 못 잡는다.
//
// 그래서 한 벌로 모으고, 따옴표 세 종류·대문자·숫자·밑줄·붙임표를 다 받는다.

const LABEL = /case\s*(['"`])([^'"`\r\n]+)\1\s*:/g

// 몸통 안의 case 라벨을 적힌 순서대로 모두 돌려준다.
export function caseLabels(body) {
  return [...body.matchAll(LABEL)].map(m => m[2])
}

// 그 이름의 case 가 있는가 — 따옴표 종류를 가리지 않는다.
export function hasCaseLabel(body, name) {
  return caseLabels(body).includes(name)
}

// 그 case 라벨 바로 뒤에 붙은 글 — 「무엇으로 이어지는가」를 볼 때 쓴다.
// 다음 case(또는 default)까지만 자른다.
export function caseHandler(body, name) {
  const m = new RegExp(`case\\s*(['"\`])${name}\\1\\s*:`).exec(body)
  if (!m) return null
  const rest = body.slice(m.index + m[0].length)
  const next = rest.search(/\bcase\s*['"`]|\bdefault\s*:/)
  return next < 0 ? rest : rest.slice(0, next)
}
