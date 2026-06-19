# Hook Reconciliation Plan

## Context

React hooks in this package currently create or subscribe to reactive primitives once, then update only a subset of passed values. This means some changed options/parameters are silently ignored after rerender.

The desired direction is that hook inputs should be reconciled across renders. Consumers are expected to pass inline objects such as `{ tags: [tag] }`, so reconciliation cannot be based on object identity alone. It needs semantic comparison on every render.

This is a delicate change. Work should be test-first and split into small steps.

## Decisions Log (resolved — ready to implement)

These were decided with the project owner and are reflected in the steps below.

1. **`tags` comparison**: order-insensitive set comparison; `undefined`/`[]`/missing all equal. (Comparator Policy → ListenerOptions)
2. **Listener option changes**: update the live listener **in place**, preserving `called`/`count`. New core API `updateListenerOptions(handler, context, nextOptions)` on `createEvent`, threaded through `eventBus`/`store`/`actionBus`. Soft fields: `limit`, `start`, `async`, `tags`, `extraData`, `alwaysFirst`/`alwaysLast` (re-sort). `context` change → true resubscribe (remove with OLD context). `first` is insertion-only (no-op in place). Lowering `limit` ≤ current `called` removes immediately. (Step 1)
3. **`useEvent` event-option changes**: apply in place via expanded `setOptions`; `triggered` is preserved (changing `limit` allows more triggers). (Step 2)
4. **`useEventBus` options**: reconcile instead of throw. Present entries applied via `setOptions`; a removed event-name entry **leaves the existing event unchanged** (no reset to defaults). (Step 3)
5. **Action function changes** (`useAction`/`useActionBus`/`useActionMap`): replace **in place** via new core `createAction().setAction(fn)`, preserving all listeners; compare functions by reference. Removed bus actions throw `Action <name> not found` (already core behavior). (Steps 7, 4)
6. **`useActionMap` key set**: static — fixed by the action-map type contract. Reconcile values only (in-place `setAction` + error-listener); a runtime key-set change keeps a defensive throw. (Step 8)
7. **`useStore` `initialData`**: seed-only (Policy A). No reconciliation; later `initialData` changes are ignored. (Step 6)
8. **New core APIs are PUBLIC** (decided): `updateListenerOptions` (event/eventBus/actionBus), `updateOnChangeOptions` (store), `setAction` (action/actionBus), and the expanded `setOptions` (event/eventBus) are exported from the package root, documented, and treated as a supported semver surface — not internal-only. This is in addition to the React-independent core tests already required in the per-step risk checks.

## Current Findings

Silent stale-update cases:

- `src/react/useListenToEvent.ts`: `options` is used when adding/removing the listener, but is not part of update logic.
- `src/react/useListenToEventBus.ts`: same stale `options` issue.
- `src/react/useListenToActionBus.ts`: response listener `options` are stale, including object-form `{ listener, options }`.
- `src/react/useListenToStoreChanges.ts`: same stale `options` issue.
- `src/react/useEvent.ts`: `eventOptions` are only used by initial `createEvent`.
- `src/react/useStore.ts`: `initialData` and `config` are only used during initial `createStore`.
- `src/react/useActionBus.ts`: `initialActions` is only used during initial `createActionBus`.

Already explicit/static:

- `src/react/useAction.ts`: throws if `actionSignature` changes.
- `src/react/useActionMap.ts`: throws if actions/error listener change.
- `src/react/useEventBus.ts`: throws if `eventBusOptions` changes.

The new direction is to move away from static behavior where practical and reconcile inputs instead.

## Overall Principles

1. Add failing tests before implementation for each step.
2. Do not rely on object identity for options/config objects.
3. Compare domain-specific fields explicitly instead of using generic deep equality.
4. Preserve existing instance identity where hooks return reactive primitives.
5. Avoid duplicate listeners after rerender.
6. Cleanup must use the old registration data, especially old `context`.
7. Inline semantically equal objects should not reset listener counters or listener ordering.
8. Keep implementation narrow per step. Do not refactor unrelated core APIs unless a test requires it.

