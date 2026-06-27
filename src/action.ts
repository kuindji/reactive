import { createEvent } from "./event.js";
import isPromiseLike from "./lib/isPromiseLike.js";
import type {
    ApiType,
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
} from "./lib/types.js";

export type ActionResponse<
    Response = any,
    Args extends unknown[] = unknown[],
> = {
    response: Response;
    error: null;
    args: Args;
} | {
    response: null;
    error: string;
    args: Args;
};

export type ListenerSignature<ActionSignature extends BaseHandler> = (
    arg: ActionResponse<
        Awaited<ReturnType<ActionSignature>>,
        Parameters<ActionSignature>
    >,
) => void;

/**
 * Status of an action's `invoke` lifecycle, suitable for driving
 * `loading`/`disabled` UI. `pending` is true while one or more invocations are
 * in flight; `response`/`error` hold the last settled outcome (a before-veto
 * settles to neither). This is not a cache — `response` is just the last value.
 */
export type ActionStatus<Response = any> = {
    pending: boolean;
    error: Error | null;
    response: Response | null;
};

export type StatusListenerSignature<ActionSignature extends BaseHandler> = (
    status: ActionStatus<Awaited<ReturnType<ActionSignature>>>,
) => void;

export type BeforeActionSignature<ActionSignature extends BaseHandler> = (
    ...args: Parameters<ActionSignature>
) => false | void | Promise<false | void>;

export type ActionDefinitionHelper<A extends BaseHandler> = {
    actionSignature: A;
    actionArguments: Parameters<A>;
    actionReturnType: Awaited<ReturnType<A>>;
    responseType: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>;
    errorResponseType: ErrorResponse<Parameters<A>>;
    listenerArgument: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>;
    listenerSignature: ListenerSignature<A>;
    beforeActionSignature: BeforeActionSignature<A>;
    errorListenerArgument: ErrorResponse<Parameters<A>>;
    errorListenerSignature: ErrorListenerSignature<Parameters<A>>;
    statusType: ActionStatus<Awaited<ReturnType<A>>>;
    statusListenerSignature: StatusListenerSignature<A>;
};

