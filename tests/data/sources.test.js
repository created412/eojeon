import { describe, it, expect } from 'vitest'
import { SOURCES, sourceById, sourcesOfAct, plunderTargets } from '../../src/data/sources.js'

describe('사료 카드 전체', () => {
  it('1막의 두 장이 그대로 남아 있다', () => {
    expect(sourceById('wonnapjeon')?.act).toBe(1)
    expect(sourceById('dangbaekjeon')?.act).toBe(1)
    expect(sourcesOfAct(1)).toHaveLength(2)
  })

  it('모든 카드가 id·제목·출처·등급·발췌·의미를 가진다', () => {
    for (const c of SOURCES) {
      expect(c.id, 'id 없음').toBeTruthy()
      expect(c.title, `${c.id} 제목 없음`).toBeTruthy()
      expect(c.origin, `${c.id} 출처 없음`).toBeTruthy()
      expect(c.excerpt, `${c.id} 발췌 없음`).toBeTruthy()
      expect(c.meaning, `${c.id} 의미 없음`).toBeTruthy()
      expect(['textbook', 'source', 'staged'], `${c.id} 등급 이상`).toContain(c.grade)
    }
  })

  it('id 가 겹치지 않는다', () => {
    const ids = SOURCES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('2막 7장 · 3막 8장이 들어 있다', () => {
    expect(sourcesOfAct(2)).toHaveLength(7)
    expect(sourcesOfAct(3)).toHaveLength(8)
    // 4·5막 여덟 장이 더해져 전체는 25장이다 — 아래 '4·5막 사료 여덟 장' describe 가 자세히 못 박는다.
    expect(SOURCES).toHaveLength(25)
  })

  it('교과서 등급 카드는 출처에 쪽수를 밝힌다', () => {
    for (const c of SOURCES.filter(c => c.grade === 'textbook')) {
      expect(c.origin, `${c.id}`).toMatch(/p{1,2}\.\d/)
    }
  })

  it('교과서 번역을 그대로 옮기지 않았음을 출처에 밝힌다', () => {
    for (const c of SOURCES.filter(c => c.origin.includes('한국사1'))) {
      expect(c.origin, `${c.id}`).toContain('우리말 옮김')
    }
  })

  it('D1 약탈 대상은 「외규장각 도서 목록」 한 장이다 — 판정 R17·검증 C', () => {
    expect(plunderTargets().map(c => c.id)).toEqual(['oegyujanggak'])
  })

  it('양헌수 장계는 약탈 대상이 아니다 — 장계는 강화도 서고에 있던 물건이 아니다', () => {
    expect(sourceById('yangheonsu').plunderable).toBeUndefined()
  })

  it('약탈 대상은 모두 2막 카드다', () => {
    for (const c of plunderTargets()) expect(c.act).toBe(2)
  })

  it('강화도 조약 세 조문이 모두 3막에 있다', () => {
    for (const id of ['ganghwa1', 'ganghwa7', 'ganghwa10']) {
      expect(sourceById(id)?.act, id).toBe(3)
    }
  })

  it('척화비 비문에 열두 글자가 들어 있다', () => {
    expect(sourceById('cheokhwabi').excerpt).toContain('洋夷侵犯 非戰則和 主和賣國')
  })

  it('척화비 카드가 「발췌」임을 밝히고 뒤따르는 구절을 함께 싣는다 — 검증 C', () => {
    const c = sourceById('cheokhwabi')
    expect(c.origin).toContain('발췌')
    expect(c.excerpt).toContain('戒我萬年子孫')
    expect(c.excerpt).toContain('丙寅作 辛未立')
  })
})

describe('4·5막 사료 여덟 장', () => {
  it('4막 6장 · 5막 2장이 들어 있고, 전체가 25장이다', () => {
    // 설계서 §9는 24장이라 하지만 그 표는 「원납전과 당백전」을 한 장으로 센다.
    // 1단계가 두 장으로 커밋했고 그 두 장은 잠금이다 — 그래서 25가 맞는다.
    expect(sourcesOfAct(4)).toHaveLength(6)
    expect(sourcesOfAct(5)).toHaveLength(2)
    expect(SOURCES).toHaveLength(25)
  })

  it('여덟 장의 id 가 계획서와 같다', () => {
    expect(sourcesOfAct(4).map(c => c.id)).toEqual([
      'joseon-chaeryak', 'yeongnam-manin', 'hong-jaehak', 'muwiyeong', 'jemulpo4', 'sokbang',
    ])
    expect(sourcesOfAct(5).map(c => c.id)).toEqual(['gapsin-memoir', 'reform14'])
  })

  it('1~3막 열일곱 장이 그대로 남아 있다 — 이 태스크는 덧붙이기만 한다', () => {
    expect(sourcesOfAct(1)).toHaveLength(2)
    expect(sourcesOfAct(2)).toHaveLength(7)
    expect(sourcesOfAct(3)).toHaveLength(8)
    expect(sourceById('cheokhwabi').origin).toContain('발췌')
    expect(sourceById('yangheonsu').plunderable).toBeUndefined()
  })

  it('약탈 대상은 여전히 「외규장각 도서 목록」 한 장뿐이다 — 판정 R17·R26', () => {
    expect(plunderTargets().map(c => c.id)).toEqual(['oegyujanggak'])
  })

  // ── 사료 검증 D 가 잡아낸 다섯 가지. 주석은 지워질 수 있지만 시험은 운다(판정 R45) ──

  it('속방 카드는 屬邦 이 실제로 들어 있는 문장을 싣는다 — 판정 R46', () => {
    const c = sourceById('sokbang')
    expect(c.excerpt).toContain('속방(屬邦)을 우대하는 뜻')
    // 「藩封」 문장과 합성해 만든 옛 문구를 되살리지 못하게 한다
    expect(c.excerpt).not.toContain('오래도록')
    // 「서문」인지 「제1조 서두」인지 자료가 갈린다 — 단정하지 않는다
    expect(c.title).not.toContain('서문')
    expect(c.origin).not.toContain('서문')
  })

  it('어려운 낱말을 남기기로 한 네 장은 gloss 를 달고 있다 — 분해 아니면 교체, 중간은 없다', () => {
    for (const id of ['yeongnam-manin', 'hong-jaehak', 'sokbang', 'reform14']) {
      const c = sourceById(id)
      expect(c.gloss, `${id} 가 어려운 낱말을 남기면서 gloss 가 없다`).toBeTruthy()
      expect(c.gloss, id).toMatch(/·|—/)
    }
  })

  it('속방 카드가 두 조약을 나란히 놓는다 — 자주국(1876) 대 속방(1882)', () => {
    const c = sourceById('sokbang')
    expect(c.meaning).toContain('자주')
    expect(c.meaning).toContain('속방')
  })

  it('무위영 카드는 「겨」와 「모래」의 근거가 다르다는 것을 밝힌다 — 판정 R47', () => {
    const c = sourceById('muwiyeong')
    expect(c.grade).toBe('textbook')          // 교과서가 제 목소리로 그렇게 적는다
    expect(c.meaning).toContain('겨')
    expect(c.meaning).toContain('모래')
    expect(c.meaning).toContain('매천야록')   // 「겨」의 당대 근거
  })

  it('김옥균 카드는 그의 직접 육성이 아님을 제목에서부터 밝힌다 — 판정 R48', () => {
    const c = sourceById('gapsin-memoir')
    expect(c.title).toContain('후쿠자와 유키치전')
    expect(c.title).not.toBe('김옥균의 회고')
    expect(c.meaning).toContain('1943')
  })

  it('김옥균 카드는 교과서 p.116 이 싣는 그 문단이다 — 판정 R49', () => {
    const c = sourceById('gapsin-memoir')
    expect(c.excerpt).toContain('자금 없이는')
    expect(c.origin).toContain('p.116')
    // 어디서도 확인되지 않은 옛 후보 문구를 되살리지 못하게 한다
    expect(c.excerpt).not.toContain('프랑스')
  })

  it('홍재학 카드는 실록 국역의 어순·단어를 쓰고, 교과서와 다르다는 것도 밝힌다 — 판정 R50', () => {
    const c = sourceById('hong-jaehak')
    expect(c.excerpt).toContain('척사위정')
    expect(c.excerpt).toContain('정령')
    expect(c.excerpt).not.toContain('위정척사의 명령')
    expect(c.meaning).toContain('위정척사의 명령')   // 교과서는 이렇게 옮긴다고 카드가 알린다
  })

  it('홍재학이 이 상소로 죽었다는 것이 카드에 있다 — 그냥 물러간 것이 아니다', () => {
    const c = sourceById('hong-jaehak')
    expect(c.meaning).toContain('참형')
    expect(c.meaning).toContain('1881')
  })

  it('영남 만인소에서 「원수」가 사라졌다 — 원문에 없는 말이다 · 판정 R50', () => {
    const c = sourceById('yeongnam-manin')
    expect(c.excerpt).not.toContain('원수')
    expect(c.excerpt).toContain('나쁜 감정이 없는 나라')   // 교과서 p.115 지면
    expect(c.meaning).toContain('기미')                    // 국편 발췌의 다른 대목
  })

  it('조선책략 카드는 옮긴 것이 「문장」이 아니라 「취지」임을 밝힌다', () => {
    const c = sourceById('joseon-chaeryak')
    expect(c.excerpt).toContain('중국과 친하고')
    expect(c.origin).toContain('취지를 옮김')
  })

  it('개혁 정강 카드에 「80여 조」가 없다 — 서재필 한 사람의 회고뿐이다', () => {
    const c = sourceById('reform14')
    expect(c.excerpt).toContain('제13조')
    expect(c.meaning).toContain('전제권')
    expect(JSON.stringify(c)).not.toContain('80여')
  })

  it('조항 번호를 화면에 적는 카드는 번호와 본문이 함께 있다', () => {
    expect(sourceById('jemulpo4').title).toContain('제4관')
    expect(sourceById('jemulpo4').excerpt).toContain('50만 원')
  })

  it('「日使來衛」를 사료 카드로 만들지 않았다 — 그것은 붓 화면의 수업이다', () => {
    expect(SOURCES.some(c => c.excerpt.includes('日使來衛'))).toBe(false)
  })

  it('여덟 장 모두 우리말로 옮긴 것임을 밝힌다 — 교과서 번역을 옮겨 오지 않는다', () => {
    for (const c of [...sourcesOfAct(4), ...sourcesOfAct(5)]) {
      expect(c.rendering, c.id).toBe('우리말 옮김')
      expect(c.origin, c.id).toContain('우리말 옮김')
    }
  })
})
