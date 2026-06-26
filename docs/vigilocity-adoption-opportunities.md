# Vigilocity — Adoption Opportunities

> Companion to [feature-gaps-and-designs.md](./feature-gaps-and-designs.md); sibling to
> [thefloorr-adoption-opportunities.md](./thefloorr-adoption-opportunities.md). Concrete
> call sites in `Vigilocity/monorepo` (8 apps: admin, blacklight, dashboard, docs,
> ip-checker, mythic, registrars, silentium; shared: packages/lib, common, ui) where the
> five proposed `@kuindji/reactive` features would make code **cleaner and easier to
> understand**.
>
> Lens: readability/understandability wins. Ranked by clarity gained. Paths relative to
> `Vigilocity/monorepo/`.

## Key takeaways for roadmap sequencing

1. **Feature 2a (async status) is the dominant win — even more so than in TheFloorr.**
   Nearly every mutation routes through one ActionBus (`appActions`, `packages/lib/src/appContext.ts:19`),
   and **36 files** hand-roll a `useState(false)` loading flag around `await appActions.invoke(...)`.
2. **Feature 2b (concurrency/takeLatest) has no consumer** — same as TheFloorr. Search/autocomplete
   uses react-query; global search is button/Enter-triggered; the only stale-request guards are
   long-lived WebSocket sessions that don't map to action concurrency.
3. **Features 4a (`signal`) and 5 (`once`/introspection) have essentially zero applicable sites here.**
   The repo uses the library's React hooks (which own listener lifecycle) and app-level singletons
   wired once at module scope. No `relay`/`addEventSource`/`limit:1`/self-unsubscribe idioms exist.
   This is strong signal these two are low-priority for *this* style of codebase.

---

## Tier 1 — Biggest readability wins

### Feature 2a (action status) — manual loading flags around `appActions.invoke` (36 files)

The single highest-leverage cleanup in the monorepo. One ActionBus underpins nearly every
mutation; every call site wraps it in a hand-rolled flag whose only job is to drive
`loading=`/`disabled=` on a button.

**1a. Shared auth blocks + UserProfile (written once, rendered across all apps):**

| File | Pattern |
| --- | --- |
| `packages/common/src/blocks/auth/LoginForm.tsx:20,29,36` | `useState(false)` → `setLoading(true)` → `const {error} = await appActions.invoke("user/login", …)` → `if (error) { setLoading(false); password.setError(error) }` |
| `packages/common/src/blocks/auth/ResetPasswordForm.tsx:19,29,33` | same shape |
| `packages/common/src/blocks/auth/NewPasswordForm.tsx:32,41,48` | same |
| `packages/common/src/blocks/auth/MFAForm.tsx:21,41,49` | same |
| `packages/common/src/blocks/auth/MFAEnrollForm.tsx` | same |
| `packages/common/src/blocks/UserProfile.tsx:55,132,150` | react-query for reads, manual `setLoading` for the save mutation |

**Why cleaner + a real bug class:** these files are *inconsistent* about when the flag resets —
some call `setLoading(false)` before the error check, some after, and `LoginForm` never resets it
on success at all (relies on navigation/unmount). Replacing with `useAsyncAction` / a
status-bearing invoke makes "pending ends on settle" automatic and removes the inconsistency.
Auto-deriving the field error from the action's `error` would also collapse the
`if (error) field.setError(error)` boilerplate.

**1b. Form/mutation dialogs (~19 files, common + admin):** identical
`setSubmitting(true)` → `await form.validate()` → `await appActions.invoke(...)` → toast →
`setSubmitting(false)` skeleton, with `submitting` threaded into every `disabled=` and the
`loading=` Button. Representative:
- `apps/admin/src/components/UserFormDialog.tsx:51,185,250` (`submitting` in ~12 `disabled=` props)
- `packages/common/src/components/watchlist/WatchlistFormDialog.tsx:26,39,83`
- `packages/common/src/components/HuntReportDialog.tsx:41,81,115`
- plus `HuntReportQueueDialog`, `ThreatEditorDialog`, `DomainDialog`, `TagsDialog`,
  `NotificationsDialog`, `watchlist/{Ip,Domain,Username,CredentialDomain,Query,Description}Dialog.tsx`,
  admin `apiKey/*`, `company/{IpDialog,CompanyEditDialog}`, `DomainSettingsDialog`

Per-file win is modest but the pattern is uniform enough to warrant a codemod.

**Adoption note:** like TheFloorr, the win lands on making `appActions.invoke` status-bearing
(or a `useAsyncAction` wrapping the bus). `createAction`/`useAction` are not used directly.

### Feature 1 (computed) — `showMain` auth gate duplicated across 6 app shells

Every app's `App.tsx` subscribes to 3–4 auth keys and ANDs them by hand:
```ts
const [ loggedIn ]   = useAppState("userLoggedIn");
const [ mfaPassed ]  = useAppState("userMfaPassed");
const [ isApproved ] = useAppState("userIsApproved");
const showMain = loggedIn && mfaPassed && isApproved;
```
| File | Variant |
| --- | --- |
| `apps/admin/src/App.tsx:58-61` | `loggedIn && mfaPassed && isApproved` |
| `apps/blacklight/src/App.tsx:74-77` | same |
| `apps/silentium/src/App.tsx:53-57` | same |
| `apps/registrars/src/App.tsx:53-56` | same |
| `apps/dashboard/src/App.tsx:65-70` | `… && userProfile` |
| `apps/mythic/src/App.tsx:60-64` | `… && userProfile` |

