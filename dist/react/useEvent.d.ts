import { createEvent, type EventOptions } from "../event";
import type { BaseHandler, ErrorListenerSignature, ErrorResponse } from "../lib/types";
export type { BaseHandler, ErrorListenerSignature, ErrorResponse, EventOptions, };
export declare function useEvent<Listener extends BaseHandler = BaseHandler, ErrorListener extends ErrorListenerSignature<Parameters<Listener>> = ErrorListenerSignature<Parameters<Listener>>>(eventOptions?: EventOptions<Listener>, listener?: Listener | null, errorListener?: ErrorListener | null): ReturnType<typeof createEvent<Listener>>;
