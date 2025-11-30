/**
 * Compile-time type tests for createEventBus
 *
 * These tests verify type safety at compile time.
 * If TypeScript compiles this file without errors (except for @ts-expect-error lines),
 * the type tests pass.
 */

import { createEventBus } from "../../src/eventBus";

// ============================================================================
// Basic EventBus creation and type inference
// ============================================================================

// Test: Basic typed eventBus
{
    const bus = createEventBus<{
        userCreated: (userId: string, name: string) => void;
        userDeleted: (userId: string) => void;
        dataFetched: (data: { items: string[]; }) => number;
    }>();

    // Valid triggers
    bus.trigger("userCreated", "123", "John");
    bus.trigger("userDeleted", "123");
    bus.trigger("dataFetched", { items: ["a", "b"] });

    // @ts-expect-error - Invalid: unknown event name
    bus.trigger("unknownEvent");

    // @ts-expect-error - Invalid: wrong argument type
    bus.trigger("userCreated", 123, "John");

    // @ts-expect-error - Invalid: missing argument
    bus.trigger("userCreated", "123");

    // @ts-expect-error - Invalid: wrong event data shape
    bus.trigger("dataFetched", { wrongProp: true });
}

// Test: Listener type inference
{
    const bus = createEventBus<{
        message: (content: string, sender: { id: number; name: string; }) => void;
    }>();

    bus.on("message", (content, sender) => {
        // Types are correctly inferred
        const _c: string = content;
        const _id: number = sender.id;
        const _name: string = sender.name;

        // @ts-expect-error - Invalid: wrong property
        const _wrong = sender.wrongProp;
    });

    // @ts-expect-error - Invalid: wrong event name
    bus.on("wrongEvent", () => { });
}

// ============================================================================
// Return type methods
// ============================================================================

// Test: first() returns correct type
{
    const bus = createEventBus<{
        calculate: (a: number, b: number) => number;
    }>();

    const result = bus.first("calculate", 5, 3);
    // Valid: result is number | undefined
    const _check: number | undefined = result;

    // @ts-expect-error - Invalid: expecting wrong type
    const _wrong: string = result;
}

// Test: all() returns array of return types
{
    const bus = createEventBus<{
        getUsers: () => { id: string; name: string; };
    }>();

    const results = bus.all("getUsers");
    // Valid: results is array of user objects
    const first = results[0];
    const _id: string | undefined = first?.id;

    // @ts-expect-error - Invalid: accessing wrong property
    const _wrong = results[0]?.wrongProp;
}

// Test: concat() flattens arrays
{
    const bus = createEventBus<{
        getTags: () => string[];
    }>();

    const results = bus.concat("getTags");
    // Valid: results is string[]
    const _tag: string | undefined = results[0];

    // @ts-expect-error - Invalid: expecting nested array
    const _wrong: string[][] = results;
}

// Test: merge() combines objects
{
    const bus = createEventBus<{
        getConfig: () => { theme?: string; locale?: string; };
    }>();

    const result = bus.merge("getConfig");
    const _theme: string | undefined = result?.theme;
    const _locale: string | undefined = result?.locale;
}

// Test: pipe() passes through value
{
    const bus = createEventBus<{
        transform: (value: string) => string;
    }>();

    const result = bus.pipe("transform", "hello");
    const _check: string | undefined = result;
}

// ============================================================================
// Async/Promise methods
// ============================================================================

// Test: resolveAll() with async handlers
{
    const bus = createEventBus<{
        fetchData: (id: string) => Promise<{ data: string; }>;
    }>();

    async function _test() {
        const results = await bus.resolveAll("fetchData", "123");
        // Valid: results is array of awaited types
        const _data: string = results[0].data;

        // @ts-expect-error - Invalid: expecting Promise
        const _wrong: Promise<{ data: string; }> = results[0];
    }
}

// Test: resolveFirst()
{
    const bus = createEventBus<{
        lookup: (key: string) => Promise<number | null>;
    }>();

    async function _test() {
        const result = await bus.resolveFirst("lookup", "key");
        // Valid: result is awaited type or undefined
        const _check: number | null | undefined = result;
    }
}

