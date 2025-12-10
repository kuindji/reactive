import { createContext, useCallback, useContext, useRef } from "react";
import type { ErrorListenerSignature, ErrorResponse } from "../lib/types";

export type ErrorBoundaryProps = {
    children: React.ReactNode;
    listener?: ErrorListenerSignature<any>;
};

export type { ErrorListenerSignature, ErrorResponse };

export const ErrorBoundaryContext = createContext<
    ErrorListenerSignature<any> | null
>(null);

function ErrorBoundary(
    { children, listener }: ErrorBoundaryProps,
) {
    const boundaryErrorListener = useContext(ErrorBoundaryContext);
    const thisRef = useRef(listener);
    const outerRef = useRef(boundaryErrorListener);

    // Keep refs in sync with props
    thisRef.current = listener;
    outerRef.current = boundaryErrorListener;

    const thisErrorListener = useCallback(
        (errorResponse: ErrorResponse<any[]>) => {
            if (thisRef.current) {
                thisRef.current(errorResponse);
            }
            else if (outerRef.current) {
                outerRef.current(errorResponse);
            }
            else {
                throw errorResponse.error;
            }
        },
        [],
    );

    return (
        <ErrorBoundaryContext.Provider value={thisErrorListener}>
            {children}
        </ErrorBoundaryContext.Provider>
    );
}

export default ErrorBoundary;
export { ErrorBoundary };
