# 글꼴을 게임에 실을 수 있게 깎고 묶는다.
#
#   python tools/pack-font.py
#
# 입력 : assets/fonts/Pretendard-{Regular,SemiBold}.otf
# 출력 : src/ui/font-data.js   (woff2 data URI 두 벌)
#
# ── 왜 이 파일이 있는가 ────────────────────────────────────────────────
# 2026-09-26 읽는 화면의 활자를 다시 짰다(src/ui/type-css.js). 그런데 그때 고친 것은
# **크기**뿐이었다. 얼굴은 `"Pretendard","Apple SD Gothic Neo","Malgun Gothic",…`
# 이라는 이름표만 적혀 있었고, 교실 컴퓨터에는 Pretendard 가 깔려 있지 않으니
# 그 이름표는 늘 **맑은 고딕**으로 내려갔다. 2026-09-27 선생님:
#
#     「폰트의 문제인데 그냥 글자 크기를 키워버렸어.」
#
# 맞는 말이다. 이름을 부르는 것과 얼굴을 싣는 것은 다른 일이다. 그래서 글꼴을
# 진짜로 싣는다 — 종이(tools/pack-paper.py)와 음악(tools/pack-bgm.py)을 base64 로
# 실은 것과 똑같은 방식으로. 이 게임은 파일 하나로 나가고 **바깥 요청이 0건**이어야
# 한다. 내려받는 것은 이 도구가 도는 지금(빌드 앞)이고, 학생의 브라우저는 아무것도
# 내려받지 않는다.
#
# ── 어느 글꼴인가, 그리고 실어도 되는가 ────────────────────────────────
# Pretendard 1.3.9 (Kil Hyung-jin), **SIL Open Font License 1.1**.
#   원본 : https://github.com/orioncactus/pretendard (v1.3.9 태그)
#           packages/pretendard/dist/public/static/Pretendard-{Regular,SemiBold}.otf
#   sha256 Regular  3ffbacde6ab8411f1d2db54bb9b1f0b3ee2a738932033722cf0388c06aed1c93
#   sha256 SemiBold c89bc43027dc7cde5726e96223376f8eec09302b2fc1f8147fd5b57cfc376118
#
# OFL 1.1 의 조건을 하나씩 짚어 둔다 — 이 게임은 eojeon.pages.dev 와 GitHub 에
# 공개되므로 「내 컴퓨터에서만 쓴다」가 아니라 **재배포**다.
#   조건 1  글꼴 자체를 따로 팔지 않는다 → 우리는 팔지 않는다.
#   조건 2  사본마다 저작권 표시와 이 라이선스가 함께 들어가야 한다
#           → assets/fonts/LICENSE 에 전문을 그대로 두고, 제목 화면의
#             .opening-credit 에 한 줄로 밝힌다(src/ui/title.js).
#   조건 3  **Reserved Font Name**(= "Pretendard")은 고친 판(Modified Version)의
#           이름으로 쓸 수 없다. 글자를 골라내는 일(subsetting)은 고치는 일이므로,
#           우리가 싣는 판의 이름은 Pretendard 가 아니라 **"어전본문"** 이다.
#           덤으로 얻는 것이 있다 — 교실 컴퓨터에 어쩌다 다른 판의 Pretendard 가
#           깔려 있어도 우리 글자는 흔들리지 않는다. 이름이 다르니까.
#   조건 4  저작자 이름을 광고에 쓰지 않는다 → 고지일 뿐 광고가 아니다.
#   조건 5  고친 판도 OFL 로만 배포한다 → assets/fonts/LICENSE 가 그 표시다.
#
# ── 어디까지 깎는가 ────────────────────────────────────────────────────
# 1. 게임이 화면에 내놓는 글자 전부. src/**/*.js 를 읽어 모은다(base64 덩어리는
#    걷어 낸다 — 그건 그림·소리지 글자가 아니다).
# 2. KS X 1001 상용 한글 2,350자. 학생이 자유 서술 칸에 **자기 말로 쓴 글**도
#    글꼴로 나와야 한다. 게임이 쓰는 한글은 988자뿐이지만, 학생이 무슨 낱말을
#    쓸지는 우리가 모른다. 2,350자가 그 바닥이다.
# 3. 한글 호환 자모(ㄱ~ㅣ). 한글을 치는 동안 아직 안 맺힌 낱자가 화면에 잠깐
#    보인다 — 그 순간에 네모(tofu)가 뜨면 안 된다.
# 4. ASCII 전부와, 우리가 실제로 쓰는 부호에 여유분을 얹은 문장부호·화살표·괄호.
#
# 한자는 뺀다. Pretendard 에는 한자 글자가 **한 자도 없다**(cmap 14,336자에 CJK
# 표의문자 0자). 屬邦·施命之寶 같은 한자는 --face-body / --face-hanja 목록의
# 다음 얼굴(윈도 맑은 고딕·바탕, 맥 Apple SD Gothic Neo, 크롬북 Noto Sans CJK)이
# 받는다 — 지금까지와 똑같이. 그래서 type-css.js 의 대비책 목록에서 **한자를 가진
# 얼굴을 절대 걷어 내지 않는다.** 걷어 내면 그 자리가 네모가 된다.

