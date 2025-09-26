"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useActionMap = useActionMap;
const react_1 = require("react");
const actionMap_1 = require("../actionMap");
const ErrorBoundary_1 = require("./ErrorBoundary");
function useActionMap(actions, errorListener) {
    const boundaryErrorListener = (0, react_1.useContext)(ErrorBoundary_1.ErrorBoundaryContext);
    const changeRef = (0, react_1.useRef)(0);
    const actionMap = (0, react_1.useMemo)(() => {
        const errorListeners = [
            ...(errorListener ? [errorListener] : []),
            ...(boundaryErrorListener ? [boundaryErrorListener] : []),
        ].filter(l => l !== undefined);
        const actionMap = (0, actionMap_1.createActionMap)(actions, errorListeners);
        return actionMap;
    }, []);
    (0, react_1.useEffect)(() => {
        if (changeRef.current > 0) {
            throw new Error("useActionMap() does not support changing actions or errorListener");
        }
        changeRef.current++;
    }, [actions, errorListener !== null && errorListener !== void 0 ? errorListener : null, boundaryErrorListener !== null && boundaryErrorListener !== void 0 ? boundaryErrorListener : null]);
    return actionMap;
}
