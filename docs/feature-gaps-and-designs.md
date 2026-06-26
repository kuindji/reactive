# Feature Gaps & Design Proposals

> Status: design baseline. This document captures gaps identified in a review of
> `@kuindji/reactive` and proposes API designs for the five highest-value
> additions. Specs and implementation plans should be derived from this; nothing
> here is committed API yet.

## Context

The library is mature and unusually feature-rich on the eventing side
(collector/pipe modes, relay, event sources, intercept, tags, suspend/queue,
React hooks with semantic reconciliation). The gaps below are the things a heavy
*application* user reaches for that aren't present — concentrated in derived
state, UI action status, and a few ergonomic/observability omissions.

The review covered: `event.ts`, `eventBus.ts`, `action.ts`, `actionBus.ts`,
`actionMap.ts`, `store.ts`, `lib/types.ts`, and the React hooks.

### Scope / positioning

**This library is not a data-fetching library, and designs should not pull it in
that direction.** Its job is UI actions (intentful operations triggered by the UI:
submit, save, delete, navigate-effecting mutations) and a UI-oriented storage layer
(reactive state for components). Server-state concerns — caching, retries, request
dedup, stale-while-revalidate, request-race cancellation — belong to a dedicated
data-fetching layer (e.g. react-query), which the real consuming apps already use
for exactly that. This positioning is the reason Feature 2 is split below: the
*status* of a UI action (pending/error/result, to drive `loading`/`disabled`) is in
scope; *concurrency/cancellation policy* for racing requests is not a core need and
is deferred. See the adoption audits
([TheFloorr](./thefloorr-adoption-opportunities.md),
[Vigilocity](./vigilocity-adoption-opportunities.md)) — both confirm heavy demand
for action status and **zero** consumer for concurrency/takeLatest.

---

## Gap Inventory

### State / Store (largest area)

- **No derived/computed state.** The defining gap. No first-class
  `computed`/derived value that recomputes and notifies automatically. Closest
  primitive is the (undocumented) `effect` control event in `store.ts:150–180`.
- **Flat keys only.** No nested paths (`set("user.name", x)`,
  `onChange("user.profile.avatar", …)`). Forces whole-object replacement + manual diffing.
- **`reset()` wipes to empty, not back to `initialData`** (`store.ts:438`).
  Surprising semantic; most users expect reset to restore the seed.
- **No `get(key, defaultValue)`** — missing keys silently return `undefined`.
- **No whole-store snapshot subscription with values.** The `change` control
  event hands you *names*, not a snapshot; `getData()` is a manual pull.
- **No persistence or devtools hooks** (localStorage adapter, redux-devtools / time-travel tap).
- **Reference-equality only.** `_set` compares with `!==` (`store.ts:91`); no
  opt-in deep/custom equality. Mutate-in-place + set-same-ref is a silent no-op.

### Async / Actions

- **No loading/pending state.** `useAction` returns only the action object; no
  `{ data, loading, error }`. The most common UI-action need (drive `loading`/
  `disabled` on a submit button), rebuilt by hand every time. **In scope (Feature 2a).**
- **No cancellation / concurrency policies** (takeLatest / drop / queue, AbortSignal,
  retry, timeout, dedup, caching). These are request-race / server-state concerns that
  belong to a data-fetching layer, not this library. **Out of scope / deferred
  (Feature 2b)** — see Scope/positioning above; no consumer found in the audits.

### Events

- **No `once()` on a standalone `Event`.** `EventBus`/`ActionBus` have it;
  `createEvent` makes you write `addListener(fn, { limit: 1 })`. Inconsistent.
- **No listener introspection.** `hasListener()` is boolean-only — no
  `listenerCount()`, no enumeration, no public `triggeredCount`/`lastTriggerArgs`.
- **No `AbortSignal` support on subscription.** `addListener(fn, { signal })` →
  auto-remove on abort is now idiomatic; absent.
- **No async-iterator / observable interop.** `promise()` is one-shot; no
  `for await … of event` / `Symbol.asyncIterator` / RxJS `Symbol.observable`.

### React

- **No selector subscription with equality.** `useStoreState` is one-key-at-a-time
  (correctly uses `useSyncExternalStore`). No `useStoreSelector(store, s => …, eqFn)`.

### Cross-cutting

- **No `destroy()`/`dispose()` lifecycle.** `reset()` clears listeners but does
  not tear down relays/event sources — a quiet memory-leak risk on long-lived buses.
- **Instances are anonymous.** No optional `name`; names are the prerequisite for
  devtools, logging taps, and readable error reporting.

### Explicitly out of scope (philosophy calls, not omissions)

Nested store paths, RxJS interop, time-travel devtools. Revisit only if chasing parity.

---

## Prioritization

> **Feature 2 is split.** The adoption audits show its two halves have very
> different demand: status is the single most duplicated pattern across both real
> codebases; concurrency/takeLatest has no consumer in either. They are sequenced
> separately below.

