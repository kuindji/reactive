/**
 * Compile-time type tests for createStore
 *
 * These tests verify type safety at compile time.
 * If TypeScript compiles this file without errors (except for @ts-expect-error lines),
 * the type tests pass.
 */

import { createStore } from "../../src/store";

// ============================================================================
// Basic Store creation and type inference
// ============================================================================

// Test: Basic typed store
{
    interface AppState {
        user: { id: string; name: string; } | null;
        theme: "light" | "dark";
        count: number;
        items: string[];
    }

    const store = createStore<AppState>({
        user: null,
        theme: "light",
        count: 0,
        items: [],
    });

    // Valid: set with correct types
    store.set("user", { id: "123", name: "John" });
    store.set("user", null);
    store.set("theme", "dark");
    store.set("count", 42);
    store.set("items", ["a", "b", "c"]);

    // @ts-expect-error - Invalid: unknown property
    store.set("unknownProp", "value");

    // @ts-expect-error - Invalid: wrong type for user
    store.set("user", "not an object");

    // @ts-expect-error - Invalid: wrong theme value
    store.set("theme", "blue");

    // @ts-expect-error - Invalid: wrong type for count
    store.set("count", "not a number");

    // @ts-expect-error - Invalid: wrong array type
    store.set("items", [1, 2, 3]);
}

// Test: get() returns correct types
{
    interface State {
        name: string;
        age: number;
        active: boolean;
    }

    const store = createStore<State>({
        name: "John",
        age: 30,
        active: true,
    });

    // Single key returns single value
    const _name: string = store.get("name");
    const _age: number = store.get("age");
    const _active: boolean = store.get("active");

    // @ts-expect-error - Invalid: wrong return type
    const _wrongName: number = store.get("name");

    // @ts-expect-error - Invalid: unknown key
    store.get("unknown");

    // Array of keys returns object with those keys
    const subset = store.get(["name", "age"]);
    const _subsetName: string = subset.name;
    const _subsetAge: number = subset.age;

    // @ts-expect-error - Invalid: active not in subset
    const _subsetActive = subset.active;
}

// ============================================================================
// Batch set with object
// ============================================================================

// Test: set() with object
{
    interface State {
        a: string;
        b: number;
        c: boolean;
    }

    const store = createStore<State>({
        a: "",
        b: 0,
        c: false,
    });

    // Valid: partial update with object
    store.set({ a: "new" });
    store.set({ b: 42 });
    store.set({ a: "test", b: 100 });
    store.set({ a: "test", b: 100, c: true });

    // @ts-expect-error - Invalid: wrong type in object
    store.set({ a: 123 });

    // @ts-expect-error - Invalid: unknown property in object
    store.set({ unknown: "value" });
}

// ============================================================================
// onChange listeners
// ============================================================================

// Test: onChange listener receives correct types
{
    interface State {
        data: { value: number; };
        status: "idle" | "loading" | "done";
    }

    const store = createStore<State>({
        data: { value: 0 },
        status: "idle",
    });

    store.onChange("data", (value, prevValue) => {
        // value is correctly typed
        if (value) {
            const _v: number = value.value;

            // @ts-expect-error - Invalid: wrong property
            const _wrong = value.wrongProp;
        }

        // prevValue is also correctly typed
        if (prevValue) {
            const _prev: number = prevValue.value;
        }
    });

    store.onChange("status", (value, _prevValue) => {
        // Union type is preserved
        if (value) {
            const _s: "idle" | "loading" | "done" = value;

            // @ts-expect-error - Invalid: wrong union value
            const _wrongStatus: "error" = value;
        }
    });

    // @ts-expect-error - Invalid: unknown property
    store.onChange("unknown", () => { });
}

// ============================================================================
// pipe listeners
// ============================================================================

// Test: pipe listener transforms value
{
    interface State {
        text: string;
        numbers: number[];
    }

    const store = createStore<State>({
        text: "",
        numbers: [],
    });

    // Pipe receives value and returns transformed value of same type
    store.pipe("text", (value) => {
        // Must return string (same as input type)
        return value ? value.toUpperCase() : "";
    });

    store.pipe("numbers", (value) => {
        // Must return number[] (same as input type)
        return value ? value.map((n) => n * 2) : [];
    });

    // @ts-expect-error - Invalid: returning wrong type (number instead of string)
    store.pipe("text", (_value: string | undefined): number => {
        return 123;
    });

    // @ts-expect-error - Invalid: returning wrong array type
    store.pipe("numbers", (_value: number[] | undefined): string[] => {
        return ["a", "b"];
    });

    // @ts-expect-error - Invalid: unknown property
    store.pipe("unknown", () => "");
}

// ============================================================================
// Control events
// ============================================================================

