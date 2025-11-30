/**
 * Compile-time type tests for React hooks
 *
 * These tests verify type safety at compile time for all React hooks.
 * If TypeScript compiles this file without errors (except for @ts-expect-error lines),
 * the type tests pass.
 */

import { useCallback, useEffect } from "react";
import { createAction } from "../../src/action";
import { createActionBus } from "../../src/actionBus";
// import { createActionMap } from "../../src/actionMap";
import { createEvent } from "../../src/event";
import { createEventBus } from "../../src/eventBus";
import { useAction } from "../../src/react/useAction";
import { useActionBus } from "../../src/react/useActionBus";
import { useActionMap } from "../../src/react/useActionMap";
import { useEvent } from "../../src/react/useEvent";
import { useEventBus } from "../../src/react/useEventBus";
import { useListenToAction } from "../../src/react/useListenToAction";
import { useListenToActionBus } from "../../src/react/useListenToActionBus";
import { useListenToEvent } from "../../src/react/useListenToEvent";
import { useListenToEventBus } from "../../src/react/useListenToEventBus";
import { useListenToStoreChanges } from "../../src/react/useListenToStoreChanges";
import { useStore } from "../../src/react/useStore";
import { useStoreState } from "../../src/react/useStoreState";
import { createStore } from "../../src/store";

// ============================================================================
// useEvent
// ============================================================================

// Test: useEvent creates typed event
function _TestUseEvent() {
    const event = useEvent<(value: number) => string>();

    // Valid
    event.trigger(42);

    // @ts-expect-error - Invalid: wrong argument type
    event.trigger("string");

    // Listener is typed
    event.on((value) => {
        const _num: number = value;
        return "result";
    });

    return null;
}

// ============================================================================
// useEventBus
// ============================================================================

// Test: useEventBus creates typed event bus
function _TestUseEventBus() {
    const eventBus = useEventBus<{
        userCreated: (userId: string) => void;
        dataFetched: (data: { items: string[]; }) => number;
    }>();

    // Valid
    eventBus.trigger("userCreated", "123");
    eventBus.trigger("dataFetched", { items: [ "a" ] });

    // @ts-expect-error - Invalid: unknown event
    eventBus.trigger("unknownEvent");

    // @ts-expect-error - Invalid: wrong argument type
    eventBus.trigger("userCreated", 123);

    // Listener is typed
    eventBus.on("dataFetched", (data) => {
        const items: string[] = data.items;
        return items.length;
    });

    return null;
}

// Test: useEventBus with options and listeners
function _TestUseEventBusWithOptions() {
    const _eventBus = useEventBus<{
        message: (text: string) => void;
    }>(
        {
            eventOptions: {
                message: { autoTrigger: true },
            },
        },
        // All events listener
        (name, args, tags) => {
            console.log(name, args, tags);
        },
        // Error listener
        (error) => {
            console.error(error);
        },
    );

    return null;
}

// ============================================================================
// useListenToEvent
// ============================================================================

// Test: useListenToEvent with typed event
function _TestUseListenToEvent() {
    const event = createEvent<(a: number, b: string) => boolean>();

    // Handler must match event signature
    const handler = useCallback((_a: number, _b: string) => {
        return true;
    }, []);

    useListenToEvent(event, handler);

    // Wrong handler would be caught by TypeScript
    // const wrongHandler = useCallback((a: string) => true, []);
    // useListenToEvent(event, wrongHandler); // This would error

    return null;
}

// ============================================================================
// useListenToEventBus
// ============================================================================

// Test: useListenToEventBus with typed event bus
function _TestUseListenToEventBus() {
    const eventBus = createEventBus<{
        notification: (message: string, type: "info" | "error") => void;
    }>();

    const handler = useCallback((message: string, type: "info" | "error") => {
        console.log(message, type);
    }, []);

    useListenToEventBus(eventBus, "notification", handler);

    // @ts-expect-error - Invalid: wrong event name
    useListenToEventBus(eventBus, "wrongEvent", handler);

    return null;
}

// ============================================================================
// useAction
// ============================================================================

// Test: useAction creates typed action
function _TestUseAction() {
    const fetchUser = useAction(async (userId: string) =>
        Promise.resolve({ id: userId, name: "John" })
    );

    async function _handleClick() {
        const result = await fetchUser.invoke("user123");

        if (result.response) {
            const _name: string = result.response.name;
        }

        // @ts-expect-error - Invalid: wrong argument type
        await fetchUser.invoke(123);
    }

    return null;
}

