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
    listener: TListener | {
        listener: TListener;
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
    const listenerRef = useRef<TListener>(listener);
    const errorListenerRef = useRef<ErrorListenerSignature<any[]> | null>(
        null,
    );
    const beforeActionListenerRef = useRef<TBeforeActionListener | null>(
        null,
    );

    listenerRef.current = listener;

    const genericHandler = useCallback(
        (arg: TActionBus["__type"]["actions"][TKey]["listenerArgument"]) => {
            return listenerRef.current?.(arg);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                actionBusRef.current.removeListener(actionName, genericHandler);
                if (errorListenerRef.current) {
                    actionBusRef.current.removeErrorListener(
                        errorListenerRef.current,
                    );
                }
                if (beforeActionListenerRef.current) {
                    actionBusRef.current.get(actionName)
                        .removeBeforeActionListener(
                            beforeActionListenerRef.current,
                        );
                }
            };
        },
        [],
    );

    useEffect(
        () => {
            actionBusRef.current.removeListener(actionName, genericHandler);
            actionBusRef.current = actionBus;
            actionBusRef.current.addListener(
                actionName,
                genericHandler,
                options || undefined,
            );
        },
        [ actionBus ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current !== errorListener) {
                if (errorListenerRef.current) {
                    actionBusRef.current.removeErrorListener(
                        errorListenerRef.current,
                    );
                }
                errorListenerRef.current = errorListener || null;
                if (errorListener) {
                    actionBusRef.current.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );

    useEffect(
        () => {
            if (beforeActionListenerRef.current !== beforeActionListener) {
                if (beforeActionListenerRef.current) {
                    actionBusRef.current.get(actionName)
                        .removeBeforeActionListener(
                            beforeActionListenerRef.current,
                        );
                }
                beforeActionListenerRef.current = beforeActionListener || null;
                if (beforeActionListener) {
                    actionBusRef.current.get(actionName)
                        .addBeforeActionListener(
                            beforeActionListener,
                        );
                }
            }
        },
        [ beforeActionListener ],
    );
}
