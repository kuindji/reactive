import { createStore } from "../store";
import type { BasePropMap, BeforeChangeEventName, ChangeEventName, ErrorEventName, ResetEventName, StoreDefinitionHelper } from "../store";
export type { BasePropMap, BeforeChangeEventName, ChangeEventName, ErrorEventName, ResetEventName, StoreDefinitionHelper, };
export declare function useStore<PropMap extends BasePropMap, Store extends StoreDefinitionHelper<PropMap> = StoreDefinitionHelper<PropMap>, Config extends {
    onChange?: Partial<Store["changeEvents"]>;
    pipes?: Partial<Store["pipeEvents"]>;
    control?: Partial<Store["controlEvents"]>;
} = {
    onChange?: Partial<Store["changeEvents"]>;
    pipes?: Partial<Store["pipeEvents"]>;
    control?: Partial<Store["controlEvents"]>;
}>(initialData?: Partial<PropMap>, config?: Config): ReturnType<typeof createStore<PropMap>>;
