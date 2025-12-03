/**
 * Compile-time type tests for higher-level wrappers that accept listeners
 *
 * This file tests patterns for:
 * 1. Creating typed wrappers around events, actions, and stores
 * 2. Accepting typed listeners in constructors/factory functions
 * 3. Composing multiple reactive primitives
 * 4. Type inference for listener parameters
 */

import { createEvent, type EventOptions } from "../../src/event";
import { createEventBus, type BaseEventMap, type EventBusOptions } from "../../src/eventBus";
import { createAction } from "../../src/action";
import { createActionBus, type BaseActionsMap } from "../../src/actionBus";
import { createActionMap } from "../../src/actionMap";
import { createStore, type BasePropMap } from "../../src/store";
import type { BaseHandler, ErrorListenerSignature } from "../../src/lib/types";

// ============================================================================
// Pattern 1: Event wrapper that accepts listener in constructor
// ============================================================================

interface TypedEventOptions<H extends BaseHandler> {
    eventOptions?: EventOptions<H>;
    listener?: H;
    errorListener?: ErrorListenerSignature<Parameters<H>>;
}

function createTypedEvent<H extends BaseHandler>(
    options: TypedEventOptions<H> = {},
) {
    const event = createEvent<H>(options.eventOptions);

    if (options.listener) {
        event.addListener(options.listener);
    }

    if (options.errorListener) {
        event.addErrorListener(options.errorListener);
    }

    return event;
}

// Test: Event wrapper with listener
{
    const event = createTypedEvent<(value: number, label: string) => boolean>({
        eventOptions: { autoTrigger: true },
        listener: (value, label) => {
            // Types are correct
            const _v: number = value;
            const _l: string = label;
            return true;
        },
        errorListener: ({ error, args }) => {
            const _e: Error = error;
            const _args: [number, string] = args;
        },
    });

    // Event is correctly typed
    event.trigger(42, "test");

    // @ts-expect-error - Invalid: wrong argument types
    event.trigger("wrong", 123);
}

// ============================================================================
// Pattern 2: EventBus wrapper that accepts event listeners map
// ============================================================================

type EventListenersMap<EventsMap extends BaseEventMap> = {
    [K in keyof EventsMap]?: EventsMap[K];
};

interface TypedEventBusOptions<EventsMap extends BaseEventMap> {
    busOptions?: EventBusOptions<EventsMap>;
    listeners?: EventListenersMap<EventsMap>;
    allEventsListener?: (name: string, args: unknown[], tags: string[] | null) => void;
    errorListener?: ErrorListenerSignature<unknown[]>;
}

function createTypedEventBus<EventsMap extends BaseEventMap>(
    options: TypedEventBusOptions<EventsMap> = {},
) {
    const bus = createEventBus<EventsMap>(options.busOptions);

    if (options.listeners) {
        for (const [name, handler] of Object.entries(options.listeners)) {
            if (handler) {
                bus.on(name as string & keyof EventsMap, handler);
            }
        }
    }

    if (options.allEventsListener) {
        bus.addAllEventsListener(options.allEventsListener as any);
    }

    if (options.errorListener) {
        bus.addErrorListener(options.errorListener);
    }

    return bus;
}

// Test: EventBus wrapper with listeners map
{
    interface AppEvents extends BaseEventMap {
        "app:start": (config: { debug: boolean }) => void;
        "app:stop": (reason: string) => void;
        "data:changed": (key: string, value: unknown) => void;
    }

    const bus = createTypedEventBus<AppEvents>({
        listeners: {
            "app:start": (config) => {
                // Type is correct
                const _debug: boolean = config.debug;
            },
            "app:stop": (reason) => {
                const _r: string = reason;
            },
            // data:changed is optional
        },
        allEventsListener: (name, args, tags) => {
            console.log(name, args, tags);
        },
    });

    // Bus is correctly typed
    bus.trigger("app:start", { debug: true });

    // With BaseEventMap's index signature, this won't error at runtime
    // but the known events are still typed correctly
    bus.trigger("app:start", { debug: false });
}

// ============================================================================
// Pattern 3: Action wrapper with before/after listeners
// ============================================================================

interface TypedActionOptions<A extends BaseHandler> {
    beforeListener?: (...args: Parameters<A>) => false | void | Promise<false | void>;
    afterListener?: (response: {
        response: Awaited<ReturnType<A>> | null;
        error: string | null;
        args: Parameters<A>;
    }) => void;
    errorListener?: ErrorListenerSignature<Parameters<A>>;
}

