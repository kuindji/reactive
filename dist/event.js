"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
const asyncCall_1 = require("./lib/asyncCall");
const listenerSorter_1 = require("./lib/listenerSorter");
const tagsIntersect_1 = require("./lib/tagsIntersect");
const types_1 = require("./lib/types");
function createEvent(eventOptions = {}) {
    let listeners = [];
    let errorListeners = [];
    let queue = [];
    let suspended = false;
    let queued = false;
    let triggered = 0;
    let lastTrigger = null;
    let sortListeners = false;
    let currentTagsFilter = null;
    const options = Object.assign({ async: null, limit: null, autoTrigger: null, filter: null, filterContext: null, maxListeners: 1000 }, eventOptions);
    const addListener = (handler, listenerOptions = {}) => {
        if (!handler) {
            return;
        }
        if (listeners.find((l) => l.handler === handler && l.context === listenerOptions.context)) {
            return;
        }
        if (listeners.length >= options.maxListeners) {
            throw new Error(`Max listeners (${options.maxListeners}) reached`);
        }
        const listener = Object.assign({ handler, called: 0, count: 0, index: listeners.length, start: 1, context: null, tags: [], extraData: null, first: false, alwaysFirst: false, alwaysLast: false, limit: 0, async: null }, listenerOptions);
        if (listener.async === true) {
            listener.async = 1;
        }
        if (listenerOptions.first === true
            || listenerOptions.alwaysFirst === true) {
            listeners.unshift(listener);
        }
        else {
            listeners.push(listener);
        }
        if (sortListeners) {
            listeners.forEach((l, inx) => {
                l.index = inx;
            });
            listeners.sort((l1, l2) => (0, listenerSorter_1.default)(l1, l2));
        }
        if ((listenerOptions === null || listenerOptions === void 0 ? void 0 : listenerOptions.alwaysFirst) === true
            || (listenerOptions === null || listenerOptions === void 0 ? void 0 : listenerOptions.alwaysLast) === true) {
            sortListeners = true;
        }
        if (options.autoTrigger
            && lastTrigger !== null
            && !suspended) {
            const prevFilter = options.filter;
            options.filter = (args, l) => {
                if (l && l.handler === handler) {
                    return prevFilter ? prevFilter(args, l) !== false : true;
                }
                return false;
            };
            _trigger(lastTrigger);
            options.filter = prevFilter;
        }
    };
    const removeListener = (handler, context, tag) => {
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
    const hasListener = (handler, context, tag) => {
        if (handler) {
            return (listeners.findIndex((l) => {
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
            }) !== -1);
        }
        if (tag) {
            return (listeners.findIndex((l) => l.tags && l.tags.indexOf(tag) !== -1) !== -1);
        }
        else {
            return listeners.length > 0;
        }
    };
    const removeAllListeners = (tag) => {
        if (tag) {
            listeners = listeners.filter((l) => {
                return !l.tags || l.tags.indexOf(tag) === -1;
            });
        }
        else {
            listeners = [];
        }
    };
    const addErrorListener = (handler, context) => {
        if (listeners.find((l) => l.handler === handler && l.context === context)) {
            return;
        }
        errorListeners.push({ handler, context });
    };
    const removeErrorListener = (handler, context) => {
        const inx = errorListeners.findIndex((l) => l.handler === handler && l.context === context);
        if (inx === -1) {
            return false;
        }
        errorListeners.splice(inx, 1);
        return true;
    };
    const suspend = (withQueue = false) => {
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
    const setOptions = (eventOptions) => {
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
    const _listenerCall = (listener, args, resolve = null) => {
        let isAsync = listener.async;
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
                ? (0, asyncCall_1.default)(listener.handler, listener.context, args, isAsync)
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
        }
        catch (error) {
            for (const errorListener of errorListeners) {
                errorListener.handler({
                    error: error instanceof Error
                        ? error
                        : new Error(error),
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
    const _listenerCallWPrev = (listener, args, prevValue, returnType) => {
        if (returnType === types_1.TriggerReturnType.PIPE) {
            args[0] = prevValue;
            // since we don't user listener's arg transformer,
            // we don't need to prepare args
            // args = _prepareListenerArgs(args);
            return _listenerCall(listener, args);
        }
        else if (returnType === types_1.TriggerReturnType.UNTIL_TRUE
            && prevValue === true) {
            return true;
        }
        else if (returnType === types_1.TriggerReturnType.UNTIL_FALSE
            && prevValue === false) {
            return false;
        }
        else if (returnType === types_1.TriggerReturnType.FIRST_NON_EMPTY
            && prevValue !== null
            && prevValue !== undefined) {
            return prevValue;
        }
        return _listenerCall(listener, args);
    };
    const _trigger = (args, returnType = null, tags) => {
        if (queued) {
            queue.push([args, returnType]);
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
            lastTrigger = args.slice();
        }
        // in pipe mode if there is no listeners,
        // we just return piped value
        if (listeners.length === 0) {
            if (returnType === types_1.TriggerReturnType.PIPE) {
                return args.length > 0 ? args[0] : undefined;
            }
            else if (returnType === types_1.TriggerReturnType.ALL
                || returnType === types_1.TriggerReturnType.CONCAT
                || returnType === types_1.TriggerReturnType.RAW) {
                return [];
            }
            else if (returnType === types_1.TriggerReturnType.MERGE) {
                return {};
            }
            return;
        }
        const listenersQueue = listeners.slice();
        const isConsequent = returnType === types_1.TriggerReturnType.PIPE
            || returnType === types_1.TriggerReturnType.UNTIL_TRUE
            || returnType === types_1.TriggerReturnType.UNTIL_FALSE
            || returnType === types_1.TriggerReturnType.FIRST_NON_EMPTY;
        let listener;
        let listenerResult;
        const results = [];
        let hasPromises = false;
        while ((listener = listenersQueue.shift())) {
            if (!listener) {
                continue;
            }
            if (options.filter
                && options.filter.call(options.filterContext, args, listener)
                    === false) {
                continue;
            }
            if (tags
                && tags.length > 0
                && (!listener.tags || !(0, tagsIntersect_1.default)(tags, listener.tags))) {
                continue;
            }
            if (currentTagsFilter !== null
                && currentTagsFilter.length > 0
                && !(0, tagsIntersect_1.default)(currentTagsFilter, listener.tags)) {
                continue;
            }
            listener.count++;
            if (listener.start !== undefined
                && listener.start !== null
                && listener.count < listener.start) {
                continue;
            }
            if (isConsequent && results.length > 0) {
                let prev = results[results.length - 1];
                if (hasPromises) {
                    const prevPromise = prev instanceof Promise
                        ? prev
                        : Promise.resolve(prev);
                    listenerResult = prevPromise.then(((listener, args, returnType) => (value) => {
                        return _listenerCallWPrev(listener, args, value, returnType);
                    })(listener, args, returnType));
                }
                else {
                    listenerResult = _listenerCallWPrev(listener, args, 
                    // no promises here
                    prev, returnType);
                }
            }
            else {
                listenerResult = _listenerCall(listener, args);
            }
            listener.called++;
            if (listener.called === listener.limit) {
                removeListener(listener.handler, listener.context);
            }
            if (returnType === types_1.TriggerReturnType.FIRST) {
                return listenerResult;
            }
            if (isConsequent) {
                switch (returnType) {
                    case types_1.TriggerReturnType.UNTIL_TRUE: {
                        if (listenerResult === true) {
                            return true;
                        }
                        break;
                    }
                    case types_1.TriggerReturnType.UNTIL_FALSE: {
                        if (listenerResult === false) {
                            return false;
                        }
                        break;
                    }
                    case types_1.TriggerReturnType.FIRST_NON_EMPTY: {
                        if (!hasPromises
                            && !(listenerResult instanceof Promise)
                            && listenerResult !== null
                            && listenerResult !== undefined) {
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
            case types_1.TriggerReturnType.RAW: {
                return results;
            }
            case undefined:
            case null: {
                if (hasPromises) {
                    return Promise.all(results).then(() => undefined);
                }
                return;
            }
            case types_1.TriggerReturnType.ALL: {
                return hasPromises
                    ? Promise.all(results)
                    : results;
            }
            case types_1.TriggerReturnType.CONCAT: {
                return hasPromises
                    ? Promise.all(results).then((results) => results.flat())
                    : results.flat();
            }
            case types_1.TriggerReturnType.MERGE: {
                return hasPromises
                    ? Promise.all(results).then((results) => Object.assign.apply(null, [{}, ...results]))
                    : Object.assign.apply(null, [{}, ...results]);
            }
            case types_1.TriggerReturnType.LAST: {
                return results.pop();
            }
            case types_1.TriggerReturnType.UNTIL_TRUE: {
                return;
            }
            case types_1.TriggerReturnType.UNTIL_FALSE: {
                return;
            }
            case types_1.TriggerReturnType.FIRST_NON_EMPTY: {
                return Promise.all(results).then((results) => results.find((r) => r !== undefined && r !== null));
            }
            case types_1.TriggerReturnType.PIPE: {
                return results[results.length - 1];
            }
        }
    };
    const trigger = (...args) => {
        _trigger(args);
    };
    const withTags = (tags, callback) => {
        currentTagsFilter = tags;
        const result = callback();
        currentTagsFilter = null;
        return result;
    };
    const promise = (options) => {
        return new Promise((resolve) => {
            options = Object.assign(Object.assign({}, (options || {})), { limit: 1 });
            const l = ((...args) => resolve(args));
            addListener(l, options);
        });
    };
    const first = (...args) => {
        return _trigger(args, types_1.TriggerReturnType.FIRST);
    };
    const resolveFirst = (...args) => {
        const response = _trigger(args, types_1.TriggerReturnType.FIRST);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };
    const all = (...args) => {
        return _trigger(args, types_1.TriggerReturnType.ALL);
    };
    const resolveAll = (...args) => {
        const response = _trigger(args, types_1.TriggerReturnType.ALL);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };
    const last = (...args) => {
        return _trigger(args, types_1.TriggerReturnType.LAST);
    };
    const resolveLast = (...args) => {
        const response = _trigger(args, types_1.TriggerReturnType.LAST);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };
    const merge = (...args) => {
        return _trigger(args, types_1.TriggerReturnType.MERGE);
    };
    const resolveMerge = (...args) => {
        const response = _trigger(args, types_1.TriggerReturnType.MERGE);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };
    const concat = (...args) => {
        return _trigger(args, types_1.TriggerReturnType.CONCAT);
    };
    const resolveConcat = (...args) => {
        const response = _trigger(args, types_1.TriggerReturnType.CONCAT);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };
    const firstNonEmpty = (...args) => {
        return _trigger(args, types_1.TriggerReturnType.FIRST_NON_EMPTY);
    };
    const resolveFirstNonEmpty = (...args) => {
        const response = _trigger(args, types_1.TriggerReturnType.FIRST_NON_EMPTY);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };
    const untilTrue = (...args) => {
        _trigger(args, types_1.TriggerReturnType.UNTIL_TRUE);
    };
    const untilFalse = (...args) => {
        _trigger(args, types_1.TriggerReturnType.UNTIL_FALSE);
    };
    const pipe = (...args) => {
        return _trigger(args, types_1.TriggerReturnType.PIPE);
    };
    const resolvePipe = (...args) => {
        const response = _trigger(args, types_1.TriggerReturnType.PIPE);
        if (response instanceof Promise) {
            return response;
        }
        return Promise.resolve(response);
    };
    const raw = (...args) => {
        return _trigger(args, types_1.TriggerReturnType.RAW);
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
    };
    return api;
}
