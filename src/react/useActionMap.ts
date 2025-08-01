import { useContext, useEffect, useMemo, useRef } from "react";
import type {
    ActionResponse,
    ErrorListenerSignature,
    ErrorResponse,
    ListenerSignature,
} from "../action";
import type { BaseActionsMap } from "../actionBus";
import { createActionMap } from "../actionMap";
import { BaseHandler, Simplify } from "../lib/types";
import { ActionErrorBoundaryContext } from "./ActionErrorBoundary";

export type {
    ActionResponse,
    BaseActionsMap,
    ErrorListenerSignature,
    ErrorResponse,
    ListenerSignature,
};

export function useActionMap<M extends BaseActionsMap>(
    actions: M,
    onAnyError?: ErrorListenerSignature<BaseHandler> | (
        | ErrorListenerSignature<
            BaseHandler
        >
        | undefined
    )[],
) {
    const onBoundaryActionError = useContext(
        ActionErrorBoundaryContext,
    ) as ErrorListenerSignature<BaseHandler> | null;
    const changeRef = useRef(0);
    const actionMap = useMemo(
        () => {
            const errorListeners = [
                ...(Array.isArray(onAnyError) ? onAnyError : [ onAnyError ]),
                ...(onBoundaryActionError ? [ onBoundaryActionError ] : []),
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
        [ actions, onAnyError, onBoundaryActionError ],
    );
    return actionMap as Simplify<typeof actionMap>;
}
