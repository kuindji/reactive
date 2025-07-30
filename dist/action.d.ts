import { ApiType, BaseHandler } from "./lib/types";
export type ActionResponse<Response extends any = any, Args extends any[] = any[]> = {
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
    listenerSignature: (arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>) => void;
    errorListenerArgument: ErrorResponse<Parameters<A>>;
    errorListenerSignature: (arg: ErrorResponse<Parameters<A>>) => void;
};
export declare function createAction<A extends BaseHandler>(action: A): ApiType<ActionDefinitionHelper<A>, {
    readonly invoke: (...args: Parameters<A>) => Promise<ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>>;
    readonly addListener: (handler: (arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>) => void, listenerOptions?: import("./event").ListenerOptions) => void;
    /** @alias addListener */
    readonly on: (handler: (arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>) => void, listenerOptions?: import("./event").ListenerOptions) => void;
    /** @alias addListener */
    readonly listen: (handler: (arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>) => void, listenerOptions?: import("./event").ListenerOptions) => void;
    readonly removeAllListeners: (tag?: string) => void;
    readonly removeListener: (handler: (arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>) => void, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly un: (handler: (arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>) => void, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly off: (handler: (arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>) => void, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly remove: (handler: (arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>) => void, context?: object | null, tag?: string | null) => boolean;
    readonly promise: (options?: import("./event").ListenerOptions) => Promise<[arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>]>;
    readonly addErrorListener: (handler: (arg: ErrorResponse<Parameters<A>>) => void, listenerOptions?: import("./event").ListenerOptions) => void;
    readonly removeAllErrorListeners: (tag?: string) => void;
    readonly removeErrorListener: (handler: (arg: ErrorResponse<Parameters<A>>) => void, context?: object | null, tag?: string | null) => boolean;
    readonly errorPromise: (options?: import("./event").ListenerOptions) => Promise<[arg: ErrorResponse<Parameters<A>>]>;
}>;
export type BaseActionDefinition = ActionDefinitionHelper<(...args: [any]) => any>;
export type BaseAction = ReturnType<typeof createAction<(...args: [any]) => any>>;
