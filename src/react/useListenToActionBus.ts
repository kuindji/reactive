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
    const actionBusRef = useRef<TActionBus>(actionBus);
    const listenerRef = useRef<TListener | null>(listener || null);
    const errorListenerRef = useRef<ErrorListenerSignature<any[]> | null>(
        null,
    );
    const beforeActionListenerRef = useRef<TBeforeActionListener | null>(
        null,
    );

    listenerRef.current = listener || null;
    errorListenerRef.current = errorListener || null;
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

    const genericErrorListener = useCallback(
        (
            arg: TActionBus["__type"]["actions"][TKey]["errorListenerArgument"],
        ) => {
            return errorListenerRef.current?.(arg);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                actionBusRef.current.removeListener(actionName, genericHandler);
                actionBusRef.current.get(actionName)
                    .removeBeforeActionListener(genericBeforeActionHandler);
                actionBusRef.current.removeErrorListener(genericErrorListener);
            };
        },
        [],
    );

    useEffect(
        () => {
            actionBusRef.current.removeListener(actionName, genericHandler);
            actionBusRef.current.get(actionName)
                .removeBeforeActionListener(genericBeforeActionHandler);
            actionBusRef.current.removeErrorListener(genericErrorListener);
            actionBusRef.current = actionBus;
            actionBusRef.current.addListener(
                actionName,
                genericHandler,
                options || undefined,
            );
            actionBusRef.current.get(actionName)
                .addBeforeActionListener(genericBeforeActionHandler);
            actionBusRef.current.addErrorListener(genericErrorListener);
        },
        [ actionBus ],
    );
}
