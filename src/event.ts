import { IsTuple, Simplify } from "type-fest";
import asyncCall from "./lib/asyncCall";
import listenerSorter from "./lib/listenerSorter";
import tagsIntersect from "./lib/tagsIntersect";
import { BaseHandler, TriggerReturnType } from "./lib/types";

type Unarray<T> = T extends (infer U)[] ? U : T;
type Prettify<T> = Simplify<T>;
type Writable<T> = {
    -readonly [P in keyof T]: T[P];
};

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

export interface EventArgsOptions {
    /**
     * Prepend parameters
     */
    prependArgs?: readonly any[];
    /**
     * Append parameters
     */
    appendArgs?: readonly any[];
    /**
     * Replace parameters
     */
    replaceArgs?: readonly any[];
}

export interface EventOptions extends BaseOptions, EventArgsOptions {
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
        | ((args: any[], listener: ListenerPrototype<BaseHandler>) => boolean)
        | null;
    /**
     * TriggerFilter's this object, if needed
     */
    filterContext?: object | null;
}

export type DefaultEventArgsOptions = {
    prependArgs: readonly [];
    appendArgs: readonly [];
    replaceArgs: never;
};

type GetEventArgsOption<
    Option extends readonly any[] | undefined,
    Default extends readonly [] = readonly [],
> = [ Option ] extends [ undefined ] ? Default
    : [ Option ] extends [ never ] ? Default
    : IsTuple<NonNullable<Option>> extends true ? NonNullable<Option>
    : Default;

type GetHandlerArguments<
    TriggerArguments extends any[],
    PrependArgs extends readonly any[],
    AppendArgs extends readonly any[],
    ReplaceArgs extends readonly any[] | never,
> = [ ReplaceArgs ] extends [ never ]
    ? [ ...PrependArgs, ...TriggerArguments, ...AppendArgs ]
    : Writable<ReplaceArgs>;

export type EventDefinitionHelper<
    TriggerSignature extends BaseHandler = BaseHandler,
    Options extends EventArgsOptions = DefaultEventArgsOptions,
> = {
    eventSignature: TriggerSignature;
    triggerArguments: Parameters<TriggerSignature>;
    prependArgs: GetEventArgsOption<Options["prependArgs"]>;
    appendArgs: GetEventArgsOption<Options["appendArgs"]>;
    replaceArgs: GetEventArgsOption<Options["replaceArgs"], never>;
    eventArgsOptions: {
        prependArgs: GetEventArgsOption<Options["prependArgs"]>;
        appendArgs: GetEventArgsOption<Options["appendArgs"]>;
        replaceArgs: GetEventArgsOption<Options["replaceArgs"], never>;
    };
    listenerArguments: GetHandlerArguments<
        Parameters<TriggerSignature>,
        GetEventArgsOption<Options["prependArgs"]>,
        GetEventArgsOption<Options["appendArgs"]>,
        GetEventArgsOption<Options["replaceArgs"], never>
    >;
    listenerReturnType: ReturnType<TriggerSignature>;
    listenerSignature: (
        ...args: GetHandlerArguments<
            Parameters<TriggerSignature>,
            GetEventArgsOption<Options["prependArgs"]>,
            GetEventArgsOption<Options["appendArgs"]>,
            GetEventArgsOption<Options["replaceArgs"], never>
        >
    ) => ReturnType<TriggerSignature>;
};

export function createEvent<
    TriggerSignature extends BaseHandler = BaseHandler,
    HandlerOptions extends EventArgsOptions = DefaultEventArgsOptions,
