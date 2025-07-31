import {
    type ActionDefinitionHelper,
    createAction,
    type ErrorResponse,
} from "./action";
import { ActionResponse } from "./action";
import type { BaseActionsMap, ErrorEventSignature } from "./actionBus";
import { AnyErrorResponse } from "./actionBus";
import { KeyOf, Simplify } from "./lib/types";

type AnyErrorCallback = ErrorEventSignature;
export type { ActionResponse, AnyErrorCallback, AnyErrorResponse };

export function createActionMap<M extends BaseActionsMap>(
    actions: M,
    onAnyError?: ErrorEventSignature,
) {
    type ActionMap = {
        [key in KeyOf<M>]: Simplify<ReturnType<typeof createAction<M[key]>>>;
    };
    type ErrorListenersMap = {
        [key in KeyOf<M>]: ActionDefinitionHelper<
            M[key]
        >["errorListenerSignature"];
    };

    const errorListenersMap: ErrorListenersMap = {} as ErrorListenersMap;
    for (const key in actions) {
        (errorListenersMap as any)[key] = (error: ErrorResponse<[ any ]>) => {
            onAnyError?.({ name: key, ...error });
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
