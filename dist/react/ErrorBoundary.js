"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundaryContext = void 0;
exports.ErrorBoundary = ErrorBoundary;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
exports.ErrorBoundaryContext = (0, react_1.createContext)(null);
function ErrorBoundary({ children, listener }) {
    const boundaryErrorListener = (0, react_1.useContext)(exports.ErrorBoundaryContext);
    const thisRef = (0, react_1.useRef)(listener);
    const outerRef = (0, react_1.useRef)(boundaryErrorListener);
    const thisErrorListener = (0, react_1.useCallback)((errorResponse) => {
        if (thisRef.current) {
            thisRef.current(errorResponse);
        }
        else if (outerRef.current) {
            outerRef.current(errorResponse);
        }
        else {
            throw errorResponse.error;
        }
    }, []);
    return ((0, jsx_runtime_1.jsx)(exports.ErrorBoundaryContext.Provider, { value: thisErrorListener, children: children }));
}
exports.default = ErrorBoundary;
