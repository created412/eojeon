import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { installTypeVars } from '../../src/ui/type-css.js'
import { FONTS, FONT_FAMILY } from '../../src/ui/font-data.js'

// ── 왜 이 파일이 있는가 ────────────────────────────────────────────────
// 2026-09-26 읽는 화면의 활자를 다시 짰다. 그런데 고친 것은 **크기**뿐이었다.
// 얼굴은 `"Pretendard","Apple SD Gothic Neo","Malgun Gothic",…` 이라는 **이름표**만
// 적혀 있었고, 교실 컴퓨터에는 Pretendard 가 깔려 있지 않으니 그 이름표는 언제나
// 맑은 고딕에서 멈췄다. 2026-09-27 선생님:
//
//     「폰트의 문제인데 그냥 글자 크기를 키워버렸어.」
//
// 이름을 부르는 것과 얼굴을 싣는 것은 다른 일이다. 이 파일이 지키는 것은 그 차이다 —
// 「글꼴 이름이 CSS 에 적혀 있다」가 아니라 **「글꼴이 파일 안에 있고, 그것이 맨 앞이다」**.
// 그래서 검사는 세 갈래다: ① 얼굴이 실제로 실려 있다 ② 그것이 목록의 맨 앞이다
// ③ 실어도 되는 글꼴이고, 그 사실이 학생이 볼 수 있는 자리에 적혀 있다.

const TYPE_CSS = readFileSync(new URL('../../src/ui/type-css.js', import.meta.url), 'utf8')
const TITLE_JS = readFileSync(new URL('../../src/ui/title.js', import.meta.url), 'utf8')

// 이 시험 묶음은 DOM 없이 돈다(vitest.config.js 의 environment 는 'node' 다).
// 그래서 진짜 document 대신 installTypeVars() 가 만지는 만큼만 흉내 낸 종이를 준다 —
// **소스 문자열을 훑는 것과는 다르다.** 소스에는 `${'$'}{FONT_FAMILY}` 라는 자리만
// 적혀 있어서, 그 자리가 엉뚱한 이름으로 풀려도 소스 검사는 통과한다. 여기서는
// 그 자리가 실제로 풀린 결과, 곧 화면에 깔리는 바로 그 CSS 를 본다.
function installedCss() {
  let style = null
  const doc = {
    head: { firstChild: null, insertBefore(node) { style = node } },
    getElementById: () => null,
    createElement: () => ({ id: '', textContent: '' }),
  }
  installTypeVars(doc)
  expect(style, 'installTypeVars 가 <style> 을 안 넣었다').toBeTruthy()
  expect(style.id).toBe('eojeon-type-style')
  return style.textContent
}

describe('실은 글꼴 — 파일 안에 있다', () => {
  it('font-data.js 가 woff2 data URI 를 담고 있다', () => {
    expect(FONTS.length).toBeGreaterThan(0)
    for (const f of FONTS) {
      expect(f.src, `${f.key} 의 src`).toMatch(/^data:font\/woff2;base64,[A-Za-z0-9+/]+=*$/)
      // woff2 는 'wOF2' 로 시작한다 — base64 로는 'd09GMk'. 「data URI 처럼 보이는
      // 문자열」이 아니라 진짜 woff2 인지 첫 바이트로 확인한다.
      const head = Buffer.from(f.src.split(',')[1].slice(0, 8), 'base64')
      expect(head.subarray(0, 4).toString('latin1'), `${f.key} 가 woff2 가 아니다`).toBe('wOF2')
    }
  })

  it('두 벌뿐이고, 보통 굵기와 굵은 굵기다', () => {
    // 굵은 판이 없으면 브라우저가 가로로 늘려 흉내 내는데(synthetic bold) 한글은
    // 그 흉내에서 획이 뭉개진다. 반대로 다섯 벌을 실으면 파일이 감당하지 못한다.
    expect(FONTS.map(f => f.key)).toEqual(['regular', 'bold'])
    expect(FONTS.find(f => f.key === 'regular').weight).toBe('400')
    // <strong> 은 700 을 부른다 — 600 만 적어 두면 브라우저가 600 위에 다시 흉내
    // 굵기를 얹을 수 있다. 범위로 적어야 700 이 이 판에 정확히 맞아떨어진다.
    expect(FONTS.find(f => f.key === 'bold').weight).toBe('600 700')
  })

  it('실은 글꼴 전부를 합쳐도 900KB 를 넘지 않는다', () => {
    const bytes = FONTS.reduce((n, f) => n + f.src.length, 0)
    expect(bytes, `실은 글꼴이 ${(bytes / 1024).toFixed(0)}KB 다`).toBeLessThanOrEqual(900 * 1024)
  })

  it('@font-face 가 실제로 깔리고, font-display 를 일부러 정해 두었다', () => {
    const css = installedCss()
    expect(css).toContain(`@font-face`)
    expect(css).toContain(`font-family:"${FONT_FAMILY}"`)
    expect(css).toContain('format("woff2")')
    // block 이면 글꼴을 푸는 동안 글자가 아예 안 보인다(느린 교실 컴퓨터에서 첫
    // 화면이 한순간 빈 종이가 된다). swap 이면 그 한두 프레임을 옛 얼굴로 메운다.
    expect(css).toContain('font-display:swap')
    expect(css).not.toContain('font-display:block')
    for (const f of FONTS) expect(css).toContain(f.src)
  })
})

