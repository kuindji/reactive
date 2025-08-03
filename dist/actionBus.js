"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActionBus = createActionBus;
const action_1 = require("./action");
const event_1 = require("./event");
function createActionBus(initialActions = {}, errorListener) {
    const actions = new Map();
    const errorEvent = (0, event_1.createEvent)();
    if (errorListener) {
        errorEvent.addListener(({ error, args }) => {
            errorEvent.emit({ error, args, type: "action" });
        });
    }
    const add = (name, action) => {
        if (!actions.has(name)) {
            const a = (0, action_1.createAction)(action);
            a.addErrorListener(({ error, args }) => {
                errorEvent.emit({ name, error, args, type: "action" });
            });
            actions.set(name, a);
        }
    };
    Object.entries(initialActions).forEach(([name, action]) => {
        add(name, action);
    });
    const get = (name) => {
        return actions.get(name);
    };
    const invoke = (name, ...args) => {
        const action = get(name);
        return action.invoke(...args);
    };
    const on = (name, handler, options) => {
        const action = get(name);
        if (!action) {
            throw new Error(`Action ${name} not found`);
        }
        return action.addListener(handler, options);
    };
    const once = (name, handler, options) => {
        options = options || {};
        options.limit = 1;
        const action = get(name);
        if (!action) {
            throw new Error(`Action ${name} not found`);
        }
        return action.addListener(handler, options);
    };
    const un = (name, handler, context, tag) => {
        const action = get(name);
        if (!action) {
            throw new Error(`Action ${name} not found`);
        }
        return action.removeListener(handler, context, tag);
    };
    const api = {
        add,
        get,
        invoke,
        addListener: on,
        /** @alias addListener */
        on,
        /** @alias addListener */
        subscribe: on,
        /** @alias addListener */
        listen: on,
        once,
        removeListener: un,
        /** @alias removeListener */
        off: un,
        /** @alias removeListener */
        remove: un,
        /** @alias removeListener */
        un: un,
        /** @alias removeListener */
        unsubscribe: un,
        addErrorListener: errorEvent.addListener,
        removeErrorListener: errorEvent.removeListener,
    };
    return api;
}
