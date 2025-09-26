import { createEvent } from "./event";
import type { EventDefinitionHelper, EventOptions, ListenerOptions } from "./event";
import { ApiType, BaseHandler, ErrorListenerSignature, KeyOf, MapKey, ProxyType, TriggerReturnType } from "./lib/types";
type InterceptorFunction = (name: MapKey, args: any[], tags: string[] | null, returnType: TriggerReturnType | null) => boolean;
type RelaySource = {
    on: (name: any, fn: (...args: any[]) => any, options?: ListenerOptions) => void;
    addAllEventsListener: (fn: (name: any, args: any[]) => any, options?: ListenerOptions) => void;
    un: (name: any, fn: (...args: any[]) => any, context?: object | null, tag?: string | null) => void;
    removeAllEventsListener: (fn: (name: any, args: any[]) => any, context?: object | null, tag?: string | null) => void;
};
export type EventSourceSubscriber = (name: MapKey, fn: BaseHandler, eventSource: EventSource, options?: ListenerOptions) => void;
export type EventSourceUnsubscriber = (name: MapKey, fn: BaseHandler, eventSource: EventSource, tag?: string | null) => void;
export type EventSource<On extends BaseHandler = EventSourceSubscriber, Un extends BaseHandler = EventSourceUnsubscriber> = {
    name: MapKey;
    on: On;
    un: Un;
    accepts: ((name: MapKey) => boolean) | boolean;
    proxyType?: ProxyType;
    [key: string]: any;
};
export interface BaseEventMap {
    [key: MapKey]: BaseHandler;
}
export type DefaultEventMap = {
    [key: MapKey]: (...args: any[]) => void;
};
export interface EventBusOptions<EventsMap extends BaseEventMap> {
    eventOptions?: {
        [key in KeyOf<EventsMap>]: EventOptions<EventsMap[key]>;
    };
}
export type GetEventsMap<EventDefinitionsMap extends BaseEventMap> = {
    [key in KeyOf<EventDefinitionsMap>]: EventDefinitionHelper<EventDefinitionsMap[key]>;
};
type GetEventTypesMap<EventDefinitionsMap extends BaseEventMap> = {
    [key in KeyOf<EventDefinitionsMap>]: ReturnType<typeof createEvent<EventDefinitionsMap[key]>>;
};
export type EventBusDefinitionHelper<EventsMap extends BaseEventMap = BaseEventMap> = {
    eventSignatures: EventsMap;
    events: GetEventsMap<EventsMap>;
    eventTypes: GetEventTypesMap<EventsMap>;
};
export declare function createEventBus<EventsMap extends BaseEventMap = DefaultEventMap>(eventBusOptions?: EventBusOptions<EventsMap>): ApiType<EventBusDefinitionHelper<EventsMap>, {
    readonly addListener: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, options?: ListenerOptions) => void;
    /** @alias addListener */
    readonly on: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, options?: ListenerOptions) => void;
    /** @alias addListener */
    readonly listen: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, options?: ListenerOptions) => void;
    /** @alias addListener */
    readonly subscribe: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, options?: ListenerOptions) => void;
    readonly once: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, options?: ListenerOptions) => void;
    readonly promise: <K extends KeyOf<GetEventsMap<EventsMap>>>(name: K, options?: ListenerOptions) => Promise<GetEventsMap<EventsMap>[K]["arguments"]>;
    readonly removeListener: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    /** @alias removeListener */
    readonly un: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    /** @alias removeListener */
    readonly off: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    /** @alias removeListener */
    readonly remove: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    /** @alias removeListener */
    readonly unsubscribe: <K extends KeyOf<GetEventsMap<EventsMap>>, H extends GetEventsMap<EventsMap>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    readonly trigger: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => void;
    /** @alias trigger */
    readonly emit: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => void;
    /** @alias trigger */
    readonly dispatch: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => void;
    readonly get: <K extends KeyOf<GetEventsMap<EventsMap>>>(name: K) => GetEventTypesMap<EventsMap>[K];
    readonly add: (name: MapKey, options?: EventOptions<BaseHandler>) => void;
    readonly first: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => ReturnType<EventsMap[K]> | undefined>;
    readonly resolveFirst: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => Promise<Awaited<ReturnType<EventsMap[K]>> | undefined>>;
    readonly all: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => ReturnType<EventsMap[K]>[]>;
    readonly resolveAll: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => Promise<Awaited<ReturnType<EventsMap[K]>>[]>>;
    readonly last: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => ReturnType<EventsMap[K]> | undefined>;
    readonly resolveLast: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => Promise<Awaited<ReturnType<EventsMap[K]>> | undefined>>;
    readonly merge: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => ReturnType<EventsMap[K]> | undefined>;
    readonly resolveMerge: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => Promise<Awaited<ReturnType<EventsMap[K]>> | undefined>>;
    readonly concat: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => (ReturnType<EventsMap[K]> extends infer T ? T extends ReturnType<EventsMap[K]> ? T extends (infer U)[] ? U : T : never : never)[]>;
    readonly resolveConcat: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => Promise<(Awaited<ReturnType<EventsMap[K]>> extends infer T ? T extends Awaited<ReturnType<EventsMap[K]>> ? T extends (infer U)[] ? U : T : never : never)[]>>;
    readonly firstNonEmpty: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => ReturnType<EventsMap[K]> | undefined>;
    readonly resolveFirstNonEmpty: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => Promise<Awaited<ReturnType<EventsMap[K]>> | undefined>>;
    readonly untilTrue: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => void>;
    readonly untilFalse: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => void>;
    readonly pipe: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => ReturnType<EventsMap[K]> | undefined>;
    readonly resolvePipe: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => Promise<Awaited<ReturnType<EventsMap[K]>> | undefined>>;
    readonly raw: <K extends KeyOf<GetEventsMap<EventsMap>>, A extends GetEventsMap<EventsMap>[K]["arguments"]>(name: K, ...args: A) => ReturnType<(...args: Parameters<EventsMap[K]>) => (ReturnType<EventsMap[K]> extends infer T ? T extends ReturnType<EventsMap[K]> ? T extends (infer U)[] ? U : T : never : never)[]>;
    readonly withTags: <T extends (...args: any[]) => any>(tags: string[], callback: T) => ReturnType<T>;
    readonly intercept: (fn: InterceptorFunction) => void;
    readonly stopIntercepting: () => void;
    readonly isIntercepting: () => boolean;
    readonly reset: () => void;
    readonly suspendAll: (withQueue?: boolean) => void;
    readonly resumeAll: () => void;
    readonly relay: ({ eventSource, remoteEventName, localEventName, proxyType, localEventNamePrefix, }: {
        eventSource: RelaySource;
        remoteEventName: MapKey;
        localEventName?: any;
        proxyType?: ProxyType;
        localEventNamePrefix?: string | null;
    }) => void;
    readonly unrelay: ({ eventSource, remoteEventName, localEventName, proxyType, localEventNamePrefix, }: {
        eventSource: RelaySource;
        remoteEventName: MapKey;
        localEventName?: any;
        proxyType?: ProxyType;
        localEventNamePrefix?: string | null;
    }) => void;
    readonly addEventSource: (eventSource: EventSource) => void;
    readonly removeEventSource: (eventSource: EventSource | MapKey) => void;
    readonly addAllEventsListener: (handler: (name: MapKey, args: any[], tags: string[] | null) => void, listenerOptions?: ListenerOptions) => void;
    readonly removeAllEventsListener: (handler: (name: MapKey, args: any[], tags: string[] | null) => void, context?: object | null, tag?: string | null) => boolean;
    readonly addErrorListener: (handler: ErrorListenerSignature<any[]>, listenerOptions?: ListenerOptions) => void;
    readonly removeErrorListener: (handler: ErrorListenerSignature<any[]>, context?: object | null, tag?: string | null) => boolean;
}>;
export type BaseEventBusDefinition = EventBusDefinitionHelper<BaseEventMap>;
export type BaseEventBus = ReturnType<typeof createEventBus<BaseEventMap>>;
export {};
