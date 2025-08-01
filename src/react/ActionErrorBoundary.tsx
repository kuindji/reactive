import { createContext } from "react";
import type { ErrorListenerSignature, ErrorResponse } from "../action";

export type ActionErrorBoundaryProps = {
    children: React.ReactNode;
    onActionError?: ErrorListenerSignature<any>;
};

export type { ErrorListenerSignature, ErrorResponse };

export const ActionErrorBoundaryContext = createContext<
    ErrorListenerSignature<any> | null
>(null);

function ActionErrorBoundary(
    { children, onActionError }: ActionErrorBoundaryProps,
) {
    return (
        <ActionErrorBoundaryContext.Provider value={onActionError || null}>
            {children}
        </ActionErrorBoundaryContext.Provider>
    );
}

export default ActionErrorBoundary;
export { ActionErrorBoundary };
