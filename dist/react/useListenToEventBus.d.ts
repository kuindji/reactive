import type { ListenerOptions } from "../event";
import type { BaseEventBus } from "../eventBus";
import type { ErrorListenerSignature, KeyOf } from "../lib/types";
export type { BaseEventBus, ErrorListenerSignature, ListenerOptions };
export declare function useListenToEventBus<TEventBus extends BaseEventBus, TKey extends KeyOf<TEventBus["__type"]["eventSignatures"]>, TListener extends TEventBus["__type"]["eventSignatures"][TKey]>(eventBus: TEventBus, eventName: TKey, listener: TListener, options?: ListenerOptions, errorListener?: ErrorListenerSignature<any[]>): void;