export function createAction<A extends BaseHandler>(action: A) {
    type Action = ActionDefinitionHelper<A>;

    // The action function is held in a mutable variable so it can be swapped in
    // place via setAction without disturbing any listeners (response, before
    // and error listeners live in separate events independent of the function).
    let actionFn: A = action;

    const {
        trigger,
        addListener,
        removeAllListeners,
        removeListener,
        updateListenerOptions,
        promise,
        destroy: destroyResponseEvent,
    } = createEvent<Action["listenerSignature"]>();

    const {
        all: triggerBeforeAction,
        addListener: addBeforeActionListener,
        removeAllListeners: removeAllBeforeActionListeners,
        removeListener: removeBeforeActionListener,
        promise: beforeActionPromise,
        destroy: destroyBeforeEvent,
    } = createEvent<Action["beforeActionSignature"]>();

    const {
        trigger: triggerError,
        addListener: addErrorListener,
        removeAllListeners: removeAllErrorListeners,
        removeListener: removeErrorListener,
        promise: errorPromise,
        hasListener: hasErrorListeners,
        destroy: destroyErrorEvent,
    } = createEvent<Action["errorListenerSignature"]>();

    // Status is a side channel over the invoke lifecycle: a dedicated event so
    // a React hook can subscribe through useSyncExternalStore. The status
    // object reference is kept stable and only rebuilt when a field actually
    // changes, which is required for useSyncExternalStore to bail out of
    // redundant renders.
    const {
        trigger: triggerStatus,
        addListener: addStatusListener,
        removeListener: removeStatusListener,
        destroy: destroyStatusEvent,
    } = createEvent<Action["statusListenerSignature"]>();

    let destroyed = false;
    let inFlight = 0;
    let lastResponse: Action["actionReturnType"] | null = null;
    let lastError: Error | null = null;
    let currentStatus: Action["statusType"] = {
        pending: false,
        error: null,
        response: null,
    };

    const updateStatus = () => {
        // The status event may have been torn down while an invocation was in
        // flight; emitting onto it would throw and mask the real outcome.
        if (destroyed) {
            return;
        }
        const pending = inFlight > 0;
        if (
            currentStatus.pending === pending
            && currentStatus.error === lastError
            && currentStatus.response === lastResponse
        ) {
            return;
        }
        currentStatus = {
            pending,
            error: lastError,
            response: lastResponse,
        };
        triggerStatus(currentStatus);
    };

    const getStatus = () => currentStatus;

    const invoke = async (
        ...args: Action["actionArguments"]
    ): Promise<Action["responseType"]> => {
        if (destroyed) {
            throw new Error("Action is destroyed");
        }
        inFlight++;
        updateStatus();
        try {
            type BeforeResult = Awaited<
                ReturnType<Action["beforeActionSignature"]>
            >;
            const beforeResponse = triggerBeforeAction(...args) as
                | BeforeResult[]
                | PromiseLike<BeforeResult[]>;
            const beforeResults = isPromiseLike(beforeResponse)
                ? await Promise.resolve(beforeResponse)
                : beforeResponse;
            for (const before of beforeResults) {
                if (before === false) {
                    // A before-veto is not a UI failure: settle status to
                    // neither response nor error.
                    lastResponse = null;
                    lastError = null;
                    const response = {
                        response: null,
                        error: "Action cancelled",
                        args: args,
                    };
                    // Skip emitting if destroyed mid-flight: the caller still
                    // gets its settled response, but the torn-down event is not
                    // triggered (which would throw "Event is destroyed").
                    if (!destroyed) {
                        trigger(response);
                    }
                    return response;
                }
            }
            let result = actionFn(...args);
            if (isPromiseLike(result)) {
                result = await Promise.resolve(result);
            }
            lastResponse = result;
            lastError = null;
            const response = {
                response: result,
                error: null,
                args: args,
            };
            // A successful invocation must still resolve with its result even if
            // the action was destroyed while awaiting; only skip the emit.
            if (!destroyed) {
                trigger(response);
            }
            return response;
        }
        catch (error) {
            // Record the failure before the re-throw branch so status is
            // correct even when invoke re-throws (no error listener).
            lastError = error instanceof Error
                ? error
                : new Error(error as string);
            lastResponse = null;
            if (!hasErrorListeners()) {
                throw error;
            }
            const response = {
                response: null,
                error: error instanceof Error ? error.message : error as string,
                args: args,
            };
            if (!destroyed) {
                trigger(response);
                triggerError({
                    error: lastError,
                    args: args,
                    type: "action",
                });
            }
            return response;
        }
        finally {
            inFlight--;
            updateStatus();
        }
    };

    const setAction = (nextAction: A) => {
        actionFn = nextAction;
    };

    // One-call teardown: destroy the underlying response/before/error/status
    // events and mark the action dead. Post-destroy invoke/addListener throw
    // rather than silently no-op.
    const destroy = () => {
        destroyResponseEvent();
        destroyBeforeEvent();
        destroyErrorEvent();
        destroyStatusEvent();
        destroyed = true;
    };

    const isDestroyed = () => destroyed;

    const api = {
        invoke,
        setAction,
        destroy,
        isDestroyed,
        getStatus,
        onStatusChange: addStatusListener,
        removeStatusListener,
        addListener,
        /** @alias addListener */
        on: addListener,
        /** @alias addListener */
        subscribe: addListener,
        /** @alias addListener */
        listen: addListener,
        removeAllListeners,
        removeListener,
        /** @alias removeListener */
        un: removeListener,
        /** @alias removeListener */
        off: removeListener,
        /** @alias removeListener */
        remove: removeListener,
        /** @alias removeListener */
        unsubscribe: removeListener,
        updateListenerOptions,
        promise,
        addErrorListener,
        removeAllErrorListeners,
        removeErrorListener,
        errorPromise,

        addBeforeActionListener,
        removeAllBeforeActionListeners,
        removeBeforeActionListener,
        beforeActionPromise,
    } as const;

    return api as ApiType<Action, typeof api>;
}

export type BaseActionDefinition = ActionDefinitionHelper<
    (...args: [any]) => any
>;
export type BaseAction = ReturnType<
    typeof createAction<(...args: [any]) => any>
>;
