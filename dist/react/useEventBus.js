"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useEventBus = useEventBus;
const react_1 = require("react");
const eventBus_1 = require("../eventBus");
const ErrorBoundary_1 = require("./ErrorBoundary");
function useEventBus(eventBusOptions, allEventsListener, errorListener) {
    const boundaryErrorListener = (0, react_1.useContext)(ErrorBoundary_1.ErrorBoundaryContext);
    const updateRef = (0, react_1.useRef)(0);
    const errorListenerRef = (0, react_1.useRef)(errorListener);
    const allEventsListenerRef = (0, react_1.useRef)(allEventsListener);
    const boundaryErrorListenerRef = (0, react_1.useRef)(boundaryErrorListener);
    const eventBus = (0, react_1.useMemo)(() => {
        const eventBus = (0, eventBus_1.createEventBus)(eventBusOptions);
        if (allEventsListener) {
            eventBus.addAllEventsListener(allEventsListener);
        }
        if (errorListener) {
            eventBus.addErrorListener(errorListener);
        }
        if (boundaryErrorListener) {
            eventBus.addErrorListener(boundaryErrorListener);
        }
        return eventBus;
    }, []);
    (0, react_1.useEffect)(() => {
        if (updateRef.current > 0) {
            throw new Error("EventBus options can't be updated");
        }
        updateRef.current++;
    }, [eventBusOptions]);
    (0, react_1.useEffect)(() => {
        if (allEventsListenerRef.current !== allEventsListener) {
            if (allEventsListenerRef.current) {
                eventBus.removeAllEventsListener(allEventsListenerRef.current);
            }
            allEventsListenerRef.current = allEventsListener;
            if (allEventsListener) {
                eventBus.addAllEventsListener(allEventsListener);
            }
        }
    }, [allEventsListener]);
    (0, react_1.useEffect)(() => {
        if (errorListenerRef.current !== errorListener) {
            if (errorListenerRef.current) {
                eventBus.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener;
            if (errorListener) {
                eventBus.addErrorListener(errorListener);
            }
        }
    }, [errorListener]);
    (0, react_1.useEffect)(() => {
        if (boundaryErrorListenerRef.current !== boundaryErrorListener) {
            if (boundaryErrorListenerRef.current) {
                eventBus.removeErrorListener(boundaryErrorListenerRef.current);
            }
            boundaryErrorListenerRef.current = boundaryErrorListener;
            if (boundaryErrorListener) {
                eventBus.addErrorListener(boundaryErrorListener);
            }
        }
    }, [boundaryErrorListener]);
    return eventBus;
}
