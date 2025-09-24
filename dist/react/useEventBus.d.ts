import { BaseEventMap, createEventBus, DefaultEventMap, EventBusOptions } from "../eventBus";
import type { BaseHandler, ErrorListenerSignature, ErrorResponse } from "../lib/types";
export type { BaseEventMap, BaseHandler, ErrorListenerSignature, ErrorResponse, EventBusOptions, };
export declare function useEventBus<EventsMap extends BaseEventMap = DefaultEventMap>(eventBusOptions?: EventBusOptions<EventsMap>, allEventsListener?: BaseHandler, errorListener?: ErrorListenerSignature<any[]>): ReturnType<typeof createEventBus<EventsMap>>;
