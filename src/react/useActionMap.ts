import { useContext, useEffect, useMemo, useRef } from "react";
import type { ActionResponse, ListenerSignature } from "../action";
import type { BaseActionsMap } from "../actionBus";
import { createActionMap } from "../actionMap";
import type {
    ErrorListenerSignature,
    ErrorResponse,
    Simplify,
} from "../lib/types";
import { ErrorBoundaryContext } from "./ErrorBoundary";

export type {
    ActionResponse,
    BaseActionsMap,
    ErrorListenerSignature,
    ErrorResponse,
    ListenerSignature,
};

export function useActionMap<M extends BaseActionsMap>(
    actions: M,
    onAnyError?:
        | ErrorListenerSignature<any[]>
        | ErrorListenerSignature<any[]>[],
) {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListenerSignature<any[]> | null;
    const changeRef = useRef(0);
    const actionMap = useMemo(
        () => {
            const errorListeners = [
                ...(Array.isArray(onAnyError) ? onAnyError : [ onAnyError ]),
                ...(boundaryErrorListener ? [ boundaryErrorListener ] : []),
            ].filter(l => l !== undefined);
            const actionMap = createActionMap(actions, errorListeners);
            return actionMap;
        },
        [],
    );
    useEffect(
        () => {
            if (changeRef.current > 0) {
                throw new Error(
                    "useActionMap() does not support changing actions or onAnyError",
                );
            }
            changeRef.current++;
        },
        [ actions, onAnyError, boundaryErrorListener ],
    );
    return actionMap as Simplify<typeof actionMap>;
}
