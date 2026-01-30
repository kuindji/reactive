import asyncCall from "./lib/asyncCall";
import listenerSorter from "./lib/listenerSorter";
import tagsIntersect from "./lib/tagsIntersect";
import type { ApiType, BaseHandler, ErrorListenerSignature } from "./lib/types";
import { TriggerReturnType } from "./lib/types";

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

interface ListenerPrototype<Handler extends BaseHandler>
    extends Required<ListenerOptions>
{
    handler: Handler;
    called: number;
    count: number;
    index: number;
    start: number;
}

interface ErrorListenerPrototype<Handler extends BaseHandler> {
    handler: Handler;
    context?: object | null;
}

export interface EventOptions<
    ListenerSignature extends BaseHandler,
> extends BaseOptions {
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
    filter?:
        | ((
            args: any[],
            listener: ListenerPrototype<ListenerSignature>,
        ) => boolean)
        | null;
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

export type EventDefinitionHelper<
    ListenerSignature extends BaseHandler = BaseHandler,
> = {
    signature: ListenerSignature;
    arguments: Parameters<ListenerSignature>;
    returnType: ReturnType<ListenerSignature>;
    options: EventOptions<ListenerSignature>;
    errorListenerSignature: ErrorListenerSignature<
        Parameters<ListenerSignature>
    >;
};

export function createEvent<
    ListenerSignature extends BaseHandler,
>(eventOptions: EventOptions<ListenerSignature> = {}) {
    type Event = EventDefinitionHelper<ListenerSignature>;
    type Listener = ListenerPrototype<ListenerSignature>;
    type ErrorListener = ErrorListenerPrototype<
        ErrorListenerSignature<Parameters<ListenerSignature>>
    >;

    let listeners: Listener[] = [];
    const errorListeners: ErrorListener[] = [];
    let queue: Array<[ Event["arguments"], TriggerReturnType | null ]> = [];
    let suspended: boolean = false;
    let queued: boolean = false;
    let triggered: number = 0;
    let lastTrigger: Event["arguments"] | null = null;
    let sortListeners: boolean = false;
    let currentTagsFilter: string[] | null = null;

    const options: Event["options"] = {
        async: null,
        limit: null,
        autoTrigger: null,
        filter: null,
        filterContext: null,
        maxListeners: 0,
        ...eventOptions,
    };

    const addListener = (
        handler: Event["signature"],
        listenerOptions: ListenerOptions = {} as ListenerOptions,
    ) => {
        if (!handler) {
            return;
        }

        if (
            listeners.find((l) =>
                l.handler === handler && l.context === listenerOptions.context
            )
        ) {
            return;
        }

        if (options.maxListeners && listeners.length >= options.maxListeners) {
            throw new Error(`Max listeners (${options.maxListeners}) reached`);
        }

        const listener: Listener = {
            handler,
            called: 0,
            count: 0,
            index: listeners.length,
            start: 1,
            context: null,
            tags: [],
            extraData: null,
            first: false,
            alwaysFirst: false,
            alwaysLast: false,
            limit: 0,
            async: null,
            ...listenerOptions,
        } as const;

        if (listener.async === true) {
            listener.async = 1;
        }
        if (
            listenerOptions.first === true
            || listenerOptions.alwaysFirst === true
        ) {
            listeners.unshift(listener);
        }
        else {
            listeners.push(listener);
        }
        if (sortListeners) {
            listeners.forEach((l, inx: number) => {
                l.index = inx;
            });
            listeners.sort((l1, l2) => listenerSorter<Listener>(l1, l2));
        }
        if (
            listenerOptions?.alwaysFirst === true
            || listenerOptions?.alwaysLast === true
        ) {
            sortListeners = true;
        }

        if (
            options.autoTrigger
            && lastTrigger !== null
            && !suspended
        ) {
            const prevFilter = options.filter;
            options.filter = (
                args: any[],
                l: Listener,
            ) => {
                if (l && l.handler === handler) {
                    return prevFilter ? prevFilter(args, l) !== false : true;
                }
                return false;
            };
            _trigger(lastTrigger);
            options.filter = prevFilter;
        }
    };

    const removeListener = (
        handler: Event["signature"],
        context?: object | null,
        tag?: string | null,
    ) => {
        const inx = listeners.findIndex((l) => {
            if (l.handler !== handler) {
                return false;
            }
            if (!!l.context !== !!context) {
                return false;
            }
            if (!!context && l.context !== context) {
                return false;
            }
            if (!!tag && (!l.tags || l.tags.indexOf(tag) === -1)) {
                return false;
            }
            return true;
        });

        if (inx === -1) {
            return false;
        }

        listeners.splice(inx, 1);
        return true;
    };

    const hasListener = (
        handler?: Event["signature"] | null,
        context?: object | null,
        tag?: string | null,
    ) => {
        if (handler) {
            return (
                listeners.findIndex((l) => {
                    if (l.handler !== handler) {
                        return false;
                    }
                    if (context && l.context !== context) {
                        return false;
                    }
                    if (tag && (!l.tags || l.tags.indexOf(tag) === -1)) {
                        return false;
                    }
                    return true;
                }) !== -1
            );
        }
        if (tag) {
            return (
                listeners.findIndex(
                    (l) => l.tags && l.tags.indexOf(tag) !== -1,
                ) !== -1
            );
        }
        else {
            return listeners.length > 0;
        }
    };

    const removeAllListeners = (tag?: string) => {
        if (tag) {
            listeners = listeners.filter((l) => {
                return !l.tags || l.tags.indexOf(tag) === -1;
            });
        }
        else {
            listeners = [];
        }
    };

    const addErrorListener = (
        handler: ErrorListenerSignature<Parameters<ListenerSignature>>,
        context?: object | null,
    ) => {
        if (
            errorListeners.find((l) =>
                l.handler === handler && l.context === context
            )
        ) {
            return;
        }
        errorListeners.push({ handler, context });
    };

    const removeErrorListener = (
        handler: ErrorListenerSignature<Parameters<ListenerSignature>>,
        context?: object | null,
    ) => {
        const inx = errorListeners.findIndex((l) =>
            l.handler === handler && l.context === context
        );
        if (inx === -1) {
            return false;
        }
        errorListeners.splice(inx, 1);
        return true;
    };

    const suspend = (withQueue: boolean = false) => {
        suspended = true;
        if (withQueue) {
            queued = true;
        }
    };

    const resume = () => {
        suspended = false;
        queued = false;

        if (queue.length > 0) {
            for (let i = 0, l = queue.length; i < l; i++) {
                _trigger(queue[i][0], queue[i][1]);
            }
            queue = [];
        }
    };

    const setOptions = (
        eventOptions: Pick<Event["options"], "async" | "limit" | "autoTrigger">,
    ) => {
        Object.assign(options, eventOptions);
    };

    const isSuspended = () => suspended;
    const isQueued = () => queued;

    const reset = () => {
        listeners.length = 0;
        errorListeners.length = 0;
        queue.length = 0;
        suspended = false;
        queued = false;
        triggered = 0;
        lastTrigger = null;
        sortListeners = false;
    };

    const _listenerCall = (
        listener: Listener,
        args: Event["arguments"],
        resolve: null | ((any: Event["returnType"]) => void) = null,
    ) => {
        let isAsync: boolean | number | null | undefined = listener.async;
        if (isAsync === null || isAsync === undefined) {
            isAsync = options.async;
        }
        if (isAsync === true) {
            isAsync = 1;
        }
        if (isAsync === null || isAsync === undefined) {
            isAsync = false;
        }

        try {
            const result = isAsync !== false
                ? asyncCall<
                    Event["arguments"],
                    Event["returnType"]
                >(
                    listener.handler,
                    listener.context,
                    args,
                    isAsync,
                )
                : listener.handler.bind(listener.context)(...args);

            if (resolve !== null) {
                if (result instanceof Promise) {
                    void result.then(resolve).catch((error) => {
                        for (const errorListener of errorListeners) {
                            errorListener.handler({
                                error: error instanceof Error
                                    ? error
                                    : new Error(error as string),
                                args: args,
                                type: "event",
                            });
                        }
                        if (errorListeners.length === 0) {
                            throw error;
                        }
                    });
                }
                else {
                    resolve(result);
                }
            }

            return result;
        }
        catch (error) {
            for (const errorListener of errorListeners) {
                errorListener.handler({
                    error: error instanceof Error
                        ? error
                        : new Error(error as string),
                    args: args,
                    type: "event",
                });
            }
            if (errorListeners.length === 0) {
                throw error;
            }
            return undefined;
        }
    };

    const _listenerCallWPrev = (
        listener: Listener,
        args: Event["arguments"],
        prevValue: Event["returnType"] | boolean,
        returnType: TriggerReturnType,
    ):
        | Event["returnType"]
        | Promise<Event["returnType"]>
        | boolean =>
    {
        if (returnType === TriggerReturnType.PIPE) {
            args[0] = prevValue;
            // since we don't user listener's arg transformer,
            // we don't need to prepare args
            // args = _prepareListenerArgs(args);
            return _listenerCall(listener, args);
        }
        else if (
            returnType === TriggerReturnType.UNTIL_TRUE
            && prevValue === true
        ) {
            return true;
        }
        else if (
            returnType === TriggerReturnType.UNTIL_FALSE
            && prevValue === false
        ) {
            return false;
        }
        else if (
            returnType === TriggerReturnType.FIRST_NON_EMPTY
            && prevValue !== null
            && prevValue !== undefined
        ) {
            return prevValue;
        }
        return _listenerCall(listener, args);
    };

    const _trigger = (
        args: Event["arguments"],
        returnType: TriggerReturnType | null = null,
        tags?: string[] | null,
    ) => {
        if (queued) {
            queue.push([ args, returnType ]);
            return;
        }
        if (suspended) {
            return;
        }
        if (options.limit && triggered >= options.limit) {
            return;
        }
        triggered++;

        if (options.autoTrigger) {
            lastTrigger = args.slice() as Event["arguments"];
        }

        // in pipe mode if there is no listeners,
        // we just return piped value
        if (listeners.length === 0) {
            if (returnType === TriggerReturnType.PIPE) {
                return args.length > 0 ? args[0] : undefined;
            }
            else if (
                returnType === TriggerReturnType.ALL
                || returnType === TriggerReturnType.CONCAT
                || returnType === TriggerReturnType.RAW
            ) {
                return [] as Event["returnType"][];
            }
            else if (returnType === TriggerReturnType.MERGE) {
                return {} as Partial<Event["returnType"]>;
            }
            return;
        }

        type ListenerResult =
            | Event["returnType"]
            | Promise<Event["returnType"]>
            | boolean
            | Promise<boolean>;

        const listenersQueue: Listener[] = listeners.slice();
        const isConsequent = returnType === TriggerReturnType.PIPE
            || returnType === TriggerReturnType.UNTIL_TRUE
            || returnType === TriggerReturnType.UNTIL_FALSE
            || returnType === TriggerReturnType.FIRST_NON_EMPTY;

        let listener: Listener | undefined;
        let listenerResult: ListenerResult;
        const results: ListenerResult[] = [];
        let hasPromises = false;

        while ((listener = listenersQueue.shift())) {
            if (!listener) {
                continue;
            }

            if (
                options.filter
                && options.filter.call(options.filterContext, args, listener)
                    === false
            ) {
                continue;
            }

            if (
                tags
                && tags.length > 0
                && (!listener.tags || !tagsIntersect(tags, listener.tags))
            ) {
                continue;
            }

            if (
                currentTagsFilter !== null
                && currentTagsFilter.length > 0
                && !tagsIntersect(currentTagsFilter, listener.tags)
            ) {
                continue;
            }

            listener.count++;

            if (
                listener.start !== undefined
                && listener.start !== null
                && listener.count < listener.start
            ) {
                continue;
            }

            if (isConsequent && results.length > 0) {
                const prev = results[results.length - 1];
                if (hasPromises) {
                    const prevPromise = prev instanceof Promise
                        ? prev
                        : Promise.resolve(prev);

                    listenerResult = prevPromise.then(
                        (
                            (
                                listener: Listener,
                                args: Event["arguments"],
                                returnType: TriggerReturnType,
                            ) =>
                            (value: Event["returnType"] | boolean) => {
                                return _listenerCallWPrev(
                                    listener,
                                    args,
                                    value,
                                    returnType,
                                );
                            }
                        )(listener, args, returnType),
                    ) as
                        | Promise<Event["returnType"]>
                        | Promise<boolean>;
                }
                else {
                    listenerResult = _listenerCallWPrev(
                        listener,
                        args,
                        // no promises here
                        prev as Event["returnType"] | boolean,
                        returnType,
                    );
                }
            }
            else {
                listenerResult = _listenerCall(listener, args);
            }

            listener.called++;

            if (listener.called === listener.limit) {
                removeListener(listener.handler, listener.context);
            }

            if (returnType === TriggerReturnType.FIRST) {
                return listenerResult;
            }

            if (isConsequent) {
                switch (returnType) {
                    case TriggerReturnType.UNTIL_TRUE: {
                        if (listenerResult === true) {
                            return true;
                        }
                        break;
                    }
                    case TriggerReturnType.UNTIL_FALSE: {
                        if (listenerResult === false) {
                            return false;
                        }
                        break;
                    }
                    case TriggerReturnType.FIRST_NON_EMPTY: {
                        if (
                            !hasPromises
                            && !(listenerResult instanceof Promise)
                            && listenerResult !== null
                            && listenerResult !== undefined
                        ) {
                            return listenerResult;
                        }
                        break;
                    }
                }
            }

            if (!hasPromises && listenerResult instanceof Promise) {
                hasPromises = true;
            }

            results.push(listenerResult);
        }

        switch (returnType) {
            case TriggerReturnType.RAW: {
                return results;
            }
            case undefined:
            case null: {
                if (hasPromises) {
                    return Promise.all(
                        results as Promise<ListenerResult>[],
                    ).then(() => undefined);
                }
                return;
            }
            case TriggerReturnType.ALL: {
                return hasPromises
                    ? Promise.all(results as Promise<ListenerResult>[])
                    : results;
            }
            case TriggerReturnType.CONCAT: {
                return hasPromises
                    ? Promise.all(results as Promise<ListenerResult>[]).then(
                        (r) => r.flat(),
                    )
                    : results.flat();
            }
            case TriggerReturnType.MERGE: {
                return hasPromises
                    ? Promise.all(results as Promise<ListenerResult>[]).then(
                        (r) => Object.assign({}, ...r) as Event["returnType"],
                    )
                    : (Object.assign({}, ...results) as Event["returnType"]);
            }
            case TriggerReturnType.LAST: {
                return results.pop();
            }
            case TriggerReturnType.UNTIL_TRUE: {
                return;
            }
            case TriggerReturnType.UNTIL_FALSE: {
                return;
            }
            case TriggerReturnType.FIRST_NON_EMPTY: {
                return hasPromises
                    ? Promise.all(results as Promise<ListenerResult>[]).then(
                        (r) =>
                            r.find(
                                (item) => item !== undefined && item !== null,
                            ),
                    )
                    : results.find(
                        (item) => item !== undefined && item !== null,
                    );
            }
            case TriggerReturnType.PIPE: {
                return results[results.length - 1];
            }
        }
    };

    const trigger = (...args: Event["arguments"]) => {
        _trigger(args);
    };

    const withTags = <R>(
        tags: string[],
        callback: () => R,
    ): R => {
        currentTagsFilter = tags;
        try {
            return callback();
        }
        finally {
            currentTagsFilter = null;
        }
    };

    let cachedPromise: Promise<Event["arguments"]> | null = null;
    const promise = (options?: ListenerOptions) => {
        return cachedPromise = cachedPromise
            || new Promise<Event["arguments"]>((resolve) => {
                options = { ...(options || {}), limit: 1 };
                const l = ((...args: Event["arguments"]) => {
                    resolve(args);
                    cachedPromise = null;
                }) as Event["signature"];
                addListener(l, options);
            });
    };

    const first = (
        ...args: Event["arguments"]
    ): Event["returnType"] | undefined => {
        return _trigger(args, TriggerReturnType.FIRST) as
            | Event["returnType"]
            | undefined;
    };

    const resolveFirst = (
        ...args: Event["arguments"]
    ): Promise<Awaited<Event["returnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.FIRST);
        if (response instanceof Promise) {
            return response as Promise<
                Awaited<Event["returnType"]> | undefined
            >;
        }
        return Promise.resolve(
            response as Awaited<Event["returnType"]> | undefined,
        );
    };

    const all = (
        ...args: Event["arguments"]
    ): Event["returnType"][] => {
        return _trigger(
            args,
            TriggerReturnType.ALL,
        ) as Event["returnType"][];
    };

    const resolveAll = (
        ...args: Event["arguments"]
    ): Promise<Awaited<Event["returnType"]>[]> => {
        const response = _trigger(args, TriggerReturnType.ALL);
        if (response instanceof Promise) {
            return response as Promise<Awaited<Event["returnType"]>[]>;
        }
        return Promise.resolve(response as Awaited<Event["returnType"]>[]);
    };

    const last = (
        ...args: Event["arguments"]
    ): Event["returnType"] | undefined => {
        return _trigger(args, TriggerReturnType.LAST) as
            | Event["returnType"]
            | undefined;
    };

    const resolveLast = (
        ...args: Event["arguments"]
    ): Promise<Awaited<Event["returnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.LAST);
        if (response instanceof Promise) {
            return response as Promise<
                Awaited<Event["returnType"]> | undefined
            >;
        }
        return Promise.resolve(
            response as Awaited<Event["returnType"]> | undefined,
        );
    };

    const merge = (
        ...args: Event["arguments"]
    ): Event["returnType"] | undefined => {
        return _trigger(args, TriggerReturnType.MERGE) as
            | Event["returnType"]
            | undefined;
    };

    const resolveMerge = (
        ...args: Event["arguments"]
    ): Promise<Awaited<Event["returnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.MERGE);
        if (response instanceof Promise) {
            return response as Promise<
                Awaited<Event["returnType"]> | undefined
            >;
        }
        return Promise.resolve(
            response as Awaited<Event["returnType"]> | undefined,
        );
    };

    const concat = (
        ...args: Event["arguments"]
    ): Unarray<Event["returnType"]>[] => {
        return _trigger(
            args,
            TriggerReturnType.CONCAT,
        ) as Unarray<Event["returnType"]>[];
    };

    const resolveConcat = (
        ...args: Event["arguments"]
    ): Promise<Unarray<Awaited<Event["returnType"]>>[]> => {
        const response = _trigger(args, TriggerReturnType.CONCAT);
        if (response instanceof Promise) {
            return response as Promise<Unarray<Awaited<Event["returnType"]>>[]>;
        }
        return Promise.resolve(
            response as Unarray<Awaited<Event["returnType"]>>[],
        );
    };

    const firstNonEmpty = (
        ...args: Event["arguments"]
    ): Event["returnType"] | undefined => {
        return _trigger(args, TriggerReturnType.FIRST_NON_EMPTY) as
            | Event["returnType"]
            | undefined;
    };

    const resolveFirstNonEmpty = (
        ...args: Event["arguments"]
    ): Promise<Awaited<Event["returnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.FIRST_NON_EMPTY);
        if (response instanceof Promise) {
            return response as Promise<
                Awaited<Event["returnType"]> | undefined
            >;
        }
        return Promise.resolve(
            response as Awaited<Event["returnType"]> | undefined,
        );
    };

    const untilTrue = (...args: Event["arguments"]) => {
        _trigger(args, TriggerReturnType.UNTIL_TRUE);
    };

    const untilFalse = (...args: Event["arguments"]) => {
        _trigger(args, TriggerReturnType.UNTIL_FALSE);
    };

    const pipe = (...args: Event["arguments"]) => {
        return _trigger(args, TriggerReturnType.PIPE) as
            | Event["returnType"]
            | undefined;
    };

    const resolvePipe = (
        ...args: Event["arguments"]
    ): Promise<Awaited<Event["returnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.PIPE);
        if (response instanceof Promise) {
            return response as Promise<
                Awaited<Event["returnType"]> | undefined
            >;
        }
        return Promise.resolve(
            response as Awaited<Event["returnType"]> | undefined,
        );
    };

    const raw = (
        ...args: Event["arguments"]
    ): Unarray<Event["returnType"]>[] => {
        return _trigger(
            args,
            TriggerReturnType.RAW,
        ) as Unarray<Event["returnType"]>[];
    };

    const api = {
        addListener,
        /** @alias addListener */
        on: addListener,
        /** @alias addListener */
        listen: addListener,
        /** @alias addListener */
        subscribe: addListener,
        removeListener,
        /** @alias removeListener */
        un: removeListener,
        /** @alias removeListener */
        off: removeListener,
        /** @alias removeListener */
        remove: removeListener,
        /** @alias removeListener */
        unsubscribe: removeListener,
        trigger,
        /** @alias trigger */
        emit: trigger,
        /** @alias trigger */
        dispatch: trigger,
        hasListener,
        /** @alias hasListener */
        has: hasListener,
        removeAllListeners,
        addErrorListener,
        removeErrorListener,
        suspend,
        resume,
        setOptions,
        reset,
        isSuspended,
        isQueued,
        withTags,
        promise,
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
    } as const;

    return api as ApiType<Event, typeof api>;
}

export type BaseEventDefinition = EventDefinitionHelper<BaseHandler>;
export type BaseEvent = ReturnType<typeof createEvent<BaseHandler>>;
