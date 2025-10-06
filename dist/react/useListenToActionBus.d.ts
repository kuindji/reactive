import type { BaseActionBus } from "../actionBus";
import type { ListenerOptions } from "../event";
import type { ErrorListenerSignature, KeyOf } from "../lib/types";
export type { BaseActionBus, ErrorListenerSignature, ListenerOptions };
export declare function useListenToActionBus<TActionBus extends BaseActionBus, TKey extends KeyOf<TActionBus["__type"]["actions"]>, TListener extends TActionBus["__type"]["actions"][TKey]["listenerSignature"], TBeforeActionListener extends TActionBus["__type"]["actions"][TKey]["beforeActionSignature"]>(actionBus: TActionBus, actionName: TKey, listener: TListener | {
    listener: TListener;
    options?: ListenerOptions;
    errorListener?: ErrorListenerSignature<any[]> | null;
    beforeActionListener?: TBeforeActionListener | null;
}, options?: ListenerOptions | null, errorListener?: ErrorListenerSignature<any[]> | null, beforeActionListener?: TBeforeActionListener | null): void;