**Why cleaner:** this is app-global derived state living in component bodies. One
`appStore.computed("userAuthenticated", ["userLoggedIn","userMfaPassed","userIsApproved"], (a,b,c)=>a&&b&&c)`
in `packages/lib/src/appContext.ts` collapses each shell to a single `useAppState("userAuthenticated")`
and centralizes the meaning of "user may enter the app." Confirms the design-doc claim that
computed keys flow transparently through `get`/`useStoreState`. (Feature 3 selector is the
alternative if kept per-app — and adds a re-render win, since shells currently re-render on each of
the 4 keys instead of only when the gate flips.)

---

## Tier 2 — Clear, localized wins

### Feature 1 (computed) — `registrarSources` re-derived from `userAccess` (4 files, with drift)

```ts
const [ access ] = useAppState("userAccess");
const registrarSources = useMemo(
  () => Object.keys(access?.registrar || []).filter(k => access.registrar[k] === true),
  [ access ],
);
```
- `apps/registrars/src/app-pages/hunt/AutomatedHuntPreview.tsx:175-179`
- `apps/registrars/src/app-pages/hunt/TakedownRequests.tsx:15-21`
- `apps/registrars/src/app-pages/hunt/ExpiringDomains.tsx:100-104`
- `packages/common/src/pages/hunt/ExpiringDomains.tsx:110-114`

**Why cleaner:** pure single-key derivation, copy-pasted with subtle drift (`|| []` vs `|| {}`,
differing optional chaining). `appStore.computed("userRegistrarSources", ["userAccess"], …)` defines
it once; each call site becomes `useAppState("userRegistrarSources")`, deleting 4 `useMemo`s and
unifying the variants.

---

## Tier 3 — Real but minor

- **Feature 4b `destroy()`** — per-instance stores created in `useMemo` with no teardown:
  `packages/common/src/components/HuntReportDialog.tsx:155-164` and
  `HuntReportQueueDialog.tsx:182-193` (recreated on `[report, open]` change while mounted — previous
  store's internal buses orphaned), `apps/admin/src/app-pages/system/Servers.tsx:149-153`. An explicit
  `useEffect(() => () => store.destroy(), [])` documents teardown. **Not leaks today** (GC'd, hook
  consumers self-clean) — explicitness/future-proofing only.
- **Feature 4b / 5** — `packages/lib/src/createQueue.ts:3-37` wraps a `createEvent` but exposes no
  `destroy()` and no introspection. Sole consumer is a module-level singleton
  (`packages/ui/src/components/Alert.tsx:34`), so nothing to fix today — flags the factory shape only.

---

## Checked and rejected (skeptical notes)

- `packages/lib/src/hooks/useCurrentUser.ts` — ~14 keys set imperatively from Supabase metadata /
  async fetches, not derived from other store keys → Feature 2 (async) territory, not computed.
- `packages/lib/src/hooks/useCurrentUserAdvisedPath.ts:23-94` — `advisedPath` memo depends on a prop,
  a revalidation counter, and `appEvents.firstNonEmpty(...)`; neither computed (no prop/event access)
  nor selector folds it cleanly.
- `hunt-report-dialog/Domain.tsx` / `HuntReportQueueDialog` / `DomainDialog.tsx:124-126` —
  `domainChecked`/`domainChecking` are independent async-status flags (incl. a `callIdRef` takeLatest
  guard in DomainDialog) → Feature 2, not 1/3.
- Search/autocomplete selectors (`packages/common/src/components/selector/*`, 13 files) and global
  search (`apps/mythic/src/components/TopMenuSearch.tsx:75-82`) — react-query / button-triggered;
  no takeLatest need.
- WebSocket stale-request guards (`apps/silentium/src/components/chat/useChatSocket.ts:279`,
  `apps/admin/src/app-pages/tools/useIpReportSocket.ts:289`) — long-lived socket sessions, not
  promise-returning actions; don't fit action concurrency. (Textbook `addEventSource`+`destroy()`
  candidates *if* bridged through reactive — an adoption rewrite, not a cleanup.)
- All `useListenTo*` call sites — the hook owns cleanup; `signal` (4a) adds nothing.
- Module-scope singleton wiring (`appEvents.on`/`appActions.add` in `packages/api/src/actions/*`,
  `App.tsx`, `context/*`) — permanent by design; not a destroy()/abort target.
- Native DOM / Supabase / matchMedia listeners — not reactive events; out of scope.

---

## Cross-repo signal (Vigilocity + TheFloorr)

| Feature | TheFloorr | Vigilocity | Verdict |
| --- | --- | --- | --- |
| 2a async status | 7 action hooks, ~25 flags | 36 files, 1 ActionBus | **Ship first.** Dominant win in both. |
| 1 computed | look-editor, FilterApiV3 | 6 app shells, 4 registrar files | Strong; lands centrally on `appStore`. |
| 3 selector | combined fetch flags | `showMain` gate | Good companion to 1. |
| 4a signal | useSubscription bridge | ~none | Niche; depends on manual-teardown style. |
| 4b destroy | per-scope store+bus | per-instance useMemo stores | Low; explicitness. |
| 5 once | bus self-unsubscribe idiom | none | Low; mostly already covered by bus `once`. |
| **2b concurrency** | **no consumer** | **no consumer** | **Defer.** Confirmed twice. |
