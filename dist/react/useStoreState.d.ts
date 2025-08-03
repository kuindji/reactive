import { KeyOf } from "../lib/types";
import { BaseStore } from "../store";
export declare function useStoreState<TStore extends BaseStore, TKey extends KeyOf<TStore["__type"]["propTypes"]>>(store: TStore, key: TKey): readonly [TStore["__type"]["propTypes"][TKey], (value: TStore["__type"]["propTypes"][TKey] | ((previousValue?: TStore["__type"]["propTypes"][TKey] | undefined) => TStore["__type"]["propTypes"][TKey])) => void];
