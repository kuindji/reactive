"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createActionMap = createActionMap;
const action_1 = require("./action");
function createActionMap(actions, onAnyError) {
    const errorListenersMap = {};
    for (const key in actions) {
        errorListenersMap[key] = (errorResponse) => {
            if (Array.isArray(onAnyError)) {
                for (const listener of onAnyError) {
                    listener === null || listener === void 0 ? void 0 : listener(Object.assign({ name: key }, errorResponse));
                }
            }
            else {
                onAnyError === null || onAnyError === void 0 ? void 0 : onAnyError(Object.assign({ name: key }, errorResponse));
            }
        };
    }
    const map = {};
    for (const key in actions) {
        const action = (0, action_1.createAction)(actions[key]);
        action.addErrorListener(errorListenersMap[key]);
        map[key] = action;
    }
    return map;
}