1. **Computed/derived store values** — the defining gap.
2. **Async action status (loading/error/data)** — *Feature 2a*. The most duplicated
   workaround in the consuming apps (36 manual loading flags in Vigilocity, 7 action
   hooks in TheFloorr). Drives `loading`/`disabled` UI; not a data-fetching tool.
3. **Store selectors with equality (`useStoreSelector`)** — the React perf pattern.
4. **`AbortSignal` on listeners + `destroy()`** — cheap, modern, fixes cleanup.
5. **`once()` on Event + listener introspection** — small consistency/debuggability wins.

**Deferred (not scheduled): Async action concurrency policy** — *Feature 2b*
(takeLatest/queue/cancellation). Out of scope per the positioning above; build only
if a genuine UI-action race appears that a data-fetching layer can't own.

**Suggested build order / sizing:** `#5` and `#4`-AbortSignal are ~an afternoon
each and pure additions. `#1` is highest-value and mostly a thin layer over the
existing `effect` machinery. `#3` depends on nothing but pairs best with `#1`.
`#2` (2a status) is moderate — a status event + a React hook — and should land on the
**ActionBus `.invoke` path**, since the consuming apps route nearly all mutations
through a single ActionBus and never call `createAction` directly.

Recommended first prototype: **#1 (computed)** — proving it composes on top of
`effect`/intercept (rather than needing new core state) validates the approach
before committing to the API.

---

## Design 1 — Computed / derived store values

### Proposed surface

```ts
type UserStore = {
    first: string;
    last: string;
    fullName: string;   // declared in the type, registered as computed
};

const store = createStore<UserStore>({ first: "Jane", last: "Doe" });

store.computed(
    "fullName",
    ["first", "last"],
    (first, last) => `${first} ${last}`,
);

store.get("fullName");                  // "Jane Doe"
store.onChange("fullName", (v) => …);   // fires when first/last change
store.set("first", "John");             // fullName recomputes → "John Doe"
store.set("fullName", "x");             // throws: computed is read-only
```

### Mechanism — built on the existing `effect` event

The `effect` control event (`store.ts:150–180`) fires per changed key *inside an
interceptor window* that folds further `_set`s into the same outer `change` batch
(`effectKeys`, `store.ts:184`). A computed is sugar over that:

```ts
// store.computed(key, deps, fn) registers internally as:
control.addListener(EffectEventName, (changedName, _value) => {
    if (deps.includes(changedName)) {
        const next = fn(...deps.map((d) => data.get(d)));
        _set(key, next, /* triggerChange */ false); // folded into effectKeys
    }
});
```

Consequences that come for free:
- `set({ first, last })` recomputes `fullName` **once** (batched).
- Computed-of-computed chains, because each `_set` re-enters the effect cycle.
- `get`/`getData`/`useStoreState`/`useStoreSelector` see computed keys transparently.

### Decisions

- **Type registration (recommended) vs builder.** Declare the computed key in the
  `PropMap` and attach the derivation via `computed()`. Keeps the store type stable
  and the React hooks simple. The builder form (widening the return type) is purer
  but fights TypeScript.
- **Read-only enforcement: throw** when `set` targets a computed key. Silent
  rejection is a debugging trap.
- **Eager (recommended for v1)**, not lazy/pull-based. Lazy needs read-tracking — a
  much larger change.
- **Cycles:** per-computed re-entrancy guard → throw, never infinite-loop.
- **Glitches/diamonds:** registration-order recompute can double-fire a computed
  that depends on two keys where one derives the other. Ship registration-order
  first; a topological sort over the dep graph at registration time is the fix —
  note as a known limitation.

---

## Design 2a — Async action status (in scope)

The purpose is UI feedback: expose pending/error/result so a component can drive
`loading`/`disabled` without a hand-rolled `useState(false)` per action. Not a
data-fetching tool.

### Proposed surface

```ts
// Status on an action / on the ActionBus invoke path (the path the apps actually use):
action.getStatus();          // { pending: boolean, error: Error | null, response: T | null }
action.onStatusChange((s) => …);

// React — the common case: a submit handler that drives a button:
const [submit, { loading, error }] = useAsyncAction(saveProfileFn);
// <Button loading={loading} disabled={loading} onClick={submit} />

// ActionBus equivalent (matches how appActions is consumed in the audits):
const { loading, error } = useActionBusStatus(appActions, "user/login");
```

### Mechanism

- Track an in-flight counter inside `invoke` (`action.ts:81`); `pending = inFlight > 0`.
  Store last `response`/`error` on settle. Emit via a dedicated status event so the
  React hook subscribes through `useSyncExternalStore` (same tearing-safe pattern as
  `useStoreState.ts:32`).
- Surface the same status on `ActionBus` per action name — this is the primary
  consumption path (both audits route mutations through one ActionBus and never call
  `createAction` directly).

### Decisions

- **Status resets deterministically on settle** — the whole point is to remove the
  hand-written reset logic that the audits found to be inconsistent/buggy (e.g. a flag
  set to `true` instead of `false` after a mutation, or never reset on success).
