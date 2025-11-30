/**
 * Compile-time type tests for dynamic ActionBus maps using declaration merging
 *
 * This demonstrates the pattern of extending action maps across multiple files
 * using TypeScript's declaration merging with `declare module`.
 */

import type { BaseActionsMap } from "../../src/actionBus";
import { createActionBus } from "../../src/actionBus";

// ============================================================================
// Setup: Base interface that can be extended via declaration merging
// ============================================================================

/**
 * Utility type to omit the index signature from a type
 */
type OmitIndexSignature<ObjectType> = {
    [
    KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
    ? never
    : KeyType
    ]: ObjectType[KeyType];
};

/**
 * Base interface for the global actions map
 * Other files can extend this using `declare module`
 */
export interface GlobalActionsMap extends BaseActionsMap { }

// Type alias that removes the index signature for strict checking
type Actions = OmitIndexSignature<GlobalActionsMap>;

// ============================================================================
// Extending the actions map (simulating multiple files)
// ============================================================================

// First extension - User actions
declare module "./actionBus.dynamic" {
    export interface GlobalActionsMap {
        "user:fetch": (userId: string) => Promise<{ id: string; name: string; email: string; }>;
        "user:create": (data: { name: string; email: string; }) => Promise<{ id: string; }>;
        "user:update": (userId: string, changes: { name?: string; email?: string; }) => Promise<boolean>;
        "user:delete": (userId: string) => Promise<void>;
    }
}

// Second extension - Auth actions
declare module "./actionBus.dynamic" {
    export interface GlobalActionsMap {
        "auth:login": (credentials: { email: string; password: string; }) => Promise<{ token: string; userId: string; }>;
        "auth:logout": () => Promise<void>;
        "auth:refresh": (token: string) => Promise<{ token: string; }>;
    }
}

// Third extension - Data actions
declare module "./actionBus.dynamic" {
    export interface GlobalActionsMap {
        "data:fetch": <T>(endpoint: string) => Promise<T>;
        "data:save": (endpoint: string, data: unknown) => Promise<{ success: boolean; }>;
    }
}

// ============================================================================
// Factory function that creates typed action bus from implementations
// ============================================================================

/**
 * Creates a typed action bus from the global actions map
 * Implementations must match the declared types exactly
 */
export function createGlobalActionBus(
    implementations: {
        [K in keyof Actions]: Actions[K];
    },
) {
    return createActionBus<Actions>(implementations);
}

// ============================================================================
// Example implementation
// ============================================================================

const globalActionBus = createGlobalActionBus({
    "user:fetch": async (userId) => {
        return Promise.resolve({ id: userId, name: "John", email: "john@example.com" });
    },
    "user:create": async (_data) => {
        return Promise.resolve({ id: "new-id" });
    },
    "user:update": async (_userId, _changes) => {
        return Promise.resolve(true);
    },
    "user:delete": async (_userId) => {
        return Promise.resolve();
    },
    "auth:login": async (_credentials) => {
        return Promise.resolve({ token: "jwt-token", userId: "user123" });
    },
    "auth:logout": async () => {
        return Promise.resolve();
    },
    "auth:refresh": async (_token) => {
        return Promise.resolve({ token: "new-token" });
    },
    "data:fetch": async (_endpoint) => {
        return Promise.resolve({} as any);
    },
    "data:save": async (_endpoint, _data) => {
        return Promise.resolve({ success: true });
    },
});

// ============================================================================
// Type tests with the extended action map
// ============================================================================

// Test: User actions work correctly
{
    async function _testUserActions() {
        // Valid invocations
        const fetchResult = await globalActionBus.invoke("user:fetch", "user123");
        const createResult = await globalActionBus.invoke("user:create", {
            name: "Jane",
            email: "jane@example.com",
        });
        const updateResult = await globalActionBus.invoke(
            "user:update",
            "user123",
            { name: "New Name" },
        );
        const _deleteResult = await globalActionBus.invoke("user:delete", "user123");

        // Check return types
        if (fetchResult.response) {
            const _id: string = fetchResult.response.id;
            const _name: string = fetchResult.response.name;
            const _email: string = fetchResult.response.email;

            // @ts-expect-error - Invalid: unknown property
            const _wrong = fetchResult.response.unknownProp;
        }

        if (createResult.response) {
            const _id: string = createResult.response.id;
        }

        if (updateResult.response !== null) {
            const _success: boolean = updateResult.response;
        }

        // @ts-expect-error - Invalid: wrong userId type
        await globalActionBus.invoke("user:fetch", 123);

        // @ts-expect-error - Invalid: missing email in create data
        await globalActionBus.invoke("user:create", { name: "Jane" });

        // @ts-expect-error - Invalid: unknown action
        await globalActionBus.invoke("user:unknown");
    }
}

