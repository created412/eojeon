import { describe, it, expect } from 'vitest'
import { createState, serialize, deserialize } from '../../src/core/state.js'
import { ACTS } from '../../src/data/acts.js'
import { enterAct } from '../../src/systems/scenario.js'
import { rememberActStart, restartActState, ensureActStart } from '../../src/systems/act-restart.js'

describe('사료 물음 뒤 막 처음으로 돌아가기', () => {
  it.each(ACTS.map((a,i)=>[a.id,i]))('%s: 저장을 거쳐도 앞 막의 기록을 정확히 되살린다', (_, ai) => {
    const start = rememberActStart(enterAct({ ...createState(),
      sources: { held:['wonnapjeon'], read:['wonnapjeon'], lost:[] },
      decisions:[{actIndex:ai-1,choiceId:'prior'}],
      inquiries:{wonnapjeon:{compared:true}}, flags:{prior:true},
      freedom:{hubs:{prior:{done:['npc:old']}}},
    },ACTS[ai],ai))
    const expected = restartActState(start)
    const playing = deserialize(serialize(start))
    playing.beatIndex = 6; playing.beatEntered = true; playing.actOpening = false
    playing.sources.held = []; playing.sources.lost = ['wonnapjeon']
    playing.flags.current = true; playing.inquiries.wonnapjeon.compared = false
    playing.decisions.push({actIndex:ai,choiceId:'current'})
    playing.pendingCards = {actIndex:ai,beatIndex:6,ids:['bellonet']}
    expect(restartActState(playing)).toEqual(expected)
    expect(restartActState(restartActState(playing))).toEqual(expected)
  })

  it('사본을 여러 막 중첩하지 않고 다음 막 시작을 새 기준으로 삼는다', () => {
    let state = createState()
    for (let ai=0;ai<ACTS.length;ai++) {
      state = rememberActStart(enterAct(state,ACTS[ai],ai))
      expect(state.actStart.actStart).toBeUndefined()
      expect(state.actStart.actIndex).toBe(ai)
    }
  })

  it('기존 3막 저장은 이전 사료·선택·약탈을 보존하고 현재 막의 화재와 진행을 되돌린다', () => {
    const old = { ...createState(), actIndex:2, beatIndex:14, beatEntered:true,
      sources:{held:['treaty-1'],read:['treaty-1'],lost:['wonnapjeon','bellonet']},
      lostBy:{wonnapjeon:'fire',bellonet:'plunder'},
      decisions:[{actIndex:0,choiceId:'prior'},{actIndex:2,choiceId:'current'}],
      inquiries:{wonnapjeon:{compared:true},treaty1876:{compared:true}},
      freedom:{hubs:{'yangyo/day-changdeok':{done:['old']},'chinjeong/day-1873':{done:['new']}},legacy:{actIndex:2,beatIndex:14}},
      codexAnswers:{yangyo:{done:true},chinjeong:{done:true}},
      flags:{'stop.pending':'new'},pendingCards:{ids:['treaty-1']},
    }
    const result = restartActState(old)
    expect(result.sources).toEqual({held:['wonnapjeon'],read:['wonnapjeon'],lost:['bellonet']})
    expect(result.decisions).toEqual([old.decisions[0]])
    expect(result.inquiries).toEqual({wonnapjeon:{compared:true}})
    expect(result.freedom).toEqual({hubs:{'yangyo/day-changdeok':{done:['old']}}})
    expect(result.codexAnswers).toEqual({yangyo:{done:true}})
    expect(result.pendingCards).toBeUndefined()
    expect(result.flags).toEqual({})
    expect(result.beatIndex).toBe(0)
    expect(result.palace).toBe(ACTS[2].palace)
    expect(ensureActStart(old).beatIndex).toBe(14)
    expect(restartActState(ensureActStart(old))).toEqual(result)
  })

  it('첫 막의 구형 저장은 완전한 첫 진행으로 돌아간다', () => {
    const result=restartActState({...createState(),beatIndex:5,sources:{held:['wonnapjeon'],read:['wonnapjeon'],lost:[]},inquiries:{wonnapjeon:{compared:true}}})
    expect(result.sources.held).toEqual([])
    expect(result.inquiries).toEqual({})
    expect(result.actOpening).toBe(true)
  })
})
