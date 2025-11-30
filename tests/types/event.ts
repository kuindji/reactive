/**
 * Compile-time type tests for createEvent
 *
 * These tests verify type safety at compile time.
 * If TypeScript compiles this file without errors (except for @ts-expect-error lines),
 * the type tests pass.
 */

import { createEvent } from "../../src/event";

// ============================================================================
// Basic event creation and type inference
// ============================================================================

// Test: Basic typed event
{
    const event = createEvent<(value: number) => void>();

    // Valid: correct argument type
    event.trigger(42);

    // @ts-expect-error - Invalid: wrong argument type
    event.trigger("string");

    // @ts-expect-error - Invalid: missing argument
    event.trigger();

    // @ts-expect-error - Invalid: extra argument
    event.trigger(42, "extra");
}

// Test: Multi-argument event
{
    const event = createEvent<(a: string, b: number, c: boolean) => void>();

    // Valid
    event.trigger("hello", 42, true);

    // @ts-expect-error - Invalid: wrong order
    event.trigger(42, "hello", true);

    // @ts-expect-error - Invalid: missing arguments
    event.trigger("hello");
}

// Test: Event with return type
{
    const event = createEvent<(value: number) => string>();

    event.addListener((value) => {
        // Valid: value is inferred as number
        const result: number = value;
        return String(result);
    });

    // @ts-expect-error - Invalid: listener returns wrong type
    event.addListener((_value: number) => {
        return 123;
    });

    // Test return types of various trigger methods
    const _first: string | undefined = event.first(42);
    const _last: string | undefined = event.last(42);
    const _all: string[] = event.all(42);
}

// Test: Event with object argument
{
    interface UserData {
        name: string;
        age: number;
    }

    const event = createEvent<(user: UserData) => void>();

    // Valid
    event.trigger({ name: "John", age: 30 });

    // @ts-expect-error - Invalid: missing property
    event.trigger({ name: "John" });

    // @ts-expect-error - Invalid: wrong property type
    event.trigger({ name: "John", age: "thirty" });
}

// ============================================================================
// Listener type inference
// ============================================================================

// Test: Listener argument inference
{
    const event = createEvent<(a: string, b: number) => boolean>();

    event.addListener((a, b) => {
        // Verify types are correctly inferred
        const _strCheck: string = a;
        const _numCheck: number = b;
        return true;
    });

    // Using alias methods
    event.on((a, b) => {
        const _strCheck: string = a;
        const _numCheck: number = b;
        return true;
    });

    event.listen((a, b) => {
        const _strCheck: string = a;
        const _numCheck: number = b;
        return true;
    });

    event.subscribe((a, b) => {
        const _strCheck: string = a;
        const _numCheck: number = b;
        return true;
    });
}

// ============================================================================
// Return type methods
// ============================================================================

// Test: all() returns array of return types
{
    const event = createEvent<(n: number) => { value: number; }>();

    const results = event.all(42);
    // Valid: results is array of objects
    const _first: { value: number; } | undefined = results[0];

    // @ts-expect-error - Invalid: accessing wrong property
    const _wrong = results[0]?.wrongProp;
}

// Test: concat() flattens array return types
{
    const event = createEvent<(n: number) => number[]>();

    const results = event.concat(42);
    // Valid: results is flattened to number[]
    const _first: number | undefined = results[0];

    // @ts-expect-error - Invalid: expecting wrong type
    const _wrong: string = results[0];
}

// Test: merge() combines object return types
{
    const event = createEvent<(n: number) => { a?: string; b?: number; }>();

    const result = event.merge(42);
    // Valid: result is combined object type
    const _a: string | undefined = result?.a;
    const _b: number | undefined = result?.b;
}

// Test: pipe() passes through values
{
    const event = createEvent<(value: string) => string>();

    const result = event.pipe("hello");
    // Valid: result is string | undefined
    const _check: string | undefined = result;
}

// Test: first() and last() return single value or undefined
{
    const event = createEvent<(n: number) => boolean>();

    const firstResult = event.first(42);
    const lastResult = event.last(42);

    // Valid: both return boolean | undefined
    const _checkFirst: boolean | undefined = firstResult;
    const _checkLast: boolean | undefined = lastResult;
}

// Test: firstNonEmpty() returns first non-null/undefined value
{
    const event = createEvent<(n: number) => string | null>();

    const result = event.firstNonEmpty(42);
    // Valid: returns string | null | undefined
    const _check: string | null | undefined = result;
}

// ============================================================================
// Promise-based methods
// ============================================================================

// Test: promise() method
{
    const event = createEvent<(a: number, b: string) => void>();

    async function _test() {
        const args = await event.promise();
        // Valid: args is tuple of arguments
        const _a: number = args[0];
        const _b: string = args[1];

        // @ts-expect-error - Invalid: wrong tuple index type
        const _wrong: string = args[0];
    }
}

// Test: resolveAll() returns Promise of awaited types
{
    const event = createEvent<(n: number) => Promise<string>>();

    async function _test() {
        const results = await event.resolveAll(42);
        // Valid: results is string[] (promises resolved)
        const _first: string = results[0];

        // @ts-expect-error - Invalid: expecting Promise
        const _wrong: Promise<string> = results[0];
    }
}

// Test: resolveFirst() returns Promise
{
    const event = createEvent<(n: number) => Promise<{ data: string; }>>();

    async function _test() {
        const result = await event.resolveFirst(42);
        // Valid: result is awaited type
        const _data: string | undefined = result?.data;
    }
}

// ============================================================================
// Error listeners
// ============================================================================

// Test: Error listener receives correct type
{
    const event = createEvent<(a: number, b: string) => void>();

    event.addErrorListener((errorResponse) => {
        // Valid: error response has correct shape
        const _error: Error = errorResponse.error;
        const _args: [number, string] = errorResponse.args;
        const _type: "action" | "event" | "store-change" | "store-pipe" | "store-control" = errorResponse.type;
    });
}

// ============================================================================
// Untyped event (any handler)
// ============================================================================

// Test: Untyped event accepts any arguments
{
    const event = createEvent();

    // All valid for untyped event
    event.trigger();
    event.trigger(1);
    event.trigger("string", 123, true);
    event.trigger({ nested: { data: true } });
}

// ============================================================================
// Edge cases
// ============================================================================

// Test: Optional parameters
{
    const event = createEvent<(required: string, optional?: number) => void>();

    // Valid: with optional
    event.trigger("hello", 42);

    // Valid: without optional
    event.trigger("hello");

    // @ts-expect-error - Invalid: missing required
    event.trigger();
}

// Test: Rest parameters
{
    const event = createEvent<(...args: number[]) => number>();

    // Valid: any number of numbers
    event.trigger();
    event.trigger(1);
    event.trigger(1, 2, 3, 4, 5);

    // @ts-expect-error - Invalid: wrong type
    event.trigger("string");
}

// Test: Union types
{
    const event = createEvent<(value: string | number) => void>();

    // Both valid
    event.trigger("hello");
    event.trigger(42);

    // @ts-expect-error - Invalid: wrong type
    event.trigger(true);
}

// Test: Generic function as handler
{
    type Handler = <T>(value: T) => T;
    const event = createEvent<Handler>();

    // Handler can be generic
    event.addListener((value) => value);
}

console.log("Event type tests passed!");

