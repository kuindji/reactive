import { useCallback, useEffect, useRef } from "react";
import { createEvent, type Event, ListenerOptions } from "../../src/event";

export function useEventListen<
    TEvent extends Event,
    TEventSignature extends TEvent["eventSignature"],
>(event: TEvent, handler: TEventSignature, options?: ListenerOptions) {
    const handlerRef = useRef<TEventSignature>(handler);
    const eventRef = useRef<TEvent>(event);

    handlerRef.current = handler;

    const genericHandler = useCallback(
        (...args: Parameters<TEventSignature>) => {
            return handlerRef.current(...args);
        },
        [],
    );

    useEffect(
        () => {
            return () => {
                eventRef.current.off(genericHandler);
            };
        },
        [],
    );

    useEffect(
        () => {
            eventRef.current.off(genericHandler);
            eventRef.current = event;
            eventRef.current.on(genericHandler, options);
        },
        [ event ],
    );
}
