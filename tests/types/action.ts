/**
 * Compile-time type tests for createAction
 *
 * These tests verify type safety at compile time.
 * If TypeScript compiles this file without errors (except for @ts-expect-error lines),
 * the type tests pass.
 */

import { createAction } from "../../src/action";

// ============================================================================
// Basic action creation and type inference
// ============================================================================

// Test: Basic typed action
{
    const fetchUser = createAction(async (userId: string) => {
        return Promise.resolve({ id: userId, name: "John" });
    });

    async function _test() {
        // Valid: correct argument type
        const result = await fetchUser.invoke("user123");

        // result has correct shape
        if (result.response) {
            const _id: string = result.response.id;
            const _name: string = result.response.name;
        }

        // @ts-expect-error - Invalid: wrong argument type
        await fetchUser.invoke(123);

        // @ts-expect-error - Invalid: missing argument
        await fetchUser.invoke();
    }
}

// Test: Action with multiple arguments
{
    const createUser = createAction(
        async (name: string, email: string, age: number) => {
            return Promise.resolve({ id: "new-id", name, email, age });
        },
    );

    async function _test() {
        // Valid
        const _result = await createUser.invoke("John", "john@example.com", 30);

        // @ts-expect-error - Invalid: wrong argument order/types
        await createUser.invoke(30, "john@example.com", "John");

        // @ts-expect-error - Invalid: missing arguments
        await createUser.invoke("John");
    }
}

// Test: Synchronous action
{
    const calculate = createAction((a: number, b: number) => {
        return a + b;
    });

    async function _test() {
        const result = await calculate.invoke(5, 3);

        if (result.response !== null) {
            // result.response is number
            const _sum: number = result.response;

            // @ts-expect-error - Invalid: expecting wrong type
            const _wrongType: string = result.response;
        }
    }
}

// Test: Action returning void
{
    const logMessage = createAction((message: string) => {
        console.log(message);
    });

    async function _test() {
        const result = await logMessage.invoke("Hello");

        // response is void (undefined)
        if (result.response !== null) {
            const _check: void = result.response;
        }
    }
}

// ============================================================================
// ActionResponse type
// ============================================================================

// Test: ActionResponse shape
{
    const fetchData = createAction(async (_id: string) => {
        return Promise.resolve({ data: "test" });
    });

    async function _test() {
        const result = await fetchData.invoke("123");

        // Discriminated union: either response or error is null
        if (result.error === null) {
            // TypeScript knows response is not null here
            const _data: { data: string; } = result.response;
        }
        else {
            // TypeScript knows response is null here
            const _error: string = result.error;
            const _nullResponse: null = result.response;
        }

        // args are always present with correct types
        const _args: [string] = result.args;
        const _firstArg: string = result.args[0];

        // @ts-expect-error - Invalid: args type mismatch
        const _wrongArgs: [number] = result.args;
    }
}

// ============================================================================
// Action listeners
// ============================================================================

// Test: Listener receives correct ActionResponse type
{
    const action = createAction(async (userId: string, _data: { name: string; }) => {
        return Promise.resolve({ success: true, userId });
    });

    action.addListener((response) => {
        // args tuple is correctly typed
        const _userId: string = response.args[0];
        const _data: { name: string; } = response.args[1];

        // @ts-expect-error - Invalid: wrong args index type
        const _wrongArg: number = response.args[0];

        if (response.response) {
            const _success: boolean = response.response.success;
            const _uid: string = response.response.userId;

            // @ts-expect-error - Invalid: accessing wrong property
            const _wrong = response.response.wrongProp;
        }
    });

    // Using aliases
    action.on((response) => {
        // Same type inference
        const _userId: string = response.args[0];
    });

    action.subscribe((response) => {
        const _userId: string = response.args[0];
    });
}

// ============================================================================
// Before action listeners
// ============================================================================

// Test: Before action listener receives correct arguments
{
    const action = createAction(async (id: string, count: number) => {
        return Promise.resolve({ id, count });
    });

    action.addBeforeActionListener((id, count) => {
        // Arguments are correctly typed
        const _idCheck: string = id;
        const _countCheck: number = count;

        // @ts-expect-error - Invalid: wrong type
        const _wrongId: number = id;

        // Can return false to cancel
        if (id === "blocked") {
            return false;
        }
        // Or return void/undefined to continue
    });

    // Async before action listener
    action.addBeforeActionListener(async (id, count) => {
        await Promise.resolve();
        if (count < 0) {
            return false;
        }
    });
}

