import { useContext, useEffect, useMemo, useRef } from "react";
import {
    type ActionResponse,
    createAction,
    type ListenerSignature,
} from "../action";
import type {
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
} from "../lib/types";
import { ErrorBoundaryContext } from "./ErrorBoundary";

export type {
    ActionResponse,
    ErrorListenerSignature,
    ErrorResponse,
    ListenerSignature,
};

export function useAction<
    ActionSignature extends BaseHandler,
    Listener extends ListenerSignature<ActionSignature>,
    ErrorListener extends ErrorListenerSignature<Parameters<ActionSignature>>,
>(
    actionSignature: ActionSignature,
    listener?: Listener | null,
    errorListener?: ErrorListener | null,
) {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListener;
    const updateRef = useRef(0);
    const listenerRef = useRef<Listener | null>(listener);
    const errorListenerRef = useRef<ErrorListener | null>(errorListener);
    const boundaryErrorListenerRef = useRef<ErrorListener | null>(
        boundaryErrorListener,
    );

    const action = useMemo(
        () => {
            const action = createAction<ActionSignature>(actionSignature);
            if (listenerRef.current) {
                action.addListener(listenerRef.current);
            }
            if (errorListenerRef.current) {
                action.addErrorListener(errorListenerRef.current);
            }
            if (boundaryErrorListenerRef.current) {
                action.addErrorListener(boundaryErrorListenerRef.current);
            }
            return action;
        },
        [],
    );

    useEffect(
        () => {
            if (updateRef.current > 0) {
                throw new Error("Action cannot be updated");
            }
            updateRef.current++;
        },
        [ actionSignature ],
    );

    useEffect(
        () => {
            if (listenerRef.current !== listener) {
                if (listenerRef.current) {
                    action.removeListener(listenerRef.current);
                }
                listenerRef.current = listener ?? null;
                if (listener) {
                    action.addListener(listener);
                }
            }
        },
        [ listener ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current !== errorListener) {
                if (errorListenerRef.current) {
                    action.removeErrorListener(errorListenerRef.current);
                }
                errorListenerRef.current = errorListener ?? null;
                if (errorListener) {
                    action.addErrorListener(errorListener);
                }
            }
        },
        [ errorListener ],
    );

    useEffect(
        () => {
            if (boundaryErrorListenerRef.current !== boundaryErrorListener) {
                if (boundaryErrorListenerRef.current) {
                    action.removeErrorListener(
                        boundaryErrorListenerRef.current,
                    );
                }
                boundaryErrorListenerRef.current = boundaryErrorListener
                    ?? null;
                if (boundaryErrorListener) {
                    action.addErrorListener(boundaryErrorListener);
                }
            }
        },
        [ boundaryErrorListener ],
    );

    return action;
}
