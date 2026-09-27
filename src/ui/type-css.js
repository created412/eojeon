// 읽는 화면의 활자를 한 곳에 모은다.
//
// 왜 한 곳인가: 2026-09-26 선생님이 세 장의 화면을 따로 지적하셨다 — 글 화면
// 「이런 안내문이 너무 가독성이 떨어져」, 하루의 끝 「이거도 정리해줘야해. 지금
// 가독성이 너무 떨어져」, 그림 곁의 글 「왼쪽의 글씨가 가독성 있게 들어오지 않아.
// 글자크기도 작고 폰트도 개판이고, 이 부분의 전면 수정이 필요해」. 세 장이지만
// 병은 하나다: **읽는 글에 쓰는 규칙이 화면마다 따로 적혀 있었다.** 그래서 어떤
// 화면은 17px, 어떤 화면은 19px, 작은 글씨는 10~13px 사이를 떠돌았고, 문단에까지
// 자간이 걸려 낱말 모양이 무너졌다. 세 군데를 각각 고치면 네 번째 화면에서 또 난다.
//
// 그래서 값을 CSS 변수로 한 벌만 두고, 화면들은 그 이름을 부른다. paper-css.js 가
// 종이를 `var(--hanji)` 한 줄로 걸어 둔 것과 같은 꼴이다 — 다만 이쪽은 **없으면 안 되는**
// 값이라, 부르는 자리마다 예전 값을 대비책(fallback)으로 함께 적는다:
// `font-size:var(--read-body,17px)`. installTypeVars() 가 한 번도 안 불린 빌드·시험에서도
// 화면은 지금까지 그대로 보인다. 이것이 이 파일의 무너짐 방식(graceful degradation)이다.
//
// ── 규칙 넷 ────────────────────────────────────────────────────────────
// 1. 본문 한국어는 **왼쪽 맞춤**이다. 가운데 맞춤은 두 줄짜리 문단을 「…아들이
//    없다.」처럼 외톨이 꼬리로 끊는다. 함께 `word-break:keep-all` 로 낱말을 쪼개지
//    않고, `text-wrap:balance` 로 짧은 문단의 두 줄 길이를 고르게 한다.
// 2. **자간은 제목에만** 건다(.type-display). 한글 문단에 자간을 주면 낱말 덩어리가
//    풀어져 오히려 늦게 읽힌다. 「해 가 진 다」 같은 짧은 표제는 그 벌어짐이 뜻이므로 남긴다.
// 3. 본문 한글은 **잘 다듬어진 고딕**으로 읽는다. 바탕(Batang)은 큰 표제와 한자에만 쓴다.
//    그 고딕은 **파일 안에 싣는다** — 아래 「얼굴을 싣는다」를 보라.
// 4. 작은 글씨(출처·고지·설명)에도 **바닥이 있다**. 교실 프로젝터의 뒷줄에서도
//    읽혀야 한다 — 망설여지면 큰 쪽으로 간다.
//
// ── 얼굴을 싣는다 (2026-09-27) ─────────────────────────────────────────
// 어제까지 이 파일이 한 일은 **이름을 부르는 것**뿐이었다. `"Pretendard","Apple SD
// Gothic Neo","Malgun Gothic",…` 이라고 적어 두고 「Pretendard 는 학교 크롬북·개인
// PC에 흔히 깔려 있다」고 스스로 믿었다. 아니었다. 교실 컴퓨터에 Pretendard 는
// 없고, 그 목록은 언제나 **맑은 고딕**에서 멈췄다. 크기만 커진 맑은 고딕이었다.
//
//     2026-09-27 선생님: 「폰트의 문제인데 그냥 글자 크기를 키워버렸어.」
//
// 그래서 얼굴을 싣는다. 종이(paper-data.js)와 음악(bgm-data.js)을 base64 로 실은 것과
// 같은 방식이다 — 학생의 브라우저는 여전히 **아무것도 내려받지 않는다**.
// 무엇을 어떻게 깎았는지는 tools/pack-font.py 맨 위에 적어 두었다(라이선스도 거기다).
import { FONTS, FONT_FAMILY } from './font-data.js'

// @font-face — 글꼴이 안 실린 빌드에서도 이 줄이 통째로 비고, 그러면 아래 목록의
// 다음 얼굴이 받는다. paper-css.js 가 종이 없이도 화면을 지키는 것과 같은 꼴이다.
//
// font-display 를 **swap** 으로 둔 까닭: 이 글꼴은 data URI 라 내려받을 것이 없지만,
// 「없음」과 「곧 옴」은 다르다. block 으로 두면 브라우저가 글꼴을 풀 동안(느린 교실
// 컴퓨터에서 woff2 331KB 를 푸는 데 백 밀리초쯤) **글자를 안 보여 준다** — 첫 화면이
// 한순간 빈 종이가 된다. swap 은 그 한두 프레임을 맑은 고딕으로 메우고 곧바로 갈아
// 끼운다. 한 프레임의 옛 얼굴이 한 프레임의 빈 화면보다 낫다.
const FONT_FACE = FONTS.map(f => `
@font-face{
  font-family:"${FONT_FAMILY}";
  src:url(${f.src}) format("woff2");
  font-weight:${f.weight};
  font-style:normal;
  font-display:swap;
}`).join('')

