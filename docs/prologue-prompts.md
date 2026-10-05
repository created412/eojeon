# 「어전」 프롤로그 — 영상 프롬프트 (체이닝 6장면 · 30초)

선생님이 GPT Codex 에서 직접 뽑으실 프롬프트입니다. **여섯 장면이 끊기지 않고
이어지도록** 짰습니다.

---

## 체이닝 방법 — 이것이 핵심입니다

한 장면씩 따로 뽑으면 빛도 색도 사람도 제각각이 되어 **이어 붙였을 때 여섯 토막**이
됩니다. 그래서 이렇게 갑니다:

> **장면 N 의 마지막 프레임을 장면 N+1 의 시작 이미지로 넣는다.**

차례:

1. 1장면을 뽑는다 (시작 이미지 없이, 텍스트만으로)
2. 1장면의 **마지막 프레임을 갈무리**한다 (영상 끝 컷을 이미지로 저장)
3. 그 이미지를 2장면의 **시작 이미지(first frame / image-to-video)** 로 넣고 2장면 프롬프트를 쓴다
4. 3~6장면도 같은 식으로 앞 장면의 마지막 프레임을 물려준다

**아래 각 장면의 「이어받는 것」이 그 물려주는 내용**입니다. 모델이 시작 이미지를
안 받는 경우에는 그 문장을 프롬프트 맨 앞에 붙여 주십시오.

---

## 모든 장면에 공통으로 붙일 문장 (스타일 고정)

한 번 정해 두고 여섯 번 다 붙입니다. 이것이 흔들리면 체이닝이 깨집니다.

```
STYLE (keep identical across all six shots):
Cinematic historical reconstruction, late-19th-century Korea (Joseon, 1860s).
Muted sepia-and-ink palette: warm ochre, faded indigo, bone white, charcoal.
Soft overcast or low golden light, slight haze, fine film grain, subtle vignette.
35mm lens feel, shallow depth of field, slow deliberate camera motion.
Painterly, restrained, documentary tone — not glossy, not fantasy, no saturation.
16:9. No on-screen text. No subtitles. No watermark. No logo.
```

## 모든 장면에 공통으로 붙일 금지문 (아주 중요합니다)

```
NEGATIVE / CONSTRAINTS:
No recognizable faces of real historical figures — keep the boy king and his father
seen only from behind, in silhouette, at distance, or with the face out of frame.
No Chinese or Japanese architecture; Korean Joseon architecture only
(dancheong eaves, giwa tile roofs, hanok wooden pillars, white hanbok).
No modern objects, no electricity, no glass windows, no anachronistic clothing.
No text or lettering rendered in frame.
No blood, no violence on screen.
```

**왜 얼굴을 안 만드는가** — 이 게임은 사료 / 해석 / **재구성**을 나누는 것을 뼈대로
삼습니다. AI 가 지어낸 고종의 얼굴을 학생이 보면 그 구분이 무너집니다. 얼굴이
필요한 자리에는 **실제 초상화**를 씁니다(게임 안에 이미 있습니다).

---

# 장면 1 — 나라 안이 흔들렸다 (5초)

**이어받는 것:** 없음 (첫 장면)

```
A wide, slow push-in over harvested rice paddies at dusk in 1860s Korea.
Bundled rice straw stands in rows; a thin mist lies over the fields.
In the middle distance, a small county office gate with a giwa tile roof.
A clerk's ledger lies open on a low table outside, pages lifting in the wind.
Farmers in white hanbok gather in the distance, backs to camera, standing still.
The light is failing, warm and grey. Dust and chaff drift through the air.
Camera: slow dolly forward, then drifts slightly upward toward the horizon.
```

**다음으로 넘길 마지막 프레임:** 들녘 너머 **하늘과 지평선**이 화면을 채운 상태.
사람들은 작은 실루엣으로 아래쪽에 남습니다.

---

# 장면 2 — 밖에서는 낯선 배가 왔다 (5초)

**이어받는 것:** 앞 장면 마지막의 **하늘·지평선**을 그대로 물려받아, 그 지평선이
들녘이 아니라 **바다**로 바뀝니다.

