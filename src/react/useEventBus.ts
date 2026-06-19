import { useContext, useEffect, useMemo, useRef } from "react";
import {
    BaseEventMap,
    createEventBus,
    DefaultEventMap,
    EventBusOptions,
} from "../eventBus.js";

import type {
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
} from "../lib/types.js";
import { ErrorBoundaryContext } from "./ErrorBoundary.js";
import { areEventBusOptionsEqual } from "./listenerOptionsEqual.js";

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
    const committedOptionsRef = useRef<EventBusOptions<EventsMap> | undefined>(
        eventBusOptions,
    );
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

    // Reconcile event bus options across renders instead of throwing. Present
    // entries are applied via event.setOptions; a removed event-name entry
    // leaves the existing event unchanged.
    useEffect(() => {
        if (committedOptionsRef.current === eventBusOptions) {
            return;
        }
        if (
            !areEventBusOptionsEqual(
                committedOptionsRef.current as EventBusOptions<BaseEventMap>,
                eventBusOptions as EventBusOptions<BaseEventMap>,
            )
        ) {
            eventBus.setOptions(
                eventBusOptions as EventBusOptions<BaseEventMap>,
            );
        }
        committedOptionsRef.current = eventBusOptions;
    });

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
            };
        },
        [],
    );

    return eventBus;
}
