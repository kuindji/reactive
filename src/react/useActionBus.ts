import { useContext, useEffect, useMemo, useRef } from "react";
import type { ActionResponse, ListenerSignature } from "../action.js";
import type { BaseActionsMap } from "../actionBus.js";
import { createActionBus } from "../actionBus.js";
import type {
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
} from "../lib/types.js";
import { ErrorBoundaryContext } from "./ErrorBoundary.js";

export type {
    ActionResponse,
    BaseActionsMap,
    ErrorListenerSignature,
    ErrorResponse,
    ListenerSignature,
};

export function useActionBus<
    ActionsMap extends BaseActionsMap = BaseActionsMap,
>(
    initialActions?: ActionsMap,
    errorListener?: ErrorListenerSignature<any[]>,
): ReturnType<typeof createActionBus<ActionsMap>> {
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

    // Reconcile the actions map every render: added keys are added, changed
    // function references are replaced in place (preserving listeners), removed
    // keys are removed. Functions are compared by reference and never invoked.
    const appliedActionsRef = useRef<Record<string, BaseHandler>>({
        ...(initialActions as Record<string, BaseHandler> | undefined),
    });
    useEffect(() => {
        const next = (initialActions ?? {}) as Record<string, BaseHandler>;
        const prev = appliedActionsRef.current;
        for (const key in prev) {
            if (!(key in next)) {
                actionBus.removeAction(key);
            }
        }
        for (const key in next) {
            if (!(key in prev)) {
                actionBus.add(key, next[key]);
            }
            else if (next[key] !== prev[key]) {
                actionBus.replace(key, next[key]);
            }
        }
        appliedActionsRef.current = { ...next };
    });

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
