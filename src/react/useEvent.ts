import { useContext, useEffect, useMemo, useRef } from "react";
import { createEvent, type EventOptions } from "../event";
import type {
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
} from "../lib/types";
import { ErrorBoundaryContext } from "./ErrorBoundary";

export type {
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
    EventOptions,
};

export function useEvent<
    Listener extends BaseHandler = BaseHandler,
    ErrorListener extends ErrorListenerSignature<
        Parameters<Listener>
    > = ErrorListenerSignature<Parameters<Listener>>,
>(
    eventOptions: EventOptions<Listener> = {},
    listener?: Listener | null,
    errorListener?: ErrorListener | null,
): ReturnType<typeof createEvent<Listener>> {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListener;
    const updateRef = useRef(0);
    const listenerRef = useRef<Listener | null>(listener);
    const errorListenerRef = useRef<ErrorListener | null>(errorListener);
    const boundaryErrorListenerRef = useRef<ErrorListener | null>(
        boundaryErrorListener,
    );
    const event = useMemo(
        () => {
            const event = createEvent<Listener>(eventOptions);
            if (listenerRef.current) {
                event.addListener(listenerRef.current);
            }
            if (errorListenerRef.current) {
                event.addErrorListener(errorListenerRef.current);
            }
            if (boundaryErrorListenerRef.current) {
                event.addErrorListener(boundaryErrorListenerRef.current);
            }
            return event;
        },
        [],
    );

    useEffect(
        () => {
            if (updateRef.current > 0) {
                throw new Error("Event cannot be updated");
            }
            updateRef.current++;
        },
        [ event ],
    );

    useEffect(
        () => {
            if (listenerRef.current !== listener) {
                if (listenerRef.current) {
                    event.removeListener(listenerRef.current);
                }
                listenerRef.current = listener ?? null;
                if (listener) {
                    event.addListener(listener);
                }
            }
        },
        [ listener ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current !== errorListener) {
                if (errorListenerRef.current) {
                    event.removeErrorListener(errorListenerRef.current);
                }
                errorListenerRef.current = errorListener ?? null;
                if (errorListener) {
                    event.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );

    useEffect(
        () => {
            if (boundaryErrorListenerRef.current !== boundaryErrorListener) {
                if (boundaryErrorListenerRef.current) {
                    event.removeErrorListener(boundaryErrorListenerRef.current);
                }
                boundaryErrorListenerRef.current = boundaryErrorListener
                    ?? null;
                if (boundaryErrorListener) {
                    event.addErrorListener(boundaryErrorListener);
                }
            }
        },
        [ boundaryErrorListener ],
    );

    return event;
}
