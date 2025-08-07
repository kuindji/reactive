import { createEventBus, EventBusDefinitionHelper } from "./eventBus";
import type {
    ApiType,
    ErrorListenerSignature,
    KeyOf,
    MapKey,
} from "./lib/types";

export interface BasePropMap {
    [key: MapKey]: any;
}

export const BeforeChangeEventName = "before";
export const ChangeEventName = "change";
export const ResetEventName = "reset";
export const ErrorEventName = "error";
export const EffectEventName = "effect";

type StoreControlEvents<PropMap extends BasePropMap> = {
    [BeforeChangeEventName]: <K extends KeyOf<PropMap>, V extends PropMap[K]>(
        name: K,
        value: V,
    ) => boolean;
    [ChangeEventName]: (names: KeyOf<PropMap>[]) => void;
    [ResetEventName]: () => void;
    [ErrorEventName]: ErrorListenerSignature<any[]>;
    [EffectEventName]: <K extends KeyOf<PropMap>, V extends PropMap[K]>(
        name: K,
        value: V,
    ) => void;
};

type StoreChangeEvents<PropMap extends BasePropMap> = {
    [K in KeyOf<PropMap>]: (
        value: PropMap[K],
        previousValue?: PropMap[K] | undefined,
    ) => void;
};

type StorePipeEvents<PropMap extends BasePropMap> = {
    [K in KeyOf<PropMap>]: (value: PropMap[K]) => PropMap[K];
};

export type StoreDefinitionHelper<
    PropMap extends BasePropMap,
> = {
    propTypes: PropMap;
    controlEvents: StoreControlEvents<PropMap>;
    changeEvents: StoreChangeEvents<PropMap>;
    pipeEvents: StorePipeEvents<PropMap>;
    changeEventBus: EventBusDefinitionHelper<
        StoreChangeEvents<PropMap>
    >;
    pipeEventBus: EventBusDefinitionHelper<
        StorePipeEvents<PropMap>
    >;
    controlEventBus: EventBusDefinitionHelper<
        StoreControlEvents<PropMap>
    >;
};

