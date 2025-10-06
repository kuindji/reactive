"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAction = useAction;
const react_1 = require("react");
const action_1 = require("../action");
const ErrorBoundary_1 = require("./ErrorBoundary");
function useAction(actionSignature, listener, errorListener, beforeActionListener) {
    const boundaryErrorListener = (0, react_1.useContext)(ErrorBoundary_1.ErrorBoundaryContext);
    const updateRef = (0, react_1.useRef)(0);
    const listenerRef = (0, react_1.useRef)(listener);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
    const boundaryErrorListenerRef = (0, react_1.useRef)(boundaryErrorListener);
    const beforeActionListenerRef = (0, react_1.useRef)(beforeActionListener);
    const action = (0, react_1.useMemo)(() => {
        const action = (0, action_1.createAction)(actionSignature);
        if (listenerRef.current) {
            action.addListener(listenerRef.current);
        }
        if (errorListenerRef.current) {
            action.addErrorListener(errorListenerRef.current);
        }
        if (boundaryErrorListenerRef.current) {
            action.addErrorListener(boundaryErrorListenerRef.current);
        }
        if (beforeActionListenerRef.current) {
            action.addBeforeActionListener(beforeActionListenerRef.current);
        }
        return action;
    }, []);
    (0, react_1.useEffect)(() => {
        if (updateRef.current > 0) {
            throw new Error("Action cannot be updated");
        }
        updateRef.current++;
    }, [actionSignature]);
    (0, react_1.useEffect)(() => {
        if (listenerRef.current !== listener) {
            if (listenerRef.current) {
                action.removeListener(listenerRef.current);
            }
            listenerRef.current = listener !== null && listener !== void 0 ? listener : null;
            if (listener) {
                action.addListener(listener);
            }
        }
    }, [listener]);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                action.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener !== null && errorListener !== void 0 ? errorListener : null;
            if (errorListener) {
                action.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
    (0, react_1.useEffect)(() => {
        if (boundaryErrorListenerRef.current !== boundaryErrorListener) {
            if (boundaryErrorListenerRef.current) {
                action.removeErrorListener(boundaryErrorListenerRef.current);
            }
            boundaryErrorListenerRef.current = boundaryErrorListener !== null && boundaryErrorListener !== void 0 ? boundaryErrorListener : null;
            if (boundaryErrorListener) {
                action.addErrorListener(boundaryErrorListener);
            }
        }
    }, [boundaryErrorListener]);
    (0, react_1.useEffect)(() => {
        if (beforeActionListenerRef.current !== beforeActionListener) {
            if (beforeActionListenerRef.current) {
                action.removeBeforeActionListener(beforeActionListenerRef.current);
            }
            beforeActionListenerRef.current = beforeActionListener !== null && beforeActionListener !== void 0 ? beforeActionListener : null;
            if (beforeActionListener) {
                action.addBeforeActionListener(beforeActionListener);
            }
        }
    }, [beforeActionListener]);
    (0, react_1.useEffect)(() => {
        return () => {
            if (listenerRef.current) {
                listenerRef.current = null;
            }
            if (errorListenerRef.current) {
                errorListenerRef.current = null;
            }
            if (boundaryErrorListenerRef.current) {
                boundaryErrorListenerRef.current = null;
            }
            if (beforeActionListenerRef.current) {
                beforeActionListenerRef.current = null;
            }
            action.removeAllListeners();
            action.removeAllBeforeActionListeners();
            action.removeAllErrorListeners();
            updateRef.current = 0;
        };
    }, []);
    return action;
}
