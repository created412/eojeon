import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = 'dist/어전.html'

describe('단일 HTML 빌드', () => {
  beforeAll(() => {
    // 다른 작업자가 산출물을 만드는 동안에는 기존 HTML을 읽기만 한다.
    if (process.env.EOJEON_TEST_EXISTING_BUILD === '1') return
    execFileSync('node', ['build.mjs'], { stdio: 'inherit' })
  }, 120000)

  it('dist/어전.html 을 만든다', async () => {
    const s = await stat(OUT)
    expect(s.isFile()).toBe(true)
  })

  it('사용자가 여는 루트 어전.html에도 같은 최신 빌드를 쓴다', async () => {
    const [distribution, entry] = await Promise.all([readFile(OUT), readFile('어전.html')])
    expect(entry.equals(distribution)).toBe(true)
  })

  // 네트워크 요청이 아닌, 남아 있어도 안전한 URL 문자열
  //  - w3.org 네임스페이스: XML 네임스페이스 식별자일 뿐 가져오지 않는다
  //  - jcgt.org: GLSL 셰이더 문자열 안의 인용 주석
  // Original-source / image-license links are navigation only. Images stay data URLs.
  const ALLOWED = /https?:\/\/(?:www\.w3\.org|jcgt\.org|commons\.wikimedia\.org|creativecommons\.org|www\.kogl\.or\.kr|contents\.history\.go\.kr|www\.naturalearthdata\.com)\/[^\s"'`)\\]*/gi

  it('외부 리소스를 참조하지 않는다', async () => {
    const html = await readFile(OUT, 'utf8')
    expect(html).not.toMatch(/<script[^>]+src=/i)
    expect(html).not.toMatch(/<link[^>]+href=/i)
    const leftovers = html.replace(ALLOWED, '').match(/https?:\/\/[^\s"'`)\\]*/gi) ?? []
    expect(leftovers).toEqual([])
  })

  it('허용 목록에 없는 외부 URL은 반드시 잡아낸다', async () => {
    // 안전망 자체가 동작하는지 검사한다 — 이 테스트가 없으면
    // 검사가 언제 무력해졌는지 알 수 없다
    const html = await readFile(OUT, 'utf8')
    const poisoned = html + `\n<!-- fetch("https://cdn.example.com/evil.js") -->`
    const leftovers = poisoned.replace(ALLOWED, '').match(/https?:\/\/[^\s"'`)\\]*/gi) ?? []
    expect(leftovers).toContain('https://cdn.example.com/evil.js')
  })

  // 제목표는 사실이 변하는 값을 담을 자리가 아니다. 화면 안의 연도는 actSpan() 이
  // 막에서 뽑지만 <title> 은 손으로 박혀 있어, 5막이 붙을 때마다 학생이 게임보다
  // 먼저 보는 자리에서 연도가 틀린다. 그래서 이름만 남긴다.
  it('탭 제목에 네 자리 연도가 없다 — index.html', async () => {
    const html = await readFile('index.html', 'utf8')
    const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ''
    expect(title.trim()).toBe('어전 御前')
    expect(title).not.toMatch(/\d{4}/)
  })

  it('탭 제목에 네 자리 연도가 없다 — dist', async () => {
    const html = await readFile(OUT, 'utf8')
    const title = /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ''
    expect(title.trim()).toBe('어전 御前')
    expect(title).not.toMatch(/\d{4}/)
  })

  // 설계서(2026-09-03)의 목표는 8MB 였다. 2026-09-13 선생님 요청으로 인물 대사 음성 71줄(32kbps,
  // 약 1.7MB)을 파일 안에 넣으면서 12MB 로 올렸다 — 게임은 여전히 파일 하나로 오프라인에서 돈다.
  // 이 수를 또 올리기 전에 먼저 줄일 것(이미지·음성 압축)을 찾는다.
  // 2026-09-14 BGM 두 곡(Lyria · 모노 Opus 32kbps, 약 670KB)을 더하며 13MB 로 올렸다.
  it('13MB 이하다', async () => {
    const s = await stat(OUT)
    expect(s.size).toBeLessThan(13 * 1024 * 1024)
  })
})

// ── 임시 통로가 학생에게 나가지 않는다 ─────────────────────────────────
//
// 만드는 동안 main.js 는 장면 하나만 눈으로 보려고 globalThis 에 통로를 뚫어 두었다
// (__go5 · __g · __c2 · __escape · __gukjang · __hold · __f2 · __game). 다섯 막이
// 다 붙어 실제 진행으로 도는 지금 그것들은 쓸모가 없고, 학생 화면에 남으면
// 콘솔 한 줄로 막을 건너뛰거나 flags 를 손댈 수 있다.
//
// 그래서 「소스에 없다」가 아니라 **빌드 산출물에 없다**를 검사한다 — 학생이 받는
// 것은 이 파일 하나이기 때문이다.
describe('임시 통로가 빌드에 실리지 않는다', () => {
  // 이름이 __ 로 시작하는 **전역 대입**만 본다. three.js 가 객체에 붙이는
  // obj.__webglTexture = … 같은 내부 속성은 전역이 아니므로 걸리지 않는다.
  const GLOBAL_ASSIGN =
    /(?:globalThis|window|self|global)\s*(?:\.\s*(__[A-Za-z0-9_$]*)|\[\s*["'`](__[A-Za-z0-9_$]*)["'`]\s*\])\s*=(?!=)/g

  // 예외는 하나뿐이고, 이유는 하나뿐이다: __THREE__ 는 **우리가 넣은 것이 아니라**
  // three.js 가 번들 안에서 스스로 심는 판번호다(three/src/Three.js). 우리 소스를
  // 아무리 고쳐도 사라지지 않으므로 여기서 비켜 준다.
  //
  // ⛔ 이 목록에 이름을 더하지 마라. 여기 이름을 더한다는 것은 곧 학생 화면에
  //    통로를 하나 여는 것이다. 새 통로가 필요하면 통로를 만들지 말고,
  //    그 장면을 부르는 순수 함수를 테스트에서 직접 부르는 쪽으로 가라
  //    (hold-screen.test.js · brush-trace.test.js 가 그렇게 한다).
  const NOT_OURS = '__THREE__'

  function ourGlobals(html) {
    const found = new Set()
    for (const m of html.matchAll(GLOBAL_ASSIGN)) {
      const name = m[1] ?? m[2]
      if (name !== NOT_OURS) found.add(name)
    }
    return [...found].sort()
  }

  it('__ 로 시작하는 전역 대입이 하나도 없다', async () => {
    const html = await readFile(OUT, 'utf8')
    expect(ourGlobals(html), '임시 통로가 학생에게 나가는 파일에 남아 있다').toEqual([])
  })

  it('통로가 되살아나면 반드시 잡아낸다 — 안전망 자체를 시험한다', async () => {
    const html = await readFile(OUT, 'utf8')
    expect(ourGlobals(html + '\nglobalThis.__hold=()=>{};window["__go5"]=1;')) 
      .toEqual(['__go5', '__hold'])
  })

  // 소스 쪽도 함께 잠근다 — 빌드 검사만 있으면 「빌드를 안 돌린 채 커밋」에서 샌다.
  it('src/ 안에 globalThis.__ 통로가 없다', async () => {
    const files = await readdir('src', { recursive: true })
    for (const f of files) {
      if (!f.endsWith('.js')) continue
      const src = await readFile(join('src', f), 'utf8')
      expect(ourGlobals(src), `src/${f} 에 임시 통로가 있다`).toEqual([])
    }
  })
})

// ── esbuild 가 한글을 이스케이프한다 — 산출물에서 우리말을 훑는 검사의 함정 ──
//
// Task 15 에서 우연히 밟았다. `dist/어전.html` 안에서 「갑신일록」을 찾으면 **없다.**
// esbuild 가 번들 안의 ASCII 밖 글자를 전부 대문자 `\uXXXX` 로 바꾸기 때문이다.
// 반면 `index.html` 껍데기에서 온 글(<title> 의 「어전 御前」)은 그대로다.
//
// 그래서 산출물에서 우리말을 훑는 검사는 **두 가지가 다 잘못될 수 있다.**
//   ① 「있어야 한다」 — 원문 그대로만 찾으면 늘 실패한다(그건 눈에 띈다).
//   ② 「없어야 한다」 — 원문 그대로만 찾으면 **늘 통과한다.** 아무것도 안 보면서
//      초록불이다. 이 프로젝트가 반복해서 물린 가장 조용한 형태다.
//
// 앞으로 산출물에서 우리말을 훑을 일이 있으면 아래 distHasText() 를 쓴다.
describe('산출물에서 우리말을 찾을 때는 이스케이프까지 본다', () => {
  // ASCII 밖 글자만 \uXXXX(대문자)로 바꾼다 — 공백·따옴표는 그대로다.
  function escapeNonAscii(s) {
    return [...s].map(c => (c.charCodeAt(0) < 128
      ? c
      : String.fromCharCode(92) + 'u' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'))).join('')
  }

  // 산출물 안에 이 글이 있는가 — 원문과 이스케이프본을 모두 본다.
  function distHasText(html, s) {
    return html.includes(s) || html.includes(escapeNonAscii(s))
  }

  it('번들 안의 우리말은 원문 그대로는 안 보이고 이스케이프본으로 보인다', async () => {
    const html = await readFile(OUT, 'utf8')
    // 5막 F2 가 붓을 놓은 뒤 보여 주는 문서 이름 — 번들(JS) 안에만 있는 글이다
    const inBundle = '갑신일록'
    expect(html.includes(inBundle), '원문 그대로 찾혔다 — 이 시험의 전제가 바뀌었다').toBe(false)
    expect(distHasText(html, inBundle), '이스케이프본으로도 못 찾았다').toBe(true)
  })

  it('껍데기(index.html)에서 온 글은 원문 그대로 있다 — 둘을 섞어 짐작하지 않는다', async () => {
    const html = await readFile(OUT, 'utf8')
    expect(html.includes('어전 御前')).toBe(true)
  })

  // 「없어야 한다」를 원문만으로 훑으면 아무것도 안 보면서 통과한다는 것을
  // 그 자리에서 보인다 — 이 시험이 그 함정 자체의 증거다.
  it('원문만 훑는 「없어야 한다」는 헛돈다 — 실제로 있는 글에도 통과한다', async () => {
    const html = await readFile(OUT, 'utf8')
    const 헛돈다 = !html.includes('갑신일록')          // 있는데도 참이다
    const 제대로본다 = !distHasText(html, '갑신일록')   // 있으므로 거짓이다
    expect(헛돈다).toBe(true)
    expect(제대로본다).toBe(false)
  })

  // 실제로 쓰는 자리 — 이번에 고친 두 문구가 학생이 받는 파일에 실려 있는가.
  // (판정 R97 붓 화면 · 판정 R100 못 읽는 저장 알림)
  it('이번에 고친 문구가 학생이 받는 파일에 실제로 실려 있다', async () => {
    const html = await readFile(OUT, 'utf8')
    for (const s of [
      '네 글자를 한 자씩 따라 씁니다',            // 붓을 대기 전 판(R97)
      '다 쓰고 나서 밝힙니다',                    // 쓰는 동안의 출처 자리(R97)
      '게임이 새 판으로 바뀌어 이어 할 수 없습니다',  // 못 읽는 저장 알림(R100)
      ' 해 동안 이 궁에서 저 궁으로 옮겨 다녔다.',  // 타이틀 햇수(R101) — 앞의 수는 아래 참조
      '열아홉 해가 지났다',                       // 4막 첫 줄(R101)
    ]) {
      expect(distHasText(html, s), `산출물에 「${s}」가 없다`).toBe(true)
    }
  })

  // 타이틀의 햇수는 산출물에 **글자로 없다.** 그것이 옳다 — actSpan() 이 실행할 때
  // 세기 때문이다(판정 R101). 「스물한」이 번들에 리터럴로 박히는 순간 그 값은
  // 다시 손으로 적은 값이 되고, 막이 하나 붙는 날 조용히 거짓말이 된다.
  it('타이틀의 햇수는 번들에 글자로 박혀 있지 않다 — 실행할 때 센다', async () => {
    const html = await readFile(OUT, 'utf8')
    expect(distHasText(html, '스물한 해 동안'), '햇수가 리터럴로 박혔다').toBe(false)
    expect(distHasText(html, ' 해 동안 이 궁에서'), '문장 자체가 사라졌다').toBe(true)
  })

  it('되돌아가면 안 되는 옛 문구는 산출물에 없다', async () => {
    const html = await readFile(OUT, 'utf8')
    for (const s of [
      '스무 해 동안 이 궁에서 저 궁으로',   // R101 이전 타이틀
      '스무 해가 지났다',                   // R101 이전 4막
      '그중 스스로 정한 것은',              // R98 이전 마지막 화면
      '함께 나라를 떠났다',                 // I1 이전 윤치호
    ]) {
      expect(distHasText(html, s), `산출물에 옛 문구 「${s}」가 남아 있다`).toBe(false)
    }
  })
})
