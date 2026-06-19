import { useContext, useEffect, useMemo, useRef } from "react";
import type { ActionResponse, ListenerSignature } from "../action.js";
import type { BaseActionsMap } from "../actionBus.js";
import { createActionMap } from "../actionMap.js";
import type {
    ErrorListenerSignature,
    ErrorResponse,
    Simplify,
} from "../lib/types.js";
import { ErrorBoundaryContext } from "./ErrorBoundary.js";

export type {
    ActionResponse,
    BaseActionsMap,
    ErrorListenerSignature,
    ErrorResponse,
    ListenerSignature,
};

export function useActionMap<M extends BaseActionsMap>(
    actions: M,
    errorListener?: ErrorListenerSignature<any[]>,
): ReturnType<typeof createActionMap<M>> {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListenerSignature<any[]> | null;
    const initialActionsRef = useRef(actions);
    const initialErrorListenerRef = useRef(errorListener ?? null);
    const initialBoundaryErrorListenerRef = useRef(
        boundaryErrorListener ?? null,
    );
    const actionMap = useMemo(
        () => {
            const errorListeners = [
                ...(errorListener ? [ errorListener ] : []),
                ...(boundaryErrorListener ? [ boundaryErrorListener ] : []),
            ].filter(l => l !== undefined);
            const actionMap = createActionMap(actions, errorListeners);
            return actionMap;
        },
        [],
    );
    useEffect(
        () => {
            if (
                initialActionsRef.current !== actions
                || initialErrorListenerRef.current !== (errorListener ?? null)
                || initialBoundaryErrorListenerRef.current
                    !== (boundaryErrorListener ?? null)
            ) {
                throw new Error(
                    "useActionMap() does not support changing actions or errorListener",
                );
            }
        },
        [ actions, errorListener ?? null, boundaryErrorListener ?? null ],
    );
    return actionMap as Simplify<typeof actionMap>;
}
