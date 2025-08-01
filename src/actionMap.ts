import { createAction } from "./action";
import type {
    ActionResponse,
    ErrorListenerSignature,
    ErrorResponse,
} from "./action";
import type { BaseActionsMap } from "./actionBus";
import { BaseHandler, KeyOf, Simplify } from "./lib/types";

export type {
    ActionResponse,
    BaseActionsMap,
    ErrorListenerSignature,
    ErrorResponse,
};

export function createActionMap<M extends BaseActionsMap>(
    actions: M,
    onAnyError?: ErrorListenerSignature<BaseHandler> | ErrorListenerSignature<
        BaseHandler
    >[],
) {
    type ActionMap = {
        [key in KeyOf<M>]: Simplify<ReturnType<typeof createAction<M[key]>>>;
    };
    type ErrorListenersMap = {
        [key in KeyOf<M>]: ErrorListenerSignature<M[key]>;
    };

    const errorListenersMap: ErrorListenersMap = {} as ErrorListenersMap;
    for (const key in actions) {
        (errorListenersMap as any)[key] = (error: ErrorResponse<[ any ]>) => {
            if (Array.isArray(onAnyError)) {
                for (const listener of onAnyError) {
                    listener?.({ name: key, ...error });
                }
            }
            else {
                onAnyError?.({ name: key, ...error });
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