describe('실은 글꼴 — 목록의 맨 앞이다', () => {
  // 이것이 이 파일의 핵심이다. 실어 놓고 목록 둘째에 두면 Pretendard 가 깔린
  // 기계에서만 보이고 교실에서는 예전 그대로다 — 고친 것이 아니다.
  function faceBody() {
    const m = /--face-body:([^;]+);/.exec(installedCss())
    expect(m, '--face-body 선언을 못 찾았다').toBeTruthy()
    return m[1].split(',').map(s => s.trim())
  }

  it('--face-body 의 첫 얼굴이 실은 글꼴이다', () => {
    expect(faceBody()[0]).toBe(`"${FONT_FAMILY}"`)
  })

  it('한자를 가진 대비책 얼굴이 뒤에 남아 있다', () => {
    // 실은 글꼴에는 한자가 **한 자도 없다**(Pretendard 는 CJK 표의문자를 담지 않는다).
    // 屬邦·施命之寶 같은 한자와 상용 한글 2,350자 밖의 드문 글자는 뒤쪽 얼굴이 받는다.
    // 뒤쪽을 「이제 필요 없다」고 걷어 내는 순간 그 자리가 네모(tofu)가 된다.
    const rest = faceBody().slice(1).map(s => s.replace(/"/g, ''))
    expect(rest).toContain('Malgun Gothic')
    expect(rest).toContain('Apple SD Gothic Neo')
    expect(rest).toContain('Noto Sans KR')
  })

  it('한자 자리의 얼굴에도 한자를 가진 얼굴이 남아 있다', () => {
    const hanja = /--face-hanja:([^;]+);/.exec(TYPE_CSS)
    expect(hanja).toBeTruthy()
    expect(hanja[1]).toMatch(/Batang|Gungsuh/)
  })
})

describe('실은 글꼴 — 실어도 되는 글꼴이다', () => {
  it('라이선스 전문이 저장소에 있다', () => {
    const p = new URL('../../assets/fonts/LICENSE', import.meta.url)
    expect(existsSync(p), 'assets/fonts/LICENSE 가 없다 — OFL 조건 2 를 못 지킨다').toBe(true)
    const text = readFileSync(p, 'utf8')
    expect(text).toContain('SIL OPEN FONT LICENSE Version 1.1')
    // 저작권 표시가 라이선스와 **함께** 가야 한다(조건 2). 라이선스 본문만 있으면 모자란다.
    expect(text).toContain('Kil Hyung-jin')
    expect(text).toContain('Reserved Font Name')
  })

  it('실은 판의 이름은 Reserved Font Name 이 아니다', () => {
    // OFL 조건 3: 고친 판(= 글자를 골라낸 판)은 Reserved Font Name 을 제 이름으로
    // 쓸 수 없다. 그래서 우리 판의 이름은 Pretendard 가 아니다. 덤도 있다 —
    // 교실 컴퓨터에 다른 판의 Pretendard 가 깔려 있어도 우리 글자는 흔들리지 않는다.
    expect(FONT_FAMILY).not.toMatch(/pretendard/i)
    expect(FONT_FAMILY).toBe('어전본문')
  })

  it('제목 화면의 고지가 글꼴 이름과 라이선스를 밝힌다', () => {
    // 학생·선생님이 「글꼴을 실었다」는 사실을 볼 수 있는 유일한 자리다. 음악·그림의
    // 출처가 적히는 그 줄(.opening-credit)에 함께 적는다 — 예의가 아니라 조건이다.
    //
    // 주석은 걷어 내고 본다 — 왜 그렇게 했는지 적은 줄에 이름이 나온다고 해서
    // 「화면에 적혀 있다」가 되면 안 된다(tests/ui/title.test.js 와 같은 판단).
    const code = TITLE_JS.replace(/\/\/[^\r\n]*/g, '')
    const credits = [...code.matchAll(/className\s*=\s*'opening-credit'[\s\S]{0,400}?textContent\s*=\s*'([^']*)'/g)]
      .map(m => m[1])
    expect(credits.length, '.opening-credit 이 하나도 없다').toBeGreaterThanOrEqual(2)
    const all = credits.join('\n')
    expect(all).toContain('Pretendard')
    expect(all).toContain('Kil Hyung-jin')     // 저작권자 표시 — OFL 조건 2
    expect(all).toContain('SIL Open Font License 1.1')
    // 음악 고지를 밀어내지 않았다 — 한 줄을 더한 것이지 갈아 끼운 것이 아니다.
    expect(all).toContain('Beneath the Bronze Bell')
  })
})
