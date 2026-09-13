# Eojeon Cinematic Metaverse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the factual five-act Gojong campaign while replacing its 3D presentation, HUD, and interactions with a cinematic palace experience.

**Architecture:** Historical beats and state transitions remain in the current data and systems modules. A small direction layer converts the act, active beat, phase, and rush state into lighting, camera, NPC, and cue directives; rendering and UI consume those directives without deciding historical outcomes. Visual state is ephemeral, so saved-game state stays compatible.

**Tech Stack:** ES modules, Three.js 0.185.1, Vitest 3, esbuild, browser-native CSS and Web Audio.

**Spec:** `docs/superpowers/specs/2026-09-10-eojeon-cinematic-metaverse-design.md`

## Global Constraints

- Preserve all five acts, historical text, source grades, card gates, outcomes, and existing saved-game state.
- Add no runtime dependency; continue producing one `dist/어전.html` artifact.
- Keep `E`/tap interaction and keyboard/touch completion paths.
- Keep routine HUD to date, objective, and codex; show countdown and hazard guidance only during rushes.
- Honour `prefers-reduced-motion`; do not use camera shake, flashes, or forced long camera moves in that mode.
- Do not present reconstructions as historical facts.

---

### Task 1: Add a pure cinematic-direction contract

**Files:**
- Create: `src/render/cinematic.js`
- Create: `tests/render/cinematic.test.js`
- Modify: `src/render/scene.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces `cinematicDirective({ actId, beat, phase, control, rush })` returning `{ mood, camera, ambience, cue }`.
- Produces `interpolateCameraShot(current, target, alpha)`.
- Adds scene methods `ctx.setCinematic(directive)` and `ctx.setReducedMotion(enabled)`.

- [ ] **Step 1: Write the failing test**

```js
import { expect, it } from 'vitest'
import { cinematicDirective, interpolateCameraShot } from '../../src/render/cinematic.js'

it('stages the Gapsin rush as a night danger shot', () => {
  expect(cinematicDirective({ actId: 'gapsin', phase: 'rush', control: 'B', rush: { fire: false } }))
    .toMatchObject({ mood: 'night', cue: 'gunfire', camera: { mode: 'danger' } })
})

