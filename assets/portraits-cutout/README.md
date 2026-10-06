# 대화 인물의 배경 제거 편집본

2026-10-06 사용자 요청에 따라 실제 사진·초상을 imagegen으로 배경 제거 편집했습니다. AI 편집 과정에서 세부가 달라질 수 있으므로 원본 사료 이미지로 취급하지 않습니다. 게임 대화에 편집 사실을 표시하고, 인물을 누르면 편집 전 원본 및 출처를 엽니다.

흥선대원군은 기존 흰옷의 1883년 사진 대신 [Homer Hulbert 수록 사진](https://commons.wikimedia.org/wiki/File:Heungseon_Daewongun_Portrait.jpg)을 사용합니다. 1898년 이전 촬영, 1906년 《The Passing of Korea》 수록, public domain. 내려받은 원본은 `assets/historical/originals/heungseon-hulbert.jpg`입니다.

최익현·신헌·고종·김옥균의 원본과 출처는 `assets/historical/manifest.json`에 보존됩니다. 투명 PNG는 편집 결과 원본이며, `node tools/pack-portrait-cutouts.mjs`가 게임용 WebP와 데이터 모듈을 만듭니다.
