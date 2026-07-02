import { useEffect, useRef } from "react";
import type { ListenerOptions } from "../event.js";
import {
    areListenerOptionsEqual,
    fillListenerUpdateDefaults,
} from "./listenerOptionsEqual.js";

type ListenerOps = {
    /**
     * Identity dependencies. When any element changes (reference equality) the
     * listener is fully resubscribed: the old registration is removed using the
     * previous closure (previous target + previous context) and a fresh one is
     * added. `context` is appended automatically because it is part of listener
     * identity. The array length must stay constant across renders.
     */
    keyDeps: ReadonlyArray<unknown>;
    options?: ListenerOptions | null;
    /** Add the listener to the current target with the given options. */
    subscribe: (options?: ListenerOptions | null) => void;
    /** Remove the listener from the current target using the given context. */
    unsubscribe: (context: object | null) => void;
    /** Update soft options on the live listener in place (counters preserved). */
    update: (context: object | null, options?: ListenerOptions | null) => void;
};

/**
 * Reconciles a single reactive listener across renders without relying on the
 * identity of the options object.
 *
 * Two effects cooperate:
 *  - an identity effect keyed by `[...keyDeps, context]` performs the classic
 *    add-on-mount / remove-on-cleanup cycle, so target/context changes (and
 *    React StrictMode remounts) resubscribe correctly using the OLD context on
 *    cleanup;
 *  - a reconciliation effect runs every render and, when only soft options
 *    changed, updates the live listener in place instead of resubscribing, so
 *    per-listener counters are preserved.
 */
export function useReconciledListener({
    keyDeps,
    options,
    subscribe,
    unsubscribe,
    update,
}: ListenerOps) {
    const context = options?.context ?? null;
    const committedRef = useRef<ListenerOptions | null | undefined>(undefined);
    const registeredRef = useRef(false);

    // Identity effect: (re)subscribe on target/context change.
    useEffect(() => {
        subscribe(options);
        committedRef.current = options;
        registeredRef.current = true;
        return () => {
            unsubscribe(context);
            registeredRef.current = false;
        };
    }, [ ...keyDeps, context ]);

    // Reconciliation effect: in-place soft-option updates every render.
    useEffect(() => {
        if (!registeredRef.current) {
            return;
        }
        if (committedRef.current === options) {
            return;
        }
        if (!areListenerOptionsEqual(committedRef.current, options)) {
            // Normalize to a full soft-option set so a field dropped since the
            // last render resets to its default: updateListenerOptions is
            // partial-merge, but the React path is declarative (see
            // fillListenerUpdateDefaults). Carry `signal` through only when
            // present (matching the old whole-options pass), so its abort wiring
            // is rebound/cleared exactly as before; `context` is passed
            // separately and not read from the options object.
            update(context, {
                ...fillListenerUpdateDefaults(options),
                ...(options?.signal !== undefined
                    ? { signal: options.signal }
                    : {}),
            });
        }
        committedRef.current = options;
    });
}
