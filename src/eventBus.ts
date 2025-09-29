import { createEvent } from "./event";
import type {
    EventDefinitionHelper,
    EventOptions,
    ListenerOptions,
} from "./event";
import {
    ApiType,
    BaseHandler,
    ErrorListenerSignature,
    KeyOf,
    MapKey,
    ProxyType,
    TriggerReturnType,
} from "./lib/types";

type InterceptorFunction = (
    name: MapKey,
    args: any[],
    tags: string[] | null,
    returnType: TriggerReturnType | null,
) => boolean;

type RelaySource = {
    on: (
        name: any,
        fn: (...args: any[]) => any,
        options?: ListenerOptions,
    ) => void;
    addAllEventsListener: (
        fn: (name: any, args: any[]) => any,
        options?: ListenerOptions,
    ) => void;
    un: (
        name: any,
        fn: (...args: any[]) => any,
        context?: object | null,
        tag?: string | null,
    ) => void;
    removeAllEventsListener: (
        fn: (name: any, args: any[]) => any,
        context?: object | null,
        tag?: string | null,
    ) => void;
};

export type EventSourceSubscriber = (
    name: MapKey,
    fn: BaseHandler,
    eventSource: EventSource,
    options?: ListenerOptions,
) => void;

export type EventSourceUnsubscriber = (
    name: MapKey,
    fn: BaseHandler,
    eventSource: EventSource,
    tag?: string | null,
) => void;

export type EventSource<
    On extends BaseHandler = EventSourceSubscriber,
    Un extends BaseHandler = EventSourceUnsubscriber,
> = {
    name: MapKey;
    on: On;
    un: Un;
    accepts: ((name: MapKey) => boolean) | boolean;
    proxyType?: ProxyType;
    [key: string]: any;
};

type ProxyListener = {
    localEventName: any; // had to set to any to avoid type errors when extending
    remoteEventName: MapKey;
    localEventNamePrefix: string | null;
    returnType: TriggerReturnType | null;
    resolve: boolean;
    listener: (...args: any[]) => any;
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
    [key in KeyOf<EventDefinitionsMap>]: EventDefinitionHelper<
        EventDefinitionsMap[key]
    >;
};

type GetEventTypesMap<
    EventDefinitionsMap extends BaseEventMap,
> = {
    [key in KeyOf<EventDefinitionsMap>]: ReturnType<
        typeof createEvent<
            EventDefinitionsMap[key]
        >
    >;
};

export type EventBusDefinitionHelper<
    EventsMap extends BaseEventMap = BaseEventMap,
> = {
    eventSignatures: EventsMap;
    events: GetEventsMap<EventsMap>;
    eventTypes: GetEventTypesMap<EventsMap>;
};

function proxyReturnTypeToTriggerReturnType(proxyType: ProxyType) {
    switch (proxyType) {
        case ProxyType.TRIGGER:
            return { returnType: null, resolve: false };
        case ProxyType.RAW:
            return { returnType: TriggerReturnType.RAW, resolve: false };
        case ProxyType.ALL:
            return { returnType: TriggerReturnType.ALL, resolve: false };
        case ProxyType.CONCAT:
            return { returnType: TriggerReturnType.CONCAT, resolve: false };
        case ProxyType.MERGE:
            return { returnType: TriggerReturnType.MERGE, resolve: false };
        case ProxyType.LAST:
            return { returnType: TriggerReturnType.LAST, resolve: false };
        case ProxyType.PIPE:
            return { returnType: TriggerReturnType.PIPE, resolve: false };
        case ProxyType.FIRST:
            return { returnType: TriggerReturnType.FIRST, resolve: false };
        case ProxyType.UNTIL_TRUE:
            return { returnType: TriggerReturnType.UNTIL_TRUE, resolve: false };
        case ProxyType.UNTIL_FALSE:
            return {
                returnType: TriggerReturnType.UNTIL_FALSE,
                resolve: false,
            };
        case ProxyType.FIRST_NON_EMPTY:
            return {
                returnType: TriggerReturnType.FIRST_NON_EMPTY,
                resolve: false,
            };
        case ProxyType.RESOLVE_ALL:
            return {
                returnType: TriggerReturnType.ALL,
                resolve: true,
            };
        case ProxyType.RESOLVE_MERGE:
            return {
                returnType: TriggerReturnType.MERGE,
                resolve: true,
            };
        case ProxyType.RESOLVE_CONCAT:
            return {
                returnType: TriggerReturnType.CONCAT,
                resolve: true,
            };
        case ProxyType.RESOLVE_FIRST:
            return {
                returnType: TriggerReturnType.FIRST,
                resolve: true,
            };
        case ProxyType.RESOLVE_FIRST_NON_EMPTY:
            return {
                returnType: TriggerReturnType.FIRST_NON_EMPTY,
                resolve: true,
            };
        case ProxyType.RESOLVE_LAST:
            return {
                returnType: TriggerReturnType.LAST,
                resolve: true,
            };
        case ProxyType.RESOLVE_PIPE:
            return {
                returnType: TriggerReturnType.PIPE,
                resolve: true,
            };
        default:
            return { returnType: null, resolve: false };
    }
}