it('interpolates a camera target without overshoot', () => {
  expect(interpolateCameraShot({ x: 0, y: 4, z: 0, lookY: 2 }, { x: 10, y: 6, z: -8, lookY: 3 }, .5))
    .toEqual({ x: 5, y: 5, z: -4, lookY: 2.5 })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/render/cinematic.test.js`

Expected: FAIL because `src/render/cinematic.js` does not exist.

- [ ] **Step 3: Write the minimal implementation**

```js
const ACT_MOODS = Object.freeze({ enthronement: 'dawnwinter', yangyo: 'day', chinjeong: 'fire', imo: 'daybreak', gapsin: 'night' })

export function cinematicDirective({ actId, phase, rush }) {
  const danger = phase === 'rush'
  const fire = danger && rush?.fire === true
  return { mood: fire ? 'fire' : ACT_MOODS[actId] ?? 'day',
    camera: { mode: danger ? 'danger' : 'follow' },
    ambience: danger ? 'tense' : 'palace',
    cue: fire ? 'fire' : danger && actId === 'act5' ? 'gunfire' : null }
}

export function interpolateCameraShot(current, target, alpha) {
  const t = Math.max(0, Math.min(1, alpha))
  return Object.fromEntries(Object.keys(current).map(k => [k, current[k] + (target[k] - current[k]) * t]))
}
```

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- tests/render/cinematic.test.js tests/render/occlusion.test.js tests/render/facing.test.js`

Expected: PASS.

- [ ] **Step 5: Integrate scene direction**

Add a camera target group and at-most-one-second eased transition in `scene.js`. Reuse existing `setMood`, fire, NPC, and player objects. In reduced-motion mode apply the target immediately. In `main.js`, compute exactly one directive from authoritative flow state each frame and pass it to the scene.

- [ ] **Step 6: Commit**

```bash
git add src/render/cinematic.js src/render/scene.js src/main.js tests/render/cinematic.test.js
git commit -m "feat: add cinematic scene direction"
```

### Task 2: Replace generic markers with diegetic interaction cues

**Files:**
- Create: `src/systems/interaction-cues.js`
- Create: `tests/systems/interaction-cues.test.js`
- Modify: `src/render/scene.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces `interactionCue({ kind, label, distance, urgent })` as `{ label, tone, pulse, visible }`.
- Adds `ctx.setInteractionCues(cues)`; `main.js` supplies only actionable targets calculated by existing proximity rules.

- [ ] **Step 1: Write the failing test**

```js
import { expect, it } from 'vitest'
import { interactionCue } from '../../src/systems/interaction-cues.js'

it('uses a restrained cue for a nearby document', () => {
  expect(interactionCue({ kind: 'document', label: '강화도 조약', distance: 3, urgent: false }))
    .toEqual({ label: '강화도 조약 · E 읽기', tone: 'gold', pulse: false, visible: true })
})

it('uses red only for an urgent route target', () => {
  expect(interactionCue({ kind: 'door', label: '대조전', distance: 8, urgent: true }).tone).toBe('red')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/systems/interaction-cues.test.js`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement the cue policy and scene rendering**

Implement the pure policy. Replace the always-visible black nameplate with a lantern-shaped sprite/ring that uses gold for a normal interaction and red only for rush targets; keep `depthTest: false`. Show only the nearest normal target. During a rush, show the goal and the next urgent target rather than a centre-screen arrow.

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- tests/systems/interaction-cues.test.js tests/systems/movement.test.js tests/systems/audience.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/interaction-cues.js src/render/scene.js src/main.js tests/systems/interaction-cues.test.js
git commit -m "feat: add diegetic palace interaction cues"
```

### Task 3: Rebuild the persistent HUD and contextual panels

**Files:**
- Create: `src/ui/cinematic-hud.js`
- Create: `tests/ui/cinematic-hud.test.js`
- Modify: `src/ui/hud.js`
- Modify: `src/ui/dialog.js`
- Modify: `src/ui/council-ui.js`
- Modify: `src/ui/controls-hint.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces `createCinematicHud(root)` with `update(view)`, `showRush(rush)`, `hideRush()`, and `dispose()`.
- Existing `hud.update` data remains authoritative; `main.js` adds current objective and rush lifecycle only.

- [ ] **Step 1: Write the failing test**

```js
import { beforeEach, expect, it } from 'vitest'
import { createCinematicHud } from '../../src/ui/cinematic-hud.js'

beforeEach(() => document.body.replaceChildren())

it('shows date, objective, and codex during calm exploration', () => {
  const hud = createCinematicHud(document.body)
  hud.update({ dateLabel: '1876 · 강화도', objective: '장계를 읽는다', codexCount: '2/4' })
  expect(document.body.textContent).toContain('1876 · 강화도')
  expect(document.body.querySelector('[data-role="rush"]')).toBeNull()
})

it('adds a rush panel only while danger is active', () => {
  const hud = createCinematicHud(document.body)
  hud.showRush({ remainMs: 20000, label: '대조전으로 가십시오' })
  expect(document.body.querySelector('[data-role="rush"]')?.textContent).toContain('대조전으로 가십시오')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/ui/cinematic-hud.test.js`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement and integrate**

Create a transparent top rail for date and codex, a lower-left objective, and a bottom danger strip created only by `showRush`. Add visible focus and `prefers-reduced-motion` CSS. Restyle dialogue as a low subtitle panel and council choices as documents on a council table; preserve existing exports, locked-choice reasons, and button semantics. In `main.js`, update the rush panel from the existing `remainingMs` source and hide it on every outcome and disposal path.

- [ ] **Step 4: Run UI regression tests**

Run: `npm test -- tests/ui/cinematic-hud.test.js tests/ui/dialog.test.js tests/ui/council-ui.test.js tests/ui/controls-hint.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/cinematic-hud.js src/ui/hud.js src/ui/dialog.js src/ui/council-ui.js src/ui/controls-hint.js src/main.js tests/ui/cinematic-hud.test.js
git commit -m "feat: redesign cinematic game interface"
```

### Task 4: Stage the three historical crises through the world

**Files:**
- Create: `src/systems/event-staging.js`
- Create: `tests/systems/event-staging.test.js`
- Modify: `src/systems/audio.js`
- Modify: `src/systems/fire-rush.js`
- Modify: `src/systems/rush-scene.js`
- Modify: `src/render/scene.js`
- Modify: `src/main.js`

**Interfaces:**
- Produces `stageEvent({ actId, beat, phase, rush })` returning `{ cue, ambience, npcMode, cameraMode, reducedMotionSafe }`.
- Uses current rush systems and scene methods only; it adds no historical flags or alternate outcomes.

- [ ] **Step 1: Write the failing test**

```js
import { expect, it } from 'vitest'
import { stageEvent } from '../../src/systems/event-staging.js'

it('stages the Imo rush as crowd pressure, not fire', () => {
  expect(stageEvent({ actId: 'imo', phase: 'rush', rush: { fire: false } }))
    .toMatchObject({ cue: 'crowd', ambience: 'riot', npcMode: 'flee', cameraMode: 'danger' })
})

it('stages palace fire with a fire cue', () => {
  expect(stageEvent({ actId: 'chinjeong', phase: 'rush', rush: { fire: true } }).cue).toBe('fire')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/systems/event-staging.test.js`

Expected: FAIL because the module is absent.

- [ ] **Step 3: Implement and wire stages**

Map existing rushes to fire (orange source lights and embers), Imo unrest (crowd calls, doors closing, NPC retreat), and Gapsin flight (distant gunfire, blue night, escorts). Begin and stop ambient loops at existing rush boundaries, restore normal cues on every outcome, and never modify the caught/success branch behavior.

- [ ] **Step 4: Run event and history regression tests**

Run: `npm test -- tests/systems/event-staging.test.js tests/systems/fire-rush.test.js tests/systems/rush-scene.test.js tests/data/acts.test.js tests/data/grade-honesty.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/event-staging.js src/systems/audio.js src/systems/fire-rush.js src/systems/rush-scene.js src/render/scene.js src/main.js tests/systems/event-staging.test.js
git commit -m "feat: stage historical crises in the palace"
```

### Task 5: Verify the single-file classroom build

**Files:**
- Modify: `tests/build.test.js`
- Modify: `tests/full-run.test.js`
- Modify: `docs/teacher-guide.md`
- Generated: `dist/어전.html`

**Interfaces:**
- Build tests consume the generated HTML and full-run harness.
- Produces assertions for cinematic modules, reduced-motion CSS, calm HUD, and rush teardown.

- [ ] **Step 1: Write the failing build assertions**

```js
expect(html).toContain('cinematicDirective')
expect(html).toContain('대조전으로 가십시오')
expect(html).toContain('prefers-reduced-motion')
```

- [ ] **Step 2: Run the test to verify it fails before rebuilding**

Run: `npm test -- tests/build.test.js`

Expected: FAIL because the existing built HTML lacks the new cinematic strings.

- [ ] **Step 3: Build and add full-run coverage**

Run: `npm run build`

Add full-run checks for a visible nearby interaction cue, no rush panel during calm exploration, and rush-panel teardown after all existing rush outcomes.

- [ ] **Step 4: Run the complete automated suite**

Run: `npm test`

Expected: PASS with no build, history-data, save-restore, input, UI, rendering, or full-run failure.

- [ ] **Step 5: Complete visual browser QA**

Check the title, NPC interaction, council, C1 fire, C2 Imo unrest, C3 Gapsin flight, reduced-motion mode, and ending at 1280×720 and a narrow touch viewport. Correct console errors, overlapping UI, unreadable Korean text, obscured cues, and unreachable touch actions before handoff.

- [ ] **Step 6: Update the teacher guide and commit**

Document `E`/tap investigation, `Q` codex, the objective line, three crisis signals, and the reduced-motion browser setting.

```bash
git add tests/build.test.js tests/full-run.test.js docs/teacher-guide.md dist/어전.html
git commit -m "test: verify cinematic classroom build"
```

## Plan Self-Review

- **Spec coverage:** Tasks 1–4 cover cinematic camera/light, diegetic interaction, minimal UI, accessibility, and the three event types. Task 5 covers the build, browser, touch, and teacher-facing handoff.
- **No placeholders:** Every task names exact files, APIs, failure-first tests, commands, and completion checks.
- **Interface consistency:** `cinematicDirective` is the common direction contract; `stageEvent` enriches it for rushes. The scene and HUD APIs are defined before integration tasks consume them.