// Test: Before action listener return type
{
    const action = createAction((x: number) => x * 2);

    // Valid return types: false | void | Promise<false | void>
    action.addBeforeActionListener(() => { });
    action.addBeforeActionListener(() => false);
    action.addBeforeActionListener(async () => { });
    // For async returning false, need explicit type to narrow from Promise<boolean>
    action.addBeforeActionListener(async (): Promise<false | void> => Promise.resolve(false));

    // Can return false to cancel, or void to continue
    action.addBeforeActionListener((x) => {
        if (x < 0) return false;
        // Implicitly returns void, which is valid
    });

    // @ts-expect-error - Invalid: explicit non-false/void return
    action.addBeforeActionListener((x: number): number => x);
}

// ============================================================================
// Error listeners
// ============================================================================

// Test: Error listener receives ErrorResponse
{
    const action = createAction(async (data: { value: number; }) => {
        if (data.value < 0) {
            throw new Error("Invalid value");
        }
        return Promise.resolve(data.value);
    });

    action.addErrorListener((errorResponse) => {
        // errorResponse has correct shape
        const _error: Error = errorResponse.error;
        const _args: [{ value: number; }] = errorResponse.args;
        const _type: "action" | "event" | "store-change" | "store-pipe" | "store-control" = errorResponse.type;

        // Can access the original args
        const _value: number = errorResponse.args[0].value;

        // @ts-expect-error - Invalid: wrong args type
        const _wrongValue: string = errorResponse.args[0].value;
    });
}

// ============================================================================
// Promise methods
// ============================================================================

// Test: promise() returns the listener argument (ActionResponse tuple)
{
    const action = createAction(async (a: string, b: number) => {
        return Promise.resolve({ a, b });
    });

    async function _test() {
        // Wait for next action completion - returns the ActionResponse arguments
        const args = await action.promise();
        // args is [ActionResponse<...>]
        const response = args[0];

        if (response.response) {
            const _a: string = response.response.a;
            const _b: number = response.response.b;
        }
    }
}

// ============================================================================
// Complex return types
// ============================================================================

// Test: Action returning union type
{
    type Result =
        | { success: true; data: string; }
        | { success: false; error: string; };

    const action = createAction(async (shouldSucceed: boolean): Promise<Result> => {
        if (shouldSucceed) {
            return Promise.resolve({ success: true, data: "OK" });
        }
        return Promise.resolve({ success: false, error: "Failed" });
    });

    async function _test() {
        const result = await action.invoke(true);

        if (result.response) {
            if (result.response.success) {
                const _data: string = result.response.data;
            }
            else {
                const _error: string = result.response.error;
            }
        }
    }
}

// Test: Action with generic-like return type
{
    interface ApiResponse<T> {
        data: T;
        status: number;
    }

    const fetchApi = createAction(async <T>(_endpoint: string): Promise<ApiResponse<T>> => {
        return Promise.resolve({ data: {} as T, status: 200 });
    });

    async function _test() {
        const result = await fetchApi.invoke("/users");
        if (result.response) {
            const _status: number = result.response.status;
        }
    }
}

// ============================================================================
// Edge cases
// ============================================================================

// Test: Action with optional parameters
{
    const action = createAction((required: string, optional?: number) => {
        return { required, optional };
    });

    async function _test() {
        // Valid: with optional
        await action.invoke("test", 42);

        // Valid: without optional
        await action.invoke("test");

        // @ts-expect-error - Invalid: missing required
        await action.invoke();
    }
}

// Test: Action with rest parameters
{
    const action = createAction((...numbers: number[]) => {
        return numbers.reduce((a, b) => a + b, 0);
    });

    async function _test() {
        await action.invoke();
        await action.invoke(1);
        await action.invoke(1, 2, 3, 4, 5);

        // @ts-expect-error - Invalid: wrong type
        await action.invoke("string");
    }
}

// Test: Action throwing error
{
    const riskyAction = createAction(async (value: number) => {
        if (value < 0) {
            throw new Error("Negative value");
        }
        return Promise.resolve(value);
    });

    async function _test() {
        const result = await riskyAction.invoke(-1);

        // Without error listener, the action would throw
        // With error listener, we get the error in response

        if (result.error !== null) {
            const _errorMessage: string = result.error;
        }
    }
}

console.log("Action type tests passed!");

