import { useContext, useEffect, useMemo, useRef } from "react";
import { createAction } from "../action";
import type {
    ActionResponse,
    BeforeActionSignature,
    ListenerSignature,
} from "../action";
import type {
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
} from "../lib/types";
import { ErrorBoundaryContext } from "./ErrorBoundary";

export type {
    ActionResponse,
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
    ListenerSignature,
};

export function useAction<
    ActionSignature extends BaseHandler,
    Listener extends ListenerSignature<ActionSignature>,
    ErrorListener extends ErrorListenerSignature<Parameters<ActionSignature>>,
    BeforeActionListener extends BeforeActionSignature<ActionSignature>,
>(
    actionSignature: ActionSignature,
    listener?: Listener | null,
    errorListener?: ErrorListener | null,
    beforeActionListener?: BeforeActionListener | null,
): ReturnType<typeof createAction<ActionSignature>> {
    const boundaryErrorListener = useContext(
        ErrorBoundaryContext,
    ) as ErrorListener;
    const updateRef = useRef(0);
    const listenerRef = useRef<Listener | null>(listener);
    const errorListenerRef = useRef<ErrorListener | null>(errorListener);
    const boundaryErrorListenerRef = useRef<ErrorListener | null>(
        boundaryErrorListener,
    );
    const beforeActionListenerRef = useRef<BeforeActionListener | null>(
        beforeActionListener,
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
            if (beforeActionListenerRef.current) {
                action.addBeforeActionListener(beforeActionListenerRef.current);
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

    useEffect(
        () => {
            if (beforeActionListenerRef.current !== beforeActionListener) {
                if (beforeActionListenerRef.current) {
                    action.removeBeforeActionListener(
                        beforeActionListenerRef.current,
                    );
                }
                beforeActionListenerRef.current = beforeActionListener ?? null;
                if (beforeActionListener) {
                    action.addBeforeActionListener(beforeActionListener);
                }
            }
        },
        [ beforeActionListener ],
    );

    useEffect(
        () => {
            return () => {
                if (listenerRef.current) {
                    listenerRef.current = null;
                }
                if (errorListenerRef.current) {
                    errorListenerRef.current = null;
                }
                if (boundaryErrorListenerRef.current) {
                    boundaryErrorListenerRef.current = null;
                }
                if (beforeActionListenerRef.current) {
                    beforeActionListenerRef.current = null;
                }
                action.removeAllListeners();
                action.removeAllBeforeActionListeners();
                action.removeAllErrorListeners();
                updateRef.current = 0;
            };
        },
        [],
    );

    return action;
}
