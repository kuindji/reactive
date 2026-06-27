import asyncCall from "./lib/asyncCall.js";
import isPromiseLike from "./lib/isPromiseLike.js";
import listenerSorter from "./lib/listenerSorter.js";
import tagsIntersect from "./lib/tagsIntersect.js";
import type { ApiType, BaseHandler, ErrorListenerSignature } from "./lib/types.js";
import { TriggerReturnType } from "./lib/types.js";

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
    /**
     * When provided, the listener is auto-removed once the signal aborts. If the
     * signal is already aborted the listener is not added at all.
     */
    signal?: AbortSignal | null;
}

interface ListenerPrototype<Handler extends BaseHandler>
    extends Required<Omit<ListenerOptions, "signal">>
{
    handler: Handler;
    called: number;
    count: number;
    index: number;
    start: number;
    // Detaches the AbortSignal "abort" handler, if one was registered. Kept on
    // the listener so a manual removeListener also unwinds the abort handler
    // (no dangling reference into a still-live signal).
    abortCleanup: (() => void) | null;
}

interface ErrorListenerPrototype<Handler extends BaseHandler> {
    handler: Handler;
    context?: object | null;
}

/**
 * Read-only projection of a registered listener, returned by `getListeners()`.
 * Carries the listener's options plus its live `called`/`count` counters but
 * none of the mutable internals — mutating this object does not affect the
 * event.
 */
