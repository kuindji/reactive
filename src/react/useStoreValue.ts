import { KeyOf } from "../lib/types";
import { BaseStore } from "../store";
import { useStoreState } from "./useStoreState";

export function useStoreValue<
    TStore extends BaseStore,
    TKey extends KeyOf<TStore["__type"]["propTypes"]>,
>(store: TStore, key: TKey) {
    const [ value ] = useStoreState(store, key);
    return value;
}
