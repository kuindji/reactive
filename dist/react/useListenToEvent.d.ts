import type { BaseEvent, ListenerOptions } from "../../src/event";
import type { ErrorListenerSignature } from "../lib/types";
export type { BaseEvent, ErrorListenerSignature, ListenerOptions };
export declare function useListenToEvent<TEvent extends BaseEvent, TListenerSignature extends TEvent["__type"]["signature"], TErrorListenerSignature extends TEvent["__type"]["errorListenerSignature"]>(event: TEvent, listener: TListenerSignature, options?: ListenerOptions, errorListener?: TErrorListenerSignature): void;
