import { useCallback, useEffect, useRef } from "react";
import type { BaseAction } from "../action.js";

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
    const listenerRef = useRef<TListenerSignature | null>(listener);

    listenerRef.current = listener;

    const genericHandler = useCallback(
        (arg: ActionDefinition["listenerArgument"]) => {
            listenerRef.current?.(arg);
        },
        [],
    );

    useEffect(
        () => {
            action.addListener(genericHandler);
            return () => {
                action.removeListener(genericHandler);
            };
        },
        [ action, genericHandler ],
    );

    useEffect(
        () => {
            if (errorListener) {
                action.addErrorListener(errorListener);
                return () => {
                    action.removeErrorListener(errorListener);
                };
            }
        },
        [ action, errorListener ],
    );

    useEffect(
        () => {
            if (beforeActionListener) {
                action.addBeforeActionListener(beforeActionListener);
                return () => {
                    action.removeBeforeActionListener(beforeActionListener);
                };
            }
        },
        [ action, beforeActionListener ],
    );
}
