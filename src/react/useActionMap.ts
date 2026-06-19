import { useContext, useEffect, useMemo, useRef } from "react";
import type { ActionResponse, ListenerSignature } from "../action.js";
import type { BaseActionsMap } from "../actionBus.js";
import { ActionMapSetErrorListeners, createActionMap } from "../actionMap.js";
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
    const committedActionsRef = useRef(actions);
    const committedErrorListenerRef = useRef(errorListener ?? null);
    const committedBoundaryErrorListenerRef = useRef(
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

    // The action map TYPE fixes the available keys, so the key set is static:
    // reconcile values only (in-place setAction) and the forwarded error
    // listeners. A runtime key-set change is a type-contract violation and
    // keeps a defensive throw.
    useEffect(() => {
        const next = actions;
        const prev = committedActionsRef.current;
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (
            prevKeys.length !== nextKeys.length
            || nextKeys.some((key) => !(key in prev))
        ) {
            throw new Error(
                "useActionMap() does not support changing the set of action keys",
            );
        }
        for (const key of nextKeys) {
            if (next[key] !== prev[key]) {
                (actionMap as Record<string, any>)[key].setAction(next[key]);
            }
        }
        committedActionsRef.current = next;

        const nextErrorListener = errorListener ?? null;
        const nextBoundaryErrorListener = boundaryErrorListener ?? null;
        if (
            committedErrorListenerRef.current !== nextErrorListener
            || committedBoundaryErrorListenerRef.current
                !== nextBoundaryErrorListener
        ) {
            const errorListeners = [
                ...(nextErrorListener ? [ nextErrorListener ] : []),
                ...(nextBoundaryErrorListener
                    ? [ nextBoundaryErrorListener ]
                    : []),
            ];
            (actionMap as Record<symbol, any>)[ActionMapSetErrorListeners](
                errorListeners,
            );
            committedErrorListenerRef.current = nextErrorListener;
            committedBoundaryErrorListenerRef.current =
                nextBoundaryErrorListener;
        }
    });

    return actionMap as Simplify<typeof actionMap>;
}
