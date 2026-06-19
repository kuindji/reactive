import { createAction } from "./action.js";
import type { ActionResponse } from "./action.js";
import type { BaseActionsMap } from "./actionBus.js";
import { ActionMapSetErrorListeners } from "./lib/actionMapInternal.js";
import type {
    ErrorListenerSignature,
    ErrorResponse,
    KeyOf,
    Simplify,
} from "./lib/types.js";

export type {
    ActionResponse,
    BaseActionsMap,
    ErrorListenerSignature,
    ErrorResponse,
};

export function createActionMap<M extends BaseActionsMap>(
    actions: M,
    onAnyError?:
        | ErrorListenerSignature<any[]>
        | ErrorListenerSignature<any[]>[],
) {
    let currentOnAnyError = onAnyError;
    type ActionMap = {
        [key in KeyOf<M>]: Simplify<ReturnType<typeof createAction<M[key]>>>;
    };
    type ErrorListenersMap = {
        [key in KeyOf<M>]: ErrorListenerSignature<Parameters<M[key]>>;
    };

    const errorListenersMap: ErrorListenersMap = {} as ErrorListenersMap;
    for (const key in actions) {
        (errorListenersMap as Record<string, unknown>)[key] = (
            errorResponse: ErrorResponse<any[]>,
        ) => {
            const handlers = currentOnAnyError;
            if (Array.isArray(handlers)) {
                for (const listener of handlers) {
                    listener?.({ name: key, ...errorResponse });
                }
            }
            else {
                handlers?.({ name: key, ...errorResponse });
            }
        };
    }

    const map: ActionMap = {} as ActionMap;

    for (const key in actions) {
        const action = createAction(actions[key]);
        action.addErrorListener(errorListenersMap[key]);
        map[key] = action;
    }

    (map as Record<symbol, unknown>)[ActionMapSetErrorListeners] = (
        next?:
            | ErrorListenerSignature<any[]>
            | ErrorListenerSignature<any[]>[],
    ) => {
        currentOnAnyError = next;
    };

    return map;
}