import base64, hashlib, re, subprocess, sys, tempfile
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / 'assets' / 'fonts'
OUT_JS = ROOT / 'src' / 'ui' / 'font-data.js'

# (키, 파일, CSS font-weight) — 두 벌만 싣는다.
#
# 왜 두 벌인가: 화면의 font-weight 는 거의 400 이지만 600·700 이 여덟 자리 있고
# <strong> 도 쓴다(제목 화면의 막 이름, 사진 설명, HUD). 굵은 판이 없으면
# 브라우저가 가로로 늘려 흉내 내는데(synthetic bold), 한글은 그 흉내에서 획이
# 뭉개져 오히려 읽기 어려워진다. 177KB 는 그 값을 한다.
#
# 600 뿐 아니라 `600 700` 범위로 적는 까닭: <strong> 은 700 을 부른다. 400 과
# 600 만 있으면 브라우저가 600 을 고르고 그 위에 다시 흉내 굵기를 얹을 수 있다.
# 범위로 적어 두면 700 이 이 판에 **정확히** 맞아떨어져 흉내가 끼어들지 않는다.
PLAN = [
    ('regular', 'Pretendard-Regular.otf',  '400',     'Regular'),
    ('bold',    'Pretendard-SemiBold.otf', '600 700', 'SemiBold'),
]

# 우리가 싣는 판의 이름. OFL 조건 3 때문에 Pretendard 가 아니다(맨 위 설명).
FAMILY = '어전본문'
PS_FAMILY = 'EojeonBody'   # PostScript 이름은 ASCII 만 받는다


def rename(font: TTFont, style: str):
    """글꼴 안쪽 이름표까지 갈아 끼운다.

    OFL 조건 3 이 막는 것은 「사용자에게 보이는 으뜸 이름」이다. CSS 의 font-family
    한 줄만 바꾸고 글꼴 name 테이블에 Pretendard 를 남겨 두면, 브라우저 개발자
    도구·운영체제의 글꼴 목록에는 여전히 「고친 Pretendard」로 뜬다. 그건 조건 3 이
    막는 바로 그 일이다. 그래서 이름표를 진짜로 갈아 끼운다.

    id 1 가족 · 2 스타일 · 3 고유 이름 · 4 전체 이름 · 6 PostScript 이름 ·
    16/17 타이포그래피 가족·스타일. 여기서 손대지 않는 것은 id 0(저작권), 13(라이선스),
    14(라이선스 주소) — 그건 **남겨야** 하는 것이다(조건 2).
    """
    names = {
        1: FAMILY, 2: style, 3: f'{FAMILY} {style} (Pretendard subset)',
        4: f'{FAMILY} {style}', 6: f'{PS_FAMILY}-{style.replace(" ", "")}',
        16: FAMILY, 17: style,
    }
    tbl = font['name']
    # 옛 매킨토시 이름표(platform 1 · Roman)는 통째로 버린다. 그 칸은 mac_roman
    # 이라 「어전본문」을 아예 담을 수 없어(charmap 오류) 이름표가 반쪽만 바뀌고,
    # platform 3 만 보는 요즘 브라우저에는 쓸모도 없다. 저작권·라이선스 줄은
    # platform 3 쪽 사본으로 그대로 남는다 — 조건 2 는 지켜진다.
    tbl.names = [n for n in tbl.names if n.platformID != 1]
    for nid, value in names.items():
        tbl.setName(value, nid, 3, 1, 0x409)   # Windows · Unicode BMP · en-US
    # 어디서 왔는지 글꼴 안에 남긴다 — 파일만 떼어 가도 출처가 따라가게.
    tbl.setName(
        'Pretendard 1.3.9 (Kil Hyung-jin) 을 「어전」이 쓰는 글자로 깎은 판. '
        'SIL Open Font License 1.1.', 10, 3, 1, 0x409)