// Test: Auth actions work correctly
{
    async function _testAuthActions() {
        const loginResult = await globalActionBus.invoke("auth:login", {
            email: "user@example.com",
            password: "secret",
        });

        const _logoutResult = await globalActionBus.invoke("auth:logout");
        const refreshResult = await globalActionBus.invoke("auth:refresh", "old-token");

        if (loginResult.response) {
            const _token: string = loginResult.response.token;
            const _userId: string = loginResult.response.userId;
        }

        if (refreshResult.response) {
            const _token: string = refreshResult.response.token;
        }

        // @ts-expect-error - Invalid: missing password
        await globalActionBus.invoke("auth:login", { email: "user@example.com" });

        // @ts-expect-error - Invalid: extra argument for logout
        await globalActionBus.invoke("auth:logout", "extra");
    }
}

// Test: Listeners have correct types
{
    globalActionBus.on("user:fetch", (response) => {
        // args are correctly typed
        const _userId: string = response.args[0];

        // @ts-expect-error - Invalid: wrong args type
        const _wrongUserId: number = response.args[0];

        if (response.response) {
            const user = response.response;
            const _id: string = user.id;
            const _name: string = user.name;
        }
    });

    globalActionBus.on("auth:login", (response) => {
        const credentials = response.args[0];
        const _email: string = credentials.email;
        const _password: string = credentials.password;

        if (response.response) {
            const _token: string = response.response.token;
        }
    });

    // @ts-expect-error - Invalid: unknown action
    globalActionBus.on("unknown:action", () => { });
}

// Test: get() returns correctly typed action
{
    const fetchAction = globalActionBus.get("user:fetch");

    async function _test() {
        const _result = await fetchAction.invoke("user123");

        // @ts-expect-error - Invalid: wrong argument type
        await fetchAction.invoke(123);
    }

    // @ts-expect-error - Invalid: unknown action
    globalActionBus.get("unknown:action");
}

// ============================================================================
// Pattern: Module-scoped action bus with shared types
// ============================================================================

export interface ModuleActionsMap extends BaseActionsMap { }

type ModuleActions = OmitIndexSignature<ModuleActionsMap>;

declare module "./actionBus.dynamic" {
    export interface ModuleActionsMap {
        "module:init": (config: { debug: boolean; }) => Promise<void>;
        "module:process": (data: string) => Promise<{ result: string; }>;
    }
}

export function createModuleActionBus(
    implementations: {
        [K in keyof ModuleActions]: ModuleActions[K];
    },
) {
    return createActionBus<ModuleActions>(implementations);
}

// Test module action bus
{
    const moduleBus = createModuleActionBus({
        "module:init": async (_config) => { },
        "module:process": async (_data) => Promise.resolve({ result: _data.toUpperCase() }),
    });

    async function _test() {
        await moduleBus.invoke("module:init", { debug: true });
        const result = await moduleBus.invoke("module:process", "hello");

        if (result.response) {
            const _processed: string = result.response.result;
        }

        // @ts-expect-error - Invalid: wrong config shape
        await moduleBus.invoke("module:init", { wrong: "prop" });

        // Module bus doesn't have global actions
        // @ts-expect-error - user:fetch is not in ModuleActionsMap
        await moduleBus.invoke("user:fetch", "user123");
    }
}

// ============================================================================
// Pattern: Type-safe action invocation from external modules
// ============================================================================

async function _loginUser(email: string, password: string) {
    const result = await globalActionBus.invoke("auth:login", { email, password });
    if (result.response) {
        return result.response.token;
    }
    return null;
}

async function _fetchUser(userId: string) {
    const result = await globalActionBus.invoke("user:fetch", userId);
    return result.response;
}

// Type errors caught at compile time
async function _brokenInvocation() {
    // @ts-expect-error - Invalid argument type
    await globalActionBus.invoke("user:fetch", 123);
}

console.log("Dynamic ActionBus type tests passed!");

