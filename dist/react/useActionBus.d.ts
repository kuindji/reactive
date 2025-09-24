import type { ActionResponse, ListenerSignature } from "../action";
import type { BaseActionsMap } from "../actionBus";
import { createActionBus } from "../actionBus";
import type { ErrorListenerSignature, ErrorResponse } from "../lib/types";
export type { ActionResponse, BaseActionsMap, ErrorListenerSignature, ErrorResponse, ListenerSignature, };
export declare function useActionBus<ActionsMap extends BaseActionsMap = BaseActionsMap>(initialActions?: ActionsMap, errorListener?: ErrorListenerSignature<any[]>): ReturnType<typeof createActionBus<ActionsMap>>;