## Comparator Policy

Avoid generic deep equality. Use small comparators per domain.

### ListenerOptions

Relevant type: `ListenerOptions` in `src/event.ts`.

Compare:

- `async`: primitive equality.
- `limit`: primitive equality after default semantics.
- `first`: primitive equality.
- `alwaysFirst`: primitive equality.
- `alwaysLast`: primitive equality.
- `start`: primitive equality.
- `context`: reference equality.
- `tags`: **order-insensitive set comparison** (decided). Equal when both have the same members regardless of order; `undefined`/`[]`/missing all compare equal. Rationale: the core only ever uses tags via membership (`indexOf`) and intersection (`tagsIntersect`) checks (event.ts:253, 281, 291, 303, 568-578) — order and duplicates have no behavioral effect, so order-sensitive comparison would cause spurious resubscribes that needlessly reset `called`/`count`.
- `extraData`: reference equality only. Do not deep compare arbitrary values.

Important behavior (decided — in-place update, preserve counters):

- Fresh inline object with same semantic fields should be treated as unchanged (no-op).
- A changed semantic field should update the existing listener **in place**, preserving the per-listener `called`/`count` counters. It must NOT remove+add (which would reset counters). See "In-Place Listener Option Updates" below.
- The one exception is `context`: it is part of listener identity (add dedupes on handler+context; remove matches on context). A changed `context` requires a true resubscribe — remove using the **old** context, then add with the new context. Counters reset in this case only.

### In-Place Listener Option Updates (new core API)

The chosen semantics require a new core capability: update a registered listener's "soft" options without losing its counters.

New core function on `createEvent`:

- `updateListenerOptions(handler, context, nextOptions)` — find the listener by `handler` + (old) `context`; mutate its soft fields in place; return whether a listener was found.

Soft fields updatable in place (counters `called`/`count`/`index` preserved):

- `limit`, `start`, `async` (normalize `true` → `1`), `tags`, `extraData`.
- `alwaysFirst` / `alwaysLast`: updatable, but must re-run the listener sort (these drive `sortListeners` + `listenerSorter`, event.ts:201-212).

Not reconciled in place:

- `context`: identity field → resubscribe (handled by the hook, not this API).
- `first`: insertion-time-only hint (controls unshift vs push at add, event.ts:192-200). It has no ongoing meaning once inserted, so in-place updates ignore it. Document this; changing only `first` across renders is a no-op.

Edge case to cover with a test: lowering `limit` to a value at/below the current `called` count. The core auto-remove check is `listener.called === listener.limit` (event.ts:634, strict `===`), so a listener whose `called` already exceeds the new `limit` would never auto-remove. `updateListenerOptions` should remove the listener immediately when `nextLimit !== 0 && called >= nextLimit`.

Threading through wrappers (same delegation pattern as `addListener`/`removeListener`):

- `eventBus`: add `updateListenerOptions(name, handler, context, nextOptions)` delegating to `_getOrAddEvent(name)`.
- `store`: expose `updateOnChangeOptions` mapped to the internal `changes` event bus (store.ts:432-433 pattern).
- `actionBus`: add `updateListenerOptions(name, ...)` delegating to `actions.get(name)`.

### EventOptions

Relevant type: `EventOptions` in `src/event.ts`.

Compare:

- `async`: primitive equality.
- `limit`: primitive equality.
- `autoTrigger`: primitive equality.
- `filter`: reference equality.
- `filterContext`: reference equality.
- `maxListeners`: primitive equality.

Core `event.setOptions` currently only accepts `async`, `limit`, and `autoTrigger`. Full reconciliation likely requires expanding `setOptions` to support all event options.

### Config Maps

For maps such as store config and action maps:

- Compare key sets.
- Compare callback/function values by reference.
- Do not invoke functions during comparison.

## Step 1: Listener Hook Options

Target hooks:

