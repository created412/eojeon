"""장면 그림(assets/scene-art/*.png) → src/ui/scene-art-data.js.

Higgsfield gpt_image_2_5 로 그린 **재구성 그림**이다 — 실제 사진·기록화가 아니다.
화면마다 그림 아래 캡션으로 그 사실을 적는다(caption). 폭 800 · WebP 품질 72 로 줄여 base64 로 싣는다.

사용: python tools/pack-scene-art.py
"""
import base64, io, json, os
from PIL import Image

ART = {
    'fleet-1866':   ('강화 앞바다에 이른 프랑스 함대(1866)', '재구성 그림 · 1866년 병인양요의 프랑스 함대'),
    'plunder-1866': ('프랑스 군이 외규장각의 의궤와 상자를 배로 옮기는 모습', '재구성 그림 · 1866년 외규장각 약탈 — 실제 장면을 그린 기록이 아닙니다'),
    'fleet-1871':   ('초지진을 향해 포를 쏘는 미국 군함(1871)', '재구성 그림 · 1871년 신미양요의 미국 함대'),
    'unyo-1875':    ('초지진 앞에 나타난 일본 군함 운요호(1875)', '재구성 그림 · 1875년 운요호 사건'),
    'market':       ('종로 쌀가게 앞에 줄지어 선 사람들(1882)', '재구성 그림 · 1882년 종로 시전 — 임금이 직접 본 기록은 없습니다'),

    # ── 「돈을 만든다」 판(1막 끝) ──────────────────────────────────────────
    # 2026-09-27 선생님: 「힉스필드 등을 활용하여 제대로 된 게임의 형태를 만들어봐.」
    # 그전까지 이 판은 계기판이었다 — 민심은 「원망이 돈다」는 **낱말**이었고, 채울 것은
    # 빈 막대였고, 당백전을 찍는 자리는 지레였다. 낱말을 그림으로 바꾼다. 학생이 지레를
    # 밀면 고을 그림이 바뀌고 공사장이 올라간다 — 숫자가 아니라 **장소가 응답한다.**
    #
    # ⚠ 고을 석 장은 「민심」이라는 눈금의 세 얼굴이지 세 개의 다른 고을이 아니다.
    #    캡션에 그 사실을 적는다 — 특정 고을에서 실제로 일어난 일의 기록이 아니다.
    'village-calm':   ('걷기 전의 고을 — 아이들이 마당에서 놀고 굴뚝에 연기가 오른다',
                       '재구성 그림 · 원납전을 걷기 전의 고을입니다. 특정한 고을의 기록이 아닙니다'),
    'village-levied': ('아전이 장부를 펴 놓고 곡식 섬과 엽전 꾸러미를 받는 고을',
                       '재구성 그림 · 원납전을 걷는 자리입니다. 「스스로 원하여 바친다」는 이름과 달리 고을마다 낼 액수가 위에서 내려왔습니다'),
    'village-empty':  ('문이 열린 채 비어 버린 집들과, 짐을 지고 고을을 떠나는 식구',
                       '재구성 그림 · 더 걷을 것이 남지 않은 고을입니다. 특정한 고을의 기록이 아닙니다'),
    'palace-site':    ('주춧돌만 남은 경복궁 터에 목재와 석재가 쌓여 있다',
                       '재구성 그림 · 중건을 시작하기 전의 경복궁 터'),
    'palace-rising':  ('기둥이 서고 서까래가 올라가는 경복궁 공사장, 목재와 돌을 나르는 일꾼들',
                       '재구성 그림 · 경복궁 중건 공사 — 실제 공사 장면을 그린 기록화가 아닙니다'),
    'mint-house':     ('쇳물을 거푸집에 붓고 망치로 찍어 내는 주전소, 쌓여 가는 엽전 꾸러미',
                       '재구성 그림 · 당백전을 찍어 내는 자리입니다. 실제 주전소를 그린 기록이 아닙니다'),
}

out = {}
for key, (alt, caption) in ART.items():
    im = Image.open(f'assets/scene-art/{key}.png').convert('RGB')
    im.thumbnail((800, 800))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=72, method=6)
    data = buf.getvalue()
    out[key] = {'src': 'data:image/webp;base64,' + base64.b64encode(data).decode(), 'alt': alt, 'caption': caption}
    print(key, len(data) // 1024, 'KB')

with open('src/ui/scene-art-data.js', 'w', encoding='utf-8') as f:
    f.write('// 자동 생성 — tools/pack-scene-art.py. Higgsfield 로 그린 재구성 그림(assets/scene-art).\n')
    f.write('export const SCENE_ART = ' + json.dumps(out, ensure_ascii=False) + '\n')
