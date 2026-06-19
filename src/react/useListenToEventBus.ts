import { useCallback, useEffect, useRef } from "react";
import type { ListenerOptions } from "../event.js";
import type { BaseEventBus } from "../eventBus.js";
import type { ErrorListenerSignature, KeyOf } from "../lib/types.js";
import { useReconciledListener } from "./useReconciledListener.js";

export type { BaseEventBus, ErrorListenerSignature, ListenerOptions };

export function useListenToEventBus<
    TEventBus extends BaseEventBus,
    TKey extends KeyOf<TEventBus["__type"]["eventSignatures"]>,
    TListener extends TEventBus["__type"]["eventSignatures"][TKey],
>(
    eventBus: TEventBus,
    eventName: TKey,
    listener: TListener,
    options?: ListenerOptions,
    errorListener?: ErrorListenerSignature<any[]>,
) {
    const listenerRef = useRef<TListener>(listener);
    listenerRef.current = listener;

    const genericHandler = useCallback(
        (...args: Parameters<TListener>) => {
            return listenerRef.current?.(...args);
        },
        [],
    );

    // Main listener - reconciled across eventBus/eventName/option changes
    useReconciledListener({
        keyDeps: [ eventBus, eventName ],
        options,
        subscribe: (opts) =>
            eventBus.addListener(eventName, genericHandler, opts ?? undefined),
        unsubscribe: (ctx) =>
            eventBus.removeListener(eventName, genericHandler, ctx),
        update: (ctx, opts) =>
            eventBus.updateListenerOptions(
                eventName,
                genericHandler,
                ctx,
                opts ?? undefined,
            ),
    });

    // Error listener - cleanup pattern
    useEffect(() => {
        if (errorListener) {
            eventBus.addErrorListener(errorListener);
            return () => {
                eventBus.removeErrorListener(errorListener);
            };
        }
    }, [eventBus, errorListener]);
}
