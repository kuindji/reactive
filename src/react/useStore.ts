import { useEffect, useMemo, useRef } from "react";
import { createStore } from "../store.js";
import type {
    BasePropMap,
    BeforeChangeEventName,
    ChangeEventName,
    ErrorEventName,
    ResetEventName,
    StoreDefinitionHelper,
} from "../store.js";

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
    // initialData is seed-only (captured once); later changes are ignored.
    const store = useMemo(
        () => createStore<PropMap>(initialData),
        [],
    );

    type Handler = (...args: any[]) => any;
    type Category = "onChange" | "pipes" | "control";

    // Track only the handlers we added (per category + key) and compare by
    // reference, so consumer listeners added outside the hook are never
    // touched and inline-equal config maps do not duplicate or churn
    // subscriptions.
    const appliedRef = useRef<Record<Category, Record<string, Handler>>>({
        onChange: {},
        pipes: {},
        control: {},
    });

    const add = (category: Category, key: string, fn: Handler) => {
        if (category === "onChange") {
            store.onChange(key, fn as any);
        }
        else if (category === "pipes") {
            store.pipe(key as any, fn as any);
        }
        else {
            store.control(key as any, fn as any);
        }
    };
    const remove = (category: Category, key: string, fn: Handler) => {
        if (category === "onChange") {
            store.removeOnChange(key, fn as any);
        }
        else if (category === "pipes") {
            store.removePipe(key as any, fn as any);
        }
        else {
            store.removeControl(key as any, fn as any);
        }
    };

    // Reconcile config handlers every render (no cleanup here, so equal config
    // never causes remove/add churn).
    useEffect(() => {
        const categories: Record<Category, Record<string, Handler> | undefined> =
            {
                onChange: config?.onChange as
                    | Record<string, Handler>
                    | undefined,
                pipes: config?.pipes as Record<string, Handler> | undefined,
                control: config?.control as Record<string, Handler> | undefined,
            };
        (Object.keys(categories) as Category[]).forEach((category) => {
            const next = categories[category] ?? {};
            const prev = appliedRef.current[category];
            // Remove stale/changed handlers before adding (matters for pipes).
            for (const key in prev) {
                if (next[key] !== prev[key]) {
                    remove(category, key, prev[key]);
                }
            }
            for (const key in next) {
                if (next[key] !== prev[key]) {
                    add(category, key, next[key]);
                }
            }
            appliedRef.current[category] = { ...next };
        });
    });

    // Unmount cleanup: detach everything we applied (also makes StrictMode
    // remount re-subscribe cleanly via the reconcile effect above).
    useEffect(() => {
        return () => {
            const applied = appliedRef.current;
            (Object.keys(applied) as Category[]).forEach((category) => {
                const map = applied[category];
                for (const key in map) {
                    remove(category, key, map[key]);
                }
                applied[category] = {};
            });
        };
    }, []);

    return store;
}
