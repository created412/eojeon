// Node에는 ProgressEvent가 없다 — three의 GLB 로더가 내는 진행 이벤트만 브라우저와 맞춘다.
// 파일 로딩 실패를 삼키거나 가짜 모델을 주지 않아 실제 오류는 그대로 시험에 드러난다.
if (!globalThis.ProgressEvent) {
  globalThis.ProgressEvent = class ProgressEvent extends Event {
    constructor(type, init = {}) {
      super(type, init)
      this.lengthComputable = init.lengthComputable ?? false
      this.loaded = init.loaded ?? 0
      this.total = init.total ?? 0
    }
  }
}