const CSS = FONT_FACE + `
:root{
  /* 얼굴 — 맨 앞은 우리가 파일 안에 실은 것이다. 그 뒤는 대비책이다.
     ⚠ 뒤쪽 이름을 걷어 내지 마라. 실은 글꼴에는 **한자가 한 자도 없다**(Pretendard
        는 CJK 표의문자를 담지 않는다). 屬邦·施命之寶 같은 한자와, 상용 한글 2,350자
        밖의 드문 글자(학생이 자유 서술 칸에 쓸 수도 있다)는 이 뒤쪽 얼굴들이 받는다 —
        CSS 는 글자 하나하나마다 목록을 훑으므로 한 글자만 뒤로 넘어간다.
        뒤쪽을 지우면 그 자리가 네모(tofu)가 된다. */
  --face-body:"${FONT_FAMILY}","Pretendard","Apple SD Gothic Neo","Malgun Gothic","맑은 고딕","Noto Sans KR",system-ui,sans-serif;
  /* 표제와 한자는 일부러 명조(세리프)다 — 1863년의 종이를 흉내 내는 자리다.
     이쪽은 아직 시스템 글꼴이다. 싣는다면 한자를 담은 명조여야 하는데, 그건
     본문 두 벌(331KB)에 더해 또 한 벌을 싣는 일이라 이번에는 하지 않았다. */
  --face-display:Batang,"바탕","Apple SD Gothic Neo",Georgia,serif;
  --face-hanja:Batang,"Gungsuh","궁서","SimSun",serif;

  /* 크기 — 프로젝터의 뒷줄 기준이다. 예전 값은 괄호로 적어 둔다. */
  --read-title:30px;      /* 글 화면 제목 (25px) */
  --read-lead:22px;       /* 첫 문장·이끄는 줄 (17~20px) */
  --read-body:20px;       /* 본문 (17px) */
  --read-label:15px;      /* 「오늘 한 일 3」 같은 짧은 이름표 (12px) */
  --read-small:16px;      /* 출처·재구성 고지·꼬리말 (12~13px) */
  --read-caption:14px;    /* 그림 밑 설명 (10~12px) */

  --read-lh-title:1.45;
  --read-lh-body:1.85;
  --read-lh-small:1.72;

  /* 한 줄의 길이. 34em 이 넘어가면 다음 줄 첫 글자를 눈이 잃는다. */
  --read-measure:34em;

  /* 자간은 여기서만 나온다 — 쓰는 곳은 .type-display 하나다. */
  --read-track:.12em;

  /* 먹색 — 작은 글씨가 흐려서 안 읽히는 일이 실제 병이었다. 회색을 끌어올린다. */
  --ink-strong:#211d16;   /* 종이 위 본문 */
  --ink-quiet:#4b4232;    /* 종이 위 작은 글씨 (#5e5849·#6b5a3e 였다) */
  --paper-strong:#f2ecdd; /* 어두운 바탕 위 본문 */
  --paper-quiet:#bdb6a4;  /* 어두운 바탕 위 작은 글씨 (#8f8a7c·#6b6558 이었다) */
}
/* 390px 손전화·태블릿 — 줄바꿈이 잦아지므로 한 단계만 내린다. 가로로 밀리면 안 된다. */
@media(max-width:760px){
  :root{
    --read-title:24px;
    --read-lead:19px;
    --read-body:17.5px;
    --read-label:14px;
    --read-small:14.5px;
    --read-caption:13px;
    --read-measure:100%;
  }
}

/* 읽는 덩어리 — 이 클래스가 붙은 곳은 왼쪽 맞춤·낱말 보존·고른 줄이다. */
.type-read{
  font-family:var(--face-body);
  text-align:left;
  word-break:keep-all;
  overflow-wrap:break-word;
  line-height:var(--read-lh-body);
  letter-spacing:normal;
  text-wrap:pretty;
}
/* 문단 하나가 두세 줄로 끊길 때, 마지막 줄에 낱말 하나만 남지 않게 줄 길이를 고른다.
   text-wrap 을 모르는 브라우저는 이 줄을 통째로 버린다 — 그러면 예전과 같이 보인다. */
.type-read p{text-wrap:balance}

/* 자간이 허락되는 유일한 자리. 짧은 표제에만 붙인다 — 문단에는 절대 붙이지 않는다. */
.type-display{font-family:var(--face-display);letter-spacing:var(--read-track)}
`

let installed = false

// paper-css.js 의 installPaperVars() 와 같은 자리에 선다: 화면이 뜨기 전에 한 번 불러
// 두면, 그 뒤로는 어느 화면이든 var(--read-body) 한 줄만 적으면 된다.
//
// `document` 를 맨이름으로 부르지 않고 `globalThis.document` 로 부르는 까닭: 이 저장소의
// 시험은 DOM 없이 돈다(vitest.config.js 의 environment 는 'node'). 맨이름으로 부르면
// 그곳에 document 라는 이름 자체가 없어 ReferenceError 로 터지고, 그래서 이 함수는
// 여태 **한 번도 시험된 적이 없었다.** 브라우저에서는 globalThis.document === document
// 이므로 하는 일은 똑같다 — 다만 이제 흉내 낸 종이를 넘겨 실제로 확인할 수 있다
// (tests/ui/font.test.js). 얼굴을 싣는 코드가 여기 있으니 시험이 닿아야 한다.
export function installTypeVars(doc = globalThis.document) {
  const real = globalThis.document
  if (installed && doc === real) return
  if (!doc?.head) return
  if (doc.getElementById('eojeon-type-style')) { if (doc === real) installed = true; return }
  const style = doc.createElement('style')
  style.id = 'eojeon-type-style'
  style.textContent = CSS
  // 맨 앞에 넣는다 — 이것은 바탕값이고, 화면마다의 CSS 가 그 위에 얹혀야 한다.
  doc.head.insertBefore(style, doc.head.firstChild)
  if (doc === real) installed = true
}
