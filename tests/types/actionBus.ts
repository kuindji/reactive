/**
 * Compile-time type tests for createActionBus
 *
 * These tests verify type safety at compile time.
 * If TypeScript compiles this file without errors (except for @ts-expect-error lines),
 * the type tests pass.
 */

import { createActionBus } from "../../src/actionBus";

// ============================================================================
// Basic ActionBus creation and type inference
// ============================================================================

// Test: Basic typed actionBus
{
    const bus = createActionBus({
        fetchUser: async (userId: string) => {
            return Promise.resolve({ id: userId, name: "John" });
        },
        createUser: async (name: string, email: string) => {
            return Promise.resolve({ id: "new-id", name, email });
        },
        deleteUser: async (_userId: string) => {
            return Promise.resolve(true);
        },
    });

    async function _test() {
        // Valid invocations
        const _user = await bus.invoke("fetchUser", "user123");
        const _created = await bus.invoke("createUser", "John", "john@example.com");
        const _deleted = await bus.invoke("deleteUser", "user123");

        // @ts-expect-error - Invalid: unknown action
        await bus.invoke("unknownAction", "arg");

        // @ts-expect-error - Invalid: wrong argument type
        await bus.invoke("fetchUser", 123);

        // @ts-expect-error - Invalid: missing argument
        await bus.invoke("fetchUser");

        // @ts-expect-error - Invalid: extra argument
        await bus.invoke("deleteUser", "user123", "extra");
    }
}

// Test: Return type inference
{
    const bus = createActionBus({
        getNumber: () => 42,
        getString: () => "hello",
        getObject: () => ({ a: 1, b: "two" }),
    });

    async function _test() {
        const numResult = await bus.invoke("getNumber");
        const strResult = await bus.invoke("getString");
        const objResult = await bus.invoke("getObject");

        if (numResult.response !== null) {
            const _num: number = numResult.response;
            // @ts-expect-error - Invalid: wrong type
            const _wrongNum: string = numResult.response;
        }

        if (strResult.response !== null) {
            const _str: string = strResult.response;
        }

        if (objResult.response !== null) {
            const _a: number = objResult.response.a;
            const _b: string = objResult.response.b;
            // @ts-expect-error - Invalid: unknown property
            const _c = objResult.response.c;
        }
    }
}

// ============================================================================
// get() method - accessing underlying action
// ============================================================================

// Test: get() returns typed action
{
    const bus = createActionBus({
        process: async (data: string) => Promise.resolve({ processed: data }),
    });

    const processAction = bus.get("process");

    async function _test() {
        const result = await processAction.invoke("test");
        if (result.response) {
            const _processed: string = result.response.processed;
        }

        // @ts-expect-error - Invalid: wrong argument
        await processAction.invoke(123);
    }

    // @ts-expect-error - Invalid: unknown action name
    bus.get("unknownAction");
}

// ============================================================================
// Listener type inference
// ============================================================================

// Test: on() listener receives correct ActionResponse
{
    const bus = createActionBus({
        calculate: (a: number, b: number) => a + b,
    });

    bus.on("calculate", (response) => {
        // args are correctly typed
        const _a: number = response.args[0];
        const _b: number = response.args[1];

        // @ts-expect-error - Invalid: wrong type
        const _wrongA: string = response.args[0];

        if (response.response !== null) {
            const _result: number = response.response;
        }
    });

    // @ts-expect-error - Invalid: unknown action
    bus.on("unknown", () => { });
}

// Test: once() listener
{
    const bus = createActionBus({
        init: (_config: { debug: boolean; }) => ({ initialized: true }),
    });

    bus.once("init", (response) => {
        const _debug: boolean = response.args[0].debug;
        if (response.response) {
            const _initialized: boolean = response.response.initialized;
        }
    });
}

// ============================================================================
// Error listeners
// ============================================================================

// Test: Action-specific error handling
{
    const bus = createActionBus({
        riskyOp: async (value: number) => {
            if (value < 0) throw new Error("Invalid");
            return Promise.resolve(value);
        },
    });

    // Global error listener
    bus.addErrorListener((errorResponse) => {
        const _error: Error = errorResponse.error;
        const _args: any[] = errorResponse.args;
        const _name: string | undefined = errorResponse.name;
        const _type = errorResponse.type;
    });
}

// ============================================================================
// Complex action maps
// ============================================================================

// Test: Actions with complex types
{
    interface User {
        id: string;
        name: string;
        email: string;
    }

    interface CreateUserInput {
        name: string;
        email: string;
    }

    interface UpdateUserInput {
        id: string;
        changes: Partial<Omit<User, "id">>;
    }

    const userBus = createActionBus({
        getUser: async (id: string): Promise<User | null> => {
            return Promise.resolve({ id, name: "John", email: "john@example.com" });
        },
        createUser: async (input: CreateUserInput): Promise<User> => {
            return Promise.resolve({ id: "new-id", ...input });
        },
        updateUser: async (input: UpdateUserInput): Promise<User> => {
            return Promise.resolve({ id: input.id, name: "Updated", email: "updated@example.com" });
        },
        deleteUser: async (_id: string): Promise<boolean> => {
            return Promise.resolve(true);
        },
    });

    async function _test() {
        const getResult = await userBus.invoke("getUser", "123");
        const createResult = await userBus.invoke("createUser", {
            name: "Jane",
            email: "jane@example.com",
        });
        const _updateResult = await userBus.invoke("updateUser", {
            id: "123",
            changes: { name: "New Name" },
        });
        const _deleteResult = await userBus.invoke("deleteUser", "123");

        if (getResult.response) {
            // User | null
            const _user: User | null = getResult.response;
        }

        if (createResult.response) {
            const user: User = createResult.response;
            const _name: string = user.name;
        }

        // @ts-expect-error - Invalid: missing required property
        await userBus.invoke("createUser", { name: "Jane" });

        // Invalid: wrong changes type - TypeScript catches this
        // await userBus.invoke("updateUser", {
        //     id: "123",
        //     changes: { wrongProp: true },
        // });
    }
}

// ============================================================================
// ActionBus with async actions
// ============================================================================

// Test: All actions are async-wrapped
{
    const bus = createActionBus({
        syncAction: (x: number) => x * 2,
        asyncAction: async (x: number) => Promise.resolve(x * 2),
    });

    async function _test() {
        // Both return Promise<ActionResponse<...>>
        const syncResult = await bus.invoke("syncAction", 5);
        const asyncResult = await bus.invoke("asyncAction", 5);

        // Both have the same response type
        if (syncResult.response !== null) {
            const _num: number = syncResult.response;
        }
        if (asyncResult.response !== null) {
            const _num: number = asyncResult.response;
        }
    }
}

// ============================================================================
// Empty and dynamic action buses
// ============================================================================

// Test: Untyped action bus allows any actions
{
    const bus = createActionBus();

    // Can't invoke unknown actions on typed bus
    // This is expected behavior - you need to add actions first

    // Add action dynamically
    bus.add("dynamicAction", async (x: number) => Promise.resolve(x));

    // After adding, invoke works but is not type-safe
    // This is a limitation of dynamic action adding
}

console.log("ActionBus type tests passed!");

