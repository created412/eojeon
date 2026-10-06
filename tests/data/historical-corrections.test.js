import { it, expect } from 'vitest'
import { sourceById } from '../../src/data/sources.js'
import { SOURCE_READS } from '../../src/data/source-games.js'
import { ACTS } from '../../src/data/acts.js'

it('운요호는 무단 접근→경고 사격→일본군 공격 순서이며 장계 말투는 재구성으로 밝힌다',()=>{
  const card=sourceById('unyo'), text=card.excerpt
  expect(text.indexOf('정체를 밝히지 않고')).toBeLessThan(text.indexOf('경고 사격'))
  expect(text.indexOf('경고 사격')).toBeLessThan(text.indexOf('이를 구실로'))
  expect(card.meaning).toContain('장계 원문이 아니라')
  const dispatch=ACTS[2].beats.find(b=>b.id==='unyo-dispatch')
  const serialized=JSON.stringify(dispatch)
  expect(serialized).toContain('경고 사격')
  expect(serialized).not.toContain('진에서도 마주 쏘았습니다')
  expect(serialized.match(/"grade":"staged"/g)?.length).toBe(2)
  expect(JSON.stringify(SOURCE_READS.unyo)).not.toContain('조선 쪽 기록')
})
it('영남만인소의 나쁜 감정이 없다는 상대는 러시아다',()=>{
  expect(sourceById('yeongnam-manin').excerpt).toContain('러시아는 본래 우리와 나쁜 감정이 없는 나라')
  expect(SOURCE_READS['yeongnam-manin'].parts.join('')).toContain('러시아는 본래')
})
it('벨로네의 위협 판독은 실제 교과서 발췌의 정복 예고를 근거로 삼는다',()=>{
  expect(sourceById('bellonet').excerpt).toContain('정복하기 위해 진군할 것이다')
  expect(sourceById('bellonet').excerpt).not.toContain('최후의 날이 될 것이다')
  expect(SOURCE_READS.bellonet.probe.ask).toContain('진군할 것이다')
})