function createTypedAction<A extends BaseHandler>(
    actionFn: A,
    options: TypedActionOptions<A> = {},
) {
    const action = createAction(actionFn);

    if (options.beforeListener) {
        action.addBeforeActionListener(options.beforeListener);
    }

    if (options.afterListener) {
        action.addListener(options.afterListener);
    }

    if (options.errorListener) {
        action.addErrorListener(options.errorListener);
    }

    return action;
}

// Test: Action wrapper with listeners
{
    const fetchUser = createTypedAction(
        (userId: string, options?: { includeProfile?: boolean }) => {
            return { id: userId, name: "John", profile: options?.includeProfile ? {} : null };
        },
        {
            beforeListener: (userId, options) => {
                // Types are correct
                const _id: string = userId;
                const _opts: { includeProfile?: boolean } | undefined = options;

                if (userId === "blocked") {
                    return false;
                }
            },
            afterListener: ({ response, error, args }) => {
                const _userId: string = args[0];
                const _options: { includeProfile?: boolean } | undefined = args[1];

                if (response) {
                    const _name: string = response.name;
                }
                if (error) {
                    const _err: string = error;
                }
            },
            errorListener: ({ error, args }) => {
                const _e: Error = error;
                const _userId: string = args[0];
            },
        },
    );

    // Action is correctly typed
    async function _test() {
        const result = await fetchUser.invoke("user123", { includeProfile: true });

        if (result.response) {
            const _name: string = result.response.name;
        }

        // @ts-expect-error - Invalid: wrong argument type
        await fetchUser.invoke(123);
    }
}

// ============================================================================
// Pattern 4: ActionBus wrapper with listener registration
// ============================================================================

type ActionListenersMap<ActionsMap extends BaseActionsMap> = {
    [K in keyof ActionsMap]?: (response: {
        response: Awaited<ReturnType<ActionsMap[K]>> | null;
        error: string | null;
        args: Parameters<ActionsMap[K]>;
    }) => void;
};

interface TypedActionBusOptions<ActionsMap extends BaseActionsMap> {
    listeners?: ActionListenersMap<ActionsMap>;
    errorListener?: ErrorListenerSignature<unknown[]>;
}

function createTypedActionBus<ActionsMap extends BaseActionsMap>(
    actions: ActionsMap,
    options: TypedActionBusOptions<ActionsMap> = {},
) {
    const bus = createActionBus(actions);

    if (options.listeners) {
        for (const [name, handler] of Object.entries(options.listeners)) {
            if (handler) {
                bus.on(name as string & keyof ActionsMap, handler);
            }
        }
    }

    if (options.errorListener) {
        bus.addErrorListener(options.errorListener);
    }

    return bus;
}

// Test: ActionBus wrapper with listeners
{
    const bus = createTypedActionBus(
        {
            fetchData: (_id: string) => ({ id: _id, data: "result" }),
            saveData: (_id: string, _data: string) => true,
        },
        {
            listeners: {
                fetchData: ({ response, args }) => {
                    const _id: string = args[0];
                    if (response) {
                        const _data: string = response.data;
                    }
                },
                saveData: ({ response, args }) => {
                    const _id: string = args[0];
                    const _data: string = args[1];
                    if (response !== null) {
                        const _success: boolean = response;
                    }
                },
            },
        },
    );

    async function _test() {
        const result = await bus.invoke("fetchData", "123");
        if (result.response) {
            const _data: string = result.response.data;
        }

        // @ts-expect-error - Invalid: wrong argument type
        await bus.invoke("fetchData", 123);
    }
}

// ============================================================================
// Pattern 5: ActionMap wrapper with global error handling
// ============================================================================

interface TypedActionMapOptions<M extends BaseActionsMap> {
    onAnyAction?: (actionName: keyof M, response: unknown) => void;
    onAnyError?: ErrorListenerSignature<unknown[]> | ErrorListenerSignature<unknown[]>[];
}

function createTypedActionMap<M extends BaseActionsMap>(
    actions: M,
    options: TypedActionMapOptions<M> = {},
) {
    const map = createActionMap(actions, options.onAnyError);

    if (options.onAnyAction) {
        // Add listeners to all actions
        for (const key of Object.keys(actions) as Array<keyof M>) {
            (map as any)[key].on((response: unknown) => {
                options.onAnyAction!(key, response);
            });
        }
    }

    return map;
}

