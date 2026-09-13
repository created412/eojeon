// ── 함수 몸통을 잘라내는 한 벌 ──────────────────────────────────────────
//
// 소스를 훑는 검사들이 저마다 자기 bodyOf() 를 들고 있었다 — 일곱 파일에 일곱 벌.
// 그중 한 벌만 고쳐졌고 나머지 여섯은 같은 함정을 그대로 안고 있었다:
//
//   const open = src.indexOf('{', m.index + m[0].length)
//
// m[0] 은 **여는 괄호에서 끝난다**. 그래서 그다음 첫 「{」를 몸통으로 잡으면,
// 인자를 구조분해하는 함수(`function f({ a = 1 } = {})`)에서 **인자 목록의 중괄호**를
// 몸통으로 착각한다. 그 여섯 벌은 지금 보는 함수 중 구조분해하는 것이 하나도 없어
// 우연히 무사했을 뿐이다 — 검사 대상 함수 하나가 언젠가 그 모양으로 바뀌는 날,
// 여섯 벌이 동시에 조용히 통과한다.
//
// 그래서 한 벌로 모은다. 인자 목록을 먼저 괄호로 세어 건너뛴 뒤에 몸통을 찾는다.
// tests/helpers/body-of.test.js 가 실제 구조분해 인자로 이 한 벌을 시험한다.

// 여는 중괄호 자리에서 짝이 맞는 닫는 중괄호까지 — 바깥 중괄호는 뺀 안쪽만.
export function blockAt(src, open) {
  if (open < 0) throw new Error('여는 중괄호를 못 찾았다')
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i)
  }
  throw new Error('닫는 중괄호를 못 찾았다')
}

// 여는 괄호 자리에서 짝이 맞는 닫는 괄호 **다음** 자리를 돌려준다.
function afterArgs(src, openParen) {
  let depth = 0
  for (let i = openParen; i < src.length; i++) {
    if (src[i] === '(') depth++
    else if (src[i] === ')' && --depth === 0) return i + 1
  }
  throw new Error('인자 목록이 안 닫혔다')
}

// `function <name>( … ) { … }` 의 몸통. async·export 가 앞에 붙어도 상관없다.
// 「다음 함수 이름까지」로 자르지 않는다 — 사이에 새 함수가 끼면 검사 범위가
// 말없이 넓어져, 옮겨진 코드를 여전히 「안에 있다」고 세어 버린다.
export function bodyOf(src, name) {
  const m = new RegExp(`function\\s+${name}\\s*\\(`).exec(src)
  if (!m) throw new Error(`함수 ${name} 를 못 찾았다`)
  const openParen = m.index + m[0].length - 1
  return blockAt(src, src.indexOf('{', afterArgs(src, openParen)))
}

// 객체 메서드 축약형(`open(view) {`)은 `function` 이 없어 위 정규식에 안 걸린다.
// 이름을 주면 그 메서드의 몸통을 같은 방식으로 잘라낸다.
export function methodBodyOf(src, name) {
  const m = new RegExp(`(^|[^\\w.])${name}\\s*\\(`, 'm').exec(src)
  if (!m) throw new Error(`메서드 ${name} 를 못 찾았다`)
  const openParen = m.index + m[0].length - 1
  return blockAt(src, src.indexOf('{', afterArgs(src, openParen)))
}
