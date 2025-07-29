import { createEvent } from "./event";
import { ApiType, BaseHandler } from "./lib/types";

export type ActionResponse<
    Response extends any = any,
    Args extends any[] = any[],
> = {
    response: Response;
    error: null;
    request: Args;
} | {
    response: null;
    error: string;
    request: Args;
};

export type ErrorResponse<Args extends any[] = any[]> = {
    error: string;
    request: Args;
};

export type ActionDefinitionHelper<A extends BaseHandler> = {
    actionSignature: A;
    actionArguments: Parameters<A>;
    actionReturnType: Awaited<ReturnType<A>>;
    responseType: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>;
    errorResponseType: ErrorResponse<Parameters<A>>;
    listenerArgument: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>;
    listenerSignature: (
        arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>,
    ) => void;
    errorListenerArgument: ErrorResponse<Parameters<A>>;
    errorListenerSignature: (arg: ErrorResponse<Parameters<A>>) => void;
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
        trigger: triggerError,
        addListener: addErrorListener,
        removeAllListeners: removeAllErrorListeners,
        removeListener: removeErrorListener,
        promise: errorPromise,
    } = createEvent<Action["errorListenerSignature"]>();

    const invoke = async (
        ...args: Action["actionArguments"]
    ): Promise<Action["responseType"]> => {
        try {
            let result = action(...args);
            if (result instanceof Promise) {
                result = await result;
            }
            const response = {
                response: result,
                error: null,
                request: args,
            };
            trigger(response);
            return response;
        }
        catch (error) {
            const response = {
                response: null,
                error: error instanceof Error ? error.message : error as string,
                request: args,
            };
            trigger(response);
            triggerError({
                error: error instanceof Error ? error.message : error as string,
                request: args,
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
        listen: addListener,
        removeAllListeners,
        removeListener,
        /** @alias removeListener */
        un: removeListener,
        /** @alias removeListener */
        off: removeListener,
        /** @alias removeListener */
        remove: removeListener,
        promise,
        addErrorListener,
        removeAllErrorListeners,
        removeErrorListener,
        errorPromise,
    } as const;

    return api as ApiType<Action, typeof api>;
}

export type BaseActionDefinition = ActionDefinitionHelper<
    (...args: [ any ]) => any
>;
export type BaseAction = ReturnType<
    typeof createAction<(...args: [ any ]) => any>
>;
