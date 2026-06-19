import { useCallback, useEffect, useRef } from "react";
import type { BaseActionBus } from "../actionBus.js";
import type { ListenerOptions } from "../event.js";
import type { ErrorListenerSignature, KeyOf } from "../lib/types.js";
import { useReconciledListener } from "./useReconciledListener.js";

export type { BaseActionBus, ErrorListenerSignature, ListenerOptions };

export function useListenToActionBus<
    TActionBus extends BaseActionBus,
    TKey extends KeyOf<TActionBus["__type"]["actions"]>,
    TListener
        extends TActionBus["__type"]["actions"][TKey]["listenerSignature"],
    TBeforeActionListener
        extends TActionBus["__type"]["actions"][TKey]["beforeActionSignature"],
>(
    actionBus: TActionBus,
    actionName: TKey,
    listener?: TListener | null | {
        listener?: TListener;
        options?: ListenerOptions;
        errorListener?: ErrorListenerSignature<any[]> | null;
        beforeActionListener?: TBeforeActionListener | null;
    },
    options?: ListenerOptions | null,
    errorListener?: ErrorListenerSignature<any[]> | null,
    beforeActionListener?: TBeforeActionListener | null,
) {
    if (listener && typeof listener !== "function") {
        options = listener.options;
        errorListener = listener.errorListener;
        beforeActionListener = listener.beforeActionListener;
        listener = listener.listener;
    }
    const listenerRef = useRef<TListener | null>(listener || null);
    const beforeActionListenerRef = useRef<TBeforeActionListener | null>(null);

    listenerRef.current = listener || null;
    beforeActionListenerRef.current = beforeActionListener || null;

    const genericHandler = useCallback(
        (arg: TActionBus["__type"]["actions"][TKey]["listenerArgument"]) => {
            return listenerRef.current?.(arg);
        },
        [],
    );

    const genericBeforeActionHandler = useCallback(
        (...args: Parameters<TBeforeActionListener>) => {
            return beforeActionListenerRef.current?.(...args);
        },
        [],
    );

    // Main listener + beforeAction listener - reconciled across changes
    useReconciledListener({
        keyDeps: [ actionBus, actionName ],
        options: options ?? undefined,
        subscribe: (opts) => {
            actionBus.addListener(
                actionName,
                genericHandler,
                opts ?? undefined,
            );
            actionBus.get(actionName).addBeforeActionListener(
                genericBeforeActionHandler,
            );
        },
        unsubscribe: (ctx) => {
            actionBus.removeListener(actionName, genericHandler, ctx);
            actionBus.get(actionName).removeBeforeActionListener(
                genericBeforeActionHandler,
            );
        },
        update: (ctx, opts) =>
            actionBus.updateListenerOptions(
                actionName,
                genericHandler,
                ctx,
                opts ?? undefined,
            ),
    });

    // Error listener - bus level
    useEffect(() => {
        if (errorListener) {
            actionBus.addErrorListener(errorListener);
            return () => {
                actionBus.removeErrorListener(errorListener);
            };
        }
    }, [actionBus, errorListener]);
}