// ============================================================================
// get() method - accessing underlying event
// ============================================================================

// Test: get() returns typed event
{
    const bus = createEventBus<{
        notification: (message: string) => void;
    }>();

    const event = bus.get("notification");

    // Can use event methods directly
    event.trigger("Hello");

    // @ts-expect-error - Invalid: wrong argument type
    event.trigger(123);
}

// ============================================================================
// once() method
// ============================================================================

// Test: once() has correct types
{
    const bus = createEventBus<{
        init: (config: { ready: boolean; }) => void;
    }>();

    bus.once("init", (config) => {
        const _ready: boolean = config.ready;
    });

    // @ts-expect-error - Invalid: wrong event name
    bus.once("wrongEvent", () => { });
}

// ============================================================================
// promise() method
// ============================================================================

// Test: promise() returns correct tuple type
{
    const bus = createEventBus<{
        ready: (status: string, timestamp: number) => void;
    }>();

    async function _test() {
        const args = await bus.promise("ready");
        const _status: string = args[0];
        const _timestamp: number = args[1];

        // @ts-expect-error - Invalid: wrong tuple type
        const _wrong: number = args[0];
    }
}

// ============================================================================
// withTags() method
// ============================================================================

// Test: withTags() preserves return types
{
    const bus = createEventBus<{
        process: (data: string) => number;
    }>();

    const result = bus.withTags(["tag1"], () => {
        return bus.first("process", "data");
    });

    // Valid: result is number | undefined
    const _check: number | undefined = result;
}

// ============================================================================
// Error handling
// ============================================================================

// Test: Error listener types
{
    const bus = createEventBus<{
        riskyOp: (value: number) => void;
    }>();

    bus.addErrorListener((errorResponse) => {
        const _error: Error = errorResponse.error;
        const _args: any[] = errorResponse.args;
        const _name: string | undefined = errorResponse.name;
        const _type = errorResponse.type;
    });
}

// ============================================================================
// Untyped EventBus (DefaultEventMap)
// ============================================================================

// Test: Untyped bus accepts any events
{
    const bus = createEventBus();

    // All valid for untyped bus
    bus.trigger("anything", 1, 2, 3);
    bus.trigger("other", { data: true });
    bus.on("dynamic", (_value: unknown) => { });
}

// ============================================================================
// Event options
// ============================================================================

// Test: EventBus with event options
{
    const bus = createEventBus<{
        limited: (x: number) => void;
        autoTriggered: (msg: string) => void;
    }>({
        eventOptions: {
            limited: { limit: 5 },
            autoTriggered: { autoTrigger: true },
        },
    });

    // Bus works normally
    bus.trigger("limited", 42);
    bus.trigger("autoTriggered", "hello");

    // Invalid event name in options - TypeScript catches this
    // createEventBus<{ a: () => void; }>({
    //     eventOptions: {
    //         wrongName: { limit: 5 },
    //     },
    // });
}

// ============================================================================
// Complex event maps
// ============================================================================

// Test: Events with complex generic types
{
    interface ApiResponse<T> {
        data: T;
        status: number;
    }

    const bus = createEventBus<{
        userResponse: (response: ApiResponse<{ name: string; }>) => void;
        listResponse: (response: ApiResponse<string[]>) => void;
    }>();

    bus.on("userResponse", (response) => {
        const _name: string = response.data.name;
        const _status: number = response.status;
    });

    bus.on("listResponse", (response) => {
        const items: string[] = response.data;
        const _first: string | undefined = items[0];
    });
}

// Test: Event handlers that return promises
{
    const bus = createEventBus<{
        asyncOp: (id: string) => Promise<{ result: boolean; }>;
    }>();

    bus.on("asyncOp", async (_id) => {
        return Promise.resolve({ result: true });
    });

    async function _test() {
        // resolveAll awaits all promises
        const results = await bus.resolveAll("asyncOp", "123");
        const _firstResult: boolean = results[0].result;
    }
}

console.log("EventBus type tests passed!");

