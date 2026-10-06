import { it, expect, vi } from 'vitest'
import { createGameTime } from '../../src/core/game-time.js'

it('멈춘 동안의 시간은 재개 뒤에도 행렬과 제한 시간에 더하지 않는다', () => {
  let time=1000;const clock=createGameTime(()=>time)
  const began=clock.now();time=1500;clock.setPaused(true)
  time=6500;expect(clock.now()-began).toBe(500)
  clock.setPaused(false);time=6800;expect(clock.now()-began).toBe(800)
})
it('메뉴·숨긴 탭·화면 회전이 겹치면 모두 해제되어야 다시 흐른다', () => {
  let time=0;const clock=createGameTime(()=>time)
  time=100;clock.setPaused(true,'menu');time=200;clock.setPaused(true,'hidden')
  clock.setPaused(false,'menu');time=800;expect(clock.now()).toBe(100)
  clock.setPaused(false,'hidden');time=900;expect(clock.now()).toBe(200)
})
it('결과 지연도 정지를 따르며 취소·폐기 뒤에는 실행하지 않는다', () => {
  vi.useFakeTimers()
  try {
    const clock=createGameTime(()=>Date.now()), done=vi.fn(), cancelled=vi.fn()
    clock.delay(done,1000);clock.delay(cancelled,500)()
    vi.advanceTimersByTime(400);clock.setPaused(true);vi.advanceTimersByTime(3000)
    expect(done).not.toHaveBeenCalled();clock.setPaused(false)
    vi.advanceTimersByTime(600);expect(done).toHaveBeenCalledOnce()
    expect(cancelled).not.toHaveBeenCalled();clock.delay(done,100);clock.dispose()
    vi.advanceTimersByTime(1000);expect(done).toHaveBeenCalledOnce()
  } finally { vi.useRealTimers() }
})