- `useListenToEvent`
- `useListenToEventBus`
- `useListenToActionBus`
- `useListenToStoreChanges`

### Tests First

Add tests in existing React test files:

- `tests/react/useEvent.spec.tsx`
- `tests/react/useEventBus.spec.tsx`
- `tests/react/useActionBus.spec.tsx`
- `tests/react/useStore.spec.tsx`

For each hook, add tests for:

1. Inline semantically equal options do not resubscribe.

Example shape:

- Render with `{ limit: 1 }`.
- Trigger once, listener fires.
- Rerender with a fresh `{ limit: 1 }`.
- Trigger again.
- Expect listener not to fire again.

This proves the listener record was not reset just because object identity changed.

2. Changed `tags` take effect.

Example shape:

- Render with `{ tags: ["a"] }`.
- Rerender with `{ tags: ["b"] }`.
- Trigger under tag `b`; expect call.
- Trigger under tag `a`; expect no additional call.

3. Changed `context` resubscribes (using the OLD context) and cleans up old registration.

Example shape:

- Render with `{ context: ctxA }` (optionally `{ limit: 3, context: ctxA }`).
- Rerender with `{ context: ctxB }`.
- Verify only one effective listener is present by triggering once and checking one call.
- Because `context` is an identity field, this is a true resubscribe: the old `ctxA` registration is removed using the OLD context and counters reset for the new `ctxB` registration.
- Unmount and verify no listener remains.

4. Changed `limit` updates the existing listener in place (counters preserved).

Example shape (decided):

- Render with `{ limit: 1 }`; trigger once → listener fires, `called` becomes 1 and it auto-removes.
- This first sub-case proves the auto-remove; for the in-place path use a higher starting limit:
- Render with `{ limit: 3 }`; trigger once → fires (`called` = 1).
- Rerender with `{ limit: 2 }`.
- Trigger again → fires (`called` = 2), and now auto-removes because `called === limit`.
- Trigger a third time → does NOT fire.
- This proves the change updated the live listener in place and kept the running `called` count, rather than resubscribing with a fresh budget.

Also add the limit-lowering edge test: render `{ limit: 3 }`, trigger twice (`called` = 2), rerender `{ limit: 1 }` → listener should be removed immediately (since `called` already exceeds the new limit and the `===` auto-remove check would otherwise never fire). Next trigger does not fire.

### Implementation Notes

Create shared internal helpers if useful, likely under `src/react/`:

- `areListenerOptionsEqual`
- maybe `usePreviousRef` or a small subscription helper

Potential file:

- `src/react/listenerOptionsEqual.ts`

Keep it internal; do not export from package unless needed.

Each listener hook should:

