"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventBus = createEventBus;
const event_1 = require("./event");
const types_1 = require("./lib/types");
function proxyReturnTypeToTriggerReturnType(proxyType) {
    switch (proxyType) {
        case types_1.ProxyType.TRIGGER:
            return { returnType: null, resolve: false };
        case types_1.ProxyType.RAW:
            return { returnType: types_1.TriggerReturnType.RAW, resolve: false };
        case types_1.ProxyType.ALL:
            return { returnType: types_1.TriggerReturnType.ALL, resolve: false };
        case types_1.ProxyType.CONCAT:
            return { returnType: types_1.TriggerReturnType.CONCAT, resolve: false };
        case types_1.ProxyType.MERGE:
            return { returnType: types_1.TriggerReturnType.MERGE, resolve: false };
        case types_1.ProxyType.LAST:
            return { returnType: types_1.TriggerReturnType.LAST, resolve: false };
        case types_1.ProxyType.PIPE:
            return { returnType: types_1.TriggerReturnType.PIPE, resolve: false };
        case types_1.ProxyType.FIRST:
            return { returnType: types_1.TriggerReturnType.FIRST, resolve: false };
        case types_1.ProxyType.UNTIL_TRUE:
            return { returnType: types_1.TriggerReturnType.UNTIL_TRUE, resolve: false };
        case types_1.ProxyType.UNTIL_FALSE:
            return {
                returnType: types_1.TriggerReturnType.UNTIL_FALSE,
                resolve: false,
            };
        case types_1.ProxyType.FIRST_NON_EMPTY:
            return {
                returnType: types_1.TriggerReturnType.FIRST_NON_EMPTY,
                resolve: false,
            };
        case types_1.ProxyType.RESOLVE_ALL:
            return {
                returnType: types_1.TriggerReturnType.ALL,
                resolve: true,
            };
        case types_1.ProxyType.RESOLVE_MERGE:
            return {
                returnType: types_1.TriggerReturnType.MERGE,
                resolve: true,
            };
        case types_1.ProxyType.RESOLVE_CONCAT:
            return {
                returnType: types_1.TriggerReturnType.CONCAT,
                resolve: true,
            };
        case types_1.ProxyType.RESOLVE_FIRST:
            return {
                returnType: types_1.TriggerReturnType.FIRST,
                resolve: true,
            };
        case types_1.ProxyType.RESOLVE_FIRST_NON_EMPTY:
            return {
                returnType: types_1.TriggerReturnType.FIRST_NON_EMPTY,
                resolve: true,
            };
        case types_1.ProxyType.RESOLVE_LAST:
            return {
                returnType: types_1.TriggerReturnType.LAST,
                resolve: true,
            };
        case types_1.ProxyType.RESOLVE_PIPE:
            return {
                returnType: types_1.TriggerReturnType.PIPE,
                resolve: true,
            };
        default:
            return { returnType: null, resolve: false };
    }
}
function createEventBus(eventBusOptions) {
    const events = new Map();
    let currentTagsFilter = null;
    let interceptor = null;
    const proxyListeners = [];
    const eventSources = [];
    const asterisk = (0, event_1.createEvent)();
    const errorEvent = (0, event_1.createEvent)();
    const _getProxyListener = ({ remoteEventName, localEventName, returnType, resolve, localEventNamePrefix, }) => {
        let listener = proxyListeners.find((listener) => listener.returnType === returnType
            && listener.resolve === resolve
            && listener.localEventName === localEventName
            && listener.remoteEventName === remoteEventName
            && listener.localEventNamePrefix === localEventNamePrefix);
        if (!listener) {
            listener = {
                localEventName,
                remoteEventName,
                localEventNamePrefix,
                returnType,
                resolve,
                listener: remoteEventName === "*"
                    ? (eventName, args) => {
                        const name = localEventName
                            ? localEventName
                            : localEventNamePrefix
                                ? `${localEventNamePrefix}${eventName}`
                                : eventName;
                        return _trigger(name, 
                        // @ts-expect-error
                        args, returnType, resolve);
                    }
                    : (...args) => {
                        const name = localEventName
                            ? localEventName
                            : localEventNamePrefix
                                ? `${localEventNamePrefix}${remoteEventName}`
                                : remoteEventName;
                        return _trigger(name, 
                        // @ts-expect-error
                        args, returnType, resolve);
                    },
            };
            proxyListeners.push(listener);
        }
        return listener;
    };
    const add = (name, options) => {
        if (!events.has(name)) {
            events.set(name, (0, event_1.createEvent)(options));
        }
    };
    const _getOrAddEvent = (name) => {
        var _a;
        if (!events.has(name)) {
            events.set(name, (0, event_1.createEvent)((_a = eventBusOptions === null || eventBusOptions === void 0 ? void 0 : eventBusOptions.eventOptions) === null || _a === void 0 ? void 0 : _a[name]));
        }
        return events.get(name);
    };
    const intercept = (fn) => {
        interceptor = fn;
    };
    const stopIntercepting = () => {
        interceptor = null;
    };
    const isIntercepting = () => {
        return interceptor !== null;
    };
    const get = (name) => {
        return _getOrAddEvent(name);
    };
    const on = (name, handler, options) => {
        const e = _getOrAddEvent(name);
        eventSources.forEach((evs) => {
            name;
            if (evs.eventSource.accepts === false
                || (typeof evs.eventSource.accepts === "function"
                    && !evs.eventSource.accepts(name))) {
                return;
            }
            if (evs.subscribed.indexOf(name) === -1) {
                const { returnType, resolve } = proxyReturnTypeToTriggerReturnType(evs.eventSource.proxyType || types_1.ProxyType.TRIGGER);
                const listener = _getProxyListener({
                    localEventName: null,
                    remoteEventName: name,
                    returnType,
                    resolve,
                    localEventNamePrefix: null,
                });
                evs.eventSource.on(name, listener.listener, evs.eventSource, options);
                evs.subscribed.push(name);
            }
        });
        return e.addListener(handler, options);
    };
    const once = (name, handler, options) => {
        options = options || {};
        options.limit = 1;
        return on(name, handler, options);
    };
    const promise = (name, options) => {
        const e = _getOrAddEvent(name);
        return e.promise(options);
    };
    const un = (name, handler, context, tag) => {
        const e = events.get(name);
        if (e) {
            e.removeListener(handler, context, tag);
        }
        if (eventSources.length > 0) {
            const isEmpty = !e.hasListener();
            eventSources.forEach((evs) => {
                const inx = evs.subscribed.indexOf(name);
                if (inx !== -1) {
                    evs.subscribed.splice(inx, 1);
                    if (isEmpty) {
                        const { returnType, resolve } = proxyReturnTypeToTriggerReturnType(evs.eventSource.proxyType || types_1.ProxyType.TRIGGER);
                        const listener = _getProxyListener({
                            localEventName: null,
                            remoteEventName: name,
                            returnType,
                            resolve,
                            localEventNamePrefix: null,
                        });
                        evs.eventSource.un(name, listener.listener, evs.eventSource, tag);
                    }
                }
            });
        }
    };
    const _trigger = (name, args, returnType, resolve) => {
        if (name === "*") {
            return;
        }
        if (interceptor) {
            const result = interceptor(name, args, currentTagsFilter, returnType || null);
            if (result === false) {
                return;
            }
        }
        const e = _getOrAddEvent(name);
        const runner = () => {
            let result;
            switch (returnType) {
                case types_1.TriggerReturnType.RAW:
                    result = e.raw(...args);
                    break;
                case types_1.TriggerReturnType.ALL:
                    result = resolve ? e.resolveAll(...args) : e.all(...args);
                    break;
                case types_1.TriggerReturnType.CONCAT:
                    result = resolve
                        ? e.resolveConcat(...args)
                        : e.concat(...args);
                    break;
                case types_1.TriggerReturnType.MERGE:
                    result = resolve
                        ? e.resolveMerge(...args)
                        : e.merge(...args);
                    break;
                case types_1.TriggerReturnType.LAST:
                    result = resolve ? e.resolveLast(...args) : e.last(...args);
                    break;
                case types_1.TriggerReturnType.PIPE:
                    result = resolve ? e.resolvePipe(...args) : e.pipe(...args);
                    break;
                case types_1.TriggerReturnType.FIRST:
                    result = resolve
                        ? e.resolveFirst(...args)
                        : e.first(...args);
                    break;
                case types_1.TriggerReturnType.UNTIL_TRUE:
                    result = e.untilTrue(...args);
                    break;
                case types_1.TriggerReturnType.UNTIL_FALSE:
                    result = e.untilFalse(...args);
                    break;
                case types_1.TriggerReturnType.FIRST_NON_EMPTY:
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
    const trigger = (name, ...args) => {
        return _trigger(name, args, null, false);
    };
    const first = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.FIRST, false);
    };
    const resolveFirst = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.FIRST, true);
    };
    const all = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.ALL, false);
    };
    const resolveAll = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.ALL, true);
    };
    const last = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.LAST, false);
    };
    const resolveLast = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.LAST, true);
    };
    const merge = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.MERGE, false);
    };
    const resolveMerge = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.MERGE, true);
    };
    const concat = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.CONCAT, false);
    };
    const resolveConcat = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.CONCAT, true);
    };
    const firstNonEmpty = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.FIRST_NON_EMPTY, false);
    };
    const resolveFirstNonEmpty = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.FIRST_NON_EMPTY, true);
    };
    const untilTrue = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.UNTIL_TRUE, false);
    };
    const untilFalse = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.UNTIL_FALSE, false);
    };
    const pipe = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.PIPE, false);
    };
    const resolvePipe = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.PIPE, true);
    };
    const raw = (name, ...args) => {
        const e = _getOrAddEvent(name);
        return _trigger(name, args, types_1.TriggerReturnType.RAW, false);
    };
    const withTags = (tags, callback) => {
        currentTagsFilter = tags;
        const result = callback();
        currentTagsFilter = null;
        return result;
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
    const suspendAll = (withQueue = false) => {
        for (const name in events) {
            events.get(name).suspend(withQueue);
        }
    };
    const resumeAll = () => {
        for (const name in events) {
            events.get(name).resume();
        }
    };
    const relay = ({ eventSource, remoteEventName, localEventName, proxyType, localEventNamePrefix, }) => {
        const { returnType, resolve } = proxyReturnTypeToTriggerReturnType(proxyType || types_1.ProxyType.TRIGGER);
        const listener = _getProxyListener({
            localEventName: localEventName || null,
            remoteEventName,
            returnType,
            resolve,
            localEventNamePrefix: localEventNamePrefix || null,
        });
        if (remoteEventName === "*") {
            eventSource.addAllEventsListener(listener.listener);
        }
        else {
            eventSource.on(remoteEventName, listener.listener);
        }
    };
    const unrelay = ({ eventSource, remoteEventName, localEventName, proxyType, localEventNamePrefix, }) => {
        const { returnType, resolve } = proxyReturnTypeToTriggerReturnType(proxyType || types_1.ProxyType.TRIGGER);
        const listener = _getProxyListener({
            localEventName: localEventName || null,
            remoteEventName,
            returnType,
            resolve,
            localEventNamePrefix: localEventNamePrefix || null,
        });
        if (listener) {
            if (remoteEventName === "*") {
                eventSource.removeAllEventsListener(listener.listener);
            }
            else {
                eventSource.un(remoteEventName, listener.listener);
            }
        }
    };
    const addEventSource = (eventSource) => {
        if (eventSources.find((evs) => evs.eventSource.name === eventSource.name)) {
            return;
        }
        eventSources.push({
            eventSource,
            subscribed: [],
        });
    };
    const removeEventSource = (eventSource) => {
        const inx = eventSources.findIndex((evs) => typeof eventSource === "string"
            || typeof eventSource === "symbol"
            ? evs.eventSource.name === eventSource
            : evs.eventSource.name === eventSource.name);
        if (inx !== -1) {
            const evs = eventSources[inx];
            evs.subscribed.forEach((name) => {
                const { returnType, resolve } = proxyReturnTypeToTriggerReturnType(evs.eventSource.proxyType || types_1.ProxyType.TRIGGER);
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
    };
    return api;
}
