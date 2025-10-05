"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEvent = useEvent;
const react_1 = require("react");
const event_1 = require("../event");
const ErrorBoundary_1 = require("./ErrorBoundary");
function useEvent(eventOptions = {}, listener, errorListener) {
    const boundaryErrorListener = (0, react_1.useContext)(ErrorBoundary_1.ErrorBoundaryContext);
    const listenerRef = (0, react_1.useRef)(listener);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
    const boundaryErrorListenerRef = (0, react_1.useRef)(boundaryErrorListener);
    const event = (0, react_1.useMemo)(() => {
        const event = (0, event_1.createEvent)(eventOptions);
        if (listenerRef.current) {
            event.addListener(listenerRef.current);
        }
        if (errorListenerRef.current) {
            event.addErrorListener(errorListenerRef.current);
        }
        if (boundaryErrorListenerRef.current) {
            event.addErrorListener(boundaryErrorListenerRef.current);
        }
        return event;
    }, []);
    (0, react_1.useEffect)(() => {
        if (listenerRef.current !== listener) {
            if (listenerRef.current) {
                event.removeListener(listenerRef.current);
            }
            listenerRef.current = listener !== null && listener !== void 0 ? listener : null;
            if (listener) {
                event.addListener(listener);
            }
        }
    }, [listener]);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                event.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener !== null && errorListener !== void 0 ? errorListener : null;
            if (errorListener) {
                event.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
    (0, react_1.useEffect)(() => {
        if (boundaryErrorListenerRef.current !== boundaryErrorListener) {
            if (boundaryErrorListenerRef.current) {
                event.removeErrorListener(boundaryErrorListenerRef.current);
            }
            boundaryErrorListenerRef.current = boundaryErrorListener !== null && boundaryErrorListener !== void 0 ? boundaryErrorListener : null;
            if (boundaryErrorListener) {
                event.addErrorListener(boundaryErrorListener);
            }
        }
    }, [boundaryErrorListener]);
    (0, react_1.useEffect)(() => {
        return () => {
            if (listenerRef.current) {
                event.removeListener(listenerRef.current);
                listenerRef.current = null;
            }
            if (errorListenerRef.current) {
                event.removeErrorListener(errorListenerRef.current);
                errorListenerRef.current = null;
            }
            if (boundaryErrorListenerRef.current) {
                event.removeErrorListener(boundaryErrorListenerRef.current);
                boundaryErrorListenerRef.current = null;
            }
            event.removeAllListeners();
        };
    }, []);
    return event;
}
