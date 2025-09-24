import { createAction } from "../action";
import type { ActionResponse, ListenerSignature } from "../action";
import type { BaseHandler, ErrorListenerSignature, ErrorResponse } from "../lib/types";
export type { ActionResponse, BaseHandler, ErrorListenerSignature, ErrorResponse, ListenerSignature, };
export declare function useAction<ActionSignature extends BaseHandler, Listener extends ListenerSignature<ActionSignature>, ErrorListener extends ErrorListenerSignature<Parameters<ActionSignature>>>(actionSignature: ActionSignature, listener?: Listener | null, errorListener?: ErrorListener | null): ReturnType<typeof createAction<ActionSignature>>;