```
CONTINUES DIRECTLY FROM THE PREVIOUS FRAME: the same dusk sky and horizon line,
the same haze and grain. The land below the horizon becomes open sea.
Camera continues its upward-forward drift, then settles.
A dark steam warship of the 1860s appears low on the horizon, black smoke
trailing flat across the sky. Two more silhouettes behind it, further out.
The sea is grey and calm. Nothing on shore moves.
Camera: slow forward drift, almost imperceptible, holding on the ships.
```

**다음으로 넘길 마지막 프레임:** **연기가 하늘을 가로지르는** 화면. 어둡고 낮은 색조.

---

# 장면 3 — 철종이 아들 없이 죽었다 (5초)

**이어받는 것:** 앞 장면의 **연기와 어두운 하늘**이 그대로 **실내의 어둠**으로
이어집니다. 밖에서 안으로 들어가는 느낌.

```
CONTINUES DIRECTLY FROM THE PREVIOUS FRAME: the dark smoke-grey tone carries over
and becomes interior shadow as the camera moves through a doorway into darkness.
Interior of a Korean royal throne hall (Joseon), empty.
An ornate empty throne on a low dais, a folding screen of peaks and sun behind it.
Thick wooden pillars, painted dancheong beams, stone floor.
Dust turns slowly in a single shaft of pale light. Absolutely no people.
Far behind the camera, two great wooden doors swing slowly shut, and the light narrows.
Camera: slow push toward the empty throne as the room darkens.
```

**다음으로 넘길 마지막 프레임:** **닫히는 문틈의 좁은 빛**만 남은 어두운 화면.

---

# 장면 4 — 열두 살 명복이 불려 나왔다 (5초)

**이어받는 것:** 앞 장면의 **좁은 빛**이 이번에는 문이 **열리는** 빛으로 바뀝니다.
어둠에서 마당으로 나옵니다.

```
CONTINUES DIRECTLY FROM THE PREVIOUS FRAME: the narrow band of light widens as a
gate opens instead of closing, and the camera moves out into daylight.
Courtyard of a modest Korean noble house (not a palace), winter, 1863.
A boy of about twelve sits alone on the raised wooden floor of the main room,
SEEN FROM BEHIND, small against the building. Plain dark winter hanbok.
Bare persimmon tree, packed earth yard, low stone wall.
Several adult men in official robes and black gat hats enter through the gate
behind the camera and stop at a respectful distance, their backs and sides to us.
Nobody speaks. The boy does not turn around.
Camera: slow arc around the boy, keeping him from behind, never showing his face.
```

**다음으로 넘길 마지막 프레임:** 소년의 **뒷모습**과 그 너머로 열린 **대문**.

---

# 장면 5 — 어제까지 명복이었다 (5초)

**이어받는 것:** 앞 장면의 **소년 뒷모습과 열린 대문**을 그대로 이어받아, 소년이
그 문으로 걸어갑니다.

```
CONTINUES DIRECTLY FROM THE PREVIOUS FRAME: same boy, same courtyard, same light.
The boy rises and walks slowly toward the open gate, STILL SEEN FROM BEHIND.
Beyond the gate, a closed Korean royal palanquin waits in the lane, red and gold,
its carrying poles resting on low stands. Bearers in dark robes stand on either side,
heads lowered, faces not visible.
The men in the courtyard bow as he passes. Winter dust lifts from the ground.
Camera: follows the boy from behind at walking pace, toward the palanquin.
```

**다음으로 넘길 마지막 프레임:** 가마의 **드리운 발(문)** 이 화면을 채운 상태 —
소년이 막 그 안으로 들어간 직후.

---

# 장면 6 — 임금은 앉고, 아버지는 그 곁에 섰다 (5초)

**이어받는 것:** 앞 장면의 **가마 발**이 걷히면서 그 너머가 **어전**으로 바뀝니다.

```
CONTINUES DIRECTLY FROM THE PREVIOUS FRAME: the hanging curtain of the palanquin
lifts, and beyond it the frame opens into the throne hall from shot 3 — the same
pillars, the same screen of peaks and sun, but now lit by many lamps.
The same boy, SEEN FROM BEHIND AND FROM A DISTANCE, sits small on the great throne,
his feet not reaching the floor.
A tall grown man in dark official robes steps into frame and stands beside the
throne, SEEN FROM BEHIND, filling the foreground.
Rows of officials kneel on the stone floor below, all seen from behind.
Camera: slow pull back and slightly up, leaving the boy small and centred.
```

