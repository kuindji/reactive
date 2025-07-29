import { useCallback, useEffect, useRef } from "react";
import { createEventBus, type EventBus } from "../../src/eventBus";
import { BaseHandler, MapKey } from "../../src/lib/types";
import { ListenerOptions } from "../event";

export function useEventBusListen<
    TEventBus extends EventBus,
    TEventSignatures extends EventBus["eventSignatures"] =
        TEventBus["eventSignatures"],
    K extends MapKey & keyof TEventSignatures = MapKey & keyof TEventSignatures,
    H extends BaseHandler = TEventSignatures[K]["signature"],
>(eventBus: TEventBus, eventName: K, handler: H, options?: ListenerOptions) {
    const handlerRef = useRef<H>(handler);
    const eventBusRef = useRef<TEventBus>(eventBus);

    handlerRef.current = handler;

    const genericHandler = useCallback(
        (...args: Parameters<H>) => {
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