- No `data` caching semantics — `response` is just the last settled value, not a cache.

### Evidence

- TheFloorr: 7 action hooks, ~25 manual flags (`useConsultationActions.ts:77-83`, etc.);
  a confirmed stuck-flag bug at `useProductActions.ts:155`.
- Vigilocity: 36 files with manual loading flags around `appActions.invoke`; shared
  auth blocks (`packages/common/src/blocks/auth/*`) reset the flag inconsistently.

---

## Design 2b — Async action concurrency policy (DEFERRED, out of scope)

Recorded for completeness; **not scheduled.** Concurrency/cancellation (takeLatest,
queue, drop, AbortSignal into the fn, retry/timeout/dedup) is a request-race /
server-state concern that belongs to a data-fetching layer, not a UI-action/storage
library. Both adoption audits found **no consumer**: data fetching uses react-query
(which de-races via query keys), searches are button/Enter-triggered, and the only
hand-rolled stale-request guards are long-lived WebSocket sessions that don't map onto
action invocations.

If a genuine UI-action race ever appears, the intended mechanism was result-level
versioning (each `invoke` bumps a counter; stale settles are discarded) with optional
opt-in `AbortSignal` — but do not build this speculatively.

---

## Design 3 — `useStoreSelector` with equality

### Proposed surface

```ts
// selector form (standard)
const label = useStoreSelector(
    store,
    (s) => `${s.first} ${s.last}`,
    shallowEqual,            // optional; default Object.is
);

// deps-keyed form (perf: recompute only when these keys change)
const label = useStoreSelector(store, ["first", "last"], (first, last) => …);
```

### Mechanism

Mirrors `useStoreState.ts:32` over a derived snapshot:
- Subscribe to the store's `change` control event (fires once per batch).
- `getSnapshot` runs the selector over `getData()`, compares with the cached result
  via the equality fn, and **returns the cached reference when equal** — the
  correctness-critical detail that lets React bail out (return a fresh object every
  call → infinite loop).
- The deps-keyed form skips recompute unless the batch intersects its keys.

Composes with Design 1: subscribe to a slice of derived state with shallow equality.

---

## Design 4 — `AbortSignal` on listeners + `destroy()`

### AbortSignal (additive on `ListenerOptions`, `event.ts:17`)

```ts
event.addListener(handler, { signal: controller.signal });
controller.abort();   // auto-removes the listener
```

In `addListener` (`event.ts:151`): if `signal.aborted`, skip adding; else
`signal.addEventListener("abort", () => removeListener(handler, context), { once: true })`.
Store the abort callback alongside the listener so manual `removeListener` also
detaches it (no dangling abort handler). Flows for free into
`EventBus`/`Store`/`Action` via delegation.

### `destroy()` — one-call teardown

```ts
event.destroy();      // reset() + mark dead
eventBus.destroy();   // unrelay all + remove all event sources + destroy each event
store.destroy();      // destroy changes/pipe/control buses + clear data
action.destroy();     // destroy underlying response/before/error events
```

### Decisions

- **EventBus needs a relay/source registry** to tear down — relays and
  `addEventSource` attach external listeners that `reset()` doesn't unwind (the
  actual leak risk). `destroy()` is the forcing function to track them.
- **Post-destroy: throw, don't no-op.** Add `isDestroyed()`; `trigger`/`addListener`/
  `invoke` throw `… is destroyed`. No dev/prod split exists, so a thrown error is the
  honest choice against use-after-free.

---

## Design 5 — `once()` on `Event` + introspection

### `once`

Consistency fix. Add to the api object (`event.ts:990`):

```ts
once: (handler, options) => addListener(handler, { ...options, limit: 1 }),
```

### Introspection (expose already-tracked internal state)

```ts
event.listenerCount(tag?);     // number (vs boolean-only hasListener)
event.triggeredCount();        // exposes internal `triggered` (event.ts:136)
event.lastTriggerArgs();       // exposes `lastTrigger`
event.getListeners();          // readonly projection: options + called/count (no handlers leaked mutably)
```

### Decisions

- `lastTrigger` is currently only populated when `autoTrigger` is on
  (`event.ts:571`). For introspection, always store a reference to the last args
  (one assignment; copy only when `autoTrigger` needs it).
- `getListeners()` returns a read-only projection — enough for devtools/tests
  without handing out mutable internals.

---

## Open questions for spec phase

- Computed: ship registration-order recompute, or invest in topological ordering up front?
- Action status (2a): does status live on `createAction` only, on the `ActionBus`
  invoke path, or both? (Audits say the ActionBus path is what's actually consumed.)
- `destroy()` post-call behavior confirmed as throw (vs no-op) across all factories?
- Naming: `name` field on factories now (enables devtools later) or defer?

(Resolved: Feature 2 split into 2a-status (in scope) and 2b-concurrency (deferred,
out of scope) — see Scope/positioning and Designs 2a/2b.)
