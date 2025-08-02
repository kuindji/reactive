import { useCallback, useEffect, useRef } from "react";
import { type BaseEvent, ListenerOptions } from "../../src/event";

export function useEventListen<
    TEvent extends BaseEvent,
    TEventSignature extends TEvent["__type"]["signature"] =
        TEvent["__type"]["signature"],
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
                eventRef.current.removeListener(genericHandler);
            };
        },
        [],
    );

    useEffect(
        () => {
            eventRef.current.removeListener(genericHandler);
            eventRef.current = event;
            eventRef.current.addListener(genericHandler, options);
        },
        [ event ],
    );
}
