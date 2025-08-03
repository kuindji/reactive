"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useActionBus = useActionBus;
const react_1 = require("react");
const actionBus_1 = require("../actionBus");
const ErrorBoundary_1 = require("./ErrorBoundary");
function useActionBus(initialActions, errorListener) {
    const boundaryErrorListener = (0, react_1.useContext)(ErrorBoundary_1.ErrorBoundaryContext);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
    const boundaryErrorListenerRef = (0, react_1.useRef)(boundaryErrorListener);
    const actionBus = (0, react_1.useMemo)(() => {
        const actionBus = (0, actionBus_1.createActionBus)(initialActions);
        if (errorListener) {
            actionBus.addErrorListener(errorListener);
        }
        if (boundaryErrorListener) {
            actionBus.addErrorListener(boundaryErrorListener);
        }
        return actionBus;
    }, []);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                actionBus.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener !== null && errorListener !== void 0 ? errorListener : null;
            if (errorListener) {
                actionBus.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
    (0, react_1.useEffect)(() => {
        if (boundaryErrorListenerRef.current !== boundaryErrorListener) {
            if (boundaryErrorListenerRef.current) {
                actionBus.removeErrorListener(boundaryErrorListenerRef.current);
            }
            boundaryErrorListenerRef.current = boundaryErrorListener !== null && boundaryErrorListener !== void 0 ? boundaryErrorListener : null;
            if (boundaryErrorListener) {
                actionBus.addErrorListener(boundaryErrorListener);
            }
        }
    }, [boundaryErrorListener]);
    return actionBus;
}