// Test: ActionMap wrapper
{
    const actions = createTypedActionMap(
        {
            increment: (value: number) => value + 1,
            decrement: (value: number) => value - 1,
            multiply: (a: number, b: number) => a * b,
        },
        {
            onAnyAction: (name, _response) => {
                console.log(`Action ${String(name)} completed`);
            },
            onAnyError: [
                ({ error }) => console.error("Error:", error),
                ({ name }) => console.log("Failed action:", name),
            ],
        },
    );

    async function _test() {
        const incResult = await actions.increment.invoke(5);
        const decResult = await actions.decrement.invoke(10);
        const mulResult = await actions.multiply.invoke(3, 4);

        if (incResult.response !== null) {
            const _num: number = incResult.response;
        }
        if (decResult.response !== null) {
            const _num: number = decResult.response;
        }
        if (mulResult.response !== null) {
            const _num: number = mulResult.response;
        }

        // @ts-expect-error - Invalid: wrong type
        await actions.increment.invoke("five");
    }
}

// ============================================================================
// Pattern 6: Store wrapper with change listeners map
// ============================================================================

type StoreChangeListenersMap<PropMap extends BasePropMap> = {
    [K in keyof PropMap]?: (
        value: PropMap[K] | undefined,
        previousValue: PropMap[K] | undefined,
    ) => void;
};

type StorePipeListenersMap<PropMap extends BasePropMap> = {
    [K in keyof PropMap]?: (value: PropMap[K] | undefined) => PropMap[K];
};

interface TypedStoreOptions<PropMap extends BasePropMap> {
    onChange?: StoreChangeListenersMap<PropMap>;
    pipe?: StorePipeListenersMap<PropMap>;
    onBeforeChange?: <K extends keyof PropMap>(
        name: K,
        value: PropMap[K] | undefined,
    ) => boolean;
    onReset?: () => void;
    onError?: ErrorListenerSignature<unknown[]>;
}

function createTypedStore<PropMap extends BasePropMap>(
    initialData: Partial<PropMap> = {},
    options: TypedStoreOptions<PropMap> = {},
) {
    const store = createStore<PropMap>(initialData);

    // Register onChange listeners
    if (options.onChange) {
        for (const key of Object.keys(options.onChange) as Array<string & keyof PropMap>) {
            const listener = options.onChange[key];
            if (listener) {
                store.onChange(key, listener as any);
            }
        }
    }

    // Register pipe listeners
    if (options.pipe) {
        for (const key of Object.keys(options.pipe) as Array<string & keyof PropMap>) {
            const listener = options.pipe[key];
            if (listener) {
                store.pipe(key, listener as any);
            }
        }
    }

    // Register control listeners
    if (options.onBeforeChange) {
        store.control("before", options.onBeforeChange as any);
    }

    if (options.onReset) {
        store.control("reset", options.onReset);
    }

    if (options.onError) {
        store.control("error", options.onError);
    }

    return store;
}

// Test: Store wrapper with listeners
{
    interface AppState {
        count: number;
        user: { name: string } | null;
        theme: "light" | "dark";
        items: string[];
    }

    const store = createTypedStore<AppState>(
        {
            count: 0,
            user: null,
            theme: "light",
            items: [],
        },
        {
            onChange: {
                count: (value, prevValue) => {
                    // Types are correct
                    const _v: number | undefined = value;
                    const _pv: number | undefined = prevValue;
                },
                user: (value, _prevValue) => {
                    if (value) {
                        const _name: string = value.name;
                    }
                },
                theme: (value, _prevValue) => {
                    if (value) {
                        const _theme: "light" | "dark" = value;
                    }
                },
            },
            pipe: {
                count: (value) => Math.max(0, value ?? 0), // Clamp to non-negative
                items: (value) => (value ?? []).slice(0, 100), // Limit to 100 items
            },
            onBeforeChange: (name, value) => {
                // Can validate any property change
                if (name === "count" && (value as number) > 1000) {
                    return false;
                }
                return true;
            },
            onReset: () => {
                console.log("Store was reset");
            },
            onError: ({ error }) => {
                console.error("Store error:", error);
            },
        },
    );

    // Store is correctly typed
    store.set("count", 42);
    store.set("user", { name: "John" });
    store.set("theme", "dark");

    const _count: number = store.get("count");
    const _user: { name: string } | null = store.get("user");

    // @ts-expect-error - Invalid: wrong type
    store.set("count", "not a number");

    // @ts-expect-error - Invalid: unknown property
    store.set("unknown", "value");
}