export function createEventBus<
    EventsMap extends BaseEventMap = DefaultEventMap,
>(eventBusOptions?: EventBusOptions<EventsMap>) {
    type EventBus = EventBusDefinitionHelper<
        EventsMap
    >;
    type Events = EventBus["events"];
    type EventTypes = EventBus["eventTypes"];

    const events = new Map<KeyOf<Events>, any>();
    let currentTagsFilter: string[] | null = null;
    let interceptor: InterceptorFunction | null = null;
    const proxyListeners: ProxyListener[] = [];
    const eventSources: {
        eventSource: EventSource;
        subscribed: MapKey[];
    }[] = [];

    const asterisk = createEvent<
        (name: MapKey, args: any[], tags: string[] | null) => void
    >();

    const errorEvent = createEvent<ErrorListenerSignature<any[]>>();

    const _getProxyListener = ({
        remoteEventName,
        localEventName,
        returnType,
        resolve,
        localEventNamePrefix,
    }: Omit<ProxyListener, "listener">) => {
        let listener = proxyListeners.find(
            (listener) =>
                listener.returnType === returnType
                && listener.resolve === resolve
                && listener.localEventName === localEventName
                && listener.remoteEventName === remoteEventName
                && listener.localEventNamePrefix === localEventNamePrefix,
        );
        if (!listener) {
            listener = {
                localEventName,
                remoteEventName,
                localEventNamePrefix,
                returnType,
                resolve,
                listener: remoteEventName === "*"
                    ? (eventName: MapKey, args: any[]) => {
                        const name = localEventName
                            ? localEventName
                            : localEventNamePrefix
                            ? `${localEventNamePrefix}${eventName as string}`
                            : eventName;
                        return _trigger(
                            name,
                            // @ts-expect-error
                            args,
                            returnType,
                            resolve,
                        );
                    }
                    : (...args: any[]) => {
                        const name = localEventName
                            ? localEventName
                            : localEventNamePrefix
                            ? `${localEventNamePrefix}${remoteEventName as string}`
                            : remoteEventName;
                        return _trigger(
                            name,
                            // @ts-expect-error
                            args,
                            returnType,
                            resolve,
                        );
                    },
            };
            proxyListeners.push(listener);
        }
        return listener;
    };

    const add = (name: MapKey, options?: EventOptions<BaseHandler>) => {
        if (!events.has(name)) {
            events.set(name, createEvent(options));
        }
    };

    const _getOrAddEvent = <K extends KeyOf<Events>>(name: K) => {
        if (!events.has(name)) {
            events.set(
                name,
                createEvent(eventBusOptions?.eventOptions?.[name]),
            );
        }
        return events.get(name) as EventTypes[K];
    };

    const intercept = (fn: InterceptorFunction) => {
        interceptor = fn;
    };

    const stopIntercepting = () => {
        interceptor = null;
    };

    const isIntercepting = () => {
        return interceptor !== null;
    };

    const get = <K extends KeyOf<Events>>(name: K) => {
        return _getOrAddEvent(name);
    };

    const on = <
        K extends KeyOf<Events>,
        H extends Events[K]["signature"],
    >(
        name: K,
        handler: H,
        options?: ListenerOptions,
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        eventSources.forEach((evs) => {
            name;
            if (
                evs.eventSource.accepts === false
                || (typeof evs.eventSource.accepts === "function"
                    && !evs.eventSource.accepts(name))
            ) {
                return;
            }
            if (evs.subscribed.indexOf(name) === -1) {
                const { returnType, resolve } =
                    proxyReturnTypeToTriggerReturnType(
                        evs.eventSource.proxyType || ProxyType.TRIGGER,
                    );
                const listener = _getProxyListener({
                    localEventName: null,
                    remoteEventName: name,
                    returnType,
                    resolve,
                    localEventNamePrefix: null,
                });
                evs.eventSource.on(
                    name,
                    listener.listener,
                    evs.eventSource,
                    options,
                );
                evs.subscribed.push(name);
            }
        });
        return e.addListener(handler as any, options);
    };

    const once = <
        K extends KeyOf<Events>,
        H extends Events[K]["signature"],
    >(
        name: K,
        handler: H,
        options?: ListenerOptions,
    ) => {
        options = options || {};
        options.limit = 1;
        return on(name, handler, options);
    };

    const promise = <K extends KeyOf<Events>>(
        name: K,
        options?: ListenerOptions,
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return e.promise(options) as Promise<Events[K]["arguments"]>;
    };

    const un = <
        K extends KeyOf<Events>,
        H extends Events[K]["signature"],
    >(
        name: K,
        handler: H,
        context?: object | null,
        tag?: string | null,
    ) => {
        const e: EventTypes[K] = events.get(name);
        if (e) {
            e.removeListener(handler as any, context, tag);
        }
        if (eventSources.length > 0) {
            const isEmpty = !e.hasListener();
            eventSources.forEach((evs) => {
                const inx = evs.subscribed.indexOf(name);
                if (inx !== -1) {
                    evs.subscribed.splice(inx, 1);
                    if (isEmpty) {
                        const { returnType, resolve } =
                            proxyReturnTypeToTriggerReturnType(
                                evs.eventSource.proxyType || ProxyType.TRIGGER,
                            );
                        const listener = _getProxyListener({
                            localEventName: null,
                            remoteEventName: name,
                            returnType,
                            resolve,
                            localEventNamePrefix: null,
                        });
                        evs.eventSource.un(
                            name,
                            listener.listener,
                            evs.eventSource,
                            tag,
                        );
                    }
                }
            });
        }
    };

    const _trigger = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        args: A,
        returnType?: TriggerReturnType | null,
        resolve?: boolean,
    ) => {
        if (name === "*") {
            return;
        }
        if (interceptor) {
            const result = interceptor(
                name,
                args,
                currentTagsFilter,
                returnType || null,
            );
            if (result === false) {
                return;
            }
        }
        const e: EventTypes[K] = _getOrAddEvent(name);
        const runner = () => {
            let result;
            switch (returnType) {
                case TriggerReturnType.RAW:
                    result = e.raw(...args);
                    break;
                case TriggerReturnType.ALL:
                    result = resolve ? e.resolveAll(...args) : e.all(...args);
                    break;
                case TriggerReturnType.CONCAT:
                    result = resolve
                        ? e.resolveConcat(...args)
                        : e.concat(...args);
                    break;
                case TriggerReturnType.MERGE:
                    result = resolve
                        ? e.resolveMerge(...args)
                        : e.merge(...args);
                    break;
                case TriggerReturnType.LAST:
                    result = resolve ? e.resolveLast(...args) : e.last(...args);
                    break;
                case TriggerReturnType.PIPE:
                    result = resolve ? e.resolvePipe(...args) : e.pipe(...args);
                    break;
                case TriggerReturnType.FIRST:
                    result = resolve
                        ? e.resolveFirst(...args)
                        : e.first(...args);
                    break;
                case TriggerReturnType.UNTIL_TRUE:
                    result = e.untilTrue(...args);
                    break;
                case TriggerReturnType.UNTIL_FALSE:
                    result = e.untilFalse(...args);
                    break;
                case TriggerReturnType.FIRST_NON_EMPTY:
                    result = resolve
                        ? e.resolveFirstNonEmpty(...args)
                        : e.firstNonEmpty(...args);
                    break;
                default:
                    e.trigger(...args);
            }
            return result;
        };
        try {
            let result;
            if (currentTagsFilter) {
                result = e.withTags(currentTagsFilter, runner);
            }
            else {
                result = runner();
            }

            asterisk.trigger(name, args, currentTagsFilter);
            return result;
        }
        catch (error) {
            errorEvent.trigger({
                name,
                error: error instanceof Error
                    ? error
                    : new Error(String(error)),
                args,
                type: "event",
            });
            if (errorEvent.hasListener()) {
                return undefined;
            }
            throw error;
        }
    };

    const trigger = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        return _trigger(name, args, null, false) as void;
    };

    const first = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.FIRST,
            false,
        ) as ReturnType<typeof e.first>;
    };

    const resolveFirst = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.FIRST,
            true,
        ) as ReturnType<typeof e.resolveFirst>;
    };

    const all = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(name, args, TriggerReturnType.ALL, false) as ReturnType<
            typeof e.all
        >;
    };

    const resolveAll = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.ALL,
            true,
        ) as ReturnType<typeof e.resolveAll>;
    };

    const last = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.LAST,
            false,
        ) as ReturnType<typeof e.last>;
    };

    const resolveLast = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.LAST,
            true,
        ) as ReturnType<typeof e.resolveLast>;
    };

    const merge = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.MERGE,
            false,
        ) as ReturnType<typeof e.merge>;
    };

    const resolveMerge = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.MERGE,
            true,
        ) as ReturnType<typeof e.resolveMerge>;
    };

    const concat = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.CONCAT,
            false,
        ) as ReturnType<typeof e.concat>;
    };

    const resolveConcat = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.CONCAT,
            true,
        ) as ReturnType<typeof e.resolveConcat>;
    };

    const firstNonEmpty = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.FIRST_NON_EMPTY,
            false,
        ) as ReturnType<typeof e.firstNonEmpty>;
    };

    const resolveFirstNonEmpty = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.FIRST_NON_EMPTY,
            true,
        ) as ReturnType<typeof e.resolveFirstNonEmpty>;
    };

    const untilTrue = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.UNTIL_TRUE,
            false,
        ) as ReturnType<typeof e.untilTrue>;
    };

    const untilFalse = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.UNTIL_FALSE,
            false,
        ) as ReturnType<typeof e.untilFalse>;
    };

    const pipe = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.PIPE,
            false,
        ) as ReturnType<typeof e.pipe>;
    };

    const resolvePipe = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.PIPE,
            true,
        ) as ReturnType<typeof e.resolvePipe>;
    };

    const raw = <
        K extends KeyOf<Events>,
        A extends Events[K]["arguments"],
    >(
        name: K,
        ...args: A
    ) => {
        const e: EventTypes[K] = _getOrAddEvent(name);
        return _trigger(
            name,
            args,
            TriggerReturnType.RAW,
            false,
        ) as ReturnType<typeof e.raw>;
    };

    const withTags = <T extends (...args: any[]) => any>(
        tags: string[],
        callback: T,
    ) => {
        type R = ReturnType<T>;
        currentTagsFilter = tags;
        const result = callback();
        currentTagsFilter = null;
        return result as R;
    };

    const reset = () => {
        if (eventSources.length > 0) {
            eventSources.forEach((evs) => {
                removeEventSource(evs.eventSource);
            });
        }
        events.clear();
        interceptor = null;
        currentTagsFilter = null;
        asterisk.reset();
        proxyListeners.length = 0;
        eventSources.length = 0;
    };

    const suspendAll = (withQueue: boolean = false) => {
        for (const name in events) {
            events.get(name).suspend(withQueue);
        }
    };

    const resumeAll = () => {
        for (const name in events) {
            events.get(name).resume();
        }
    };

    const relay = ({
        eventSource,
        remoteEventName,
        localEventName,
        proxyType,
        localEventNamePrefix,
    }: {
        eventSource: RelaySource;
        remoteEventName: MapKey;
        localEventName?: any;
        proxyType?: ProxyType;
        localEventNamePrefix?: string | null;
    }) => {
        const { returnType, resolve } = proxyReturnTypeToTriggerReturnType(
            proxyType || ProxyType.TRIGGER,
        );
        const listener = _getProxyListener(
            {
                localEventName: localEventName || null,
                remoteEventName,
                returnType,
                resolve,
                localEventNamePrefix: localEventNamePrefix || null,
            },
        );
        if (remoteEventName === "*") {
            eventSource.addAllEventsListener(listener.listener);
        }
        else {
            eventSource.on(remoteEventName, listener.listener);
        }
    };

    const unrelay = ({
        eventSource,
        remoteEventName,
        localEventName,
        proxyType,
        localEventNamePrefix,
    }: {
        eventSource: RelaySource;
        remoteEventName: MapKey;
        localEventName?: any;
        proxyType?: ProxyType;
        localEventNamePrefix?: string | null;
    }) => {
        const { returnType, resolve } = proxyReturnTypeToTriggerReturnType(
            proxyType || ProxyType.TRIGGER,
        );
        const listener = _getProxyListener(
            {
                localEventName: localEventName || null,
                remoteEventName,
                returnType,
                resolve,
                localEventNamePrefix: localEventNamePrefix || null,
            },
        );
        if (listener) {
            if (remoteEventName === "*") {
                eventSource.removeAllEventsListener(listener.listener);
            }
            else {
                eventSource.un(remoteEventName, listener.listener);
            }
        }
    };

    const addEventSource = (eventSource: EventSource) => {
        if (
            eventSources.find((evs) =>
                evs.eventSource.name === eventSource.name
            )
        ) {
            return;
        }
        eventSources.push({
            eventSource,
            subscribed: [],
        });
    };

    const removeEventSource = (eventSource: EventSource | MapKey) => {
        const inx = eventSources.findIndex((evs) =>
            typeof eventSource === "string"
                || typeof eventSource === "symbol"
                ? evs.eventSource.name === eventSource
                : evs.eventSource.name === eventSource.name
        );
        if (inx !== -1) {
            const evs = eventSources[inx];
            evs.subscribed.forEach((name: MapKey) => {
                const { returnType, resolve } =
                    proxyReturnTypeToTriggerReturnType(
                        evs.eventSource.proxyType || ProxyType.TRIGGER,
                    );
                const listener = _getProxyListener({
                    localEventName: null,
                    remoteEventName: name,
                    returnType,
                    resolve,
                    localEventNamePrefix: null,
                });
                evs.eventSource.un(name, listener.listener, evs.eventSource);
            });
            eventSources.splice(inx, 1);
        }
    };

    const api = {
        addListener: on,
        /** @alias addListener */
        on,
        /** @alias addListener */
        listen: on,
        /** @alias addListener */
        subscribe: on,
        once,
        promise,
        removeListener: un,
        /** @alias removeListener */
        un,
        /** @alias removeListener */
        off: un,
        /** @alias removeListener */
        remove: un,
        /** @alias removeListener */
        unsubscribe: un,
        trigger,
        /** @alias trigger */
        emit: trigger,
        /** @alias trigger */
        dispatch: trigger,
        get,
        add,
        first,
        resolveFirst,
        all,
        resolveAll,
        resolve: resolveAll,
        last,
        resolveLast,
        merge,
        resolveMerge,
        concat,
        resolveConcat,
        firstNonEmpty,
        resolveFirstNonEmpty,
        untilTrue,
        untilFalse,
        pipe,
        resolvePipe,
        raw,
        withTags,
        intercept,
        stopIntercepting,
        isIntercepting,
        reset,
        suspendAll,
        resumeAll,
        relay,
        unrelay,
        addEventSource,
        removeEventSource,
        addAllEventsListener: asterisk.addListener,
        removeAllEventsListener: asterisk.removeListener,
        addErrorListener: errorEvent.addListener,
        removeErrorListener: errorEvent.removeListener,
    } as const;

    return api as ApiType<EventBus, typeof api>;
}

export type BaseEventBusDefinition = EventBusDefinitionHelper<BaseEventMap>;
export type BaseEventBus = ReturnType<typeof createEventBus<BaseEventMap>>;
