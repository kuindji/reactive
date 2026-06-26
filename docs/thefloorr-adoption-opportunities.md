# TheFloorr — Adoption Opportunities

> Companion to [feature-gaps-and-designs.md](./feature-gaps-and-designs.md). Concrete
> call sites in `TheFloorr/monorepo` where the five proposed `@kuindji/reactive`
> features would make code **cleaner and easier to understand**. Specs/plans can
> cite these as real-world evidence and validation cases.
>
> Lens: readability/understandability wins, not merely technical applicability.
> Ranked by clarity gained. All paths relative to `TheFloorr/monorepo/`.

## Key takeaway for roadmap sequencing

**Feature 2 should be split.** Its two halves have very different demand here:
- **2a (async status: loading/error/data)** — heavily duplicated, highest-value target in the codebase.
- **2b (concurrency / takeLatest)** — *essentially no consumer*. All data fetching uses
  `@tanstack/react-query`, which already handles stale-request races via `queryKey`; the
  search pickers use an explicit "Search" button (no search-as-you-type race). Build 2b
  later or only when a real takeLatest use case appears.

---

## Tier 1 — Biggest readability wins

### Feature 2a (action status) — the manual loading-flag cluster

Seven hooks each declare 4–5 `useState(false)` flags, flip them around every
`await appActions.invoke(...)`, and OR them into one `loading`.

| File | Pattern |
| --- | --- |
| `packages/common/src/hooks/consultation/useConsultationActions.ts:77-83` | 5 flags (`duplicating, sending, deleting, hiding, assigning`) + `loading = a\|\|b\|\|c\|\|d\|\|e`; setTrue/setFalse across ~5 handlers |
| `packages/common/src/hooks/moodboard/useMoodboardActions.ts:47-51` | 5 flags |
| `packages/common/src/hooks/look/useLookActions.ts:71-76` | 4 flags |
| `packages/common/src/hooks/catalogue/useProductActions.ts:30-41` | 4 flags |
| `apps/tools/src/hooks/look/useLookActions.tsx:70-73` | near-duplicate of common hook |
| `apps/tools/src/hooks/moodboard/useMoodboardActions.tsx:36-39` | near-duplicate |
| `apps/tools/src/hooks/product/useProductActions.tsx:28-31` | near-duplicate |

**Why cleaner:** ~25+ pieces of bookkeeping state disappear; each handler stops being
`setTrue → try → await → finally setFalse` and becomes just the await. Loading comes from
the action (`useAsyncAction` / `getStatus()`).

**Confirmed bug this prevents:** `packages/common/src/hooks/catalogue/useProductActions.ts:155`
(and the twin at `apps/tools/src/hooks/product/useProductActions.tsx:118-132`) calls
`setRemovingFromMoodboard(true)` *after* the await in `onOk` — should be `false` — leaving a
permanently stuck loading flag. Built-in status makes this class of bug impossible.

**Adoption note:** the app's only reactive-action surface in use is the central
`createActionBus` (`appActions`, `packages/common/src/app/appContext.ts:22`). `createAction`/
`useAction`/`useAsyncAction` are not used today, so status support should land on the
**ActionBus `.invoke` / per-action** path.

### Feature 5 `once()` — subscribe / self-unsubscribe-in-handler idiom

Repeated 4-line pattern:
```ts
const listener = () => { resolve(true); appEvents.off("user/signed-in", listener); };
appEvents.on("user/signed-in", listener);
```
| File | Event |
| --- | --- |
| `packages/common/src/user.ts:128-134` (`authPromise`) | `user/signed-in` |
| `packages/common/src/user.ts:150-156` (`infoPromise`) | — |
| `packages/common/src/hooks/user/useCurrentTeam.ts:121-127` | `user/team-loaded` |
| `packages/common/src/hooks/user/useUserGeoCookie.ts:13-19` | `user/geo-loaded` |
| `packages/common/src/api/getHasuraClientContext.ts:17-23` | `user/auth-success` |

**Why cleaner:** collapses to `appEvents.once("user/signed-in", () => resolve(true))`.
**Caveat:** these run on a *bus*, which already exposes `once` — so this is partly "use what
exists." The standalone-`Event` `once()` + a `promise()`-style helper close the gap fully,
and Feature 4a `signal` would make the promise cancellable.

---

## Tier 2 — Clear, localized wins