>(eventOptions: Prettify<EventOptions> = {}) {
    type Event = EventDefinitionHelper<TriggerSignature, HandlerOptions>;
    type Listener = Prettify<ListenerPrototype<Event["listenerSignature"]>>;

    let listeners: Listener[] = [];
    let queue: Array<[ Event["triggerArguments"], TriggerReturnType | null ]> =
        [];
    let suspended: boolean = false;
    let queued: boolean = false;
    let triggered: number = 0;
    let lastTrigger: Event["triggerArguments"] | null = null;
    let sortListeners: boolean = false;
    let currentTagsFilter: string[] | null = null;

    const options: Prettify<EventOptions> = {
        async: null,
        limit: null,
        autoTrigger: null,
        appendArgs: undefined,
        prependArgs: undefined,
        replaceArgs: undefined,
        filter: null,
        filterContext: null,
        ...eventOptions,
    };

    const addListener = (
        handler: Event["listenerSignature"],
        listenerOptions: Prettify<ListenerOptions> = {} as Prettify<
            ListenerOptions
        >,
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
        handler: Event["listenerSignature"],
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
        handler?: Event["listenerSignature"] | null,
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
        eventOptions: Pick<EventOptions, "async" | "limit" | "autoTrigger">,
    ) => {
        Object.assign(options, eventOptions);
    };

    const isSuspended = () => suspended;
    const isQueued = () => queued;

    const reset = () => {
        listeners.length = 0;
        queue.length = 0;
        suspended = false;
        queued = false;
        triggered = 0;
    };

    const _prepareListenerArgs = (
        args: Event["triggerArguments"],
    ): Event["listenerArguments"] => {
        if (options.replaceArgs) {
            return options.replaceArgs as unknown as Event["listenerArguments"];
        }
        return [
            ...(options.prependArgs || []),
            ...args,
            ...(options.appendArgs || []),
        ] as Event["listenerArguments"];
    };

    const _listenerCall = (
        listener: Listener,
        args: Event["listenerArguments"],
        resolve: null | ((any: Event["listenerReturnType"]) => void) = null,
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

        const result = isAsync !== false
            ? asyncCall<
                Event["listenerArguments"],
                Event["listenerReturnType"]
            >(
                listener.handler,
                listener.context,
                args,
                isAsync,
            )
            : listener.handler.bind(listener.context)(...args);

        if (resolve !== null) {
            if (result instanceof Promise) {
                result.then(resolve);
            }
            else {
                resolve(result);
            }
        }

        return result;
    };

    const _listenerCallWPrev = (
        listener: Listener,
        args: Event["listenerArguments"],
        prevValue: Event["listenerReturnType"] | boolean,
        returnType: TriggerReturnType,
    ):
        | Event["listenerReturnType"]
        | Promise<Event["listenerReturnType"]>
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
        origArgs: Event["triggerArguments"],
        returnType: TriggerReturnType | null = null,
        tags?: string[] | null,
    ) => {
        if (queued) {
            queue.push([ origArgs, returnType ]);
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
            lastTrigger = origArgs.slice() as Event["triggerArguments"];
        }

        // in pipe mode if there is no listeners,
        // we just return piped value
        if (listeners.length === 0) {
            if (returnType === TriggerReturnType.PIPE) {
                return origArgs.length > 0 ? origArgs[0] : undefined;
            }
            else if (
                returnType === TriggerReturnType.ALL
                || returnType === TriggerReturnType.CONCAT
                || returnType === TriggerReturnType.RAW
            ) {
                return [] as Event["listenerReturnType"][];
            }
            else if (returnType === TriggerReturnType.MERGE) {
                return {} as Partial<Event["listenerReturnType"]>;
            }
            return;
        }

        type ListenerResult =
            | Event["listenerReturnType"]
            | Promise<Event["listenerReturnType"]>
            | boolean
            | Promise<boolean>;

        const listenersQueue: Listener[] = listeners.slice();
        const isConsequent = returnType === TriggerReturnType.PIPE
            || returnType === TriggerReturnType.UNTIL_TRUE
            || returnType === TriggerReturnType.UNTIL_FALSE
            || returnType === TriggerReturnType.FIRST_NON_EMPTY;
        let args: Event["listenerArguments"];
        let listener: Listener | undefined;
        let listenerResult: ListenerResult;
        const results: ListenerResult[] = [];
        let hasPromises = false;

        while ((listener = listenersQueue.shift())) {
            if (!listener) {
                continue;
            }

            args = _prepareListenerArgs(origArgs);

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
                let prev = results[results.length - 1];
                if (hasPromises) {
                    const prevPromise = prev instanceof Promise
                        ? prev
                        : Promise.resolve(prev);

                    listenerResult = prevPromise.then(
                        (
                            (
                                listener: Listener,
                                args: Event["listenerArguments"],
                                returnType: TriggerReturnType,
                            ) =>
                            (value: Event["listenerReturnType"] | boolean) => {
                                return _listenerCallWPrev(
                                    listener,
                                    args,
                                    value,
                                    returnType,
                                );
                            }
                        )(listener, args, returnType),
                    ) as
                        | Promise<Event["listenerReturnType"]>
                        | Promise<boolean>;
                }
                else {
                    listenerResult = _listenerCallWPrev(
                        listener,
                        args,
                        // no promises here
                        prev as Event["listenerReturnType"] | boolean,
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
                return listenerResult as ListenerResult;
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
                    return Promise.all(results).then(
                        () => undefined,
                    ) as Promise<undefined>;
                }
                return;
            }
            case TriggerReturnType.ALL: {
                return hasPromises
                    ? Promise.all(results) as Promise<ListenerResult[]>
                    : results;
            }
            case TriggerReturnType.CONCAT: {
                return hasPromises
                    ? (Promise.all(results).then((results) =>
                        results.flat()
                    ) as Promise<ListenerResult[]>)
                    : results.flat();
            }
            case TriggerReturnType.MERGE: {
                return hasPromises
                    ? Promise.all(results).then((results) =>
                        Object.assign.apply(null, [ {}, ...results ])
                    )
                    : Object.assign.apply(null, [ {}, ...results ]);
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
                return Promise.all(results).then((results) =>
                    results.find((r) => r !== undefined && r !== null)
                );
            }
            case TriggerReturnType.PIPE: {
                return results[results.length - 1];
            }
        }
    };

    const trigger = (...args: Event["triggerArguments"]) => {
        _trigger(args);
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

    const promise = (options?: ListenerOptions) => {
        return new Promise<Event["listenerArguments"]>((resolve) => {
            options = { ...(options || {}), limit: 1 };
            addListener(
                (...args: Event["listenerArguments"]): any => {
                    resolve(args);
                },
                options,
            );
        });
    };

    const first = (
        ...args: Event["triggerArguments"]
    ): Event["listenerReturnType"] | undefined => {
        return _trigger(args, TriggerReturnType.FIRST) as
            | Event["listenerReturnType"]
            | undefined;
    };

    const resolveFirst = (
        ...args: Event["triggerArguments"]
    ): Promise<Awaited<Event["listenerReturnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.FIRST);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };

    const all = (
        ...args: Event["triggerArguments"]
    ): Event["listenerReturnType"][] => {
        return _trigger(
            args,
            TriggerReturnType.ALL,
        ) as Event["listenerReturnType"][];
    };

    const resolveAll = (
        ...args: Event["triggerArguments"]
    ): Promise<Awaited<Event["listenerReturnType"]>[]> => {
        const response = _trigger(args, TriggerReturnType.ALL);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };

    const last = (
        ...args: Event["triggerArguments"]
    ): Event["listenerReturnType"] | undefined => {
        return _trigger(args, TriggerReturnType.LAST) as
            | Event["listenerReturnType"]
            | undefined;
    };

    const resolveLast = (
        ...args: Event["triggerArguments"]
    ): Promise<Awaited<Event["listenerReturnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.LAST);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };

    const merge = (
        ...args: Event["triggerArguments"]
    ): Event["listenerReturnType"] | undefined => {
        return _trigger(args, TriggerReturnType.MERGE) as
            | Event["listenerReturnType"]
            | undefined;
    };

    const resolveMerge = (
        ...args: Event["triggerArguments"]
    ): Promise<Awaited<Event["listenerReturnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.MERGE);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };

    const concat = (
        ...args: Event["triggerArguments"]
    ): Unarray<Event["listenerReturnType"]>[] => {
        return _trigger(
            args,
            TriggerReturnType.CONCAT,
        ) as Unarray<Event["listenerReturnType"]>[];
    };

    const resolveConcat = (
        ...args: Event["triggerArguments"]
    ): Promise<Unarray<Awaited<Event["listenerReturnType"]>>[]> => {
        const response = _trigger(args, TriggerReturnType.CONCAT);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };

    const firstNonEmpty = (
        ...args: Event["triggerArguments"]
    ): Event["listenerReturnType"] | undefined => {
        return _trigger(args, TriggerReturnType.FIRST_NON_EMPTY) as
            | Event["listenerReturnType"]
            | undefined;
    };

    const resolveFirstNonEmpty = (
        ...args: Event["triggerArguments"]
    ): Promise<Awaited<Event["listenerReturnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.FIRST_NON_EMPTY);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };

    const untilTrue = (...args: Event["triggerArguments"]) => {
        _trigger(args, TriggerReturnType.UNTIL_TRUE);
    };

    const untilFalse = (...args: Event["triggerArguments"]) => {
        _trigger(args, TriggerReturnType.UNTIL_FALSE);
    };

    const pipe = (...args: Event["triggerArguments"]) => {
        return _trigger(args, TriggerReturnType.PIPE) as
            | Event["listenerReturnType"]
            | undefined;
    };

    const resolvePipe = (
        ...args: Event["triggerArguments"]
    ): Promise<Awaited<Event["listenerReturnType"]> | undefined> => {
        const response = _trigger(args, TriggerReturnType.PIPE);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };

    const raw = (
        ...args: Event["triggerArguments"]
    ): Unarray<Event["listenerReturnType"]>[] => {
        return _trigger(
            args,
            TriggerReturnType.RAW,
        ) as Unarray<Event["listenerReturnType"]>[];
    };

    const api = {
        addListener,
        /** @alias addListener */
        on: addListener,
        /** @alias addListener */
        listen: addListener,
        removeListener,
        /** @alias removeListener */
        un: removeListener,
        /** @alias removeListener */
        off: removeListener,
        /** @alias removeListener */
        remove: removeListener,
        trigger,
        /** @alias trigger */
        emit: trigger,
        /** @alias trigger */
        dispatch: trigger,
        hasListener,
        /** @alias hasListener */
        has: hasListener,
        removeAllListeners,
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

    return api as Prettify<typeof api>;
}

export function createEventHelper<
    TriggerSignature extends BaseHandler = never,
>() {
    return <
        T extends EventOptions,
        Prepend extends readonly any[] = T extends { prependArgs: infer A1; }
            ? A1 extends readonly any[] ? GetEventArgsOption<A1, readonly []>
            : readonly []
            : readonly [],
        Append extends readonly any[] = T extends { appendArgs: infer A2; }
            ? A2 extends readonly any[] ? GetEventArgsOption<A2, readonly []>
            : readonly []
            : readonly [],
        Replace extends readonly any[] = T extends { replaceArgs: infer A3; }
            ? A3 extends readonly any[] ? GetEventArgsOption<A3, never>
            : never
            : never,
    >(options: T = {} as T) => {
        return createEvent<TriggerSignature, {
            prependArgs: Prepend;
            appendArgs: Append;
            replaceArgs: Replace;
        }>(options as EventOptions);
    };
}