// ============================================================================
// useActionBus
// ============================================================================

// Test: useActionBus creates typed action bus
function _TestUseActionBus() {
    const actionBus = useActionBus({
        fetchData: async (id: string) => Promise.resolve({ data: id }),
        saveData: async (_data: { value: number; }) => Promise.resolve(true),
    });

    async function _handleAction() {
        const fetchResult = await actionBus.invoke("fetchData", "123");
        const _saveResult = await actionBus.invoke("saveData", { value: 42 });

        if (fetchResult.response) {
            const _data: string = fetchResult.response.data;
        }

        // @ts-expect-error - Invalid: unknown action
        await actionBus.invoke("unknownAction");

        // @ts-expect-error - Invalid: wrong argument type
        await actionBus.invoke("fetchData", 123);
    }

    return null;
}

// ============================================================================
// useActionMap
// ============================================================================

// Test: useActionMap creates typed action map
function _TestUseActionMap() {
    const actions = useActionMap({
        increment: (amount: number) => amount,
        decrement: (amount: number) => -amount,
        reset: () => 0,
    });

    async function _handleActions() {
        const incResult = await actions.increment.invoke(5);
        const _decResult = await actions.decrement.invoke(3);
        const _resetResult = await actions.reset.invoke();

        if (incResult.response !== null) {
            const _amount: number = incResult.response;
        }

        // @ts-expect-error - Invalid: wrong argument type
        await actions.increment.invoke("five");

        // @ts-expect-error - Invalid: unknown action
        const _unknownAction = actions.unknownAction;
    }

    return null;
}

// ============================================================================
// useListenToAction
// ============================================================================

// Test: useListenToAction with typed action
function _TestUseListenToAction() {
    const action = createAction(async (data: { value: number; }) => {
        return Promise.resolve({ result: data.value * 2 });
    });

    const handler = useCallback(
        (response: {
            response: { result: number; } | null;
            error: string | null;
            args: [ { value: number; } ];
        }) => {
            if (response.response) {
                const _result: number = response.response.result;
            }
            const _value: number = response.args[0].value;
        },
        [],
    );

    useListenToAction(action, handler);

    return null;
}

// ============================================================================
// useListenToActionBus
// ============================================================================

// Test: useListenToActionBus with typed action bus
function _TestUseListenToActionBus() {
    const actionBus = createActionBus({
        process: async (input: string) =>
            Promise.resolve({ output: input.toUpperCase() }),
    });

    const handler = useCallback(
        (response: {
            response: { output: string; } | null;
            error: string | null;
            args: [ string ];
        }) => {
            if (response.response) {
                const _output: string = response.response.output;
            }
        },
        [],
    );

    useListenToActionBus(actionBus, "process", handler);

    // @ts-expect-error - Invalid: wrong action name
    useListenToActionBus(actionBus, "wrongAction", handler);

    return null;
}

// ============================================================================
// useStore
// ============================================================================

// Test: useStore creates typed store
function _TestUseStore() {
    interface AppState {
        count: number;
        user: { name: string; } | null;
    }

    const store = useStore<AppState>({
        count: 0,
        user: null,
    });

    // Valid
    store.set("count", 42);
    store.set("user", { name: "John" });
    store.set("user", null);

    const _count: number = store.get("count");
    const _user: { name: string; } | null = store.get("user");

    // @ts-expect-error - Invalid: unknown key
    store.set("unknown", "value");

    // @ts-expect-error - Invalid: wrong type
    store.set("count", "not a number");

    return null;
}

// ============================================================================
// useStoreState
// ============================================================================

// Test: useStoreState subscribes to single key and returns [value, setter]
function _TestUseStoreState() {
    interface State {
        theme: "light" | "dark";
        language: string;
    }

    const store = createStore<State>({
        theme: "light",
        language: "en",
    });

    // useStoreState takes a single key and returns [value, setter]
    const [ theme, setTheme ] = useStoreState(store, "theme");
    const [ language, setLanguage ] = useStoreState(store, "language");

    // value has correct type
    const _themeCheck: "light" | "dark" = theme;
    const _languageCheck: string = language;

    // setter accepts correct type
    setTheme("dark");
    setLanguage("fr");

    // @ts-expect-error - Invalid: wrong type for setter
    setTheme("blue");

    // @ts-expect-error - Invalid: unknown key
    useStoreState(store, "unknown");

    return null;
}

