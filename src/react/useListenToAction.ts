import { useCallback, useEffect, useRef } from "react";
import type { BaseAction } from "../action";

export type { BaseAction };

export function useListenToAction<
    TAction extends BaseAction,
    TListenerSignature extends TAction["__type"]["listenerSignature"] =
        TAction["__type"]["listenerSignature"],
    TErrorListenerSignature
        extends TAction["__type"]["errorListenerSignature"] =
            TAction["__type"]["errorListenerSignature"],
    TBeforeActionListenerSignature
        extends TAction["__type"]["beforeActionSignature"] =
            TAction["__type"]["beforeActionSignature"],
>(
    action: TAction,
    listener: TListenerSignature | null,
    errorListener?: TErrorListenerSignature | null,
    beforeActionListener?: TBeforeActionListenerSignature | null,
) {
    type ActionDefinition = TAction["__type"];
    const listenerRef = useRef<TListenerSignature>(listener);
    const actionRef = useRef<TAction>(action);
    const errorListenerRef = useRef<TErrorListenerSignature | null>(
        null,
    );
    const beforeActionListenerRef = useRef<
        TBeforeActionListenerSignature | null
    >(null);

    listenerRef.current = listener;

    const genericHandler = useCallback(
        (arg: ActionDefinition["listenerArgument"]) => {
            listenerRef.current?.(arg);
        },
        [],
    );

    useEffect(
        () => {
            actionRef.current.removeListener(genericHandler);
            actionRef.current = action;
            actionRef.current.addListener(genericHandler);
        },
        [ action ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current !== errorListener) {
                if (errorListenerRef.current) {
                    actionRef.current.removeErrorListener(
                        errorListenerRef.current,
                    );
                }
                errorListenerRef.current = errorListener || null;
                if (errorListener) {
                    actionRef.current.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );

    useEffect(
        () => {
            if (beforeActionListenerRef.current !== beforeActionListener) {
                if (beforeActionListenerRef.current) {
                    actionRef.current.removeBeforeActionListener(
                        beforeActionListenerRef.current,
                    );
                }
                beforeActionListenerRef.current = beforeActionListener || null;
                if (beforeActionListener) {
                    actionRef.current.addBeforeActionListener(
                        beforeActionListener,
                    );
                }
            }
        },
        [ beforeActionListener ],
    );

    useEffect(
        () => {
            return () => {
                actionRef.current.removeListener(genericHandler);
                if (errorListenerRef.current) {
                    actionRef.current.removeErrorListener(
                        errorListenerRef.current,
                    );
                    errorListenerRef.current = null;
                }
                if (beforeActionListenerRef.current) {
                    actionRef.current.removeBeforeActionListener(
                        beforeActionListenerRef.current,
                    );
                    beforeActionListenerRef.current = null;
                }
            };
        },
        [],
    );
}
