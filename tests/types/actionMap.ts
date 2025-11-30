/**
 * Compile-time type tests for createActionMap
 *
 * These tests verify type safety at compile time.
 * If TypeScript compiles this file without errors (except for @ts-expect-error lines),
 * the type tests pass.
 */

import { createActionMap } from "../../src/actionMap";

// ============================================================================
// Basic ActionMap creation and type inference
// ============================================================================

// Test: Basic typed actionMap
{
    const actions = createActionMap({
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
        const _user = await actions.fetchUser.invoke("user123");
        const _created = await actions.createUser.invoke("John", "john@example.com");
        const _deleted = await actions.deleteUser.invoke("user123");

        // @ts-expect-error - Invalid: unknown action
        const _unknownAction = actions.unknownAction;

        // @ts-expect-error - Invalid: wrong argument type
        await actions.fetchUser.invoke(123);

        // @ts-expect-error - Invalid: missing argument
        await actions.fetchUser.invoke();

        // @ts-expect-error - Invalid: extra argument
        await actions.deleteUser.invoke("user123", "extra");
    }
}

// Test: Return type inference
{
    const actions = createActionMap({
        getNumber: () => 42,
        getString: () => "hello",
        getObject: () => ({ a: 1, b: "two" }),
        getPromise: async () => Promise.resolve({ async: true }),
    });

    async function _test() {
        const numResult = await actions.getNumber.invoke();
        const strResult = await actions.getString.invoke();
        const objResult = await actions.getObject.invoke();
        const promiseResult = await actions.getPromise.invoke();

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

        if (promiseResult.response !== null) {
            const _asyncProp: boolean = promiseResult.response.async;
        }
    }
}

// ============================================================================
// Direct action access
// ============================================================================

// Test: Accessing action directly gives full action API
{
    const actions = createActionMap({
        process: async (data: string) => Promise.resolve({ processed: data }),
    });

    // Can access all action methods
    void actions.process.invoke("test");
    actions.process.addListener((_response) => { });
    actions.process.on((_response) => { });
    actions.process.removeListener(() => { });
    actions.process.addBeforeActionListener((_data) => { });
    actions.process.addErrorListener((_error) => { });
}

// ============================================================================
// Listener type inference
// ============================================================================

// Test: Listeners receive correct ActionResponse
{
    const actions = createActionMap({
        calculate: (a: number, b: number) => a + b,
    });

    actions.calculate.on((response) => {
        // args are correctly typed
        const _a: number = response.args[0];
        const _b: number = response.args[1];

        // @ts-expect-error - Invalid: wrong type
        const _wrongA: string = response.args[0];

        if (response.response !== null) {
            const _result: number = response.response;
        }
    });

    actions.calculate.addListener((response) => {
        const sum = response.response;
        if (sum !== null) {
            const _check: number = sum;
        }
    });
}

// Test: Before action listener
{
    const actions = createActionMap({
        doSomething: async (_value: number, _flag: boolean) => Promise.resolve({ done: true }),
    });

    actions.doSomething.addBeforeActionListener((value, flag) => {
        const _v: number = value;
        const _f: boolean = flag;

        // @ts-expect-error - Invalid: wrong type
        const _wrongValue: string = value;

        if (value < 0) {
            return false; // Cancel action
        }
    });

    // Async before listener
    actions.doSomething.addBeforeActionListener(async (value, flag) => {
        await Promise.resolve();
        return flag ? undefined : false;
    });
}

// ============================================================================
// Error handling
// ============================================================================

// Test: Global error handler
{
    const _actions = createActionMap(
        {
            riskyOp: async (value: number) => {
                if (value < 0) throw new Error("Invalid");
                return Promise.resolve(value);
            },
        },
        (errorResponse) => {
            // Global error handler receives error response
            const _error: Error = errorResponse.error;
            const _args: any[] = errorResponse.args;
            const _name: string | undefined = errorResponse.name;
        },
    );

    // Can also add array of error handlers
    const _actionsWithMultipleHandlers = createActionMap(
        {
            op: async () => Promise.resolve("result"),
        },
        [
            (_error) => console.log("Handler 1", _error),
            (_error) => console.log("Handler 2", _error),
        ],
    );
}

// Test: Action-specific error listener
{
    const actions = createActionMap({
        fetchData: async (_id: string) => Promise.resolve({ data: "test" }),
    });

    actions.fetchData.addErrorListener((errorResponse) => {
        const _error: Error = errorResponse.error;
        const _args: [string] = errorResponse.args;
        const _id: string = errorResponse.args[0];

        // @ts-expect-error - Invalid: wrong args type
        const _wrongId: number = errorResponse.args[0];
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

    const userActions = createActionMap({
        getUser: async (id: string): Promise<User | null> => {
            return Promise.resolve({ id, name: "John", email: "john@example.com" });
        },
        createUser: async (input: CreateUserInput): Promise<User> => {
            return Promise.resolve({ id: "new-id", ...input });
        },
        updateUser: async (id: string, _changes: Partial<Omit<User, "id">>): Promise<User> => {
            return Promise.resolve({ id, name: "Updated", email: "updated@example.com" });
        },
        listUsers: async (_filter?: { active?: boolean; }): Promise<User[]> => {
            return Promise.resolve([]);
        },
    });

    async function _test() {
        const getResult = await userActions.getUser.invoke("123");
        const createResult = await userActions.createUser.invoke({
            name: "Jane",
            email: "jane@example.com",
        });
        const _updateResult = await userActions.updateUser.invoke("123", { name: "New Name" });
        const listResult = await userActions.listUsers.invoke({ active: true });
        const _listAllResult = await userActions.listUsers.invoke();

        if (getResult.response) {
            const _user: User | null = getResult.response;
        }

        if (createResult.response) {
            const user: User = createResult.response;
            const _name: string = user.name;
        }

        if (listResult.response) {
            const users: User[] = listResult.response;
            const _first: User | undefined = users[0];
        }

        // @ts-expect-error - Invalid: missing required property
        await userActions.createUser.invoke({ name: "Jane" });

        // @ts-expect-error - Invalid: wrong changes type
        await userActions.updateUser.invoke("123", { unknownProp: true });
    }
}

// ============================================================================
// ActionMap type inference from object
// ============================================================================

// Test: Type inference works with inline object
{
    const actions = createActionMap({
        a: (x: number) => x * 2,
        b: (s: string) => s.length,
        c: async (arr: number[]) => Promise.resolve(arr.reduce((a, b) => a + b, 0)),
    });

    async function _test() {
        const aResult = await actions.a.invoke(5);
        const bResult = await actions.b.invoke("hello");
        const cResult = await actions.c.invoke([1, 2, 3]);

        if (aResult.response !== null) {
            const _doubled: number = aResult.response;
        }

        if (bResult.response !== null) {
            const _length: number = bResult.response;
        }

        if (cResult.response !== null) {
            const _sum: number = cResult.response;
        }

        // @ts-expect-error - Invalid: wrong type for a
        await actions.a.invoke("string");

        // @ts-expect-error - Invalid: wrong type for b
        await actions.b.invoke(123);

        // @ts-expect-error - Invalid: wrong array type for c
        await actions.c.invoke(["a", "b"]);
    }
}

// ============================================================================
// Edge cases
// ============================================================================

// Test: Actions with optional parameters
{
    const actions = createActionMap({
        optionalAction: (required: string, optional?: number) => ({
            required,
            optional,
        }),
    });

    async function _test() {
        // Both valid
        await actions.optionalAction.invoke("test", 42);
        await actions.optionalAction.invoke("test");

        // @ts-expect-error - Invalid: missing required
        await actions.optionalAction.invoke();
    }
}

// Test: Actions with rest parameters
{
    const actions = createActionMap({
        sum: (...numbers: number[]) => numbers.reduce((a, b) => a + b, 0),
    });

    async function _test() {
        await actions.sum.invoke();
        await actions.sum.invoke(1);
        await actions.sum.invoke(1, 2, 3, 4, 5);

        // @ts-expect-error - Invalid: wrong type
        await actions.sum.invoke("string");
    }
}

// Test: Actions returning void
{
    const actions = createActionMap({
        logMessage: (message: string) => {
            console.log(message);
        },
    });

    async function _test() {
        const result = await actions.logMessage.invoke("Hello");

        if (result.response !== null) {
            const _voidResult: void = result.response;
        }
    }
}

console.log("ActionMap type tests passed!");

