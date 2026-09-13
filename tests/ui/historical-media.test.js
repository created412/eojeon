import { describe, it, expect } from 'vitest'
import { SOURCES } from '../../src/data/sources.js'
import { NPCS } from '../../src/data/npcs.js'
import { sourceMedia, speakerMedia, noteMedia } from '../../src/ui/historical-media.js'

describe('역사 이미지의 정확한 연결과 오프라인 표시', () => {
 it.each(SOURCES)('$id 사료에 출처 있는 이미지를 연결한다', card => {
  const media=sourceMedia(card.id)
  expect(media.src).toMatch(/^data:image\/webp;base64,/)
  expect(media.source).toMatch(/^https:\/\/commons.wikimedia.org\/wiki\//)
  expect(media.caption.length).toBeGreaterThan(6)
  expect(media.relation.length).toBeGreaterThan(6)
  expect(media.credit).toBeTruthy()
  expect(media.license).toBeTruthy()
 })
 it('당백전 뒷면의 당백 표기까지 보여 준다',()=>{
  expect(sourceMedia('dangbaekjeon').caption).toContain('앞면과 뒷면')
  expect(sourceMedia('dangbaekjeon').caption).toContain('當百')
 })
 it.each(['heungseon','choeikhyeon','sinheon'])('%s은 해당 실존 인물 원본 자료를 쓴다',id=>{
  const npc=NPCS.find(n=>n.id===id)
  const m=speakerMedia({...npc,npcId:id,portrait:'mid'})
  expect(m.caption).toContain(npc.name)
  expect(m.kind).toBe('historical')
  expect(m.source).toContain('commons.wikimedia.org')
 })
 it('역할 인물과 초상이 확인되지 않은 사람을 다른 실존 인물로 대신하지 않는다',()=>{
  expect(speakerMedia({npcId:'hojo',name:'호조 관리',portrait:'mid'}).kind).toBe('reconstruction')
  expect(speakerMedia({npcId:'hongjaehak',name:'홍재학',portrait:'mid'}).relation).toContain('확인된 초상')
  expect(speakerMedia({npcId:'hongjaehak',name:'홍재학',portrait:'mid'}).source).toBeFalsy()
 })
 it('사진의 후대 촬영 시점과 지문의 원본 여부를 구분한다',()=>{
  expect(speakerMedia({npcId:'heungseon'}).caption).toContain('1883')
  expect(sourceMedia('yeongnam-manin').relation).toContain('상소 원본이 아닌')
  expect(noteMedia({id:'imo-jemulpo'}).caption).toContain('제물포')
 })
})
