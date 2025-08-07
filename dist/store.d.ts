import { EventBusDefinitionHelper } from "./eventBus";
import type { ApiType, ErrorListenerSignature, KeyOf, MapKey } from "./lib/types";
export interface BasePropMap {
    [key: MapKey]: any;
}
export declare const BeforeChangeEventName = "before";
export declare const ChangeEventName = "change";
export declare const ResetEventName = "reset";
export declare const ErrorEventName = "error";
export declare const EffectEventName = "effect";
type StoreControlEvents<PropMap extends BasePropMap> = {
    [BeforeChangeEventName]: <K extends KeyOf<PropMap>, V extends PropMap[K]>(name: K, value: V) => boolean;
    [ChangeEventName]: (names: KeyOf<PropMap>[]) => void;
    [ResetEventName]: () => void;
    [ErrorEventName]: ErrorListenerSignature<any[]>;
    [EffectEventName]: <K extends KeyOf<PropMap>, V extends PropMap[K]>(name: K, value: V) => void;
};
type StoreChangeEvents<PropMap extends BasePropMap> = {
    [K in KeyOf<PropMap>]: (value: PropMap[K], previousValue?: PropMap[K] | undefined) => void;
};
type StorePipeEvents<PropMap extends BasePropMap> = {
    [K in KeyOf<PropMap>]: (value: PropMap[K]) => PropMap[K];
};
export type StoreDefinitionHelper<PropMap extends BasePropMap> = {
    propTypes: PropMap;
    controlEvents: StoreControlEvents<PropMap>;
    changeEvents: StoreChangeEvents<PropMap>;
    pipeEvents: StorePipeEvents<PropMap>;
    changeEventBus: EventBusDefinitionHelper<StoreChangeEvents<PropMap>>;
    pipeEventBus: EventBusDefinitionHelper<StorePipeEvents<PropMap>>;
    controlEventBus: EventBusDefinitionHelper<StoreControlEvents<PropMap>>;
};
export declare function createStore<PropMap extends BasePropMap = BasePropMap>(initialData?: Partial<PropMap>): ApiType<StoreDefinitionHelper<PropMap>, {
    readonly set: {
        <K extends KeyOf<PropMap>>(key: K, value: PropMap[K]): void;
        (key: Partial<PropMap>): void;
    };
    readonly get: <K extends (KeyOf<PropMap>) | Array<KeyOf<PropMap>>>(key: K) => K extends KeyOf<PropMap> ? PropMap[K] : K extends KeyOf<PropMap>[] ? { [AK in K[number]]: PropMap[AK]; } : never;
    readonly getData: () => PropMap;
    readonly batch: (fn: () => void) => void;
    readonly asyncSet: {
        <K extends KeyOf<PropMap>>(key: K, value: PropMap[K]): void;
        (key: Partial<PropMap>): void;
    };
    readonly isEmpty: () => boolean;
    readonly reset: () => void;
    readonly onChange: <K extends KeyOf<import("./eventBus").GetEventsMap<StoreChangeEvents<PropMap>>>, H extends import("./eventBus").GetEventsMap<StoreChangeEvents<PropMap>>[K]["signature"]>(name: K, handler: H, options?: import("./event").ListenerOptions) => void;
    readonly removeOnChange: <K extends KeyOf<import("./eventBus").GetEventsMap<StoreChangeEvents<PropMap>>>, H extends import("./eventBus").GetEventsMap<StoreChangeEvents<PropMap>>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    readonly control: <K extends KeyOf<import("./eventBus").GetEventsMap<StoreControlEvents<PropMap>>>, H extends import("./eventBus").GetEventsMap<StoreControlEvents<PropMap>>[K]["signature"]>(name: K, handler: H, options?: import("./event").ListenerOptions) => void;
    readonly removeControl: <K extends KeyOf<import("./eventBus").GetEventsMap<StoreControlEvents<PropMap>>>, H extends import("./eventBus").GetEventsMap<StoreControlEvents<PropMap>>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
    readonly pipe: <K extends KeyOf<import("./eventBus").GetEventsMap<StorePipeEvents<PropMap>>>, H extends import("./eventBus").GetEventsMap<StorePipeEvents<PropMap>>[K]["signature"]>(name: K, handler: H, options?: import("./event").ListenerOptions) => void;
    readonly removePipe: <K extends KeyOf<import("./eventBus").GetEventsMap<StorePipeEvents<PropMap>>>, H extends import("./eventBus").GetEventsMap<StorePipeEvents<PropMap>>[K]["signature"]>(name: K, handler: H, context?: object | null, tag?: string | null) => void;
}>;
export type BaseStoreDefinition = StoreDefinitionHelper<BasePropMap>;
export type BaseStore = ReturnType<typeof createStore<any>>;
export {};
