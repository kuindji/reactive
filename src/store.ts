import { createEventBus, EventBusDefinitionHelper } from "eventBus";
import { Merge, OmitIndexSignature, Simplify } from "type-fest";
import { createEvent } from "./event";
import { BaseHandler, MapKey } from "./lib/types";

type Prettify<T> = Simplify<T>;

export interface BaseStoreMap {
    [key: MapKey]: any;
}

export const BeforeChangeEventName = Symbol("beforeChange");
export const ChangeEventName = Symbol("change");
export const ResetEventName = Symbol("reset");
export const SetEventName = Symbol("set");

type StoreControlEvents<StoreMap extends BaseStoreMap = BaseStoreMap> =
    {
        [BeforeChangeEventName]: <K extends MapKey & keyof StoreMap>(
            name: K,
            value: StoreMap[K],
        ) => boolean;
        [ChangeEventName]: <K extends MapKey & keyof StoreMap>(
            name: K,
            value: StoreMap[K],
        ) => void;
        [ResetEventName]: () => void;
        [SetEventName]: <K extends (MapKey & keyof StoreMap)>(
            name: K,
            value: StoreMap[K],
        ) => void;
    };

type StoreDataEvents<StoreMap extends BaseStoreMap = BaseStoreMap> = {
    [K in keyof OmitIndexSignature<StoreMap>]: (
        name: K,
        value: StoreMap[K],
        previousValue: StoreMap[K] | undefined,
    ) => void;
};

export type StoreDefinitionHelper<
    StoreMap extends BaseStoreMap = BaseStoreMap,
> = {
    propTypes: StoreMap;
    controlEvents: StoreControlEvents<StoreMap>;
    dataEvents: StoreDataEvents<StoreMap>;
    controlEventBus: EventBusDefinitionHelper<StoreControlEvents<StoreMap>>;
    dataEventBus: EventBusDefinitionHelper<StoreDataEvents<StoreMap>>;
};

export function createStore<StoreMap extends BaseStoreMap = BaseStoreMap>(
    initialData: Partial<StoreMap> = {},
) {
    type Store = StoreDefinitionHelper<StoreMap>;

    const data = new Map<MapKey & keyof StoreMap, any>(
        Object.entries(initialData),
    );
    const dataEvents = createEventBus<Store["dataEvents"]>();
    const controlEvents = createEventBus<Store["controlEvents"]>();
    dataEvents.relay({
        eventSource: controlEvents,
        remoteEventName: "*",
    });

    const _set = <K extends (MapKey & keyof StoreMap)>(
        name: K,
        value: StoreMap[K],
    ) => {
        const prev = data.get(name) as StoreMap[K] | undefined;
        if (prev !== value) {
            if (
                controlEvents.firstNonEmpty(BeforeChangeEventName, name, value)
                    === false
            ) {
                return;
            }
            data.set(name, value);
            dataEvents.trigger(name, value, prev));
        }
    };

    const set = <
        K extends (MapKey & keyof StoreMap) | Partial<StoreMap>,
        V extends K extends (MapKey & keyof StoreMap) ? StoreMap[K]
            : never,
    >(
        name: K,
        value: V,
    ) => {
        if (typeof name === "string" || typeof name === "symbol") {
            _set(name, value);
        }
        else if (typeof name === "object") {
            Object.entries(name).forEach(([ k, v ]) => {
                _set(k, v);
            });
        }
        else {
            throw new Error(`Invalid key: ${String(name)}`);
        }
    };

    const asyncSet = () => {};

    const batch = () => {};

    const get = <
        K extends (MapKey & keyof StoreMap) | Array<MapKey & keyof StoreMap>,
    >(key: K) => {
        type V = K extends (MapKey & keyof StoreMap) ? StoreMap[K]
            : K extends Array<MapKey & keyof StoreMap> ? {
                    [AK in K[number]]: StoreMap[AK];
                }
            : never;
        if (
            typeof key === "string"
            || typeof key === "symbol"
        ) {
            return data.get(key) as V;
        }
        else if (Array.isArray(key)) {
            // return object with given keys
            return key.reduce((acc, k) => {
                acc[k] = data.get(k);
                return acc;
            }, {} as V);
        }
        else {
            throw new Error(`Invalid key: ${String(key)}`);
        }
    };

    const isEmpty = () => {
        if (data.size === 0) {
            return true;
        }
        return data.values().every((value) =>
            value === null || value === undefined
        );
    };

    const getData = () => {
        return Object.fromEntries(data.entries()) as StoreMap;
    };

    const reset = () => {
        data.clear();
    };

    const { addListener, removeListener } = dataEvents;

    const api = {
        set,
        get,
        getData,
        batch,
        asyncSet,
        isEmpty,
        reset,
        addListener,
        removeListener,
    } as const;
    return api as Prettify<typeof api>;
}
