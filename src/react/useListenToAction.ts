import { useCallback, useEffect, useRef } from "react";
import { BaseAction, BaseActionDefinition } from "../action";

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
                actionRef.current.removeListener(genericHandler);
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
}
