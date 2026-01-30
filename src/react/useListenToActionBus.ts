import { useCallback, useEffect, useRef } from "react";
import type { BaseActionBus } from "../actionBus";
import type { ListenerOptions } from "../event";
import type { ErrorListenerSignature, KeyOf } from "../lib/types";

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
            return beforeActionListenerRef.current?.(...args) || undefined;
        },
        [],
    );

    // Main listener + beforeAction listener - tied to actionName
    useEffect(() => {
        actionBus.addListener(actionName, genericHandler, options || undefined);
        actionBus.get(actionName).addBeforeActionListener(genericBeforeActionHandler);
        return () => {
            actionBus.removeListener(actionName, genericHandler);
            actionBus.get(actionName).removeBeforeActionListener(genericBeforeActionHandler);
        };
    }, [actionBus, actionName, genericHandler, genericBeforeActionHandler]);

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
