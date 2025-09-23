"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useListenToActionBus = useListenToActionBus;
const react_1 = require("react");
function useListenToActionBus(actionBus, actionName, listener, options, errorListener) {
    const listenerRef = (0, react_1.useRef)(listener);
    const actionBusRef = (0, react_1.useRef)(actionBus);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
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
        };
    }, []);
    (0, react_1.useEffect)(() => {
        actionBusRef.current.removeListener(actionName, genericHandler);
        actionBusRef.current = actionBus;
        actionBusRef.current.addListener(actionName, genericHandler, options);
    }, [actionBus]);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                actionBusRef.current.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener;
            if (errorListener) {
                actionBusRef.current.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
}
