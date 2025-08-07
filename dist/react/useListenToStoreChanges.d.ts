import type { ListenerOptions } from "../event";
import { KeyOf } from "../lib/types";
import type { BaseStore } from "../store";
export type { BaseStore, ListenerOptions };
export declare function useListenToStoreChanges<TStore extends BaseStore, TKey extends KeyOf<TStore["__type"]["propTypes"]>, TListener extends TStore["__type"]["changeEvents"][TKey]>(store: TStore, key: TKey, listener: TListener, options?: ListenerOptions): void;
