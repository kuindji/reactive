import { useContext, useEffect, useMemo, useRef } from "react";
import type { ActionResponse, ListenerSignature } from "../action";
import type { BaseActionsMap } from "../actionBus";
import { createActionBus } from "../actionBus";
import type { ErrorListenerSignature, ErrorResponse } from "../lib/types";
import { ErrorBoundaryContext } from "./ErrorBoundary";

export type {
    ActionResponse,
    BaseActionsMap,
    ErrorListenerSignature,
    ErrorResponse,
    ListenerSignature,
};

export function useActionBus<
    ActionsMap extends BaseActionsMap = BaseActionsMap,
>(initialActions?: ActionsMap, errorListener?: ErrorListenerSignature<any[]>) {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListenerSignature<any[]> | null;

    const errorListenerRef = useRef<ErrorListenerSignature<any[]> | null>(
        errorListener,
    );
    const boundaryErrorListenerRef = useRef<
        ErrorListenerSignature<any[]> | null
    >(
        boundaryErrorListener,
    );

    const actionBus = useMemo(
        () => {
            const actionBus = createActionBus<ActionsMap>(initialActions);
            if (errorListener) {
                actionBus.addErrorListener(errorListener);
            }
            if (boundaryErrorListener) {
                actionBus.addErrorListener(boundaryErrorListener);
            }
            return actionBus;
        },
        [],
    );

    useEffect(
        () => {
            if (errorListenerRef.current !== errorListener) {
                if (errorListenerRef.current) {
                    actionBus.removeErrorListener(errorListenerRef.current);
                }
                errorListenerRef.current = errorListener ?? null;
                if (errorListener) {
                    actionBus.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );

    useEffect(
        () => {
            if (boundaryErrorListenerRef.current !== boundaryErrorListener) {
                if (boundaryErrorListenerRef.current) {
                    actionBus.removeErrorListener(
                        boundaryErrorListenerRef.current,
                    );
                }
                boundaryErrorListenerRef.current = boundaryErrorListener
                    ?? null;
                if (boundaryErrorListener) {
                    actionBus.addErrorListener(boundaryErrorListener);
                }
            }
        },
        [ boundaryErrorListener ],
    );

    return actionBus;
}
