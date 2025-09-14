"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EffectEventName = exports.ErrorEventName = exports.ResetEventName = exports.ChangeEventName = exports.BeforeChangeEventName = void 0;
exports.createStore = createStore;
const eventBus_1 = require("./eventBus");
exports.BeforeChangeEventName = "before";
exports.ChangeEventName = "change";
exports.ResetEventName = "reset";
exports.ErrorEventName = "error";
exports.EffectEventName = "effect";
function createStore(initialData = {}) {
    const data = new Map(Object.entries(initialData));
    const changes = (0, eventBus_1.createEventBus)();
    const pipe = (0, eventBus_1.createEventBus)();
    const control = (0, eventBus_1.createEventBus)();
    let effectKeys = [];
    const effectInterceptor = (name, args) => {
        if (name === exports.ChangeEventName) {
            effectKeys.push(...args[0]);
            return false;
        }
        return true;
    };
    const _set = (name, value, triggerChange = true) => {
        var _a, _b, _c, _d, _e;
        const prev = data.get(name);
        if (prev !== value) {
            if (control.firstNonEmpty(exports.BeforeChangeEventName, name, value)
                === false) {
                return;
            }
            const pipeArgs = [value];
            let newValue;
            try {
                newValue = pipe.pipe(name, ...pipeArgs);
            }
            catch (error) {
                control.trigger(exports.ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: pipeArgs,
                    type: "store-pipe",
                    name,
                });
                if ((_a = control.get(exports.ErrorEventName)) === null || _a === void 0 ? void 0 : _a.hasListener()) {
                    return false;
                }
                throw error;
            }
            if (newValue !== undefined) {
                value = newValue;
            }
            data.set(name, value);
            const changeArgs = [
                value,
                prev,
            ];
            try {
                changes.trigger(name, ...changeArgs);
            }
            catch (error) {
                control.trigger(exports.ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: changeArgs,
                    type: "store-change",
                    name,
                });
                if ((_b = control.get(exports.ErrorEventName)) === null || _b === void 0 ? void 0 : _b.hasListener()) {
                    return true;
                }
                throw error;
            }
            if ((_c = control.get(exports.EffectEventName)) === null || _c === void 0 ? void 0 : _c.hasListener()) {
                try {
                    const isIntercepting = control.isIntercepting();
                    if (!isIntercepting) {
                        control.intercept(effectInterceptor);
                    }
                    control.trigger(exports.EffectEventName, name, value);
                    if (!isIntercepting) {
                        control.stopIntercepting();
                    }
                }
                catch (error) {
                    control.trigger(exports.ErrorEventName, {
                        error: error instanceof Error
                            ? error
                            : new Error(String(error)),
                        args: [name],
                        type: "store-control",
                        name,
                    });
                    if ((_d = control.get(exports.ErrorEventName)) === null || _d === void 0 ? void 0 : _d.hasListener()) {
                        return true;
                    }
                    throw error;
                }
            }
            if (triggerChange) {
                try {
                    control.trigger(exports.ChangeEventName, [name, ...effectKeys]);
                    if (!control.isIntercepting()) {
                        effectKeys = [];
                    }
                }
                catch (error) {
                    control.trigger(exports.ErrorEventName, {
                        error: error instanceof Error
                            ? error
                            : new Error(String(error)),
                        args: [name],
                        type: "store-control",
                        name,
                    });
                    if ((_e = control.get(exports.ErrorEventName)) === null || _e === void 0 ? void 0 : _e.hasListener()) {
                        return true;
                    }
                    throw error;
                }
            }
            return true;
        }
        return false;
    };
    function asyncSet(name, value) {
        setTimeout(() => {
            if (typeof name === "string") {
                set(name, value);
            }
            else if (typeof name === "object") {
                set(name);
            }
        }, 0);
    }
    function set(name, value) {
        var _a, _b;
        if (typeof name === "string") {
            _set(name, value);
        }
        else if (typeof name === "object") {
            const changedKeys = [];
            const isIntercepting = control.isIntercepting();
            const hasEffectListener = (_a = control.get(exports.EffectEventName)) === null || _a === void 0 ? void 0 : _a.hasListener();
            if (hasEffectListener && !isIntercepting) {
                control.intercept(effectInterceptor);
            }
            Object.entries(name).forEach(([k, v]) => {
                if (_set(k, v, false)) {
                    changedKeys.push(k);
                }
            });
            try {
                control.trigger(exports.ChangeEventName, [
                    ...changedKeys,
                    ...effectKeys,
                ]);
                if (hasEffectListener && !isIntercepting) {
                    effectKeys = [];
                    control.stopIntercepting();
                }
            }
            catch (error) {
                control.trigger(exports.ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: [name],
                    type: "store-control",
                });
                if ((_b = control.get(exports.ErrorEventName)) === null || _b === void 0 ? void 0 : _b.hasListener()) {
                    return true;
                }
                throw error;
            }
        }
        else {
            throw new Error(`Invalid key: ${String(name)}`);
        }
    }
    const get = (key) => {
        if (typeof key === "string") {
            return data.get(key);
        }
        else if (Array.isArray(key)) {
            // return object with given keys
            return key.reduce((acc, k) => {
                acc[k] = data.get(k);
                return acc;
            }, {});
        }
        else {
            throw new Error(`Invalid key: ${String(key)}`);
        }
    };
    const isEmpty = () => {
        if (data.size === 0) {
            return true;
        }
        return Array.from(data.values()).every((value) => value === null || value === undefined);
    };
    const getData = () => {
        return Object.fromEntries(data.entries());
    };
    const batch = (fn) => {
        const allChangedKeys = [];
        const log = [];
        const controlInterceptor = function (name, [changedKeys]) {
            if (name === exports.ChangeEventName) {
                allChangedKeys.push(...changedKeys);
                return false;
            }
            return true;
        };
        const changeInterceptor = function (propName, args) {
            log.push([propName, args[0], args[1]]);
            return false;
        };
        changes.intercept(changeInterceptor);
        control.intercept(controlInterceptor);
        fn();
        control.stopIntercepting();
        changes.stopIntercepting();
        for (const [propName, value, prev] of log) {
            const changeArgs = [
                value,
                prev,
            ];
            changes.trigger(propName, ...changeArgs);
        }
        if (allChangedKeys.length > 0) {
            control.trigger(exports.ChangeEventName, allChangedKeys);
        }
    };
    const reset = () => {
        data.clear();
        control.trigger(exports.ResetEventName);
    };
    const api = {
        set,
        get,
        getData,
        batch,
        asyncSet,
        isEmpty,
        reset,
        onChange: changes.addListener,
        removeOnChange: changes.removeListener,
        control: control.addListener,
        removeControl: control.removeListener,
        pipe: pipe.addListener,
        removePipe: pipe.removeListener,
    };
    return api;
}
