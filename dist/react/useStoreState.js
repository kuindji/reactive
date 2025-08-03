"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStoreState = useStoreState;
const react_1 = require("react");
function useStoreState(store, key) {
    const [value, setValue] = (0, react_1.useState)(store.get(key));
    const storeRef = (0, react_1.useRef)(store);
    const keyRef = (0, react_1.useRef)(key);
    const onChange = (0, react_1.useCallback)((value) => {
        setValue(value);
    }, []);
    const setter = (0, react_1.useCallback)((value) => {
        if (typeof value === "function") {
            storeRef.current.set(keyRef.current, value(storeRef.current.get(keyRef.current)));
        }
        else {
            storeRef.current.set(keyRef.current, value);
        }
    }, []);
    (0, react_1.useEffect)(() => {
        return () => {
            storeRef.current.onChange(keyRef.current, onChange);
        };
    }, []);
    (0, react_1.useEffect)(() => {
        storeRef.current.removeOnChange(keyRef.current, onChange);
        storeRef.current = store;
        keyRef.current = key;
        storeRef.current.onChange(keyRef.current, onChange);
    }, [store, key]);
    return [value, setter];
}