- Keep the latest listener function in a ref, as it does today (so the listener function itself never forces a resubscribe — the stable generic handler always calls the current ref).
- Use a stable generic handler.
- Track the previous registered target/key and the previous options snapshot/ref (including the previously registered `context`).
- On every render effect, compare previous registration against current registration:
  - **target/key/generic handler changed** → resubscribe: remove old listener using old target/key/generic handler/**old context**, then add with current target/key/generic handler/current options.
  - **only `context` changed** → resubscribe: remove using old context, add with new context (counters reset; context is an identity field).
  - **only soft options changed** (`areListenerOptionsEqual` is false but target/key/handler/context are unchanged) → call `updateListenerOptions(... , oldContext, currentOptions)` to mutate the live listener in place, preserving counters. Do NOT remove+add.
  - **nothing changed** (`areListenerOptionsEqual` true) → no-op. This must hold even if the underlying listener already auto-removed itself (e.g. `limit` reached) — a fresh equal options object must not re-add it.
  - store current registration metadata (target, key, handler, context, options snapshot) for future cleanup/comparison.
- On unmount, remove using the stored current registration metadata (current context).

Avoid using `[options]` directly as an effect dependency. Run a reconciliation effect on every render (no dependency array, or a stable semantic key) and do the explicit comparison inside it. Prefer the explicit reconciliation effect for clarity and so the in-place vs resubscribe branch is visible.

### Step 1 Risk Checks

- The new `updateListenerOptions` core API needs its own core-level tests (event, eventBus, store, actionBus) independent of React: in-place soft-field updates preserve `called`/`count`; `alwaysFirst`/`alwaysLast` change re-sorts; limit-lowering edge removes immediately; returns false when no matching listener.
- Ensure StrictMode does not duplicate listeners.
- Ensure changing only listener function still uses latest function without resubscribe unless needed.
- Ensure cleanup uses old context, and that a `context` change removes the old registration with the old context (no leak).
- Ensure soft-option changes do NOT reset counters (they go through in-place update, not remove+add).
- Ensure object-form `useListenToActionBus(actionBus, name, { listener, options })` is covered.
- Run `bun test tests/react/*.spec.tsx`.
- Run core tests after touching `event.ts`/`eventBus.ts`/`store.ts`/`actionBus.ts`.
- Run `bun run test:types` if types were touched.

## Step 2: useEvent EventOptions

Target hook:

- `useEvent`

Target core:

- `createEvent().setOptions`

### Tests First

Add tests in `tests/react/useEvent.spec.tsx`.

Test cases:

1. Inline semantically equal event options do not reset event state.

Example:

- Render with `{ limit: 1 }`.
- Trigger once.
- Rerender with fresh `{ limit: 1 }`.
- Trigger again.
- Expect still only one call.

2. Changed `limit` affects the existing event, preserving the trigger count (decided — consistent with the in-place listener decision).

Example:

- Render with `{ limit: 1 }`.
- Trigger once (event reaches its limit, `triggered` = 1).
- Rerender with `{ limit: 2 }`.
- Trigger again → allowed (one more trigger), because `triggered` is tracked separately from `options` (event.ts:509 checks `triggered >= options.limit`) and `setOptions` mutates `options` in place without touching `triggered`.
- This is the natural behavior of `setOptions` (`Object.assign(options, ...)`); no special handling needed beyond expanding the accepted fields.

3. Changed `autoTrigger` affects future listeners.

4. Changed `async` affects future listener calls where listener-level `async` is null.

5. Changed `filter`, `filterContext`, and `maxListeners`.

These need explicit desired behavior:

- `filter` and `filterContext`: should update by reference.
- `maxListeners`: should update for future `addListener` calls.

### Implementation Notes

`createEvent().setOptions` currently accepts only:

- `async`
- `limit`
- `autoTrigger`

To reconcile all event options, expand `setOptions` to accept `Partial<Event["options"]>` or a compatible public type.

`useEvent` should:

- Create the event once.
- Reconcile `eventOptions` each render using event option semantic comparison.
- Call `event.setOptions(nextOptions)` only when semantically changed.
- Continue reconciling `listener`, `errorListener`, and boundary error listener as today.

### Step 2 Risk Checks

- Changing `limit` does not reset `triggered`.
- Changing `autoTrigger` can affect whether future listeners immediately fire.
- Changing `maxListeners` can make future listener addition throw or stop throwing.
- Run event core tests and React tests.

## Step 3: useEventBus EventBusOptions

Target hook:

- `useEventBus`

Target core:

- `createEventBus`

### Tests First

Add tests in `tests/react/useEventBus.spec.tsx`.

Test cases:

1. Inline semantically equal `eventBusOptions` does not throw and does not reset bus state.
2. Changed event options affect an already-created event (via `event.setOptions`).
3. Changed event options affect an event created after the rerender (future events use latest stored options).
4. Removed event-name options leave the already-created event UNCHANGED (decided — see below). A future-created event with no entry uses defaults (it never had custom options).

### Implementation Notes (decided)

Current `useEventBus` explicitly throws when `eventBusOptions` changes (useEventBus.ts, `updateRef`/throw). Move to reconciliation — consistent with Step 2. Depends on Step 2 expanding `event.setOptions` to accept all event-option fields.

Core issue:

- `createEventBus` captures `eventBusOptions` in closure.
- `_getOrAddEvent(name)` uses `eventBusOptions?.eventOptions?.[name]` when creating events (eventBus.ts:299).
- Existing events need `event.setOptions`.
- Future events need latest stored bus options.

Core change:

- Store mutable current event bus options inside `createEventBus`.
- Add `setOptions(options?: EventBusOptions<EventsMap>)`.
- When options change:
  - update stored options so future `_getOrAddEvent` uses the latest per-event options.
  - for event names PRESENT in the new options that already exist, call `event.setOptions(eventOptions[name])`.

Removed-entry behavior (decided — leave as-is):

- If an event had custom options and the new bus options remove that event name, leave the already-created event's current options UNCHANGED. Do not reset to defaults. Rationale (project owner): there is no clear logic mandating a reset; only present entries are applied. This is intentionally asymmetric — the bus can change an event's options but does not un-set them.
- `useEventBus` reconciliation compares the new `eventOptions` map against the previously applied one (per event name, using the EventOptions comparator) and calls `eventBus.setOptions` only when something actually changed, so inline-equal options do not cause option writes.

### Step 3 Risk Checks

- Do not recreate the bus.
- Existing listeners remain attached.
- Future event creation uses latest options.
- Inline options do not trigger unnecessary option writes.
- Removing an event name from options does not alter the existing event (leave-as-is).

## Step 4: useActionBus initialActions

Target hook:

- `useActionBus`

Target core:

- `createActionBus`

### Tests First

Add tests in `tests/react/useActionBus.spec.tsx`.

Test cases:

1. Inline semantically equal actions map (same key set, same function references) does not recreate/reset bus.
2. Added action (new key) becomes available after rerender.
3. Replaced action (changed function reference) uses the new implementation after rerender, AND listeners attached to that action survive (because replacement uses `setAction`, see Step 7).
4. Removed action (key gone) is no longer invokable: `invoke`/`on`/`un` throw `Action <name> not found` (decided).

### Implementation Notes (decided — in-place replace via `setAction`, plus `remove`)

Core currently supports:

- `add(name, action)` — add-only (no-op if name exists, actionBus.ts:49-57).
- `get(name)`, `invoke(name, ...)` — `invoke`/`on`/`un` already throw `Action <name> not found` when missing (actionBus.ts:72-73, 84-85, 111-112), so removal yields the right error for free.

Core changes (build on Step 7's `setAction`):

- `replace(name, action)` (or fold into a smarter `set`): if the name exists, call `actions.get(name).setAction(action)` — preserves all listeners on that action **and** the bus error-forwarding listener (it is attached to the action's error event at add time, actionBus.ts:52-54, not to the function). If the name is new, do `add(name, action)`.
- `remove(name)`: delete the entry from the `actions` map. The removed action's listeners are dropped with it; no global leak, because the error-forwarding listener lived on the removed action's own error event.
- Optionally `has(name)`.

`useActionBus` reconciliation each render:

- Compare the current actions map against the previously applied map (key set + per-key function reference; do not invoke functions).
- For each key: new → `add`; reference changed → `replace` (in-place `setAction`); unchanged → no-op.
- For keys that disappeared → `remove`.
- Preserve bus identity (`useMemo([])`) and bus-level error listeners (already reconciled separately today).

Because replacement is in-place, listeners attached directly to `actionBus.get(name)` (external, non-hook consumers) are preserved too — the earlier concern about dropping them no longer applies.

### Step 4 Risk Checks

- Bus-level error forwarding still works for added/replaced/removed actions (forwarding listener survives `setAction`; is discarded with `remove`).
- Removed actions throw `Action <name> not found` on invoke/on/un.
- `useListenToActionBus` continues to work across action replacement (action identity preserved).
- Replacing an action preserves its existing response/before/error listeners.

## Step 5: useStore Config

Target hook:

- `useStore`

Target core:

- `createStore` likely already has enough listener removers for config reconciliation.

### Tests First

Add tests in `tests/react/useStore.spec.tsx`.

Test cases:

1. Inline semantically equal config does not duplicate listeners.

Example:

- Render with `onChange.a`.
- Rerender with fresh object containing the same function reference.
- Set `a`.
- Expect one call.

2. Changed `onChange` handler replaces previous handler.

3. Removed `onChange` handler unsubscribes previous handler.

4. Changed `pipe` handler replaces previous pipe.

5. Removed `pipe` handler unsubscribes previous pipe.

6. Changed `control` handler replaces previous handler.

7. Removed `control` handler unsubscribes previous handler.

### Implementation Notes

`createStore` exposes:

- `onChange` and `removeOnChange`
- `pipe` and `removePipe`
- `control` and `removeControl`

`useStore` should:

- Create store once.
- Reconcile `config` maps every render.
- Track registered config handlers by category and key.
- Remove handlers that disappeared or changed by reference.
- Add handlers that appeared or changed by reference.

Do not use object identity of the whole `config`.

### Step 5 Risk Checks

- No duplicate pipes. Duplicate pipes would transform values multiple times.
- Removing old pipe must happen before adding new pipe where order matters.
- Control event names must match actual exported names.
- Existing manual listeners added by consumer outside hook must not be removed.

## Step 6: useStore initialData

Target hook:

- `useStore`

### Decision: seed-only (Policy A)

`initialData` initializes the store exactly once. The store is already initialized after the first render, so subsequent `initialData` changes are intentionally ignored — it is *initial* data, not controlled data. Live store data is owned by `store.set` / `useStoreState` from that point on.

Rationale (from project owner): the store is already initialized; no further changes should be taken from `initialData` changes. If React re-creates the store (dev/StrictMode remount or a genuine remount), the fresh `createStore` call naturally uses the then-current `initialData` — which is the correct and expected behavior.

### Implementation

- No code change required for the seed path: the existing `useMemo([])` in `useStore` already captures `initialData` only at creation. Leave it as-is.
- Do NOT add `initialData` reconciliation.

### Tests

- Add/keep a test asserting that changing `initialData` across rerenders (without a remount) does NOT alter store data, and that local `set`/`useStoreState` edits are preserved.
- Optional: document in code/README that `initialData` is seed-only and controlled syncing is out of scope (could be a separate hook later if ever needed).

Note: Step 6 is no longer "the riskiest part" — it is now a no-op plus a guard test. The `config` reconciliation (Step 5) is the substantive `useStore` work.

## Step 7: useAction

Target hook:

- `useAction`

Currently throws when `actionSignature` changes. Decided: replace the function in place via `setAction`, preserving listeners and identity. Compare the action function by reference.

### Tests First

Add tests in `tests/react/useAction.spec.tsx`.

Test cases:

1. Same function reference across renders does not throw and does not change behavior.
2. Changed action function (new reference) affects future `invoke` (returns the new function's result).
3. Existing response, error, and before-action listeners remain attached across a function change (add a listener, change the function, invoke, assert the listener still fires).
4. Before-action cancellation still works after a function change.

### Implementation Notes (decided — `setAction`)

Core `createAction` captures the action function by value (`action.ts:99`, `let result = action(...args)`) and has no `setAction` API. Response, before-action, and error listeners all live in **separate events** independent of the function, so swapping the function preserves every listener automatically.

Core change:

- Store the current action function in a mutable variable inside `createAction` (e.g. `let actionFn = action`).
- `invoke` calls `actionFn(...args)` instead of the closed-over parameter.
- Add `setAction(nextAction)` that assigns `actionFn = nextAction`. Add to the returned `api`.

`useAction` change:

- Keep the action instance in `useMemo([])` as today.
- Track the previously registered action function in a ref.
- On render, if the function reference changed, call `action.setAction(next)` and update the ref. Remove the `updateRef`/throw guard.

### Step 7 Risk Checks

- `invoke` and error handling use the latest function.
- Before-action cancellation still works.
- Add core-level `setAction` tests in `tests/action.spec.ts` (or equivalent) independent of React: swapping the function preserves response/before/error listeners and uses the new function on the next `invoke`.
- Type shape cannot change safely at runtime, even though TypeScript fixes the generic from the initial render. Document that a changed function must keep a compatible signature.

## Step 8: useActionMap

Target hook:

- `useActionMap`

Currently throws when actions or error listener change.

### Tests First

Add tests in `tests/react/useActionMap.spec.tsx`.

Test cases:

1. Inline semantically equal action map (same keys, same function references) does not throw and does not reset.
2. Replaced action (changed function reference for an existing key) uses the new implementation, and listeners on that action survive.
3. Error listener reconciliation works without duplicate errors (changed `errorListener` reference updates forwarding without recreating actions).
4. Key-set change is a type-contract violation: changing the set of keys at runtime throws (defensive guard). Per the types, consumers can only pass the keys defined in the action map type, so this should not occur in correct usage.

### Implementation Notes

`createActionMap` (src/actionMap.ts) returns a plain object `map` keyed by action name, each value a `createAction` instance with a per-key error-forwarding listener attached at creation (actionMap.ts:50-51).

Decided (consistent with Steps 4/7):

- **Replaced action** (changed function reference for an existing key) → `map[key].setAction(next)`. Preserves all listeners on that action, including the error-forwarding listener (attached to the action's error event, not the function).

Key set is static (decided). The action map TYPE fixes the available keys — consumers can only pass keys defined in the action map type (as enforced in TheFloorr), so the runtime follows the type contract: reconcile values only. `useActionMap` does NOT add or remove keys on the returned object. If the key set changes at runtime (a type-contract violation), keep a defensive throw — narrow the current "throws on any actions change" to "throws only when the key set changes," allowing value reconciliation for the fixed keys.

Error listener reconciliation (test case 5): `onAnyError` is captured per-key in closures at creation (actionMap.ts:33-44). To reconcile a changed error listener without recreating actions, store `onAnyError` in a mutable variable inside `createActionMap` and have the per-key closures read the current value (add a small setter such as `setErrorListeners`). Then `useActionMap` updates it on reference change instead of throwing.

Consumer risk to keep in mind:

- `useActionMap` results are typically destructured (`const { foo } = useActionMap(...)`), so consumers hold direct references to individual actions. In-place `setAction` reaches them; adding/removing keys does not. The TypeScript type is fixed from the initial render regardless.

Sequencing:

- Do this after `useAction` and `useActionBus`, because action replacement semantics (Step 7 `setAction`, Step 4 add/replace/remove) should be settled first.

## Suggested Work Order

1. Step 1: listener hook options.
2. Step 2: `useEvent` event options.
3. Step 3: `useEventBus` options.
4. Step 5: `useStore` config only.
5. Step 7: `useAction` action function.
6. Step 4: `useActionBus` action map.
7. Step 8: `useActionMap`.
8. Step 6: `useStore` initialData — now decided (seed-only); becomes a guard test only, can be done anytime.

This order starts with the safest user-visible stale bugs and postpones state-overwrite and object-shape questions. All semantic decisions are now resolved (see Decisions Log), so steps can proceed test-first without further input.

## Verification Commands

Run after each step:

```sh
bun test tests/react/*.spec.tsx
```

Run when touching core behavior:

```sh
bun test tests/**/*.spec.ts*
```

Run when changing public or generic types:

```sh
bun run test:types
```

Full verification:

```sh
bun run test:all
```

## Handoff Notes

- Start by writing tests, not implementation.
- Keep each step in its own commit if possible.
- Watch for React StrictMode duplicate-subscription behavior.
- Watch for listener cleanup using current options instead of previous options; that is a common leak source when `context` changes.
- Prefer small helper modules over repeating comparator logic across hooks.
- Do not update `dist` unless the project release process expects built artifacts in commits.
