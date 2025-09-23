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
>(
    action: TAction,
    listener: TListenerSignature | null,
    errorListener?: TErrorListenerSignature,
) {
    type ActionDefinition = TAction["__type"];
    const listenerRef = useRef<TListenerSignature>(listener);
    const actionRef = useRef<TAction>(action);
    const errorListenerRef = useRef<TErrorListenerSignature>(errorListener);

    listenerRef.current = listener;

    const genericHandler = useCallback(
        (arg: ActionDefinition["listenerArgument"]) => {
            listenerRef.current?.(arg);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                actionRef.current.removeListener(genericHandler);
                if (errorListenerRef.current) {
                    actionRef.current.removeErrorListener(
                        errorListenerRef.current,
                    );
                }
            };
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
                errorListenerRef.current = errorListener;
                if (errorListener) {
                    actionRef.current.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );
}
