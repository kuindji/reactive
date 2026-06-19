import type { ListenerOptions } from "../event.js";

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
