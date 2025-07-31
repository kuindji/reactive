import { useEffect, useMemo, useRef } from "react";
import type { BaseActionsMap, ErrorEventSignature } from "../actionBus";
import { createActionMap } from "../actionMap";
import type {
    ActionResponse,
    AnyErrorCallback,
    AnyErrorResponse,
} from "../actionMap";
import { Simplify } from "../lib/types";

export type { ActionResponse, AnyErrorCallback, AnyErrorResponse };

export function useActionMap<M extends BaseActionsMap>(
    actions: M,
    onAnyError?: AnyErrorCallback,
) {
    const changeRef = useRef(0);
    const actionMap = useMemo(
        () => createActionMap(actions, onAnyError),
        [ actions, onAnyError ],
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
        [ actions, onAnyError ],
    );
    return actionMap as Simplify<typeof actionMap>;
}
