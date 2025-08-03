import type { BaseEventBus } from "../../src/eventBus";
import type { ErrorListenerSignature, KeyOf } from "../../src/lib/types";
import type { ListenerOptions } from "../event";
export type { BaseEventBus, ErrorListenerSignature, ListenerOptions };
export declare function useListenToEventBus<TEventBus extends BaseEventBus, TKey extends KeyOf<TEventBus["__type"]["eventSignatures"]>, TListener extends TEventBus["__type"]["eventSignatures"][TKey]>(eventBus: TEventBus, eventName: TKey, listener: TListener, options?: ListenerOptions, errorListener?: ErrorListenerSignature<any[]>): void;
