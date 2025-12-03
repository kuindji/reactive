/**
 * Compile-time type tests for dynamic Store using declaration merging
 *
 * This demonstrates patterns for:
 * 1. Extending store state types across multiple files
 * 2. Creating typed store wrappers that accept listeners
 * 3. Higher-level abstractions over the store
 */

import { createStore, type BasePropMap } from "../../src/store";
import type { ErrorListenerSignature } from "../../src/lib/types";

// ============================================================================
// Setup: Base interface that can be extended via declaration merging
// ============================================================================

/**
 * Utility type to omit the index signature
 */
type OmitIndexSignature<ObjectType> = {
    [
    KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
    ? never
    : KeyType
    ]: ObjectType[KeyType];
};

/**
 * Base interface for global app state
 */
export interface GlobalAppState extends BasePropMap { }

type AppState = OmitIndexSignature<GlobalAppState>;

// ============================================================================
// Extending the state map (simulating multiple files/modules)
// ============================================================================

// First extension - User state
declare module "./store.dynamic" {
    export interface GlobalAppState {
        currentUser: { id: string; name: string; email: string } | null;
        isAuthenticated: boolean;
        authToken: string | null;
    }
}

// Second extension - UI state
declare module "./store.dynamic" {
    export interface GlobalAppState {
        theme: "light" | "dark" | "system";
        sidebarOpen: boolean;
        notifications: Array<{ id: string; message: string; type: "info" | "warning" | "error" }>;
    }
}

// Third extension - Data state
declare module "./store.dynamic" {
    export interface GlobalAppState {
        items: Array<{ id: string; name: string; value: number }>;
        selectedItemId: string | null;
        isLoading: boolean;
        error: Error | null;
    }
}

// ============================================================================
// Factory function for typed store
// ============================================================================

export function createAppStore(
    initialData: Partial<AppState> = {},
) {
    return createStore<AppState>(initialData);
}

// ============================================================================
// Type tests with extended state
// ============================================================================

const appStore = createAppStore({
    currentUser: null,
    isAuthenticated: false,
    authToken: null,
    theme: "light",
    sidebarOpen: true,
    notifications: [],
    items: [],
    selectedItemId: null,
    isLoading: false,
    error: null,
});

// Test: User state types correctly
{
    // Valid sets
    appStore.set("currentUser", { id: "123", name: "John", email: "john@example.com" });
    appStore.set("currentUser", null);
    appStore.set("isAuthenticated", true);
    appStore.set("authToken", "jwt-token");
    appStore.set("authToken", null);

    // @ts-expect-error - Invalid: wrong user shape
    appStore.set("currentUser", { id: "123" });

    // @ts-expect-error - Invalid: wrong type for isAuthenticated
    appStore.set("isAuthenticated", "yes");

    // Valid gets
    const _user: { id: string; name: string; email: string } | null = appStore.get("currentUser");
    const _isAuth: boolean = appStore.get("isAuthenticated");
    const _token: string | null = appStore.get("authToken");
}

// Test: UI state types correctly
{
    // Valid
    appStore.set("theme", "dark");
    appStore.set("theme", "light");
    appStore.set("theme", "system");
    appStore.set("sidebarOpen", false);
    appStore.set("notifications", [{ id: "1", message: "Hello", type: "info" }]);

    // @ts-expect-error - Invalid: wrong theme value
    appStore.set("theme", "blue");

    // @ts-expect-error - Invalid: wrong notification shape
    appStore.set("notifications", [{ message: "Missing id and type" }]);

    const _theme: "light" | "dark" | "system" = appStore.get("theme");
    const _notifications = appStore.get("notifications");
    const _firstNotif: { id: string; message: string; type: "info" | "warning" | "error" } | undefined = _notifications[0];
}

// Test: Data state types correctly
{
    appStore.set("items", [{ id: "1", name: "Item 1", value: 100 }]);
    appStore.set("selectedItemId", "1");
    appStore.set("selectedItemId", null);
    appStore.set("isLoading", true);
    appStore.set("error", new Error("Failed"));
    appStore.set("error", null);

    // @ts-expect-error - Invalid: wrong item shape
    appStore.set("items", [{ id: "1", name: "Missing value" }]);

    const _items = appStore.get("items");
    const _firstItem: { id: string; name: string; value: number } | undefined = _items[0];
}

