import { useCallback, useEffect, useRef } from "react";
import { type BaseEventBus } from "../../src/eventBus";
import { KeyOf } from "../../src/lib/types";
import { ListenerOptions } from "../event";

export function useEventBusListen<
    TEventBus extends BaseEventBus,
    TKey extends KeyOf<TEventBus["__type"]["eventSignatures"]>,
    THandler extends TEventBus["__type"]["eventSignatures"][TKey],
>(
    eventBus: TEventBus,
    eventName: TKey,
    handler: THandler,
    options?: ListenerOptions,
) {
    const handlerRef = useRef<THandler>(handler);
    const eventBusRef = useRef<TEventBus>(eventBus);

    handlerRef.current = handler;

    const genericHandler = useCallback(
        (...args: Parameters<THandler>) => {
            return handlerRef.current(...args);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                eventBusRef.current.off(eventName, genericHandler);
            };
        },
        [],
    );

    useEffect(
        () => {
            eventBusRef.current.off(eventName, genericHandler);
            eventBusRef.current = eventBus;
            eventBusRef.current.on(eventName, genericHandler, options);
        },
        [ eventBus ],
    );
}
