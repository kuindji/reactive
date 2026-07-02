import { useCallback, useSyncExternalStore } from "react";
import type { ActionStatus } from "../action.js";
import type { BaseActionBus } from "../actionBus.js";
import type { KeyOf } from "../lib/types.js";
import { type AsyncActionState, toAsyncActionState } from "./useAsyncAction.js";

export type { ActionStatus, AsyncActionState };

/**
 * Subscribes to the status of a named action on an ActionBus and returns
 * `{ loading, error, response }` for driving `loading`/`disabled` UI. This is
 * the primary path for apps that route mutations through one shared ActionBus.
 *
 * An unregistered name reports an idle status and is safe to subscribe to.
 */
export function useActionBusStatus<
    TBus extends BaseActionBus,
    TName extends KeyOf<TBus["__type"]["actions"]>,
>(
    bus: TBus,
    name: TName,
): AsyncActionState<TBus["__type"]["actions"][TName]["actionReturnType"]> {
    type Response = TBus["__type"]["actions"][TName]["actionReturnType"];

    const subscribe = useCallback(
        (onChange: () => void) => {
            const listener = () => {
                onChange();
            };
            bus.onStatusChange(name, listener);
            return () => {
                bus.removeStatusListener(name, listener);
            };
        },
        [ bus, name ],
    );

    const getSnapshot = useCallback(
        () => bus.getStatus(name) as ActionStatus<Response>,
        [ bus, name ],
    );

    const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return toAsyncActionState(status);
}