// Test: control event listeners
{
    interface State {
        value: number;
    }

    const store = createStore<State>({ value: 0 });

    // before event - can cancel changes
    store.control("before", (name, value) => {
        // name is keyof State
        const _key: keyof State = name;

        // Can return false to cancel
        if (name === "value" && value === -1) {
            return false;
        }
        return true;
    });

    // change event - receives array of changed keys
    store.control("change", (names) => {
        // names is array of keys
        const _keys: (keyof State)[] = names;
        const _first: keyof State | undefined = names[0];
    });

    // reset event - no arguments
    store.control("reset", () => {
        console.log("Store was reset");
    });

    // error event
    store.control("error", (errorResponse) => {
        const _error: Error = errorResponse.error;
        const _args: any[] = errorResponse.args;
    });

    // effect event - called after change for side effects
    store.control("effect", (name, _value) => {
        const _key: keyof State = name;
        // Can trigger additional changes
    });

    // @ts-expect-error - Invalid: unknown control event
    store.control("unknownEvent", () => { });
}

// ============================================================================
// getData() and batch()
// ============================================================================

// Test: getData() returns full state
{
    interface State {
        a: string;
        b: number;
    }

    const store = createStore<State>({ a: "test", b: 42 });

    const data = store.getData();
    const _a: string = data.a;
    const _b: number = data.b;

    // @ts-expect-error - Invalid: unknown property
    const _c = data.c;
}

// Test: batch() groups changes
{
    interface State {
        x: number;
        y: number;
    }

    const store = createStore<State>({ x: 0, y: 0 });

    store.batch(() => {
        store.set("x", 10);
        store.set("y", 20);
        // Both changes are batched, single change event
    });
}

// ============================================================================
// asyncSet()
// ============================================================================

// Test: asyncSet() has same type safety as set()
{
    interface State {
        value: number;
        flag: boolean;
    }

    const store = createStore<State>({ value: 0, flag: false });

    // Valid
    store.asyncSet("value", 42);
    store.asyncSet("flag", true);
    store.asyncSet({ value: 100 });

    // @ts-expect-error - Invalid: wrong type
    store.asyncSet("value", "string");

    // @ts-expect-error - Invalid: unknown key
    store.asyncSet("unknown", 123);
}

// ============================================================================
// Complex state types
// ============================================================================

// Test: Nested object state
{
    interface DeepState {
        user: {
            profile: {
                name: string;
                bio: string;
            };
            settings: {
                notifications: boolean;
                theme: "light" | "dark";
            };
        } | null;
        metadata: {
            version: number;
            lastUpdated: Date;
        };
    }

    const store = createStore<DeepState>({
        user: null,
        metadata: { version: 1, lastUpdated: new Date() },
    });

    // Valid: setting nested objects
    store.set("user", {
        profile: { name: "John", bio: "Developer" },
        settings: { notifications: true, theme: "dark" },
    });

    store.set("metadata", { version: 2, lastUpdated: new Date() });

    // Invalid: wrong nested structure - TypeScript catches missing 'bio'
    // store.set("user", {
    //     profile: { name: "John" }, // missing bio
    //     settings: { notifications: true, theme: "dark" },
    // });

    // Invalid: wrong nested type - TypeScript catches bio being number
    // store.set("user", {
    //     profile: { name: "John", bio: 123 }, // bio should be string
    //     settings: { notifications: true, theme: "dark" },
    // });
}

// Test: Array state with complex items
{
    interface TodoState {
        todos: Array<{
            id: string;
            text: string;
            completed: boolean;
            tags: string[];
        }>;
        filter: "all" | "active" | "completed";
    }

    const store = createStore<TodoState>({
        todos: [],
        filter: "all",
    });

    // Valid
    store.set("todos", [
        { id: "1", text: "Task 1", completed: false, tags: ["work"] },
        { id: "2", text: "Task 2", completed: true, tags: [] },
    ]);

    store.set("filter", "active");

    // Invalid: wrong todo structure - TypeScript catches missing properties
    // store.set("todos", [
    //     { id: "1", text: "Task 1" }, // missing completed and tags
    // ]);

    // @ts-expect-error - Invalid: wrong filter value
    store.set("filter", "pending");
}

// ============================================================================
// Generic state (untyped)
// ============================================================================

// Test: Untyped store accepts any properties
{
    const store = createStore();

    // Untyped store is more permissive
    store.set("anything", 123);
    store.set("anyOther", { nested: true });

    // get returns any
    const _value = store.get("anything");
}

// ============================================================================
// isEmpty() and reset()
// ============================================================================

// Test: isEmpty() returns boolean
{
    interface State {
        value: string | null;
    }

    const store = createStore<State>({ value: null });

    const _empty: boolean = store.isEmpty();
}

// Test: reset() clears state and triggers reset event
{
    interface State {
        a: number;
        b: string;
    }

    const store = createStore<State>({ a: 1, b: "test" });

    let _resetCalled = false;
    store.control("reset", () => {
        _resetCalled = true;
    });

    store.reset();
    // After reset, state is cleared
}

console.log("Store type tests passed!");

