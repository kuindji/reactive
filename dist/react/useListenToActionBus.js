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
    const listenerRef = (0, react_1.useRef)(listener);
    const errorListenerRef = (0, react_1.useRef)(null);
    const beforeActionListenerRef = (0, react_1.useRef)(null);
    listenerRef.current = listener;
    const genericHandler = (0, react_1.useCallback)((arg) => {
        var _a;
        return (_a = listenerRef.current) === null || _a === void 0 ? void 0 : _a.call(listenerRef, arg);
    }, []);
    (0, react_1.useEffect)(() => {
        return () => {
            actionBusRef.current.removeListener(actionName, genericHandler);
            if (errorListenerRef.current) {
                actionBusRef.current.removeErrorListener(errorListenerRef.current);
            }
            if (beforeActionListenerRef.current) {
                actionBusRef.current.get(actionName)
                    .removeBeforeActionListener(beforeActionListenerRef.current);
            }
        };
    }, []);
    (0, react_1.useEffect)(() => {
        actionBusRef.current.removeListener(actionName, genericHandler);
        actionBusRef.current = actionBus;
        actionBusRef.current.addListener(actionName, genericHandler, options || undefined);
    }, [actionBus]);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                actionBusRef.current.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener || null;
            if (errorListener) {
                actionBusRef.current.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
    (0, react_1.useEffect)(() => {
        if (beforeActionListenerRef.current !== beforeActionListener) {
            if (beforeActionListenerRef.current) {
                actionBusRef.current.get(actionName)
                    .removeBeforeActionListener(beforeActionListenerRef.current);
            }
            beforeActionListenerRef.current = beforeActionListener || null;
            if (beforeActionListener) {
                actionBusRef.current.get(actionName)
                    .addBeforeActionListener(beforeActionListener);
            }
        }
    }, [beforeActionListener]);
}
