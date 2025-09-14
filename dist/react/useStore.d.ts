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
}>(initialData?: Partial<PropMap>, config?: Config): import("..").ApiType<StoreDefinitionHelper<PropMap>, {
    readonly set: {
        <K extends import("..").KeyOf<PropMap>>(key: K, value: PropMap[K] | undefined): void;
        (key: Partial<PropMap>): void;
    };
    readonly get: <K extends import("..").KeyOf<PropMap> | import("..").KeyOf<PropMap>[]>(key: K) => K extends import("..").KeyOf<PropMap> ? PropMap[K] : K extends import("..").KeyOf<PropMap>[] ? { [AK in K[number]]: PropMap[AK]; } : never;
    readonly getData: () => PropMap;
    readonly batch: (fn: () => void) => void;
    readonly asyncSet: {
        <K extends import("..").KeyOf<PropMap>>(key: K, value: PropMap[K] | undefined): void;
        (key: Partial<PropMap>): void;
    };
    readonly isEmpty: () => boolean;
    readonly reset: () => void;
    readonly onChange: <K extends import("..").KeyOf<import("..").GetEventsMap<{ [K_1 in import("..").KeyOf<PropMap>]: (value: PropMap[K_1] | undefined, previousValue?: PropMap[K_1] | undefined) => void; }>>, H extends import("..").GetEventsMap<{ [K_1 in import("..").KeyOf<PropMap>]: (value: PropMap[K_1] | undefined, previousValue?: PropMap[K_1] | undefined) => void; }>[K]["signature"]>(name: K, handler: H, options?: import("..").ListenerOptions) => void;
    readonly removeOnChange: <K extends import("..").KeyOf<import("..").GetEventsMap<{ [K_1 in import("..").KeyOf<PropMap>]: (value: PropMap[K_1] | undefined, previousValue?: PropMap[K_1] | undefined) => void; }>>, H extends import("..").GetEventsMap<{ [K_1 in import("..").KeyOf<PropMap>]: (value: PropMap[K_1] | undefined, previousValue?: PropMap[K_1] | undefined) => void; }>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    readonly control: <K extends import("..").KeyOf<import("..").GetEventsMap<{
        before: <K_1 extends import("..").KeyOf<PropMap>, V extends PropMap[K_1]>(name: K_1, value: V | undefined) => boolean;
        change: (names: import("..").KeyOf<PropMap>[]) => void;
        reset: () => void;
        error: import("..").ErrorListenerSignature<any[]>;
        effect: <K_1 extends import("..").KeyOf<PropMap>, V_1 extends PropMap[K_1]>(name: K_1, value: V_1 | undefined) => void;
    }>>, H extends import("..").GetEventsMap<{
        before: <K_1 extends import("..").KeyOf<PropMap>, V extends PropMap[K_1]>(name: K_1, value: V | undefined) => boolean;
        change: (names: import("..").KeyOf<PropMap>[]) => void;
        reset: () => void;
        error: import("..").ErrorListenerSignature<any[]>;
        effect: <K_1 extends import("..").KeyOf<PropMap>, V_1 extends PropMap[K_1]>(name: K_1, value: V_1 | undefined) => void;
    }>[K]["signature"]>(name: K, handler: H, options?: import("..").ListenerOptions) => void;
    readonly removeControl: <K extends import("..").KeyOf<import("..").GetEventsMap<{
        before: <K_1 extends import("..").KeyOf<PropMap>, V extends PropMap[K_1]>(name: K_1, value: V | undefined) => boolean;
        change: (names: import("..").KeyOf<PropMap>[]) => void;
        reset: () => void;
        error: import("..").ErrorListenerSignature<any[]>;
        effect: <K_1 extends import("..").KeyOf<PropMap>, V_1 extends PropMap[K_1]>(name: K_1, value: V_1 | undefined) => void;
    }>>, H extends import("..").GetEventsMap<{
        before: <K_1 extends import("..").KeyOf<PropMap>, V extends PropMap[K_1]>(name: K_1, value: V | undefined) => boolean;
        change: (names: import("..").KeyOf<PropMap>[]) => void;
        reset: () => void;
        error: import("..").ErrorListenerSignature<any[]>;
        effect: <K_1 extends import("..").KeyOf<PropMap>, V_1 extends PropMap[K_1]>(name: K_1, value: V_1 | undefined) => void;
    }>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    readonly pipe: <K extends import("..").KeyOf<import("..").GetEventsMap<{ [K_1 in import("..").KeyOf<PropMap>]: (value: PropMap[K_1] | undefined) => PropMap[K_1]; }>>, H extends import("..").GetEventsMap<{ [K_1 in import("..").KeyOf<PropMap>]: (value: PropMap[K_1] | undefined) => PropMap[K_1]; }>[K]["signature"]>(name: K, handler: H, options?: import("..").ListenerOptions) => void;
    readonly removePipe: <K extends import("..").KeyOf<import("..").GetEventsMap<{ [K_1 in import("..").KeyOf<PropMap>]: (value: PropMap[K_1] | undefined) => PropMap[K_1]; }>>, H extends import("..").GetEventsMap<{ [K_1 in import("..").KeyOf<PropMap>]: (value: PropMap[K_1] | undefined) => PropMap[K_1]; }>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
}>;