// ============================================================================
// Pattern 7: Composed reactive system
// ============================================================================

interface SystemEvents extends BaseEventMap {
    "system:ready": () => void;
    "system:error": (error: Error) => void;
}

interface SystemActions extends BaseActionsMap {
    "initialize": () => Promise<void>;
    "shutdown": () => Promise<void>;
}

interface SystemState {
    status: "idle" | "running" | "error";
    startedAt: Date | null;
}

interface ReactiveSystemOptions {
    onReady?: () => void;
    onError?: (error: Error) => void;
    onStatusChange?: (status: SystemState["status"]) => void;
}

function createReactiveSystem(options: ReactiveSystemOptions = {}) {
    const events = createEventBus<SystemEvents>();
    const actions = createActionBus<SystemActions>({
        initialize: () => Promise.resolve(),
        shutdown: () => Promise.resolve(),
    });
    const store = createStore<SystemState>({
        status: "idle",
        startedAt: null,
    });

    // Wire up listeners
    if (options.onReady) {
        events.on("system:ready", options.onReady);
    }

    if (options.onError) {
        events.on("system:error", options.onError);
    }

    if (options.onStatusChange) {
        store.onChange("status", (value) => {
            if (value) {
                options.onStatusChange!(value);
            }
        });
    }

    return {
        events,
        actions,
        store,

        async start() {
            store.set("status", "running");
            store.set("startedAt", new Date());
            await actions.invoke("initialize");
            events.trigger("system:ready");
        },

        async stop() {
            await actions.invoke("shutdown");
            store.set("status", "idle");
            store.set("startedAt", null);
        },
    };
}

// Test: Reactive system
{
    const system = createReactiveSystem({
        onReady: () => {
            console.log("System ready");
        },
        onError: (error) => {
            const _e: Error = error;
            console.error("System error:", error);
        },
        onStatusChange: (status) => {
            const _s: "idle" | "running" | "error" = status;
            console.log("Status changed to:", status);
        },
    });

    async function _test() {
        await system.start();

        // Access typed components
        system.events.trigger("system:ready");
        system.store.set("status", "running");

        const _status = system.store.get("status");
        const _startedAt = system.store.get("startedAt");

        await system.stop();

        // @ts-expect-error - Invalid: wrong status
        system.store.set("status", "unknown");
    }
}

// ============================================================================
// Pattern 8: Extracting types from reactive primitives
// ============================================================================

// Test: Using typeof to get exact listener types
{
    const myEvent = createEvent<(a: number, b: string) => boolean>();

    // Use the event's addListener parameter type
    type MyEventListener = Parameters<typeof myEvent.addListener>[0];

    const listener: MyEventListener = (a, b) => {
        const _num: number = a;
        const _str: string = b;
        return true;
    };

    myEvent.addListener(listener);
}

// Test: Extracting action listener type
{
    const myAction = createAction((id: string, count: number) => {
        return { id, count };
    });

    // Use the action's addListener parameter type
    type MyActionListener = Parameters<typeof myAction.addListener>[0];

    const handler: MyActionListener = (response) => {
        const _id: string = response.args[0];
        const _count: number = response.args[1];

        if (response.response) {
            const _resId: string = response.response.id;
            const _resCount: number = response.response.count;
        }
    };

    myAction.on(handler);
}

// Test: Extracting types from eventBus
{
    interface MyEvents extends BaseEventMap {
        "user:login": (userId: string) => void;
        "user:logout": () => void;
    }

    const bus = createEventBus<MyEvents>();

    // Handler type matches the event signature
    const loginHandler: (userId: string) => void = (userId) => {
        const _id: string = userId;
    };

    bus.on("user:login", loginHandler);

    // Verify the types work correctly
    bus.on("user:logout", () => {
        // No parameters for logout
    });

    // With BaseEventMap's index signature, handlers are flexible
    // but known events preserve their types for autocomplete
}

console.log("Wrapper type tests passed!");

