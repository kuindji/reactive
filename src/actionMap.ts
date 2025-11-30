import { createAction } from "./action";
import type { ActionResponse } from "./action";
import type { BaseActionsMap } from "./actionBus";
import type {
    ErrorListenerSignature,
    ErrorResponse,
    KeyOf,
    Simplify,
} from "./lib/types";

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
            if (Array.isArray(onAnyError)) {
                for (const listener of onAnyError) {
                    listener?.({ name: key, ...errorResponse });
                }
            }
            else {
                onAnyError?.({ name: key, ...errorResponse });
            }
        };
    }

    const map: ActionMap = {} as ActionMap;

    for (const key in actions) {
        const action = createAction(actions[key]);
        action.addErrorListener(errorListenersMap[key]);
        map[key] = action;
    }

    return map;
}
