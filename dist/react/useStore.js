"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStore = useStore;
const react_1 = require("react");
const store_1 = require("../store");
function useStore(initialData = {}, config) {
    const store = (0, react_1.useMemo)(() => {
        const store = (0, store_1.createStore)(initialData);
        if (config === null || config === void 0 ? void 0 : config.onChange) {
            for (const key in config.onChange) {
                store.onChange(key, config.onChange[key]);
            }
        }
        if (config === null || config === void 0 ? void 0 : config.pipes) {
            for (const key in config.pipes) {
                // @ts-expect-error
                store.pipe(key, config.pipes[key]);
            }
        }
        if (config === null || config === void 0 ? void 0 : config.control) {
            for (const key in config.control) {
                store.control(
                // @ts-expect-error
                key, config.control[key]);
            }
        }
        return store;
    }, []);
    return store;
}
