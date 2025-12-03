/**
 * Compile-time type tests for dynamic ActionMap using declaration merging
 *
 * This demonstrates the pattern of extending action maps across multiple files
 * using TypeScript's declaration merging with `declare module`.
 */

import type { BaseActionsMap } from "../../src/actionBus";
import { createActionMap } from "../../src/actionMap";

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
 */
export interface GlobalActionMapTypes extends BaseActionsMap { }

// Type alias that removes the index signature for strict checking
type Actions = OmitIndexSignature<GlobalActionMapTypes>;

// ============================================================================
// Extending the actions map (simulating multiple files)
// ============================================================================

// First extension - API actions
declare module "./actionMap.dynamic" {
    export interface GlobalActionMapTypes {
        "api:get": <T>(endpoint: string) => Promise<T>;
        "api:post": <T>(endpoint: string, data: unknown) => Promise<T>;
        "api:delete": (endpoint: string) => Promise<boolean>;
    }
}

// Second extension - User actions
declare module "./actionMap.dynamic" {
    export interface GlobalActionMapTypes {
        "user:fetch": (userId: string) => Promise<{ id: string; name: string; email: string }>;
        "user:create": (data: { name: string; email: string }) => Promise<{ id: string }>;
        "user:update": (userId: string, data: Partial<{ name: string; email: string }>) => Promise<boolean>;
    }
}

// Third extension - Analytics actions
declare module "./actionMap.dynamic" {
    export interface GlobalActionMapTypes {
        "analytics:track": (event: string, properties?: Record<string, unknown>) => void;
        "analytics:identify": (userId: string, traits?: Record<string, unknown>) => void;
    }
}

// ============================================================================
// Factory function to create typed action map
// ============================================================================

export function createTypedActionMap(
    implementations: {
        [K in keyof Actions]: Actions[K];
    },
    onError?: (error: { error: Error; args: unknown[]; name?: string }) => void,
) {
    return createActionMap(implementations, onError);
}

// ============================================================================
// Example implementation
// ============================================================================

const globalActions = createTypedActionMap({
    "api:get": async (_endpoint) => Promise.resolve({} as any),
    "api:post": async (_endpoint, _data) => Promise.resolve({} as any),
    "api:delete": async (_endpoint) => Promise.resolve(true),
    "user:fetch": async (userId) => Promise.resolve({ id: userId, name: "John", email: "john@example.com" }),
    "user:create": async (_data) => Promise.resolve({ id: "new-id" }),
    "user:update": async (_userId, _data) => Promise.resolve(true),
    "analytics:track": (_event, _properties) => {},
    "analytics:identify": (_userId, _traits) => {},
});

// ============================================================================
// Type tests
// ============================================================================

// Test: User actions type correctly
{
    async function _testUserActions() {
        const fetchResult = await globalActions["user:fetch"].invoke("user123");

        if (fetchResult.response) {
            const _id: string = fetchResult.response.id;
            const _name: string = fetchResult.response.name;
            const _email: string = fetchResult.response.email;

            // @ts-expect-error - Invalid: unknown property
            const _wrong = fetchResult.response.unknownProp;
        }

        const createResult = await globalActions["user:create"].invoke({
            name: "Jane",
            email: "jane@example.com",
        });

        if (createResult.response) {
            const _id: string = createResult.response.id;
        }

        // @ts-expect-error - Invalid: missing email
        await globalActions["user:create"].invoke({ name: "Jane" });

        // @ts-expect-error - Invalid: wrong userId type
        await globalActions["user:fetch"].invoke(123);
    }
}

// Test: API actions type correctly
{
    async function _testApiActions() {
        const _getResult = await globalActions["api:get"].invoke("/users");
        const _postResult = await globalActions["api:post"].invoke("/users", { name: "test" });
        const deleteResult = await globalActions["api:delete"].invoke("/users/123");

        if (deleteResult.response !== null) {
            const _success: boolean = deleteResult.response;
        }

        // @ts-expect-error - Invalid: missing endpoint
        await globalActions["api:get"].invoke();

        // @ts-expect-error - Invalid: missing data for post
        await globalActions["api:post"].invoke("/users");
    }
}

// Test: Analytics actions (void return)
{
    async function _testAnalyticsActions() {
        await globalActions["analytics:track"].invoke("page_view", { page: "/home" });
        await globalActions["analytics:track"].invoke("click");

        await globalActions["analytics:identify"].invoke("user123", { plan: "pro" });
        await globalActions["analytics:identify"].invoke("user123");

        // @ts-expect-error - Invalid: missing event name
        await globalActions["analytics:track"].invoke();
    }
}

// Test: Listeners have correct types
{
    globalActions["user:fetch"].on((response) => {
        const _userId: string = response.args[0];

        // @ts-expect-error - Invalid: wrong type
        const _wrongUserId: number = response.args[0];

        if (response.response) {
            const _name: string = response.response.name;
        }
    });

    globalActions["user:create"].addBeforeActionListener((data) => {
        const _name: string = data.name;
        const _email: string = data.email;

        // @ts-expect-error - Invalid: unknown property
        const _wrong = data.unknownProp;

        if (!data.email.includes("@")) {
            return false;
        }
    });
}

// Test: Error handlers
{
    globalActions["api:get"].addErrorListener((errorResponse) => {
        const _error: Error = errorResponse.error;
        const _args: [string] = errorResponse.args;
        const _endpoint: string = errorResponse.args[0];

        // @ts-expect-error - Invalid: wrong type
        const _wrongEndpoint: number = errorResponse.args[0];
    });
}

// Test: Unknown actions are rejected
{
    // @ts-expect-error - Invalid: unknown action
    const _unknown = globalActions["unknown:action"];
}

// ============================================================================
// Pattern: Creating scoped action maps
// ============================================================================

export interface ScopedActionMapTypes extends BaseActionsMap { }

type ScopedActions = OmitIndexSignature<ScopedActionMapTypes>;

declare module "./actionMap.dynamic" {
    export interface ScopedActionMapTypes {
        "scoped:init": (config: { debug: boolean }) => Promise<void>;
        "scoped:cleanup": () => Promise<void>;
    }
}

export function createScopedActionMap(
    implementations: {
        [K in keyof ScopedActions]: ScopedActions[K];
    },
) {
    return createActionMap(implementations);
}

// Test: Scoped actions are isolated
{
    const scopedActions = createScopedActionMap({
        "scoped:init": async (_config) => {},
        "scoped:cleanup": async () => {},
    });

    async function _test() {
        await scopedActions["scoped:init"].invoke({ debug: true });
        await scopedActions["scoped:cleanup"].invoke();

        // @ts-expect-error - Invalid: wrong config shape
        await scopedActions["scoped:init"].invoke({ wrong: "prop" });

        // @ts-expect-error - Invalid: user actions not in scoped map
        await scopedActions["user:fetch"].invoke("123");
    }
}

console.log("Dynamic ActionMap type tests passed!");

