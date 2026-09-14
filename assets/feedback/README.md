# 어전 수업 피드백 이미지

Built-in image generation tool로 2026-09-13에 생성한 게임용 재구성 그림입니다. 역사 사진이나 실제 초상, 급료 혼합 비율을 복원한 자료로 표시하지 않습니다.

- `sack.png` / `sack.webp`: 무위영 급료 가마. 짚을 엮은 질감과 새끼줄을 표현했습니다.
- `grain.png` / `grain.webp`: 흰 쌀, 누런 겨, 거친 모래를 구분해 살펴보는 그림입니다.
- `mother.png` / `mother.webp`: 여흥부대부인 민씨의 재구성 인물. 투명 알파가 없는 원본이므로 UI의 clip-path와 장면의 인물 외곽 메시로 표시합니다.

PNG는 생성 원본입니다. WebP는 배포 용량을 위한 1024px, 품질 86 변환이며 `tools/pack-feedback-media.cjs`로 HTML 내장 데이터를 만듭니다. 대체로 생성됐지만 실제 투명 알파가 없던 두 번째 어머니 그림은 사용하지 않습니다.

## 사용한 프롬프트

### 급료 가마

Use case historical-scene. Create a polished realistic painted game illustration, landscape 3:2. A single substantial late Joseon Korean straw rice sack (seom / gama), bulky rectangular woven rice-straw mat bag, tightly folded closed mouth tied with coarse twisted straw rope, resting on aged wooden planks in a dim Korean military storehouse circa 1882. Close three-quarter view, sack occupies 75% frame. Extremely convincing coarse golden straw weaving, individual fibres, frayed edges, rope tension, seams, weight and soft shadows. Warm natural side light, brown and charcoal background, restrained historical game realism. No modern burlap, no printed marks, no words, no labels, no people, no UI. This is a game asset for opening the soldiers' overdue rice salary.

### 쌀·겨·모래

Historical educational game illustration, landscape 3:2, beautiful realistic macro still life of spoiled late Joseon soldiers' rice ration spread across an opened coarse woven straw mat on old timber. Clearly visible three different materials intermingled: ivory white plump short-grain rice grains, golden tan papery elongated rice husks and fine bran flakes, granular grey beige sand with a few tiny gritty stones. Rice recognizable and dominant, appreciable husks and sand mixed THROUGH the rice, detailed texture, natural imperfect distribution. Three-quarter overhead close view, tactile detailed painted realism, warm oblique daylight, muted dark brown surround, no hands, no text, no labels, no arrows, no infographic, no stripes. Students must be able to visually distinguish rice from papery husks and gritty sand. No exact historical proportions claimed.

### 여흥부대부인 민씨

Use case historical-scene. A full length isolated character for a Korean historical educational game, plausible reconstruction of Lady Min of Yeoheung, mother of King Gojong, circa 1863, Korean woman in her mid forties, calm caring yet dignified expression. Realistic painterly game character, finely modeled Korean face, natural skin texture, dark hair center-parted and smoothed into low chignon secured with a modest simple binyeo hairpin. Late Joseon noblewoman everyday hanbok: restrained light ivory silk jeogori with muted wine-red collar ties and full deep indigo chima reaching white socks and simple shoes. Hands gently folded at waist, standing three-quarter front pose. Modest upper-class mother, not queen's ceremonial robes, no crown, no dragon insignia, no ornate tall wig. Entire body including shoes in frame with generous margin. Transparent alpha background, no scenery, no text, no labels, no frame. Beautiful warm soft side lighting, detailed textile folds and convincing volume, natural proportions. Character is artistic reconstruction, not a claim of authentic portrait likeness.
