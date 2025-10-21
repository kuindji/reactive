import type { ApiType, BaseHandler, ErrorListenerSignature } from "./lib/types";
type Unarray<T> = T extends (infer U)[] ? U : T;
interface BaseOptions {
    /**
     * Call this listener asynchronously.
     */
    async?: boolean | number | null;
}
export interface ListenerOptions extends BaseOptions {
    /**
     * Call handler this number of times; 0 for unlimited
     * @default 0
     */
    limit?: number;
    /**
     * True to prepend to the list of listeners
     * @default false
     */
    first?: boolean;
    /**
     * True to always run this listener before others
     * @default false
     */
    alwaysFirst?: boolean;
    /**
     * True to always run this listener after others
     * @default false
     */
    alwaysLast?: boolean;
    /**
     * Start calling listener after this number of calls. Starts from 1
     * @default 1
     */
    start?: number;
    /**
     * Listener's context (this) object
     */
    context?: object | null;
    /**
     * Listener tags
     */
    tags?: string[];
    /**
     * You can pass any additional fields here. They will be passed back to TriggerFilter
     */
    extraData?: any;
}
interface ListenerPrototype<Handler extends BaseHandler> extends Required<ListenerOptions> {
    handler: Handler;
    called: number;
    count: number;
    index: number;
    start: number;
}
export interface EventOptions<ListenerSignature extends BaseHandler> extends BaseOptions {
    /**
     * Call this event this number of times; 0 for unlimited
     * @default 0
     */
    limit?: number | null;
    /**
     * Trigger newly added listeners automatically this last trigger arguments
     * @default false
     */
    autoTrigger?: boolean | null;
    /**
     * A function that decides whether event should trigger a listener this time
     */
    filter?: ((args: any[], listener: ListenerPrototype<ListenerSignature>) => boolean) | null;
    /**
     * TriggerFilter's this object, if needed
     */
    filterContext?: object | null;
    /**
     * Maximum number of listeners to add
     * @default 0
     */
    maxListeners?: number;
}
export type EventDefinitionHelper<ListenerSignature extends BaseHandler = BaseHandler> = {
    signature: ListenerSignature;
    arguments: Parameters<ListenerSignature>;
    returnType: ReturnType<ListenerSignature>;
    options: EventOptions<ListenerSignature>;
    errorListenerSignature: ErrorListenerSignature<Parameters<ListenerSignature>>;
};
export declare function createEvent<ListenerSignature extends BaseHandler>(eventOptions?: EventOptions<ListenerSignature>): ApiType<EventDefinitionHelper<ListenerSignature>, {
    readonly addListener: (handler: ListenerSignature, listenerOptions?: ListenerOptions) => void;
    /** @alias addListener */
    readonly on: (handler: ListenerSignature, listenerOptions?: ListenerOptions) => void;
    /** @alias addListener */
    readonly listen: (handler: ListenerSignature, listenerOptions?: ListenerOptions) => void;
    /** @alias addListener */
    readonly subscribe: (handler: ListenerSignature, listenerOptions?: ListenerOptions) => void;
    readonly removeListener: (handler: ListenerSignature, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly un: (handler: ListenerSignature, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly off: (handler: ListenerSignature, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly remove: (handler: ListenerSignature, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly unsubscribe: (handler: ListenerSignature, context?: object | null, tag?: string | null) => boolean;
    readonly trigger: (...args: Parameters<ListenerSignature>) => void;
    /** @alias trigger */
    readonly emit: (...args: Parameters<ListenerSignature>) => void;
    /** @alias trigger */
    readonly dispatch: (...args: Parameters<ListenerSignature>) => void;
    readonly hasListener: (handler?: ListenerSignature | null, context?: object | null, tag?: string | null) => boolean;
    /** @alias hasListener */
    readonly has: (handler?: ListenerSignature | null, context?: object | null, tag?: string | null) => boolean;
    readonly removeAllListeners: (tag?: string) => void;
    readonly addErrorListener: (handler: ErrorListenerSignature<Parameters<ListenerSignature>>, context?: object | null) => void;
    readonly removeErrorListener: (handler: ErrorListenerSignature<Parameters<ListenerSignature>>, context?: object | null) => boolean;
    readonly suspend: (withQueue?: boolean) => void;
    readonly resume: () => void;
    readonly setOptions: (eventOptions: Pick<EventOptions<ListenerSignature>, "async" | "limit" | "autoTrigger">) => void;
    readonly reset: () => void;
    readonly isSuspended: () => boolean;
    readonly isQueued: () => boolean;
    readonly withTags: <T extends (...args: any[]) => any>(tags: string[], callback: T) => ReturnType<T>;
    readonly promise: (options?: ListenerOptions) => Promise<Parameters<ListenerSignature>>;
    readonly first: (...args: Parameters<ListenerSignature>) => ReturnType<ListenerSignature> | undefined;
    readonly resolveFirst: (...args: Parameters<ListenerSignature>) => Promise<Awaited<ReturnType<ListenerSignature>> | undefined>;
    readonly all: (...args: Parameters<ListenerSignature>) => ReturnType<ListenerSignature>[];
    readonly resolveAll: (...args: Parameters<ListenerSignature>) => Promise<Awaited<ReturnType<ListenerSignature>>[]>;
    readonly resolve: (...args: Parameters<ListenerSignature>) => Promise<Awaited<ReturnType<ListenerSignature>>[]>;
    readonly last: (...args: Parameters<ListenerSignature>) => ReturnType<ListenerSignature> | undefined;
    readonly resolveLast: (...args: Parameters<ListenerSignature>) => Promise<Awaited<ReturnType<ListenerSignature>> | undefined>;
    readonly merge: (...args: Parameters<ListenerSignature>) => ReturnType<ListenerSignature> | undefined;
    readonly resolveMerge: (...args: Parameters<ListenerSignature>) => Promise<Awaited<ReturnType<ListenerSignature>> | undefined>;
    readonly concat: (...args: Parameters<ListenerSignature>) => Unarray<ReturnType<ListenerSignature>>[];
    readonly resolveConcat: (...args: Parameters<ListenerSignature>) => Promise<Unarray<Awaited<ReturnType<ListenerSignature>>>[]>;
    readonly firstNonEmpty: (...args: Parameters<ListenerSignature>) => ReturnType<ListenerSignature> | undefined;
    readonly resolveFirstNonEmpty: (...args: Parameters<ListenerSignature>) => Promise<Awaited<ReturnType<ListenerSignature>> | undefined>;
    readonly untilTrue: (...args: Parameters<ListenerSignature>) => void;
    readonly untilFalse: (...args: Parameters<ListenerSignature>) => void;
    readonly pipe: (...args: Parameters<ListenerSignature>) => ReturnType<ListenerSignature> | undefined;
    readonly resolvePipe: (...args: Parameters<ListenerSignature>) => Promise<Awaited<ReturnType<ListenerSignature>> | undefined>;
    readonly raw: (...args: Parameters<ListenerSignature>) => Unarray<ReturnType<ListenerSignature>>[];
}>;
export type BaseEventDefinition = EventDefinitionHelper<BaseHandler>;
export type BaseEvent = ReturnType<typeof createEvent<BaseHandler>>;
export {};
