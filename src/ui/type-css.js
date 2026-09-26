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
//    바깥 요청이 0인 게임이라 웹폰트를 내려받을 수 없다 — 윈도·맥·크롬북에 실제로
//    깔려 있는 것만 고른다.
// 4. 작은 글씨(출처·고지·설명)에도 **바닥이 있다**. 교실 프로젝터의 뒷줄에서도
//    읽혀야 한다 — 망설여지면 큰 쪽으로 간다.
const CSS = `
:root{
  /* 얼굴 — 웹폰트를 못 받으므로 실제로 깔려 있는 것만 적는다.
     Pretendard 는 학교 크롬북·개인 PC에 흔히 깔려 있고, 없으면 맥의 Apple SD Gothic Neo,
     윈도의 맑은 고딕으로 내려간다. 마지막은 system-ui — 어디에도 없는 경우는 없다. */
  --face-body:"Pretendard","Apple SD Gothic Neo","Malgun Gothic","맑은 고딕","Noto Sans KR",system-ui,sans-serif;
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
export function installTypeVars(doc = document) {
  if (installed && doc === document) return
  if (!doc?.head) return
  if (doc.getElementById('eojeon-type-style')) { installed = true; return }
  const style = doc.createElement('style')
  style.id = 'eojeon-type-style'
  style.textContent = CSS
  // 맨 앞에 넣는다 — 이것은 바탕값이고, 화면마다의 CSS 가 그 위에 얹혀야 한다.
  doc.head.insertBefore(style, doc.head.firstChild)
  if (doc === document) installed = true
}
