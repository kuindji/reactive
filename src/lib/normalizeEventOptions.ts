import type { EventOptions } from "../event.js";
import type { BaseHandler } from "./types.js";

/**
 * Produces a complete {@link EventOptions} object with every field set to the
 * provided value or its createEvent default. Used by the reconciliation paths
 * (useEvent and eventBus.setOptions) so that applying options via the
 * merge-based event.setOptions also resets fields that were removed across
 * renders, instead of leaving stale values from a previous render.
 *
 * Internal-only: this module lives under src/lib (not re-exported by the
 * package root) and is not part of the public API surface.
 */
export function normalizeEventOptions(
    options?: EventOptions<BaseHandler> | null,
): EventOptions<BaseHandler> {
    return {
        async: options?.async ?? null,
        limit: options?.limit ?? null,
        autoTrigger: options?.autoTrigger ?? null,
        filter: options?.filter ?? null,
        filterContext: options?.filterContext ?? null,
        maxListeners: options?.maxListeners ?? 0,
    };
}