# base64 덩어리 — 200자 넘게 이어지는 base64 는 그림·소리 데이터다. 글자 목록에
# 섞이면 쓸데없이 글리프를 부르는 것은 아니지만(ASCII 뿐이니) 읽는 시간이 아깝다.
B64 = re.compile(r'[A-Za-z0-9+/]{200,}={0,2}')

# 여유분. 실제로 쓰는 부호에 「쓸 법한」 것을 얹는다 — 글 한 줄 고치다 부호 하나
# 때문에 네모가 뜨는 일을 막는 값싼 보험이다(글리프 하나는 수십 바이트다).
EXTRA = (
    '₩€£¥¢©®™†‡•‥⋯∼〜°′″×÷±≠≤≥≒∞'
    '→←↑↓↔↕↗↘↖↙↶↷⟨⟩《》〈〉〔〕〖〗　「」『』【】〝〞'
    '–—―…‘’“”·※§¶№⁂'
    '①②③④⑤⑥⑦⑧⑨⑩❶❷❸❹❺⓵'
    '─│┌┐└┘├┤┬┴┼━┃▲▼◀▶△▽◁▷○●◎◇◆□■☆★'
    '⚠⛔✓✔✕✖✦✧⤢'
    'çèéêëàâäîïôöùûüñßœæΩπΔΣαβγδμσ'
)


def screen_chars() -> set:
    """게임이 화면에 내놓을 수 있는 글자를 모은다."""
    out = set()
    for p in sorted(ROOT.glob('src/**/*.js')):
        # 우리가 방금 쓴 파일은 읽지 않는다 — 제 주석을 제 입력으로 삼으면
        # 돌릴 때마다 글자 수가 슬금슬금 늘어난다(자기 참조).
        if p.name == OUT_JS.name:
            continue
        out |= set(B64.sub('', p.read_text(encoding='utf8')))
    return out - set('\n\r\t')


def ksx1001_hangul() -> set:
    """KS X 1001 상용 한글 2,350자.

    EUC-KR 두 바이트 0xB0A1~0xC8FE 가 그 2,350자다(25행 × 94칸). 파이썬의
    'euc_kr' 코덱은 CP949 확장까지 받아 11,172자를 다 태우므로, 글자 목록을
    코덱에 물어보면 안 되고 **바이트 범위에서 되돌려** 뽑아야 한다.
    """
    out = set()
    for hi in range(0xB0, 0xC9):
        for lo in range(0xA1, 0xFF):
            try:
                c = bytes([hi, lo]).decode('euc_kr')
            except UnicodeDecodeError:
                continue
            if 0xAC00 <= ord(c) <= 0xD7A3:
                out.add(c)
    return out


