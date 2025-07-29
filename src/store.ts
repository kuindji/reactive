import { createEventBus, EventBusDefinitionHelper } from "eventBus";
import { Simplify } from "type-fest";
import { BaseHandler, MapKey } from "./lib/types";

type Prettify<T> = Simplify<T>;

export interface BasePropMap {
    [key: MapKey]: any;
}

export const BeforeChangeEventName = Symbol("beforeChange");
export const ChangeEventName = Symbol("change");
export const ResetEventName = Symbol("reset");

type StoreControlEvents<PropMap extends BasePropMap = BasePropMap> = {
    [BeforeChangeEventName]: <K extends MapKey & keyof PropMap>(
        name: K,
        value: PropMap[K],
    ) => boolean;
    [ChangeEventName]: <K extends MapKey & keyof PropMap>(
        names: K[],
    ) => void;
    [ResetEventName]: () => void;
};

type StoreDataEvents<PropMap extends BasePropMap = BasePropMap> = {
    [K in MapKey & keyof PropMap]: (
        value: PropMap[K],
        previousValue?: PropMap[K] | undefined,
    ) => void;
};

type StorePipeEvents<PropMap extends BasePropMap = BasePropMap> = {
    [K in MapKey & keyof PropMap]: (
        value: PropMap[K],
    ) => PropMap[K];
};

export type StoreDefinitionHelper<
    PropMap extends BasePropMap = BasePropMap,
> = {
    propTypes: PropMap;
    controlEvents: StoreControlEvents<PropMap>;
    changeEvents: StoreDataEvents<PropMap>;
    pipeEvents: StorePipeEvents<PropMap>;
    changeEventBus: EventBusDefinitionHelper<
        & StoreDataEvents<PropMap>
        & StoreControlEvents<PropMap>
    >;
    pipeEventBus: EventBusDefinitionHelper<StorePipeEvents<PropMap>>;
    controlEventBus: EventBusDefinitionHelper<StoreControlEvents<PropMap>>;
};

export function createStore<PropMap extends BasePropMap = BasePropMap>(
    initialData: Partial<PropMap> = {},
) {
    type Store = StoreDefinitionHelper<PropMap>;

    const data = new Map<MapKey & keyof PropMap, any>(
        Object.entries(initialData),
    );
    const changes = createEventBus<Store["changeEvents"]>();
    const pipe = createEventBus<Store["pipeEvents"]>();
    const control = createEventBus<Store["controlEvents"]>();

    const _set = <K extends (MapKey & keyof PropMap)>(
        name: K,
        value: PropMap[K],
        triggerChange: boolean = true,
    ) => {
        const prev = data.get(name) as PropMap[K] | undefined;
        if (prev !== value) {
            if (
                control.firstNonEmpty(BeforeChangeEventName, name, value)
                    === false
            ) {
                return;
            }

            // @ts-expect-error
            const newValue = pipe.pipe(name, value);
            if (newValue !== undefined) {
                value = newValue;
            }
            data.set(name, value);
            // @ts-expect-error
            changes.trigger(name, value, prev);

            if (triggerChange) {
                control.trigger(ChangeEventName, [ name ]);
            }
            return true;
        }
        return false;
    };

    function asyncSet<K extends MapKey & keyof PropMap>(
        key: K,
        value: PropMap[K],
    ): void;
    function asyncSet(key: Partial<PropMap>): void;
    function asyncSet<
        K extends (MapKey & keyof PropMap) | Partial<PropMap>,
        V extends K extends (MapKey & keyof PropMap) ? PropMap[K]
            : never,
    >(
        name: K,
        value?: V,
    ) {
        setTimeout(() => {
            if (
                (typeof name === "string" || typeof name === "symbol")
                && value !== undefined
            ) {
                set(name, value);
            }
            else if (typeof name === "object") {
                set(name);
            }
        }, 0);
    }

    function set<K extends MapKey & keyof PropMap>(
        key: K,
        value: PropMap[K],
    ): void;
    function set(key: Partial<PropMap>): void;
    function set<
        K extends (MapKey & keyof PropMap) | Partial<PropMap>,
        V extends K extends (MapKey & keyof PropMap) ? PropMap[K]
            : never,
    >(
        name: K,
        value?: V,
    ) {
        if (
            (typeof name === "string" || typeof name === "symbol")
            && value !== undefined
        ) {
            _set(name, value);
        }
        else if (typeof name === "object") {
            const changedKeys: MapKey[] = [];
            Object.entries(name).forEach(([ k, v ]) => {
                if (_set(k, v, false)) {
                    changedKeys.push(k);
                }
            });
            control.trigger(ChangeEventName, changedKeys);
        }
        else {
            throw new Error(`Invalid key: ${String(name)}`);
        }
    }

    const get = <
        K extends (MapKey & keyof PropMap) | Array<MapKey & keyof PropMap>,
    >(key: K) => {
        type V = K extends (MapKey & keyof PropMap) ? PropMap[K]
            : K extends Array<MapKey & keyof PropMap> ? {
                    [AK in K[number]]: PropMap[AK];
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
        return Object.fromEntries(data.entries()) as PropMap;
    };

    const batch = (fn: () => void) => {
        const allChangedKeys: MapKey[] = [];
        const log: [ MapKey, any, any ][] = [];
        const controlInterceptor = function(
            name: MapKey,
            [ changedKeys ]: MapKey[][],
        ) {
            if (name === ChangeEventName) {
                allChangedKeys.push(...changedKeys);
                return false;
            }
            return true;
        };
        const changeInterceptor = function(propName: MapKey, args: any[]) {
            log.push([ propName, args[0], args[1] ]);
            return false;
        };
        changes.intercept(changeInterceptor);
        control.intercept(controlInterceptor);
        fn();
        control.stopIntercepting();
        changes.stopIntercepting();

        for (const [ propName, value, prev ] of log) {
            // @ts-expect-error
            changes.trigger(propName, value, prev);
        }

        if (allChangedKeys.length > 0) {
            control.trigger(ChangeEventName, allChangedKeys);
        }
    };

    const reset = () => {
        data.clear();
        control.trigger(ResetEventName);
    };

    const api = {
        set,
        get,
        getData,
        batch,
        asyncSet,
        isEmpty,
        reset,
        onChange: changes.addListener,
        removeOnChange: changes.removeListener,
        pipe: pipe.addListener,
        control: control.addListener,
    } as const;
    return api as Prettify<typeof api>;
}
