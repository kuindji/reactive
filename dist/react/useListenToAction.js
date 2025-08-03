"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useListenToAction = useListenToAction;
const react_1 = require("react");
function useListenToAction(action, listener, errorListener) {
    const listenerRef = (0, react_1.useRef)(listener);
    const actionRef = (0, react_1.useRef)(action);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
    listenerRef.current = listener;
    const genericHandler = (0, react_1.useCallback)((arg) => {
        var _a;
        (_a = listenerRef.current) === null || _a === void 0 ? void 0 : _a.call(listenerRef, arg);
    }, []);
    (0, react_1.useEffect)(() => {
        return () => {
            actionRef.current.removeListener(genericHandler);
            if (errorListenerRef.current) {
                actionRef.current.removeErrorListener(errorListenerRef.current);
            }
        };
    }, []);
    (0, react_1.useEffect)(() => {
        actionRef.current.removeListener(genericHandler);
        actionRef.current = action;
        actionRef.current.addListener(genericHandler);
    }, [action]);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                actionRef.current.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener;
            if (errorListener) {
                actionRef.current.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
}
