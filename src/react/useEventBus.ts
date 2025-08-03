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
) {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListenerSignature<any[]>;
    const updateRef = useRef(0);
    const errorListenerRef = useRef<ErrorListenerSignature<any[]>>(
        errorListener,
    );
    const allEventsListenerRef = useRef<BaseHandler>(allEventsListener);
    const boundaryErrorListenerRef = useRef<ErrorListenerSignature<any[]>>(
        boundaryErrorListener,
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
            if (updateRef.current > 0) {
                throw new Error("EventBus options can't be updated");
            }
            updateRef.current++;
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
                allEventsListenerRef.current = allEventsListener;
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
                errorListenerRef.current = errorListener;
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
                boundaryErrorListenerRef.current = boundaryErrorListener;
                if (boundaryErrorListener) {
                    eventBus.addErrorListener(boundaryErrorListener);
                }
            }
        },
        [ boundaryErrorListener ],
    );

    return eventBus;
}