// Test: useStoreState setter with updater function
function _TestUseStoreStateUpdater() {
    interface State {
        count: number;
    }

    const store = createStore<State>({ count: 0 });

    const [ _count, setCount ] = useStoreState(store, "count");

    // Valid: direct value
    setCount(42);

    // Valid: updater function
    setCount((prev) => (prev ?? 0) + 1);

    // @ts-expect-error - Invalid: wrong type
    setCount("not a number");

    return null;
}

// ============================================================================
// useListenToStoreChanges
// ============================================================================

// Test: useListenToStoreChanges with typed store
function _TestUseListenToStoreChanges() {
    interface State {
        value: number;
        text: string;
    }

    const store = createStore<State>({
        value: 0,
        text: "",
    });

    // Listen to specific key
    useListenToStoreChanges(
        store,
        "value",
        (newValue, oldValue) => {
            const _nv: number | undefined = newValue;
            const _ov: number | undefined = oldValue;
        },
    );

    useListenToStoreChanges(
        store,
        "text",
        (newValue, oldValue) => {
            const _nv: string | undefined = newValue;
            const _ov: string | undefined = oldValue;
        },
    );

    // @ts-expect-error - Invalid: unknown key
    useListenToStoreChanges(store, "unknown", () => {});

    return null;
}

// ============================================================================
// Complex component combining multiple hooks
// ============================================================================

function _TestComplexComponent() {
    interface Events {
        userAction: (action: string, data: unknown) => void;
        stateChange: (key: string, value: unknown) => void;
        [key: string]: (...args: any[]) => any; // Index signature for BaseEventMap
    }

    interface Actions {
        fetchUser: (id: string) => Promise<{ name: string; }>;
        saveUser: (data: { name: string; }) => Promise<boolean>;
        [key: string]: (...args: any[]) => any; // Index signature for BaseActionsMap
    }

    interface State {
        currentUser: { name: string; } | null;
        loading: boolean;
    }

    // Hooks
    const eventBus = useEventBus<Events>();
    const actionBus = useActionBus<Actions>({
        fetchUser: async (id) => Promise.resolve({ name: "User " + id }),
        saveUser: async (_data) => Promise.resolve(true),
    });
    const store = useStore<State>({
        currentUser: null,
        loading: false,
    });

    // Listen to events
    const handleUserAction = useCallback((action: string, data: unknown) => {
        eventBus.trigger("stateChange", action, data);
    }, []);

    useListenToEventBus(eventBus, "userAction", handleUserAction);

    // Listen to actions - with index signature in Actions, handler type is more permissive
    useListenToActionBus(actionBus, "fetchUser", (response) => {
        // When using BaseActionsMap with index signature,
        // the response type is ActionResponse<any, any[]>
        if (response.response) {
            store.set("currentUser", response.response as { name: string; });
        }
        store.set("loading", false);
    });

    // Use store state for single key
    const [ _loading, _setLoading ] = useStoreState(store, "loading");
    const [ _currentUser, _setCurrentUser ] = useStoreState(
        store,
        "currentUser",
    );

    useEffect(() => {
        store.set("loading", true);
        void actionBus.invoke("fetchUser", "123");
    }, []);

    return null;
}

// ============================================================================
// Dynamic event bus with declaration merging pattern
// ============================================================================

import type { BaseEventMap } from "../../src/eventBus";

// Dynamic event maps in components - useEventBus requires BaseEventMap constraint
// which includes index signature. For strict checking, create bus outside component.

function _TestDynamicEventBusInComponent() {
    // useEventBus generic must extend BaseEventMap (with index signature)
    // This means unknown events are allowed but known events are still typed
    interface ComponentEvents extends BaseEventMap {
        "app:init": (config: { debug: boolean; }) => void;
        "app:error": (error: Error) => void;
    }

    const eventBus = useEventBus<ComponentEvents>();

    // Valid: declared events work with correct types
    eventBus.trigger("app:init", { debug: true });
    eventBus.trigger("app:error", new Error("test"));

    // With index signature, even known events have permissive typing
    // This is a trade-off - you get flexibility but lose strict checking
    eventBus.trigger("app:init", "wrong"); // Allowed due to index signature

    // Unknown events are also allowed
    eventBus.trigger("dynamic:event", "any", "args");

    return null;
}

console.log("React hooks type tests passed!");
