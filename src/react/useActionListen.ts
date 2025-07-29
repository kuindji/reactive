import { useCallback, useEffect, useRef } from "react";
import { BaseAction, BaseActionDefinition } from "../../src/action";

export function useActionListen<
    TAction extends BaseAction,
    TListenerSignature extends TAction["__type"]["listenerSignature"] =
        TAction["__type"]["listenerSignature"],
    ActionDefinition extends BaseActionDefinition = TAction["__type"],
>(action: TAction, handler: TListenerSignature) {
    const handlerRef = useRef<TListenerSignature>(handler);
    const actionRef = useRef<TAction>(action);

    handlerRef.current = handler;

    const genericHandler = useCallback(
        (arg: ActionDefinition["listenerArgument"]) => {
            handlerRef.current(arg);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                actionRef.current.off(genericHandler);
            };
        },
        [],
    );

    useEffect(
        () => {
            actionRef.current.off(genericHandler);
            actionRef.current = action;
            actionRef.current.on(genericHandler);
        },
        [ action ],
    );
}
