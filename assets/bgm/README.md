# BGM

2026-09-14 · Google Gemini **Lyria RealTime**(`models/lyria-realtime-exp`)으로 만들었다. Suno 잔액이 부족해 선생님이 Gemini 로 바꾸라 했다.
(`lyria-3.5`·`lyria-3-pro-preview`·`lyria-3-clip-preview` 는 무료 등급 한도 0 이라 거절됐다.)

| 파일 | 쓰는 곳 | 만든 방법 |
|---|---|---|
| bgm-main.ogg (94초) | 제목·궁·알현·회의 | `python tools/bgm-lyria-realtime.py main.wav 104 66 "Korean traditional court music jeongak, daegeum bamboo flute slow melancholic melody" "geomungo plucked zither bass, haegeum fiddle, soft janggu hand drum" "slow cinematic low strings, solemn dignified ambient, sparse, no vocals"` |
| bgm-tension.ogg (54초) | 촉박(화재·임오군란·갑신정변) | `... tension.wav 64 96 "Korean traditional percussion buk and janggu, urgent tense rhythm" "sharp haegeum fiddle tremolo, piri double reed, dark low strings ostinato" "palace in danger, suspense, cinematic, no vocals"` |

`python tools/bgm-loop.py` 가 앞 몇 초(워밍업)를 자르고 끝 4초를 처음에 겹쳐 반복 이음새를 지운 뒤 모노 Opus 32kbps 로 줄인다.
API 키는 환경 변수 `GEMINI_API_KEY` 로만 넘긴다 — 저장소에 적지 않는다.
