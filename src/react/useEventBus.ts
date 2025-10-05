import { useContext, useEffect, useMemo, useRef } from "react";
import {
    BaseEventMap,
    createEventBus,
    DefaultEventMap,
    EventBusOptions,
} from "../eventBus";

import type {
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
} from "../lib/types";
import { ErrorBoundaryContext } from "./ErrorBoundary";

export type {
    BaseEventMap,
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
    EventBusOptions,
};

export function useEventBus<
    EventsMap extends BaseEventMap = DefaultEventMap,
>(
    eventBusOptions?: EventBusOptions<EventsMap>,
    allEventsListener?: BaseHandler,
    errorListener?: ErrorListenerSignature<any[]>,
): ReturnType<typeof createEventBus<EventsMap>> {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListenerSignature<any[]>;
    const updateRef = useRef(0);
    const errorListenerRef = useRef<ErrorListenerSignature<any[]> | null>(
        errorListener || null,
    );
    const allEventsListenerRef = useRef<BaseHandler | null>(
        allEventsListener || null,
    );
    const boundaryErrorListenerRef = useRef<
        ErrorListenerSignature<any[]> | null
    >(
        boundaryErrorListener || null,
    );

    const eventBus = useMemo(
        () => {
            const eventBus = createEventBus<EventsMap>(eventBusOptions);
            if (allEventsListener) {
                eventBus.addAllEventsListener(allEventsListener);
            }
            if (errorListener) {
                eventBus.addErrorListener(errorListener);
            }
            if (boundaryErrorListener) {
                eventBus.addErrorListener(boundaryErrorListener);
            }
            return eventBus;
        },
        [],
    );

    useEffect(
        () => {
            if (eventBusOptions) {
                if (updateRef.current > 0) {
                    throw new Error("EventBus options can't be updated");
                }
                updateRef.current++;
            }
        },
        [ eventBusOptions ],
    );

    useEffect(
        () => {
            if (allEventsListenerRef.current !== allEventsListener) {
                if (allEventsListenerRef.current) {
                    eventBus.removeAllEventsListener(
                        allEventsListenerRef.current,
                    );
                }
                allEventsListenerRef.current = allEventsListener || null;
                if (allEventsListener) {
                    eventBus.addAllEventsListener(allEventsListener);
                }
            }
        },
        [ allEventsListener ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current !== errorListener) {
                if (errorListenerRef.current) {
                    eventBus.removeErrorListener(errorListenerRef.current);
                }
                errorListenerRef.current = errorListener || null;
                if (errorListener) {
                    eventBus.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );

    useEffect(
        () => {
            if (boundaryErrorListenerRef.current !== boundaryErrorListener) {
                if (boundaryErrorListenerRef.current) {
                    eventBus.removeErrorListener(
                        boundaryErrorListenerRef.current,
                    );
                }
                boundaryErrorListenerRef.current = boundaryErrorListener
                    || null;
                if (boundaryErrorListener) {
                    eventBus.addErrorListener(boundaryErrorListener);
                }
            }
        },
        [ boundaryErrorListener ],
    );

    useEffect(
        () => {
            return () => {
                if (allEventsListenerRef.current) {
                    eventBus.removeAllEventsListener(
                        allEventsListenerRef.current,
                    );
                    allEventsListenerRef.current = null;
                }
                if (errorListenerRef.current) {
                    eventBus.removeErrorListener(errorListenerRef.current);
                    errorListenerRef.current = null;
                }
                if (boundaryErrorListenerRef.current) {
                    eventBus.removeErrorListener(
                        boundaryErrorListenerRef.current,
                    );
                    boundaryErrorListenerRef.current = null;
                }
                updateRef.current = 0;
            };
        },
        [],
    );

    return eventBus;
}
