import { useMemo } from "react";
import { BasePropMap, createStore } from "../store";

export function useStore<
    PropMap extends BasePropMap = BasePropMap,
>(initialData: Partial<PropMap> = {}) {
    const store = useMemo(
        () => createStore<PropMap>(initialData),
        [],
    );
    return store;
}