**끝 프레임:** 뒤로 빠진 넓은 화면. 여기에 제목 **「御前」** 이 얹힙니다(글자는
영상에 굽지 말고, 제가 나중에 얹겠습니다).

---

## 뽑으실 때 설정

| | |
|---|---|
| 비율 | **16:9** |
| 한 장면 길이 | **5초** |
| 소리 | **나레이션 + 배경음악** — 선생님이 직접 넣으십니다(아래 원고) |
| 자막 | **넣으십니다** — 아래 자막 그대로 |
| 해상도 | 1080p 면 충분합니다 |

---

# 나레이션 원고 · 자막

선생님이 영상에 직접 넣으십니다. **나레이션과 자막을 같은 문장으로** 두었습니다 —
학생이 듣는 말과 읽는 글이 다르면 둘 다 놓칩니다.

읽는 속도는 **한 장면 5초에 한 문장**입니다. 길면 숨이 가쁘고, 짧으면 그림이 빕니다.
아래 글자 수는 그 5초에 맞춰 깎아 둔 것입니다.

| 장면 | 나레이션 = 자막 | 글자 수 |
|---|---|---|
| 1 | 열아홉 세기 중엽, 나라 안이 흔들리고 있었다. | 23 |
| 2 | 밖에서는 낯선 배가 다가와 문을 열라 하였다. | 23 |
| 3 | 그 겨울, 철종이 아들 없이 세상을 떠났다. | 21 |
| 4 | 운현궁에 열두 살 아이가 있었다. | 17 |
| 5 | 어제까지 그는 명복이었다. | 14 |
| 6 | 임금은 앉았고, 아버지가 그 곁에 섰다. | 20 |

**읽는 결** — 느리고 낮게. 이 게임은 나레이션을 한 번 걷어냈다가 영상에서만 다시
들이는 것이라, 들뜬 소리가 되면 게임 본편과 어긋납니다. 「설명하는 목소리」가
아니라 **「기록을 읽어 주는 목소리」**에 가깝게.

**끝 자막** — 6장면 끝에 제목이 뜹니다.

```
御 前
1863 — 1884
```

## 배경음악

선생님이 만드신 **「Beneath the Bronze Bell」** 한 곡. 게임 본편이 쓰는 그 곡이라,
영상에서 그대로 이어지면 학생이 영상 끝과 게임 시작을 하나로 받아들입니다.
나레이션이 묻히지 않게 **말하는 동안에는 소리를 낮춰** 주십시오.

## 반드시 넣어 주실 고지

영상 **맨 앞**(2초면 충분합니다)에 한 줄:

```
※ 이 영상은 AI 로 만든 재구성입니다. 그때를 찍은 기록이 아닙니다.
```

이것은 미관이 아니라 **참과 거짓의 문제**입니다. 이 게임은 사료 / 해석 / 재구성을
나누는 것을 뼈대로 삼고, 학생이 이 영상을 기록 영상으로 받아들이면 그 뼈대가
가장 앞자리에서 무너집니다. 영상이 끝나면 **실제 사진 자료 화면**이 이어 뜨므로,
학생은 「지어낸 그림 → 진짜 자료」 순서로 보게 됩니다.

---

## 저에게 주실 것

1. **완성된 영상 한 편**(mp4). 나레이션·자막·배경음악·고지까지 넣으신 그대로요.
   여섯 장면을 따로 주셔도 되고(`1.mp4` … `6.mp4`), 이어 붙인 한 편으로 주셔도 됩니다.
2. 중간에 **결이 어긋난 장면이 있으면** 번호만 말씀해 주십시오 — 그 장면만 다시
   뽑는 편이 전체를 다시 뽑는 것보다 낫습니다.

받으면 제가 하겠습니다:
- 용량 줄이기(교실 회선에서 끊기지 않을 크기로)
- `eojeon.pages.dev/prologue.mp4` 로 올리고, 1막을 열 때 틀리게 하기
- 영상이 없거나 안 열리면 **지금의 사진 화면이 그대로** 뜨게 하기
- 「건너뛰기」 단추 — 두 번째 보는 학생과, 시간이 없는 차시를 위해
