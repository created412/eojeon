import { it, expect } from 'vitest'
import { STUDIES, DILEMMAS } from '../../src/data/studies.js'
import { chipsOf } from '../../src/systems/doc-study.js'
import { CHOICE_ART } from '../../src/ui/choice-art-data.js'
import { choiceArtKey, choiceArtHtml } from '../../src/ui/choice-art.js'

it('정책과 사료의 모든 보기에 의미별로 다른 오프라인 그림이 있다', () => {
  for (const d of Object.values(DILEMMAS)) {
    const arts = [...d.options.map(o => o.id), 'actual'].map(o => CHOICE_ART[choiceArtKey('dilemma', d.id, null, o)])
    expect(new Set(arts).size, d.id).toBe(arts.length)
    for (const art of arts) expect(art).toMatch(/^data:image\/webp;base64,/)
  }
  for (const study of Object.values(STUDIES)) for (const [i, step] of study.steps.entries()) {
    const keys = step.kind === 'fill'
      ? chipsOf(study, step).map(c => choiceArtKey('word', study.id, i, c.word))
      : step.options.map(o => choiceArtKey('study', study.id, i, o.id))
    const arts = keys.map(k => CHOICE_ART[k])
    expect(new Set(arts).size, `${study.id}/${i}`).toBe(arts.length)
    for (const art of arts) expect(art).toMatch(/^data:image\/webp;base64,/)
    for (const key of keys) expect(choiceArtHtml(key)).toContain('선택지를 그린 재구성')
  }
})