// Test: Batch set with object
{
    // Valid partial updates
    appStore.set({ theme: "dark", sidebarOpen: false });
    appStore.set({ isLoading: true, error: null });
    appStore.set({ currentUser: null, isAuthenticated: false, authToken: null });

    // @ts-expect-error - Invalid: wrong type in batch
    appStore.set({ theme: "invalid" });

    // @ts-expect-error - Invalid: unknown property
    appStore.set({ unknownProp: "value" });
}

// Test: onChange listeners have correct types
{
    appStore.onChange("currentUser", (value, prevValue) => {
        if (value) {
            const _name: string = value.name;
            const _email: string = value.email;

            // @ts-expect-error - Invalid: unknown property
            const _wrong = value.unknownProp;
        }

        if (prevValue) {
            const _prevName: string = prevValue.name;
        }
    });

    appStore.onChange("theme", (value, _prevValue) => {
        if (value) {
            const _theme: "light" | "dark" | "system" = value;

            // Theme is narrowed to union type
            if (value === "dark") {
                // Valid: value is "dark"
            }
        }
    });

    appStore.onChange("notifications", (value, _prevValue) => {
        if (value) {
            const notifications = value;
            const _first = notifications[0];
            if (_first) {
                const _type: "info" | "warning" | "error" = _first.type;
            }
        }
    });

    // @ts-expect-error - Invalid: unknown property
    appStore.onChange("unknownProp", () => {});
}

// Test: pipe listeners transform values correctly
{
    appStore.pipe("theme", (value) => {
        // Must return same type
        return value ?? "light";
    });

    appStore.pipe("notifications", (value) => {
        // Filter to max 10 notifications
        return (value ?? []).slice(0, 10);
    });

    // @ts-expect-error - Invalid: returning wrong type
    appStore.pipe("theme", (_value): number => 123);

    // @ts-expect-error - Invalid: returning wrong array type
    appStore.pipe("notifications", (_value): string[] => []);
}

// Test: control listeners
{
    // before - can cancel changes
    appStore.control("before", (name, value) => {
        const _key: keyof AppState = name;

        // Can check specific properties
        if (name === "currentUser" && value === null) {
            // Don't allow logging out
            return false;
        }
        return true;
    });

    // change - receives changed keys
    appStore.control("change", (names) => {
        const _keys: (keyof AppState)[] = names;
        for (const key of names) {
            const _k: keyof AppState = key;
        }
    });

    // effect - side effects after change
    appStore.control("effect", (name, value) => {
        if (name === "isAuthenticated" && value === true) {
            // Fetch user data
        }
    });
}

// Test: get with array of keys
{
    const subset = appStore.get(["currentUser", "isAuthenticated", "authToken"]);

    const _user = subset.currentUser;
    const _isAuth: boolean = subset.isAuthenticated;
    const _token: string | null = subset.authToken;

    // @ts-expect-error - Invalid: theme not in subset
    const _theme = subset.theme;
}

// ============================================================================
// Pattern: Store wrapper that accepts listeners in constructor
// ============================================================================

type StoreChangeListener<K extends keyof AppState> = (
    value: AppState[K] | undefined,
    previousValue: AppState[K] | undefined,
) => void;

type StorePipeListener<K extends keyof AppState> = (
    value: AppState[K] | undefined,
) => AppState[K];

interface StoreWrapperOptions {
    initialData?: Partial<AppState>;
    onChange?: {
        [K in keyof AppState]?: StoreChangeListener<K>;
    };
    pipe?: {
        [K in keyof AppState]?: StorePipeListener<K>;
    };
    onError?: ErrorListenerSignature<unknown[]>;
}

