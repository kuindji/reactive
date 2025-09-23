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
>(
    actionBus: TActionBus,
    actionName: TKey,
    listener: TListener,
    options?: ListenerOptions,
    errorListener?: ErrorListenerSignature<any[]>,
) {
    const listenerRef = useRef<TListener>(listener);
    const actionBusRef = useRef<TActionBus>(actionBus);
    const errorListenerRef = useRef<ErrorListenerSignature<any[]>>(
        errorListener,
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
                options,
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
                errorListenerRef.current = errorListener;
                if (errorListener) {
                    actionBusRef.current.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );
}
