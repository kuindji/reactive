import { Simplify } from "type-fest";
import { createEvent } from "./event";
import { BaseHandler } from "./lib/types";

type Prettify<T> = Simplify<T>;

export type ActionResponse<
    Response extends any = any,
    Args extends any[] = any[],
> =
    | {
        response: Response;
        error: null;
        request: Args;
    }
    | {
        response: null;
        error: any;
        request: Args;
    };

export type ErrorResponse<Args extends any[] = any[]> = {
    error: any;
    request: Args;
};

export type ActionDefinitionHelper<A extends BaseHandler> = {
    actionSignature: A;
    actionArguments: Parameters<A>;
    actionReturnType: Awaited<ReturnType<A>>;
    responseType: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>;
    errorResponseType: ErrorResponse<Parameters<A>>;
    eventSignature: (
        ...args: [
            Prettify<ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>>,
        ]
    ) => void;
    errorEventSignature: (
        ...args: [ Prettify<ErrorResponse<Parameters<A>>> ]
    ) => void;
};

export function createAction<A extends BaseHandler>(action: A) {
    type Action = ActionDefinitionHelper<A>;

    const {
        trigger,
        addListener,
        removeAllListeners,
        removeListener,
        promise,
    } = createEvent<Action["eventSignature"]>();

    const {
        trigger: triggerError,
        addListener: addErrorListener,
        removeAllListeners: removeAllErrorListeners,
        removeListener: removeErrorListener,
        promise: errorPromise,
    } = createEvent<Action["errorEventSignature"]>();

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

    return api as Prettify<typeof api>;
}