export function createStore<PropMap extends BasePropMap = BasePropMap>(
    initialData: Partial<PropMap> = {},
) {
    type Store = StoreDefinitionHelper<PropMap>;
    type PipeEvents = Store["pipeEventBus"]["events"];
    type ChangeEvents = Store["changeEventBus"]["events"];

    const data = new Map<KeyOf<PropMap>, any>(
        Object.entries(initialData),
    );
    const changes = createEventBus<Store["changeEvents"]>();
    const pipe = createEventBus<Store["pipeEvents"]>();
    const control = createEventBus<Store["controlEvents"]>();
    let effectKeys: KeyOf<PropMap>[] = [];

    const _set = <K extends KeyOf<PropMap>, V extends PropMap[K]>(
        name: K,
        value: V,
        triggerChange: boolean = true,
    ) => {
        const prev = data.get(name) as V | undefined;
        if (prev !== value) {
            if (
                control.firstNonEmpty(BeforeChangeEventName, name, value)
                    === false
            ) {
                return;
            }

            const pipeArgs = [ value ] as PipeEvents[K]["arguments"];
            let newValue: any;
            try {
                newValue = pipe.pipe(name, ...pipeArgs);
            }
            catch (error) {
                control.trigger(ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: pipeArgs,
                    type: "store-pipe",
                    name,
                });
                if (control.get(ErrorEventName)?.hasListener()) {
                    return false;
                }
                throw error;
            }

            if (newValue !== undefined) {
                value = newValue;
            }

            data.set(name, value);

            const changeArgs = [
                value,
                prev,
            ] as unknown as ChangeEvents[K]["arguments"];
            try {
                changes.trigger(name, ...changeArgs);
            }
            catch (error) {
                control.trigger(ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: changeArgs,
                    type: "store-change",
                    name,
                });
                if (control.get(ErrorEventName)?.hasListener()) {
                    return true;
                }
                throw error;
            }

            if (control.get(EffectEventName)?.hasListener()) {
                try {
                    const isIntercepting = control.isIntercepting();
                    if (!isIntercepting) {
                        const interceptor = (name: MapKey, args: any[]) => {
                            if (name === ChangeEventName) {
                                effectKeys.push(...args[0]);
                                return false;
                            }
                            return true;
                        };
                        control.intercept(interceptor);
                    }
                    control.trigger(EffectEventName, name, value);
                    if (!isIntercepting) {
                        control.stopIntercepting();
                    }
                }
                catch (error) {
                    control.trigger(ErrorEventName, {
                        error: error instanceof Error
                            ? error
                            : new Error(String(error)),
                        args: [ name ],
                        type: "store-control",
                        name,
                    });
                    if (control.get(ErrorEventName)?.hasListener()) {
                        return true;
                    }
                    throw error;
                }
            }

            if (triggerChange) {
                try {
                    control.trigger(ChangeEventName, [ name, ...effectKeys ]);
                    if (!control.isIntercepting()) {
                        effectKeys = [];
                    }
                }
                catch (error) {
                    control.trigger(ErrorEventName, {
                        error: error instanceof Error
                            ? error
                            : new Error(String(error)),
                        args: [ name ],
                        type: "store-control",
                        name,
                    });
                    if (control.get(ErrorEventName)?.hasListener()) {
                        return true;
                    }
                    throw error;
                }
            }
            return true;
        }
        return false;
    };

    function asyncSet<K extends KeyOf<PropMap>>(
        key: K,
        value: PropMap[K],
    ): void;
    function asyncSet(key: Partial<PropMap>): void;
    function asyncSet<
        K extends (KeyOf<PropMap>) | Partial<PropMap>,
        V extends K extends (KeyOf<PropMap>) ? PropMap[K]
            : never,
    >(
        name: K,
        value?: V,
    ) {
        setTimeout(() => {
            if (
                (typeof name === "string")
                && value !== undefined
            ) {
                set(name, value);
            }
            else if (typeof name === "object") {
                set(name);
            }
        }, 0);
    }

    function set<K extends KeyOf<PropMap>>(
        key: K,
        value: PropMap[K],
    ): void;
    function set(key: Partial<PropMap>): void;
    function set<
        K extends (KeyOf<PropMap>) | Partial<PropMap>,
        V extends K extends (KeyOf<PropMap>) ? PropMap[K]
            : never,
    >(
        name: K,
        value?: V,
    ) {
        if (
            (typeof name === "string")
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
            try {
                control.trigger(ChangeEventName, [
                    ...changedKeys,
                    ...effectKeys,
                ]);
                if (!control.isIntercepting()) {
                    effectKeys = [];
                }
            }
            catch (error) {
                control.trigger(ErrorEventName, {
                    error: error instanceof Error
                        ? error
                        : new Error(String(error)),
                    args: [ name ],
                    type: "store-control",
                });
                if (control.get(ErrorEventName)?.hasListener()) {
                    return true;
                }
                throw error;
            }
        }
        else {
            throw new Error(`Invalid key: ${String(name)}`);
        }
    }

    const get = <
        K extends (KeyOf<PropMap>) | Array<KeyOf<PropMap>>,
    >(key: K) => {
        type V = K extends (KeyOf<PropMap>) ? PropMap[K]
            : K extends Array<KeyOf<PropMap>> ? {
                    [AK in K[number]]: PropMap[AK];
                }
            : never;
        if (
            typeof key === "string"
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
        return Array.from(data.values()).every((value) =>
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
            const changeArgs = [
                value,
                prev,
            ] as unknown as ChangeEvents[typeof propName]["arguments"];
            changes.trigger(propName, ...changeArgs);
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
        control: control.addListener,
        removeControl: control.removeListener,
        pipe: pipe.addListener,
        removePipe: pipe.removeListener,
    } as const;
    return api as ApiType<Store, typeof api>;
}

export type BaseStoreDefinition = StoreDefinitionHelper<BasePropMap>;
export type BaseStore = ReturnType<typeof createStore<any>>;
