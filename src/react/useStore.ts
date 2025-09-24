import { useMemo } from "react";
import { createStore } from "../store";
import type {
    BasePropMap,
    BeforeChangeEventName,
    ChangeEventName,
    ErrorEventName,
    ResetEventName,
    StoreDefinitionHelper,
} from "../store";

export type {
    BasePropMap,
    BeforeChangeEventName,
    ChangeEventName,
    ErrorEventName,
    ResetEventName,
    StoreDefinitionHelper,
};

export function useStore<
    PropMap extends BasePropMap,
    Store extends StoreDefinitionHelper<PropMap> = StoreDefinitionHelper<
        PropMap
    >,
    Config extends {
        onChange?: Partial<Store["changeEvents"]>;
        pipes?: Partial<Store["pipeEvents"]>;
        control?: Partial<Store["controlEvents"]>;
    } = {
        onChange?: Partial<Store["changeEvents"]>;
        pipes?: Partial<Store["pipeEvents"]>;
        control?: Partial<Store["controlEvents"]>;
    },
>(
    initialData: Partial<PropMap> = {},
    config?: Config,
): ReturnType<typeof createStore<PropMap>> {
    const store = useMemo(
        () => {
            const store = createStore<PropMap>(initialData);

            if (config?.onChange) {
                for (const key in config.onChange) {
                    store.onChange(key, config.onChange[key]!);
                }
            }
            if (config?.pipes) {
                for (const key in config.pipes) {
                    // @ts-expect-error
                    store.pipe(key, config.pipes[key]!);
                }
            }
            if (config?.control) {
                for (const key in config.control) {
                    store.control(
                        // @ts-expect-error
                        key,
                        config.control[key],
                    );
                }
            }
            return store;
        },
        [],
    );

    return store;
}
