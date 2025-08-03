export type MapKey = string;
export type BaseHandler = (...args: any[]) => any;
export type Simplify<T> = {
    [KeyType in keyof T]: T[KeyType];
} & {};
export type ApiType<TypeDefinition, Api extends object> = Simplify<Api> & {
    __type: TypeDefinition;
};
export type KeyOf<T> = MapKey & keyof T;
export declare enum TriggerReturnType {
    RAW = "raw",
    ALL = "all",
    CONCAT = "concat",
    MERGE = "merge",
    LAST = "last",
    PIPE = "pipe",
    FIRST = "first",
    UNTIL_TRUE = "true",
    UNTIL_FALSE = "false",
    FIRST_NON_EMPTY = "nonempty"
}
export declare enum ProxyType {
    TRIGGER = "trigger",
    RAW = "raw",
    ALL = "all",
    CONCAT = "concat",
    MERGE = "merge",
    LAST = "last",
    PIPE = "pipe",
    FIRST = "first",
    UNTIL_TRUE = "untilTrue",
    UNTIL_FALSE = "untilFalse",
    FIRST_NON_EMPTY = "firstNonEmpty",
    RESOLVE_ALL = "resolveAll",
    RESOLVE_MERGE = "resolveMerge",
    RESOLVE_CONCAT = "resolveConcat",
    RESOLVE_FIRST = "resolveFirst",
    RESOLVE_FIRST_NON_EMPTY = "resolveFirstNonEmpty",
    RESOLVE_LAST = "resolveLast",
    RESOLVE_PIPE = "resolvePipe"
}
export type ReturnableProxyType = ProxyType.RESOLVE_ALL | ProxyType.RESOLVE_MERGE | ProxyType.RESOLVE_CONCAT | ProxyType.RESOLVE_FIRST | ProxyType.RESOLVE_LAST | ProxyType.RESOLVE_FIRST_NON_EMPTY | ProxyType.RESOLVE_PIPE | ProxyType.ALL | ProxyType.MERGE | ProxyType.FIRST | ProxyType.LAST | ProxyType.CONCAT | ProxyType.PIPE | ProxyType.RAW;
export type ErrorResponse<Arguments extends any[] = any[]> = {
    error: Error;
    args: Arguments;
    name?: MapKey;
    type: "action" | "event" | "store-change" | "store-pipe" | "store-control";
};
export type ErrorListenerSignature<Arguments extends any[] = any[]> = (errorResponse: ErrorResponse<Arguments>) => void;
