/**
 * Compile-time type tests for dynamic EventBus maps using declaration merging
 *
 * This demonstrates the pattern of extending event maps across multiple files
 * using TypeScript's declaration merging with `declare module`.
 */

import { type BaseEventMap, createEventBus } from "../../src/eventBus";

// ============================================================================
// Setup: Base interface that can be extended via declaration merging
// ============================================================================

/**
 * Utility type to omit the index signature from a type
 * This allows proper type checking when using declaration merging
 */
type OmitIndexSignature<ObjectType> = {
    [
    KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
    ? never
    : KeyType
    ]: ObjectType[KeyType];
};

/**
 * Base interface for the global event map
 * Other files can extend this using `declare module`
 */
export interface GlobalEventMap extends BaseEventMap { }

// Type alias that removes the index signature for strict checking
type Events = OmitIndexSignature<GlobalEventMap>;

// Create the global event bus instance
export const globalEventBus = createEventBus<Events>();

// ============================================================================
// Extending the event map (simulating another file)
// This pattern is used when building the event map across multiple files
// ============================================================================

// First extension - User events
declare module "./eventBus.dynamic" {
    export interface GlobalEventMap {
        "user:login": (userId: string, timestamp: number) => void;
        "user:logout": (userId: string) => void;
        "user:profileUpdate": (userId: string, changes: { name?: string; email?: string; }) => void;
    }
}

// Second extension - Notification events (simulating yet another file)
declare module "./eventBus.dynamic" {
    export interface GlobalEventMap {
        "notification:show": (message: string, type: "info" | "warning" | "error") => void;
        "notification:dismiss": (notificationId: string) => void;
    }
}

// Third extension - Data events with return types
declare module "./eventBus.dynamic" {
    export interface GlobalEventMap {
        "data:fetch": (resource: string) => Promise<{ data: unknown; }>;
        "data:transform": (input: string) => string;
        "data:validate": (data: unknown) => boolean;
    }
}

// ============================================================================
// Type tests with the extended event map
// ============================================================================

// Test: User events work correctly
{
    // Valid: all arguments match
    globalEventBus.trigger("user:login", "user123", Date.now());
    globalEventBus.trigger("user:logout", "user123");
    globalEventBus.trigger("user:profileUpdate", "user123", { name: "New Name" });
    globalEventBus.trigger("user:profileUpdate", "user123", { email: "new@email.com" });
    globalEventBus.trigger("user:profileUpdate", "user123", { name: "Name", email: "email" });

    // @ts-expect-error - Invalid: wrong userId type
    globalEventBus.trigger("user:login", 123, Date.now());

    // @ts-expect-error - Invalid: wrong timestamp type
    globalEventBus.trigger("user:login", "user123", "now");

    // @ts-expect-error - Invalid: missing arguments
    globalEventBus.trigger("user:login", "user123");

    // @ts-expect-error - Invalid: wrong changes shape
    globalEventBus.trigger("user:profileUpdate", "user123", { wrongProp: "value" });
}

// Test: Notification events work correctly
{
    // Valid
    globalEventBus.trigger("notification:show", "Hello!", "info");
    globalEventBus.trigger("notification:show", "Warning!", "warning");
    globalEventBus.trigger("notification:dismiss", "notif-123");

    // @ts-expect-error - Invalid: wrong notification type
    globalEventBus.trigger("notification:show", "Hello!", "success");

    // @ts-expect-error - Invalid: missing type argument
    globalEventBus.trigger("notification:show", "Hello!");
}

// Test: Data events with return types
{
    // Return type inference
    const transformResult = globalEventBus.first("data:transform", "input");
    const _checkTransform: string | undefined = transformResult;

    const validateResult = globalEventBus.first("data:validate", { any: "data" });
    const _checkValidate: boolean | undefined = validateResult;

    // Async events with resolveAll
    async function _testAsync() {
        const fetchResults = await globalEventBus.resolveAll("data:fetch", "/api/users");
        const _data = fetchResults[0]?.data;
    }

    // @ts-expect-error - Invalid: expecting wrong return type
    const _wrongTransform: number = globalEventBus.first("data:transform", "input");
}

// Test: Listeners have correct types
{
    globalEventBus.on("user:login", (userId, timestamp) => {
        const _id: string = userId;
        const _ts: number = timestamp;

        // @ts-expect-error - Invalid: userId is string not number
        const _wrongId: number = userId;
    });

    globalEventBus.on("notification:show", (message, type) => {
        const _msg: string = message;
        const _t: "info" | "warning" | "error" = type;

        // @ts-expect-error - Invalid: type is union not just string
        const _wrongType: "success" = type;
    });

    globalEventBus.on("data:transform", (input) => {
        const _inp: string = input;
        return input.toUpperCase();
    });

    // @ts-expect-error - Invalid: listener returns wrong type
    globalEventBus.on("data:transform", (_input: string) => {
        return 123;
    });
}

// Test: Unknown events are rejected
{
    // @ts-expect-error - Invalid: event doesn't exist
    globalEventBus.trigger("unknown:event");

    // @ts-expect-error - Invalid: listening to unknown event
    globalEventBus.on("unknown:event", () => { });
}

// Test: get() returns correctly typed event
{
    const loginEvent = globalEventBus.get("user:login");

    loginEvent.trigger("user123", Date.now());

    // @ts-expect-error - Invalid: wrong arguments
    loginEvent.trigger(123, "wrong");
}

// ============================================================================
// Pattern: Creating typed event bus instance from extended interface
// ============================================================================

// This pattern allows you to have module-scoped event buses that share types
// with the global interface

function createTypedEventBus() {
    return createEventBus<Events>();
}

const localBus = createTypedEventBus();

// Local bus has the same type safety
localBus.trigger("user:login", "user123", Date.now());

// @ts-expect-error - Invalid: same type constraints apply
localBus.trigger("user:login", 123, Date.now());

// ============================================================================
// Pattern: Scoped event maps (for component/module isolation)
// ============================================================================

// For cases where you want isolated event namespaces
export interface ModuleEventMap extends BaseEventMap { }

type ModuleEvents = OmitIndexSignature<ModuleEventMap>;

export function createModuleEventBus() {
    return createEventBus<ModuleEvents>();
}

// Extend module events
declare module "./eventBus.dynamic" {
    export interface ModuleEventMap {
        "module:init": (config: { debug: boolean; }) => void;
        "module:destroy": () => void;
    }
}

// Test module events
{
    const moduleBus = createModuleEventBus();

    moduleBus.trigger("module:init", { debug: true });
    moduleBus.trigger("module:destroy");

    // @ts-expect-error - Invalid: wrong config shape
    moduleBus.trigger("module:init", { wrong: "prop" });

    // Module bus doesn't have global events (they're separate interfaces)
    // This would be an error if ModuleEventMap doesn't extend GlobalEventMap
    // @ts-expect-error - user:login is not in ModuleEventMap
    moduleBus.trigger("user:login", "user123", Date.now());
}

// ============================================================================
// Pattern: Type-safe event emission from external modules
// ============================================================================

// When you need to emit events from a module that imports the event bus
function _emitUserLogin(userId: string) {
    globalEventBus.trigger("user:login", userId, Date.now());
}

function _emitNotification(message: string, type: "info" | "warning" | "error") {
    globalEventBus.trigger("notification:show", message, type);
}

// Type errors are caught at compile time
function _brokenEmitter() {
    // @ts-expect-error - Invalid argument types
    globalEventBus.trigger("user:login", 123, "wrong");
}

console.log("Dynamic EventBus type tests passed!");

