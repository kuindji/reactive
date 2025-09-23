import type { BaseActionBus } from "../actionBus";
import type { ListenerOptions } from "../event";
import type { ErrorListenerSignature, KeyOf } from "../lib/types";
export type { BaseActionBus, ErrorListenerSignature, ListenerOptions };
export declare function useListenToActionBus<TActionBus extends BaseActionBus, TKey extends KeyOf<TActionBus["__type"]["actions"]>, TListener extends TActionBus["__type"]["actions"][TKey]["listenerSignature"]>(actionBus: TActionBus, actionName: TKey, listener: TListener, options?: ListenerOptions, errorListener?: ErrorListenerSignature<any[]>): void;
