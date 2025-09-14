"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useListenToEventBus = useListenToEventBus;
const react_1 = require("react");
function useListenToEventBus(eventBus, eventName, listener, options, errorListener) {
    const listenerRef = (0, react_1.useRef)(listener);
    const eventBusRef = (0, react_1.useRef)(eventBus);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
    listenerRef.current = listener;
    const genericHandler = (0, react_1.useCallback)((...args) => {
        var _a;
        return (_a = listenerRef.current) === null || _a === void 0 ? void 0 : _a.call(listenerRef, ...args);
    }, []);
    (0, react_1.useEffect)(() => {
        return () => {
            eventBusRef.current.removeListener(eventName, genericHandler);
            if (errorListenerRef.current) {
                eventBusRef.current.removeErrorListener(errorListenerRef.current);
            }
        };
    }, []);
    (0, react_1.useEffect)(() => {
        eventBusRef.current.removeListener(eventName, genericHandler);
        eventBusRef.current = eventBus;
        eventBusRef.current.addListener(eventName, genericHandler, options);
    }, [eventBus]);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                eventBusRef.current.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener;
            if (errorListener) {
                eventBusRef.current.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
}
