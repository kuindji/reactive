import type { EventOptions, ListenerOptions } from "../event.js";
import type { BaseEventMap, EventBusOptions } from "../eventBus.js";
import type { BaseHandler } from "../lib/types.js";

function normalizeAsync(
    value: boolean | number | null | undefined,
): boolean | number | null {
    if (value === undefined || value === null) {
        return null;
    }
    if (value === true) {
        return 1;
    }
    return value;
}

/**
 * Order-insensitive set comparison for listener tags.
 * `undefined`, `[]` and missing all compare equal. Order and duplicates do
 * not matter because the core only ever uses tags via membership and
 * intersection checks.
 */
export function areTagsEqual(a?: string[], b?: string[]): boolean {
    const aa = a ?? [];
    const bb = b ?? [];
    if (aa.length === 0 && bb.length === 0) {
        return true;
    }
    const sa = new Set(aa);
    const sb = new Set(bb);
    if (sa.size !== sb.size) {
        return false;
    }
    for (const tag of sa) {
        if (!sb.has(tag)) {
            return false;
        }
    }
    return true;
}

/**
 * Domain-specific comparator for {@link ListenerOptions}. Avoids generic deep
 * equality: primitives compare after default semantics, `context`/`extraData`
 * compare by reference, and `tags` use order-insensitive set comparison.
 */
export function areListenerOptionsEqual(
    a?: ListenerOptions | null,
    b?: ListenerOptions | null,
): boolean {
    const aa = a ?? {};
    const bb = b ?? {};

    if ((aa.limit ?? 0) !== (bb.limit ?? 0)) {
        return false;
    }
    if ((aa.start ?? 1) !== (bb.start ?? 1)) {
        return false;
    }
    if ((aa.first ?? false) !== (bb.first ?? false)) {
        return false;
    }
    if ((aa.alwaysFirst ?? false) !== (bb.alwaysFirst ?? false)) {
        return false;
    }
    if ((aa.alwaysLast ?? false) !== (bb.alwaysLast ?? false)) {
        return false;
    }
    if (normalizeAsync(aa.async) !== normalizeAsync(bb.async)) {
        return false;
    }
    if ((aa.context ?? null) !== (bb.context ?? null)) {
        return false;
    }
    // reference equality only; do not deep compare arbitrary values
    if (aa.extraData !== bb.extraData) {
        return false;
    }
    if (!areTagsEqual(aa.tags, bb.tags)) {
        return false;
    }
    return true;
}

/**
 * Expand a listener's options into a fully-populated set of the soft fields
 * that {@link ListenerOptions} reconciliation updates in place, filling every
 * omitted field with its default.
 *
 * `event.updateListenerOptions` uses partial-merge semantics (only fields
 * present in the passed object change), but the React reconciliation layer is
 * declarative: the options object fully describes the desired listener state,
 * so a field dropped between renders must reset to its default. Passing this
 * normalized object makes partial-merge behave as a full reset for exactly the
 * soft fields — without disturbing `signal` (identity-managed by the abort
 * wiring) or `context` (identity, handled by resubscribe).
 */
export function fillListenerUpdateDefaults(
    options?: ListenerOptions | null,
): ListenerOptions {
    const o = options ?? {};
    return {
        limit: o.limit ?? 0,
        start: o.start ?? 1,
        tags: o.tags ?? [],
        extraData: o.extraData ?? null,
        alwaysFirst: o.alwaysFirst ?? false,
        alwaysLast: o.alwaysLast ?? false,
        async: o.async ?? null,
    };
}

/**
 * Domain-specific comparator for {@link EventOptions}. Primitives compare after
 * default semantics; `filter`/`filterContext` compare by reference.
 */
export function areEventOptionsEqual(
    a?: EventOptions<BaseHandler> | null,
    b?: EventOptions<BaseHandler> | null,
): boolean {
    const aa = a ?? {};
    const bb = b ?? {};

    if (normalizeAsync(aa.async) !== normalizeAsync(bb.async)) {
        return false;
    }
    if ((aa.limit ?? null) !== (bb.limit ?? null)) {
        return false;
    }
    if ((aa.autoTrigger ?? null) !== (bb.autoTrigger ?? null)) {
        return false;
    }
    if ((aa.maxListeners ?? 0) !== (bb.maxListeners ?? 0)) {
        return false;
    }
    // reference equality
    if ((aa.filter ?? null) !== (bb.filter ?? null)) {
        return false;
    }
    if ((aa.filterContext ?? null) !== (bb.filterContext ?? null)) {
        return false;
    }
    return true;
}

/**
 * Compares the per-event `eventOptions` maps of two {@link EventBusOptions}.
 * Equal when every event name present in either map has semantically equal
 * {@link EventOptions} (missing entries compare as default options).
 */
export function areEventBusOptionsEqual(
    a?: EventBusOptions<BaseEventMap> | null,
    b?: EventBusOptions<BaseEventMap> | null,
): boolean {
    const aMap = a?.eventOptions ?? {};
    const bMap = b?.eventOptions ?? {};
    const names = new Set<string>([
        ...Object.keys(aMap),
        ...Object.keys(bMap),
    ]);
    for (const name of names) {
        if (
            !areEventOptionsEqual(
                aMap[name] as EventOptions<BaseHandler> | undefined,
                bMap[name] as EventOptions<BaseHandler> | undefined,
            )
        ) {
            return false;
        }
    }
    return true;
}
