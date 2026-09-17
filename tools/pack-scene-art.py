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
