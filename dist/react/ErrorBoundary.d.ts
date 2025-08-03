import type { ErrorListenerSignature, ErrorResponse } from "../lib/types";
export type ErrorBoundaryProps = {
    children: React.ReactNode;
    listener?: ErrorListenerSignature<any>;
};
export type { ErrorListenerSignature, ErrorResponse };
export declare const ErrorBoundaryContext: import("react").Context<ErrorListenerSignature<any> | null>;
declare function ErrorBoundary({ children, listener }: ErrorBoundaryProps): import("react/jsx-runtime").JSX.Element;
export default ErrorBoundary;
export { ErrorBoundary };
