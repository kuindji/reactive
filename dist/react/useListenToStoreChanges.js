"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useListenToStoreChanges = useListenToStoreChanges;
const react_1 = require("react");
function useListenToStoreChanges(store, key, listener, options) {
    const listenerRef = (0, react_1.useRef)(listener);
    const storeRef = (0, react_1.useRef)(store);
    listenerRef.current = listener;
    const genericHandler = (0, react_1.useCallback)((value, previousValue) => {
        return listenerRef.current(value, previousValue);
    }, []);
    (0, react_1.useEffect)(() => {
        return () => {
            storeRef.current.removeOnChange(key, genericHandler);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        storeRef.current.removeOnChange(key, genericHandler);
        storeRef.current = store;
        storeRef.current.onChange(key, genericHandler, options);
    }, [store]);
}
