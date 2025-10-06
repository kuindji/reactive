import { createEvent } from "./event";
import type {
    ApiType,
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
} from "./lib/types";

export type ActionResponse<
    Response extends any = any,
    Args extends any[] = any[],
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
};

export function createAction<A extends BaseHandler>(action: A) {
    type Action = ActionDefinitionHelper<A>;

    const {
        trigger,
        addListener,
        removeAllListeners,
        removeListener,
        promise,
    } = createEvent<Action["listenerSignature"]>();

    const {
        all: triggerBeforeAction,
        addListener: addBeforeActionListener,
        removeAllListeners: removeAllBeforeActionListeners,
        removeListener: removeBeforeActionListener,
        promise: beforeActionPromise,
    } = createEvent<Action["beforeActionSignature"]>();

    const {
        trigger: triggerError,
        addListener: addErrorListener,
        removeAllListeners: removeAllErrorListeners,
        removeListener: removeErrorListener,
        promise: errorPromise,
        hasListener: hasErrorListeners,
    } = createEvent<Action["errorListenerSignature"]>();

    const invoke = async (
        ...args: Action["actionArguments"]
    ): Promise<Action["responseType"]> => {
        try {
            const beforeResults = triggerBeforeAction(...args);
            for (let before of beforeResults) {
                if (before instanceof Promise) {
                    before = await before;
                }
                if (before === false) {
                    const response = {
                        response: null,
                        error: "Action cancelled",
                        args: args,
                    };
                    trigger(response);
                    return response;
                }
            }
            let result = action(...args);
            if (result instanceof Promise) {
                result = await result;
            }
            const response = {
                response: result,
                error: null,
                args: args,
            };
            trigger(response);
            return response;
        }
        catch (error) {
            if (!hasErrorListeners()) {
                throw error;
            }
            const response = {
                response: null,
                error: error instanceof Error ? error.message : error as string,
                args: args,
            };
            trigger(response);
            triggerError({
                error: error instanceof Error
                    ? error
                    : new Error(error as string),
                args: args,
                type: "action",
            });
            return response;
        }
    };

    const api = {
        invoke,
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
    (...args: [ any ]) => any
>;
export type BaseAction = ReturnType<
    typeof createAction<(...args: [ any ]) => any>
>;