### Feature 1 (computed) — manual "watch key → derive → set another key"

- `apps/tools/src/pages/look-editor/Context.tsx:133-166` — listens to `currentSlotIndex` via
  `useListenToStoreChanges`, pulls 3 keys from `getData()`, derives `currentProduct` /
  `currentLookProduct`, writes them back. → two `store.computed(...)` declarations. **Also fixes
  a latent correctness gap:** today it only recomputes on `currentSlotIndex`, not if `layouts`
  changes alone.
- `packages/common/src/lib/FilterApiV3.ts:418-428` — `convert_to_currency` derived from `region`
  via a manual `control(EffectEventName)` handler. This is literally the `effect`→`set` plumbing
  the design doc says `computed` is sugar over, including a `setTimeout` batching hack that
  `computed`'s built-in batching removes.

**Why cleaner:** listener + `getData()` pull + write-back boilerplate becomes one declarative
line stating what the value *is*.

### Feature 4a (`AbortSignal`) — `useSubscription` teardown juggling

`packages/common/src/graphql/useSubscription.ts` (bridge behind 8+ chat/user hooks):
stores `ubsubRef.current = unsubscribe` (`:134`), calls it by hand in cleanup (`:187-189`) and
in several `setTimeout(() => unsubscribe())` (`:198-200`, `:225-227`, `:244-246`).

**Why cleaner:** one `AbortController` threaded through `addListener(handler, { signal })`
replaces ref-juggling + scattered timeout teardowns with a single cancel. Most-used
subscription primitive, so the cleanup propagates widely.

### Feature 3 (`useStoreSelector`) — combined flags / multi-key memos

- `apps/tools/src/pages/dashboard-team/Target.tsx` (+ Sales/Commissions/Overview siblings):
  `isFetchingX || isFetchingY || isFetchingZ` from three `useStoreState` → one
  `useStoreSelector(store, [keys], (a,b,c)=>a||b||c)`. Reads as one intention, and re-renders
  only when the OR result flips (today every underlying flag flip re-renders).
- Look-editor multi-key `useMemo` combines: `LayoutLook.tsx:14-38`, `TaggedLook.tsx:17-32`,
  `AddedProducts.tsx:132-145`.

---

## Tier 3 — Real but minor

- **Feature 4b `destroy()`** — per-scope store+bus in `apps/tools/src/pages/look-editor/Context.tsx:44-77`,
  and `createFilterApi`'s three-stores-+-event with no teardown method (`FilterApiV3.ts:314-523`).
  About explicitness, not a bug — teardown is currently implicit/GC'd.
- **Feature 1 (computed)** dashboard stats duplication — `apps/tools/src/components/dashboard/GraphsAndStats.tsx:61-150`
  (web) vs `apps/mobile-pse/src/components/dashboard/statistics/StatisticsGrid.tsx:45-160` (mobile)
  compute the same ~90-line stats block. Deduplication win, but deps are react-query-fed keys.

---

## Checked and rejected (skeptical notes)

- `usePersonalDashboard.ts` / `useTeamDashboard.ts` `useStoreUpdater(...)` calls mirror
  react-query results into the store — deps are query results, not store keys, so neither
  `computed` nor `useStoreSelector` applies.
- Search pickers (`*Picker.tsx`) fetch via react-query with an explicit Search button — **not**
  2b/takeLatest opportunities; their loading is `isFetching`.
- `appEvents.on(...)` registrations in `packages/common/src/events/*` and mobile equivalents are
  permanent module-level wiring on the singleton bus — intentionally never removed; neither
  `signal` nor `destroy()` applies.
- `useKeyboard.ts` uses React Native `Keyboard.addListener` — not a reactive event.
- `addEventSource` on the app-lifetime `appEvents` singleton (`packages/common/src/events/hub.ts:27`)
  is the reference case for `destroy()` removing event sources, but the singleton never tears down.

---

## Strongest adoption targets (summary)

1. **2a status** — the 7 action hooks (Tier 1) — highest-value, repeated, prevents a real bug.
2. **5 `once()`** — the self-unsubscribe idiom (Tier 1).
3. **1 computed** + **4a signal** — look-editor / FilterApiV3 / useSubscription (Tier 2).
4. **Roadmap:** split Feature 2 → ship 2a; defer 2b (no consumer here).
