import type { ActionResponse, ListenerSignature } from "../action";
import type { BaseActionsMap } from "../actionBus";
import { createActionMap } from "../actionMap";
import type { ErrorListenerSignature, ErrorResponse } from "../lib/types";
export type { ActionResponse, BaseActionsMap, ErrorListenerSignature, ErrorResponse, ListenerSignature, };
export declare function useActionMap<M extends BaseActionsMap>(actions: M, errorListener?: ErrorListenerSignature<any[]>): ReturnType<typeof createActionMap<M>>;
