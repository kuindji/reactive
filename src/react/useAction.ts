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
    listener?: Listener,
    errorListener?: ErrorListener,
) {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListener;
    const updateRef = useRef(0);
    const listenerRef = useRef<Listener>(listener);
    const errorListenerRef = useRef<ErrorListener>(errorListener);
    const boundaryErrorListenerRef = useRef<ErrorListener>(
        boundaryErrorListener,
    );

    const action = useMemo(
        () => createAction<ActionSignature>(actionSignature),
        [],
    );

    useEffect(
        () => {
            if (updateRef.current > 0) {
                throw new Error("Action cannot be updated");
            }
            updateRef.current++;
        },
        [ action ],
    );

    useEffect(
        () => {
            if (listenerRef.current) {
                action.removeListener(listenerRef.current);
            }
            listenerRef.current = listener;
            if (listener) {
                action.addListener(listener);
            }
        },
        [ listener ],
    );

    useEffect(
        () => {
            if (errorListenerRef.current) {
                action.removeErrorListener(errorListenerRef.current);
            }
            errorListenerRef.current = errorListener;
            if (errorListener) {
                action.addErrorListener(errorListener);
            }
        },
        [ errorListener ],
    );

    useEffect(
        () => {
            if (boundaryErrorListenerRef.current) {
                action.removeErrorListener(boundaryErrorListenerRef.current);
            }
            boundaryErrorListenerRef.current = boundaryErrorListener;
            if (boundaryErrorListener) {
                action.addErrorListener(boundaryErrorListener);
            }
        },
        [ boundaryErrorListener ],
    );

    return action;
}
