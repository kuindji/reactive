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
    listener?: Listener,
    errorListener?: ErrorListener,
) {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListener;
    const updateRef = useRef(0);
    const listenerRef = useRef<Listener>(listener);
    const errorListenerRef = useRef<ErrorListener>(errorListener);
    const boundaryErrorListenerRef = useRef<ErrorListener>(
        boundaryErrorListener,
    );
    const event = useMemo(
        () => createEvent<Listener>(eventOptions),
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
            if (listenerRef.current) {
                event.removeListener(listenerRef.current);
            }
            listenerRef.current = listener;
            if (listener) {
                event.addListener(listener);
            }
        },
        [ listener ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current) {
                event.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener;
            if (errorListener) {
                event.addErrorListener(errorListener);
            }
        },
        [ errorListener ],
    );

    useEffect(
        () => {
            if (boundaryErrorListenerRef.current) {
                event.removeErrorListener(boundaryErrorListenerRef.current);
            }
            boundaryErrorListenerRef.current = boundaryErrorListener;
            if (boundaryErrorListener) {
                event.addErrorListener(boundaryErrorListener);
            }
        },
        [ boundaryErrorListener ],
    );

    return event;
}