export interface ListenerInfo<Handler extends BaseHandler = BaseHandler> {
    handler: Handler;
    context: object | null;
    tags: string[];
    limit: number;
    start: number;
    called: number;
    count: number;
    async: boolean | number | null;
    first: boolean;
    alwaysFirst: boolean;
    alwaysLast: boolean;
    extraData: any;
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
    let queue: Array<[
        Event["arguments"],
        TriggerReturnType | null,
        string[] | null,
    ]> = [];
    let suspended: boolean = false;
    let queued: boolean = false;
    let destroyed: boolean = false;
    let triggered: number = 0;
    let lastTrigger: Event["arguments"] | null = null;
    // The args replayed to a late autoTrigger listener. Recorded only while
    // autoTrigger is enabled, so enabling it *after* a trigger does not replay
    // that earlier (pre-enablement) trigger. Kept separate from `lastTrigger`,
    // which is recorded on every trigger purely for `lastTriggerArgs`.
    let autoTriggerArgs: Event["arguments"] | null = null;
    // True while replaying `autoTriggerArgs` into a newly added listener. The
    // replay goes through `_trigger`, but it is not a real trigger: it must not
    // bump `triggered`/`lastTrigger` or be gated by the trigger `limit`.
    let replaying: boolean = false;
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
        listenerOptions: ListenerOptions = {},
    ) => {
        if (destroyed) {
            throw new Error("Event is destroyed");
        }
        if (!handler) {
            return;
        }

        const signal = listenerOptions.signal ?? null;
        if (signal?.aborted) {
            return;
        }

        const listenerContext = listenerOptions.context ?? null;
        if (
            listeners.find((l) =>
                l.handler === handler && l.context === listenerContext
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
            abortCleanup: null,
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

        if (signal) {
            const onAbort = () => {
                removeListener(handler, listenerContext);
            };
            signal.addEventListener("abort", onAbort, { once: true });
            listener.abortCleanup = () => {
                signal.removeEventListener("abort", onAbort);
            };
        }

        if (
            options.autoTrigger
            && autoTriggerArgs !== null
            && !suspended
        ) {
            const prevFilter = options.filter;
            options.filter = (
                args: any[],
                l: Listener,
            ) => {
                if (
                    l
                    && l.handler === handler
                    && l.context === listenerContext
                ) {
                    return prevFilter ? prevFilter(args, l) !== false : true;
                }
                return false;
            };
            replaying = true;
            try {
                _trigger(autoTriggerArgs);
            }
            finally {
                replaying = false;
                options.filter = prevFilter;
            }
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

        const [ removed ] = listeners.splice(inx, 1);
        removed?.abortCleanup?.();
        return true;
    };

    const updateListenerOptions = (
        handler: Event["signature"],
        context: object | null = null,
        nextOptions: ListenerOptions = {},
    ): boolean => {
        const listenerContext = context ?? null;
        const listener = listeners.find((l) =>
            l.handler === handler && l.context === listenerContext
        );
        if (!listener) {
            return false;
        }

        const prevAlwaysFirst = listener.alwaysFirst;
        const prevAlwaysLast = listener.alwaysLast;

        // Partial update: only fields explicitly present in nextOptions change;
        // any omitted field keeps its current value (a caller changing one
        // option does not silently reset the others). Pass a field explicitly
        // (e.g. limit: 0, signal: null) to clear it.
        if ("limit" in nextOptions) {
            listener.limit = nextOptions.limit ?? 0;
        }
        if ("start" in nextOptions) {
            listener.start = nextOptions.start ?? 1;
        }
        if ("tags" in nextOptions) {
            listener.tags = nextOptions.tags ?? [];
        }
        if ("extraData" in nextOptions) {
            listener.extraData = nextOptions.extraData ?? null;
        }
        if ("alwaysFirst" in nextOptions) {
            listener.alwaysFirst = nextOptions.alwaysFirst ?? false;
        }
        if ("alwaysLast" in nextOptions) {
            listener.alwaysLast = nextOptions.alwaysLast ?? false;
        }

        if ("async" in nextOptions) {
            let nextAsync: boolean | number | null = nextOptions.async ?? null;
            if (nextAsync === true) {
                nextAsync = 1;
            }
            listener.async = nextAsync;
        }

        // Re-sort if ordering hints changed. Unlike addListener we do NOT
        // rewrite each listener's index here: the existing indices hold the
        // original insertion order, and preserving them lets sorting restore
        // that order when alwaysFirst/alwaysLast is cleared.
        if (
            listener.alwaysFirst !== prevAlwaysFirst
            || listener.alwaysLast !== prevAlwaysLast
        ) {
            if (listener.alwaysFirst === true || listener.alwaysLast === true) {
                sortListeners = true;
            }
            if (sortListeners) {
                listeners.sort((l1, l2) => listenerSorter<Listener>(l1, l2));
            }
        }

        // Rebind the AbortSignal only when `signal` is explicitly present:
        // detach any previous wiring so the old controller can no longer remove
        // this listener, then attach the new signal. Omitting the field leaves
        // the existing binding intact (partial-update convention); pass
        // signal: null to clear it. An already-aborted new signal removes the
        // listener now, mirroring addListener's "do not keep an aborted-signal
        // listener".
        if ("signal" in nextOptions) {
            listener.abortCleanup?.();
            listener.abortCleanup = null;
            const nextSignal = nextOptions.signal ?? null;
            if (nextSignal) {
                if (nextSignal.aborted) {
                    removeListener(listener.handler, listenerContext);
                    return true;
                }
                const onAbort = () => {
                    removeListener(listener.handler, listenerContext);
                };
                nextSignal.addEventListener("abort", onAbort, { once: true });
                listener.abortCleanup = () => {
                    nextSignal.removeEventListener("abort", onAbort);
                };
            }
        }

        // The core auto-remove check is a strict `called === limit`, so a
        // listener whose `called` already exceeds the new limit would never
        // auto-remove. Remove it immediately in that case.
        if (listener.limit !== 0 && listener.called >= listener.limit) {
            removeListener(listener.handler, listener.context);
        }

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
                const keep = !l.tags || l.tags.indexOf(tag) === -1;
                if (!keep) {
                    l.abortCleanup?.();
                }
                return keep;
            });
        }
        else {
            listeners.forEach((l) => l.abortCleanup?.());
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
                _trigger(queue[i][0], queue[i][1], queue[i][2]);
            }
            queue = [];
        }
    };

    const setOptions = (
        eventOptions: Partial<EventOptions<ListenerSignature>>,
    ) => {
        Object.assign(options, eventOptions);
    };

    const isSuspended = () => suspended;
    const isQueued = () => queued;

    // One-call teardown: drop all listeners (unwinding their abort handlers via
    // reset) and mark the event dead. Post-destroy trigger/addListener throw
    // rather than silently no-op, surfacing use-after-free.
    const destroy = () => {
        reset();
        destroyed = true;
    };

    const isDestroyed = () => destroyed;

    const listenerCount = (tag?: string | null): number => {
        if (tag) {
            return listeners.filter(
                (l) => l.tags && l.tags.indexOf(tag) !== -1,
            ).length;
        }
        return listeners.length;
    };

    const triggeredCount = (): number => triggered;

    // Return a copy: handing back the internal `lastTrigger` reference would let
    // a caller mutate it, corrupting both the recorded snapshot and the values
    // replayed to autoTrigger listeners.
    const lastTriggerArgs = (): Event["arguments"] | null =>
        lastTrigger ? (lastTrigger.slice() as Event["arguments"]) : null;

    // Deep-copy extraData so the read-only projection cannot mutate internal
    // listener metadata (which filters can read) at any depth; a shallow copy
    // still shares nested containers by reference. `seen` carries already-cloned
    // containers so a cyclic graph reuses its clone instead of recursing forever
    // (a plain recursive clone throws RangeError on cycles). Arrays, plain
    // objects, Date, Map and Set are cloned. Truly opaque values (functions,
    // class instances) are returned as-is — copying their enumerable keys would
    // not faithfully reproduce them — as are primitives.
    const projectExtraDataDeep = (value: any, seen: WeakMap<object, any>): any => {
        if (value === null || typeof value !== "object") {
            return value;
        }
        const existing = seen.get(value);
        if (existing !== undefined) {
            return existing;
        }
        if (value instanceof Date) {
            return new Date(value.getTime());
        }
        if (Array.isArray(value)) {
            const copy: any[] = [];
            seen.set(value, copy);
            for (const v of value) {
                copy.push(projectExtraDataDeep(v, seen));
            }
            return copy;
        }
        if (value instanceof Map) {
            const copy = new Map();
            seen.set(value, copy);
            value.forEach((v, k) => {
                copy.set(
                    projectExtraDataDeep(k, seen),
                    projectExtraDataDeep(v, seen),
                );
            });
            return copy;
        }
        if (value instanceof Set) {
            const copy = new Set();
            seen.set(value, copy);
            value.forEach((v) => {
                copy.add(projectExtraDataDeep(v, seen));
            });
            return copy;
        }
        const proto = Object.getPrototypeOf(value);
        if (proto === Object.prototype || proto === null) {
            const copy: Record<string, any> = {};
            seen.set(value, copy);
            for (const k of Object.keys(value)) {
                copy[k] = projectExtraDataDeep(value[k], seen);
            }
            return copy;
        }
        return value;
    };

    const projectExtraData = (value: any): any =>
        projectExtraDataDeep(value, new WeakMap());

    const getListeners = (): ListenerInfo<Event["signature"]>[] => {
        return listeners.map((l) => ({
            handler: l.handler,
            context: l.context,
            tags: l.tags ? l.tags.slice() : [],
            limit: l.limit,
            start: l.start,
            called: l.called,
            count: l.count,
            async: l.async,
            first: l.first,
            alwaysFirst: l.alwaysFirst,
            alwaysLast: l.alwaysLast,
            extraData: projectExtraData(l.extraData),
        }));
    };

    const reset = () => {
        listeners.forEach((l) => l.abortCleanup?.());
        listeners.length = 0;
        errorListeners.length = 0;
        queue.length = 0;
        suspended = false;
        queued = false;
        triggered = 0;
        lastTrigger = null;
        autoTriggerArgs = null;
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

            if (isPromiseLike<Event["returnType"]>(result)) {
                const handledResult = Promise.resolve(result).catch((error) => {
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
                    return undefined as Event["returnType"];
                });

                if (resolve !== null) {
                    void handledResult.then(resolve);
                }

                return handledResult;
            }

            if (resolve !== null) {
                resolve(result);
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
            // Copy-on-write: preserve the pre-pipe lastTrigger snapshot before
            // mutating args[0] in place for the pipe chain (lastTrigger stores
            // the args reference rather than an eager per-trigger copy).
            if (lastTrigger === args) {
                lastTrigger = args.slice() as Event["arguments"];
            }
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
        if (destroyed) {
            throw new Error("Event is destroyed");
        }
        if (queued) {
            queue.push([
                args,
                returnType,
                (tags || currentTagsFilter)?.slice() ?? null,
            ]);
            return;
        }
        if (suspended) {
            return;
        }
        // The trigger `limit` bounds real triggers; an autoTrigger replay is an
        // internal redelivery and must always reach the new listener.
        if (options.limit && triggered >= options.limit && !replaying) {
            return;
        }
        if (!replaying) {
            triggered++;

            // Record the last trigger arguments for introspection
            // (`lastTriggerArgs`). Store the reference rather than eagerly
            // copying on every trigger (a hot path even when nothing ever reads
            // it): `args` is a fresh per-call array the caller cannot reach, and
            // listeners receive it spread (never the array itself). The snapshot
            // is copied lazily — when handed out by lastTriggerArgs(), and
            // copy-on-write before PIPE mode mutates args[0] in place — so the
            // recorded snapshot stays the pre-pipe arguments.
            lastTrigger = args;

            // Record the replay source only while autoTrigger is enabled, so a
            // late listener added after autoTrigger is turned on replays the
            // most recent *enabled* trigger, never an earlier disabled one.
            if (options.autoTrigger) {
                autoTriggerArgs = args.slice() as Event["arguments"];
            }
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

            // Count the call and exhaust the limit BEFORE invoking the handler.
            // If the handler re-triggers this same event, the nested _trigger
            // snapshots `listeners` AFTER the removal below, so an exhausted
            // (e.g. once()) listener is not invoked a second time. Doing this
            // after the call would let a re-entrant trigger see the still-live
            // listener and run it again past its limit.
            listener.called++;
            if (listener.called === listener.limit) {
                removeListener(listener.handler, listener.context);
            }

            if (isConsequent && results.length > 0) {
                const prev = results[results.length - 1];
                if (hasPromises) {
                    const prevPromise = Promise.resolve(prev);

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
                            && !isPromiseLike(listenerResult)
                            && listenerResult !== null
                            && listenerResult !== undefined
                        ) {
                            return listenerResult;
                        }
                        break;
                    }
                }
            }

            if (!hasPromises && isPromiseLike(listenerResult)) {
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
        const prevTagsFilter = currentTagsFilter;
        currentTagsFilter = tags;
        try {
            return callback();
        }
        finally {
            currentTagsFilter = prevTagsFilter;
        }
    };

    const once = (
        handler: Event["signature"],
        listenerOptions: ListenerOptions = {},
    ) => {
        return addListener(handler, { ...listenerOptions, limit: 1 });
    };

    const promise = (options?: ListenerOptions) => {
        return new Promise<Event["arguments"]>((resolve) => {
            options = { ...(options || {}), limit: 1 };
            const l = ((...args: Event["arguments"]) => {
                resolve(args);
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
        if (isPromiseLike(response)) {
            return Promise.resolve(response) as Promise<
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
        if (isPromiseLike(response)) {
            return Promise.resolve(response) as Promise<
                Awaited<Event["returnType"]>[]
            >;
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
        if (isPromiseLike(response)) {
            return Promise.resolve(response) as Promise<
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
        if (isPromiseLike(response)) {
            return Promise.resolve(response) as Promise<
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
        if (isPromiseLike(response)) {
            return Promise.resolve(response) as Promise<
                Unarray<Awaited<Event["returnType"]>>[]
            >;
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
        if (isPromiseLike(response)) {
            return Promise.resolve(response) as Promise<
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
        if (isPromiseLike(response)) {
            return Promise.resolve(response) as Promise<
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
        once,
        removeListener,
        updateListenerOptions,
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
        destroy,
        isDestroyed,
        isSuspended,
        isQueued,
        listenerCount,
        triggeredCount,
        lastTriggerArgs,
        getListeners,
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