def main():
    used = screen_chars()
    hanja = sorted(c for c in used
                   if 0x3400 <= ord(c) <= 0x9FFF or 0xF900 <= ord(c) <= 0xFAFF)
    ascii_all = set(chr(c) for c in range(0x20, 0x7F))
    jamo = set(chr(c) for c in range(0x3131, 0x3164))   # ㄱ~ㅣ 호환 자모
    ks = ksx1001_hangul()

    # 한자는 이 글꼴에 없다 — 목록에 넣어도 버려지므로 애초에 빼고 셈을 맞춘다.
    target = (used - set(hanja)) | ascii_all | jamo | ks | set(EXTRA)

    used_hangul = {c for c in used if 0xAC00 <= ord(c) <= 0xD7A3}
    print(f'  게임이 쓰는 글자 {len(used)}자 (한글 {len(used_hangul)} · 한자 {len(hanja)})')
    print(f'  깎아 남길 글자 {len(target)}자 = 쓰는 글자 + KS X 1001 {len(ks)} + 자모 {len(jamo)} + 여유분')
    print(f'  한자 {len(hanja)}자는 이 글꼴에 없다 — 대비책 얼굴(맑은 고딕·바탕 …)이 받는다')

    entries, total = [], 0
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        chars = tmp / 'chars.txt'
        chars.write_text(''.join(sorted(target)), encoding='utf8')
        for key, name, weight, style in PLAN:
            src = FONT_DIR / name
            if not src.exists():
                print(f'  ! 없다: assets/fonts/{name} — 건너뛴다')
                continue
            # 깎기 → 이름표 갈기 → woff2 로 누르기. 순서가 이래야 하는 까닭:
            # pyftsubset 은 이름표를 못 바꾸고, woff2 로 먼저 누르면 다시 풀었다
            # 눌러야 한다. 그래서 중간에 맨 otf 로 한 번 내려놓는다.
            mid, out = tmp / f'{key}.otf', tmp / f'{key}.woff2'
            subprocess.run([
                sys.executable, '-m', 'fontTools.subset', str(src),
                f'--text-file={chars}',
                # 한글은 자·모를 합치는 조판 규칙이 없다(합성 글자가 다 들어 있다).
                # 그래도 kern·liga 는 라틴 글자에 쓰이므로 남긴다.
                '--layout-features=kern,liga,clig,calt',
                '--no-hinting',            # CFF 는 힌트를 브라우저가 안 본다
                '--desubroutinize',        # woff2 의 brotli 가 더 잘 먹는다
                '--drop-tables+=DSIG',
                # 저작권(0)·라이선스(13)·라이선스 주소(14)는 반드시 남는다 — OFL 조건 2.
                '--name-IDs=0,1,2,3,4,5,6,10,13,14,16,17',
                '--name-legacy',
                f'--output-file={mid}',
            ], check=True)
            font = TTFont(mid)
            rename(font, style)
            font.flavor = 'woff2'
            font.save(out)
            font.close()
            data = out.read_bytes()
            total += len(data)
            sha = hashlib.sha256(src.read_bytes()).hexdigest()[:12]
            print(f'  {key:8} {name:26} {len(data)/1024:7.1f} KB  (원본 {src.stat().st_size/1024:.0f} KB, sha {sha})')
            entries.append((key, weight, base64.b64encode(data).decode()))

    if not entries:
        raise SystemExit('실을 글꼴이 하나도 없다 — assets/fonts/ 를 보라')

    b64_total = sum(len(b) for _, _, b in entries)
    lines = [
        '// 자동 생성 — 손으로 고치지 마라. `python tools/pack-font.py` 로 다시 만든다.\n',
        '//\n',
        '// Pretendard 1.3.9 (Kil Hyung-jin) 을 이 게임이 쓰는 글자로 깎은 판이다.\n',
        '// SIL Open Font License 1.1 — 전문은 assets/fonts/LICENSE 에 있고, 고지는\n',
        '// 제목 화면의 .opening-credit 에 있다(src/ui/title.js). OFL 조건 3(Reserved\n',
        '// Font Name)에 따라 이 판의 이름은 Pretendard 가 아니라 "어전본문" 이다.\n',
        '//\n',
        f'// woff2 {total/1024:.0f} KB -> base64 {b64_total/1024:.0f} KB. 왜 base64 인가: 바깥 요청 0건.\n',
        f'export const FONT_FAMILY = {FAMILY!r}\n'.replace("'", '"'),
        'export const FONTS = [\n',
    ]
    for key, weight, b64 in entries:
        lines.append(f'  {{ key: "{key}", weight: "{weight}", src: "data:font/woff2;base64,{b64}" }},\n')
    lines.append(']\n')
    OUT_JS.write_text(''.join(lines), encoding='utf8')
    print(f'합계 woff2 {total/1024:.0f} KB · base64 {b64_total/1024:.0f} KB -> {OUT_JS.relative_to(ROOT)}')
    if b64_total > 900 * 1024:
        print(f'⚠ 900 KB 한도를 넘었다 ({b64_total/1024:.0f} KB) — 깎을 글자를 줄여라')


if __name__ == '__main__':
    main()
