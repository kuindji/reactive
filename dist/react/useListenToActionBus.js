"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useListenToActionBus = useListenToActionBus;
const react_1 = require("react");
function useListenToActionBus(actionBus, actionName, listener, options, errorListener, beforeActionListener) {
    if (listener && typeof listener !== "function") {
        options = listener.options;
        errorListener = listener.errorListener;
        beforeActionListener = listener.beforeActionListener;
        listener = listener.listener;
    }
    const actionBusRef = (0, react_1.useRef)(actionBus);
    const listenerRef = (0, react_1.useRef)(listener || null);
    const errorListenerRef = (0, react_1.useRef)(null);
    const beforeActionListenerRef = (0, react_1.useRef)(null);
    listenerRef.current = listener || null;
    errorListenerRef.current = errorListener || null;
    beforeActionListenerRef.current = beforeActionListener || null;
    const genericHandler = (0, react_1.useCallback)((arg) => {
        var _a;
        return (_a = listenerRef.current) === null || _a === void 0 ? void 0 : _a.call(listenerRef, arg);
    }, []);
    const genericBeforeActionHandler = (0, react_1.useCallback)((...args) => {
        var _a;
        return ((_a = beforeActionListenerRef.current) === null || _a === void 0 ? void 0 : _a.call(beforeActionListenerRef, ...args)) || undefined;
    }, []);
    const genericErrorListener = (0, react_1.useCallback)((arg) => {
        var _a;
        return (_a = errorListenerRef.current) === null || _a === void 0 ? void 0 : _a.call(errorListenerRef, arg);
    }, []);
    (0, react_1.useEffect)(() => {
        return () => {
            actionBusRef.current.removeListener(actionName, genericHandler);
            actionBusRef.current.get(actionName)
                .removeBeforeActionListener(genericBeforeActionHandler);
            actionBusRef.current.removeErrorListener(genericErrorListener);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        actionBusRef.current.removeListener(actionName, genericHandler);
        actionBusRef.current.get(actionName)
            .removeBeforeActionListener(genericBeforeActionHandler);
        actionBusRef.current.removeErrorListener(genericErrorListener);
        actionBusRef.current = actionBus;
        actionBusRef.current.addListener(actionName, genericHandler, options || undefined);
        actionBusRef.current.get(actionName)
            .addBeforeActionListener(genericBeforeActionHandler);
        actionBusRef.current.addErrorListener(genericErrorListener);
    }, [actionBus]);
}
