import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {bodyOf} from '../helpers/body-of.js'
import {createState,serialize,deserialize} from '../../src/core/state.js'
import {sourceById} from '../../src/data/sources.js'
const source=readFileSync(new URL('../../src/main.js',import.meta.url),'utf8')
function harness(state={...createState(),actIndex:1,beatIndex:2,sources:{held:['bellonet','oegyujanggak'],read:['bellonet','oegyujanggak'],lost:[]}}){
 const env={flow:{state},sourceById,guide:{set(){}},guideForBeat:()=>'',activeBeat:null,CARD_GUIDE:'',SOURCE_GAME_GUIDE:{},sourceGameFor:()=>null,
  saved:[],shown:[],saveGame(s){env.saved.push(serialize(s))},dialog:{showCard(card,done){env.shown.push({card,done})}}}
 env.showPacketCards=new Function('env',`with(env){return function showPacketCards(cards,done=null,persist=false){${bodyOf(source,'showPacketCards')}}}`)(env)
 env.resumePendingCards=()=>new Function('env',`with(env){return (async()=>{${bodyOf(source,'resumePendingCards')}})()}`)(env)
 return env
}
it('읽는 도중 저장해도 아직 닫지 않은 카드 묶음이 남는다',()=>{
 const e=harness();e.showPacketCards(['bellonet','oegyujanggak'].map(sourceById),null,true)
 expect(deserialize(e.saved.at(-1)).pendingCards.ids).toEqual(['bellonet','oegyujanggak'])
 e.shown[0].done()
 expect(deserialize(e.saved.at(-1)).pendingCards.ids).toEqual(['oegyujanggak'])
 e.shown[1].done()
 expect(e.flow.state.pendingCards).toBe(null)
})
it('이어하기는 미완료 카드부터 열고 모두 닫힌 뒤 돌아간다',async()=>{
 const e=harness();e.showPacketCards(['bellonet','oegyujanggak'].map(sourceById),null,true);e.shown[0].done()
 const saved=deserialize(e.saved.at(-1)),r=harness(saved);let done=false
 const task=r.resumePendingCards().then(()=>done=true)
 expect(r.shown.map(x=>x.card.id)).toEqual(['oegyujanggak'])
 expect(done).toBe(false)
 r.shown[0].done();await task
 expect(r.flow.state.sources).toEqual(saved.sources)
 expect(r.flow.state.pendingCards).toBe(null)
})
it('다른 비트의 낡은 pending은 현재 장면에 끼어들지 않는다',async()=>{
 const e=harness();e.flow.state.pendingCards={actIndex:0,beatIndex:0,ids:['bellonet']}
 await e.resumePendingCards()
 expect(e.shown).toHaveLength(0)
 expect(e.flow.state.pendingCards).toBe(null)
})

it('이어하기 직후 boot 국면의 문서도 E로 닫기를 요청한다',()=>{
 let closed=0,prevented=0
 const env={isTyping:()=>false,controlsHint:{isOpen:()=>false},pause:{isOpen:()=>false},
  dialog:{isOpen:()=>true,close(){closed++}},flow:{phase:'boot'}}
 new Function('env','e',`with(env){${bodyOf(source,'handleKey')}}`)(env,{code:'KeyE',preventDefault(){prevented++}})
 expect(closed).toBe(1);expect(prevented).toBe(1)
})
