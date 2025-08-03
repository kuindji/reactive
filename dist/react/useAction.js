"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAction = useAction;
const react_1 = require("react");
const action_1 = require("../action");
const ErrorBoundary_1 = require("./ErrorBoundary");
function useAction(actionSignature, listener, errorListener) {
    const boundaryErrorListener = (0, react_1.useContext)(ErrorBoundary_1.ErrorBoundaryContext);
    const updateRef = (0, react_1.useRef)(0);
    const listenerRef = (0, react_1.useRef)(listener);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
    const boundaryErrorListenerRef = (0, react_1.useRef)(boundaryErrorListener);
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
    return action;
}
