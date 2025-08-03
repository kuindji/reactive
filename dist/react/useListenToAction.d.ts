import type { BaseAction } from "../action";
export type { BaseAction };
export declare function useListenToAction<TAction extends BaseAction, TListenerSignature extends TAction["__type"]["listenerSignature"] = TAction["__type"]["listenerSignature"], TErrorListenerSignature extends TAction["__type"]["errorListenerSignature"] = TAction["__type"]["errorListenerSignature"]>(action: TAction, listener: TListenerSignature | null, errorListener?: TErrorListenerSignature): void;