function createStoreWrapper(options: StoreWrapperOptions = {}) {
    const store = createAppStore(options.initialData);

    // Register onChange listeners
    if (options.onChange) {
        for (const key of Object.keys(options.onChange) as Array<keyof AppState>) {
            const listener = options.onChange[key];
            if (listener) {
                store.onChange(key, listener as any);
            }
        }
    }

    // Register pipe listeners
    if (options.pipe) {
        for (const key of Object.keys(options.pipe) as Array<keyof AppState>) {
            const listener = options.pipe[key];
            if (listener) {
                store.pipe(key, listener as any);
            }
        }
    }

    // Register error listener
    if (options.onError) {
        store.control("error", options.onError);
    }

    return store;
}

// Test: Store wrapper with typed listeners
{
    const _wrappedStore = createStoreWrapper({
        initialData: {
            theme: "dark",
            isLoading: false,
        },
        onChange: {
            theme: (value, prevValue) => {
                // Types are correct
                const _v: "light" | "dark" | "system" | undefined = value;
                const _pv: "light" | "dark" | "system" | undefined = prevValue;
            },
            currentUser: (value, _prevValue) => {
                if (value) {
                    const _name: string = value.name;
                }
            },
            notifications: (value, _prevValue) => {
                const _notifs: Array<{ id: string; message: string; type: "info" | "warning" | "error" }> | undefined = value;
            },
        },
        pipe: {
            theme: (value) => value ?? "light",
            notifications: (value) => (value ?? []).slice(0, 5),
        },
        onError: ({ error }) => {
            console.error("Store error:", error);
        },
    });
}

// ============================================================================
// Pattern: Module-specific stores with shared patterns
// ============================================================================

export interface ModuleState extends BasePropMap { }

type ModuleStateKeys = OmitIndexSignature<ModuleState>;

declare module "./store.dynamic" {
    export interface ModuleState {
        moduleData: { value: number } | null;
        moduleStatus: "idle" | "active" | "error";
    }
}

function createModuleStore(
    initialData: Partial<ModuleStateKeys> = {},
    listeners?: {
        onChange?: {
            [K in keyof ModuleStateKeys]?: (
                value: ModuleStateKeys[K] | undefined,
                prevValue: ModuleStateKeys[K] | undefined,
            ) => void;
        };
    },
) {
    const store = createStore<ModuleStateKeys>(initialData);

    if (listeners?.onChange) {
        for (const key of Object.keys(listeners.onChange) as Array<keyof ModuleStateKeys>) {
            const listener = listeners.onChange[key];
            if (listener) {
                store.onChange(key, listener as any);
            }
        }
    }

    return store;
}

// Test: Module store is isolated
{
    const moduleStore = createModuleStore(
        {
            moduleData: null,
            moduleStatus: "idle",
        },
        {
            onChange: {
                moduleStatus: (value, _prevValue) => {
                    const _status: "idle" | "active" | "error" | undefined = value;
                },
            },
        },
    );

    // Valid
    moduleStore.set("moduleStatus", "active");
    moduleStore.set("moduleData", { value: 42 });

    // @ts-expect-error - Invalid: wrong status value
    moduleStore.set("moduleStatus", "unknown");

    // @ts-expect-error - Invalid: app state properties not in module store
    moduleStore.set("theme", "dark");
}

// ============================================================================
// Pattern: Computed/derived state helpers
// ============================================================================

function createComputedSelector<K extends string & keyof AppState, R>(
    store: ReturnType<typeof createAppStore>,
    key: K,
    compute: (value: AppState[K]) => R,
): () => R {
    return () => {
        const value = store.get(key) as AppState[K];
        return compute(value);
    };
}

// Test: Computed selectors
{
    const getNotificationCount = createComputedSelector(
        appStore,
        "notifications",
        (notifications) => notifications.length,
    );

    const _count: number = getNotificationCount();

    const getCurrentUserName = createComputedSelector(
        appStore,
        "currentUser",
        (user) => user?.name ?? "Guest",
    );

    const _name: string = getCurrentUserName();

    const getHasError = createComputedSelector(
        appStore,
        "error",
        (error) => error !== null,
    );

    const _hasError: boolean = getHasError();
}

console.log("Dynamic Store type tests passed!");

