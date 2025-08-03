"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useListenToEvent = useListenToEvent;
const react_1 = require("react");
function useListenToEvent(event, listener, options, errorListener) {
    const listenerRef = (0, react_1.useRef)(listener);
    const eventRef = (0, react_1.useRef)(event);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
    listenerRef.current = listener;
    const genericHandler = (0, react_1.useCallback)((...args) => {
        return listenerRef.current(...args);
    }, []);
    (0, react_1.useEffect)(() => {
        return () => {
            eventRef.current.removeListener(genericHandler);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        eventRef.current.removeListener(genericHandler);
        eventRef.current = event;
        eventRef.current.addListener(genericHandler, options);
    }, [event]);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                eventRef.current.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener;
            if (errorListener) {
                eventRef.current.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
}
