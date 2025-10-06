import type { ApiType, BaseHandler, ErrorListenerSignature, ErrorResponse } from "./lib/types";
export type ActionResponse<Response extends any = any, Args extends any[] = any[]> = {
    response: Response;
    error: null;
    args: Args;
} | {
    response: null;
    error: string;
    args: Args;
};
export type ListenerSignature<ActionSignature extends BaseHandler> = (arg: ActionResponse<Awaited<ReturnType<ActionSignature>>, Parameters<ActionSignature>>) => void;
export type BeforeActionSignature<ActionSignature extends BaseHandler> = (...args: Parameters<ActionSignature>) => false | void | Promise<false | void>;
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
export declare function createAction<A extends BaseHandler>(action: A): ApiType<ActionDefinitionHelper<A>, {
    readonly invoke: (...args: Parameters<A>) => Promise<ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>>;
    readonly addListener: (handler: ListenerSignature<A>, listenerOptions?: import("./event").ListenerOptions) => void;
    /** @alias addListener */
    readonly on: (handler: ListenerSignature<A>, listenerOptions?: import("./event").ListenerOptions) => void;
    /** @alias addListener */
    readonly subscribe: (handler: ListenerSignature<A>, listenerOptions?: import("./event").ListenerOptions) => void;
    /** @alias addListener */
    readonly listen: (handler: ListenerSignature<A>, listenerOptions?: import("./event").ListenerOptions) => void;
    readonly removeAllListeners: (tag?: string) => void;
    readonly removeListener: (handler: ListenerSignature<A>, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly un: (handler: ListenerSignature<A>, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly off: (handler: ListenerSignature<A>, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly remove: (handler: ListenerSignature<A>, context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly unsubscribe: (handler: ListenerSignature<A>, context?: object | null, tag?: string | null) => boolean;
    readonly promise: (options?: import("./event").ListenerOptions) => Promise<[arg: ActionResponse<Awaited<ReturnType<A>>, Parameters<A>>]>;
    readonly addErrorListener: (handler: ErrorListenerSignature<Parameters<A>>, listenerOptions?: import("./event").ListenerOptions) => void;
    readonly removeAllErrorListeners: (tag?: string) => void;
    readonly removeErrorListener: (handler: ErrorListenerSignature<Parameters<A>>, context?: object | null, tag?: string | null) => boolean;
    readonly errorPromise: (options?: import("./event").ListenerOptions) => Promise<[errorResponse: ErrorResponse<Parameters<A>>]>;
    readonly addBeforeActionListener: (handler: BeforeActionSignature<A>, listenerOptions?: import("./event").ListenerOptions) => void;
    readonly removeAllBeforeActionListeners: (tag?: string) => void;
    readonly removeBeforeActionListener: (handler: BeforeActionSignature<A>, context?: object | null, tag?: string | null) => boolean;
    readonly beforeActionPromise: (options?: import("./event").ListenerOptions) => Promise<Parameters<A>>;
}>;
export type BaseActionDefinition = ActionDefinitionHelper<(...args: [any]) => any>;
export type BaseAction = ReturnType<typeof createAction<(...args: [any]) => any>>;
