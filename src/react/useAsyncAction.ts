import {
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useSyncExternalStore,
} from "react";
import { createAction } from "../action.js";
import type { ActionResponse, ActionStatus } from "../action.js";
import type { BaseHandler } from "../lib/types.js";

export type { ActionResponse, ActionStatus };

export type AsyncActionState<Response = any> = {
    loading: boolean;
    error: Error | null;
    response: Response | null;
};

/**
 * Wraps a function in an action and exposes its in-flight status, so a
 * component can drive `loading`/`disabled` without a hand-rolled
 * `useState(false)`. Returns `[invoke, { loading, error, response }]`.
 *
 * For the common app pattern (one shared ActionBus) prefer
 * `useActionBusStatus`. This hook is for a standalone, component-local action.
 */
export function useAsyncAction<Fn extends BaseHandler>(
    fn: Fn,
): readonly [
    (...args: Parameters<Fn>) => Promise<ActionResponse<Awaited<ReturnType<Fn>>, Parameters<Fn>>>,
    AsyncActionState<Awaited<ReturnType<Fn>>>,
] {
    // Keep the latest fn in a ref. The action wraps a stable indirection that
    // always calls fnRef.current, so it invokes the current fn even from a
    // consumer layout effect that runs after a rerender but before this hook's
    // passive effects — which a useEffect+setAction swap would miss, invoking
    // the previous fn. The ref is updated in a layout effect (commit phase),
    // not during render: a render-phase mutation would leak a fn from a
    // suspended or abandoned concurrent render that never commits into the
    // currently committed UI. Layout effects run only for committed renders,
    // and this one runs before any consumer layout effect declared after the
    // hook call, so consumers still observe the latest fn.
    const fnRef = useRef<Fn>(fn);
    useLayoutEffect(() => {
        fnRef.current = fn;
    });

    const action = useMemo(
        () => {
            const action = createAction<Fn>(
                ((...args: Parameters<Fn>) => fnRef.current(...args)) as Fn,
            );
            // Without an error listener a throwing fn re-throws out of invoke
            // (an unhandled rejection) instead of surfacing through status.
            action.addErrorListener(() => { });
            return action;
        },
        [],
    );

    const subscribe = useCallback(
        (onChange: () => void) => {
            const listener = () => {
                onChange();
            };
            action.onStatusChange(listener);
            return () => {
                action.removeStatusListener(listener);
            };
        },
        [ action ],
    );

    const getSnapshot = useCallback(
        () => action.getStatus(),
        [ action ],
    );

    const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const invoke = useCallback(
        (...args: Parameters<Fn>) => action.invoke(...args),
        [ action ],
    );

    return [
        invoke,
        {
            loading: status.pending,
            error: status.error,
            response: status.response,
        },
    ] as const;
}
