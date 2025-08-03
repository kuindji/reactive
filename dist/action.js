"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAction = createAction;
const event_1 = require("./event");
function createAction(action) {
    const { trigger, addListener, removeAllListeners, removeListener, promise, } = (0, event_1.createEvent)();
    const { trigger: triggerError, addListener: addErrorListener, removeAllListeners: removeAllErrorListeners, removeListener: removeErrorListener, promise: errorPromise, hasListener: hasErrorListeners, } = (0, event_1.createEvent)();
    const invoke = (...args) => __awaiter(this, void 0, void 0, function* () {
        try {
            let result = action(...args);
            if (result instanceof Promise) {
                result = yield result;
            }
            const response = {
                response: result,
                error: null,
                args: args,
            };
            trigger(response);
            return response;
        }
        catch (error) {
            if (!hasErrorListeners()) {
                throw error;
            }
            const response = {
                response: null,
                error: error instanceof Error ? error.message : error,
                args: args,
            };
            trigger(response);
            triggerError({
                error: error instanceof Error
                    ? error
                    : new Error(error),
                args: args,
                type: "action",
            });
            return response;
        }
    });
    const api = {
        invoke,
        addListener,
        /** @alias addListener */
        on: addListener,
        /** @alias addListener */
        subscribe: addListener,
        /** @alias addListener */
        listen: addListener,
        removeAllListeners,
        removeListener,
        /** @alias removeListener */
        un: removeListener,
        /** @alias removeListener */
        off: removeListener,
        /** @alias removeListener */
        remove: removeListener,
        /** @alias removeListener */
        unsubscribe: removeListener,
        promise,
        addErrorListener,
        removeAllErrorListeners,
        removeErrorListener,
        errorPromise,
    };
    return api;
}
