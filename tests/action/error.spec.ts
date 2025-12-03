import { describe, expect, it } from "bun:test";
import { createAction } from "../../src/action";

describe("action error handling", () => {
    it("catches errors with error listener", async () => {
        const action = createAction(() => {
            throw new Error("Action error");
        });

        const errors: string[] = [];
        action.addErrorListener(({ error }) => {
            errors.push(error.message);
        });

        const result = await action.invoke();

        expect(errors).toEqual(["Action error"]);
        expect(result.error).toBe("Action error");
        expect(result.response).toBe(null);
    });

    it("includes args in error response", async () => {
        const action = createAction((_a: number, _b: string) => {
            throw new Error("Args error");
        });

        let receivedArgs: unknown[] = [];
        action.addErrorListener(({ args }) => {
            receivedArgs = args;
        });

        await action.invoke(42, "hello");

        expect(receivedArgs).toEqual([42, "hello"]);
    });

    it("includes type in error response", async () => {
        const action = createAction(() => {
            throw new Error("Type error");
        });

        let receivedType: string | undefined;
        action.addErrorListener(({ type }) => {
            receivedType = type;
        });

        await action.invoke();

        expect(receivedType).toBe("action");
    });

    it("throws error when no error listener is registered", () => {
        const action = createAction(() => {
            throw new Error("Unhandled");
        });

        expect(() => action.invoke()).toThrow("Unhandled");
    });

    it("removes error listener", async () => {
        const action = createAction(() => {
            throw new Error("Error");
        });

        const errors: string[] = [];
        const errorListener = ({ error }: { error: Error }) => {
            errors.push(error.message);
        };

        action.addErrorListener(errorListener);
        await action.invoke();
        expect(errors).toEqual(["Error"]);

        action.removeErrorListener(errorListener);
        expect(() => action.invoke()).toThrow("Error");
    });

    it("removes all error listeners", () => {
        const action = createAction(() => {
            throw new Error("Error");
        });

        action.addErrorListener(() => { });
        action.addErrorListener(() => { });

        action.removeAllErrorListeners();

        expect(() => action.invoke()).toThrow("Error");
    });

    it("converts non-Error throws to Error", async () => {
        const action = createAction(() => {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw "String error";
        });

        let receivedError: Error | undefined;
        action.addErrorListener(({ error }) => {
            receivedError = error;
        });

        await action.invoke();

        expect(receivedError).toBeInstanceOf(Error);
        expect(receivedError?.message).toBe("String error");
    });

    it("handles async errors", async () => {
        const action = createAction(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            throw new Error("Async error");
        });

        const errors: string[] = [];
        action.addErrorListener(({ error }) => {
            errors.push(error.message);
        });

        const result = await action.invoke();

        expect(errors).toEqual(["Async error"]);
        expect(result.error).toBe("Async error");
    });

    it("triggers both result and error listeners on error", async () => {
        const action = createAction(() => {
            throw new Error("Both error");
        });

        const resultErrors: string[] = [];
        const errorListenerErrors: string[] = [];

        action.addListener(({ error }) => {
            if (error) {
                resultErrors.push(error);
            }
        });

        action.addErrorListener(({ error }) => {
            errorListenerErrors.push(error.message);
        });

        await action.invoke();

        expect(resultErrors).toEqual(["Both error"]);
        expect(errorListenerErrors).toEqual(["Both error"]);
    });
});

describe("action before listeners", () => {
    it("supports synchronous before action listeners", async () => {
        const action = createAction((x: number) => x * 2);
        let beforeCalled = false;

        action.addBeforeActionListener((x) => {
            beforeCalled = true;
            if (x < 0) {
                return false;
            }
        });

        const result = await action.invoke(5);

        expect(beforeCalled).toBe(true);
        expect(result.response).toBe(10);
    });

    it("before action listener can cancel action", async () => {
        const action = createAction((x: number) => x * 2);

        action.addBeforeActionListener((x) => {
            if (x < 0) {
                return false;
            }
        });

        const result = await action.invoke(-5);

        expect(result.response).toBe(null);
        expect(result.error).toBe("Action cancelled");
    });

    it("multiple before listeners run in order", async () => {
        const action = createAction((x: number) => x);
        const order: number[] = [];

        action.addBeforeActionListener(() => {
            order.push(1);
        });

        action.addBeforeActionListener(() => {
            order.push(2);
        });

        await action.invoke(1);

        expect(order).toEqual([1, 2]);
    });

    it("removes before action listener", async () => {
        const action = createAction((x: number) => x * 2);
        const calls: number[] = [];

        const beforeListener = (x: number) => {
            calls.push(x);
        };

        action.addBeforeActionListener(beforeListener);
        await action.invoke(5);
        expect(calls).toEqual([5]);

        action.removeBeforeActionListener(beforeListener);
        await action.invoke(10);
        expect(calls).toEqual([5]);
    });

    it("removes all before action listeners", async () => {
        const action = createAction((x: number) => x * 2);
        const calls: number[] = [];

        action.addBeforeActionListener((x) => {
            calls.push(x);
        });
        action.addBeforeActionListener((x) => {
            calls.push(x * 10);
        });

        await action.invoke(1);
        expect(calls).toEqual([1, 10]);

        action.removeAllBeforeActionListeners();
        await action.invoke(2);
        expect(calls).toEqual([1, 10]);
    });
});

describe("action promise", () => {
    it("returns promise that resolves on next invocation", async () => {
        const action = createAction((x: number) => x * 2);

        const promiseResult = action.promise();
        setTimeout(() => void action.invoke(21), 10);

        const result = await promiseResult;
        expect(result).toEqual([{ response: 42, error: null, args: [21] }]);
    });
});

describe("action removeAllListeners", () => {
    it("removes all result listeners", async () => {
        const action = createAction((x: number) => x);
        const results: number[] = [];

        action.addListener(({ response }) => {
            if (response !== null) {
                results.push(response);
            }
        });
        action.addListener(({ response }) => {
            if (response !== null) {
                results.push(response * 10);
            }
        });

        await action.invoke(1);
        expect(results).toEqual([1, 10]);

        action.removeAllListeners();
        await action.invoke(2);
        expect(results).toEqual([1, 10]);
    });
});

describe("action errorPromise", () => {
    it("returns promise that resolves on next error", async () => {
        const action = createAction(() => {
            throw new Error("Promise error");
        });

        // Add error listener to prevent throw
        action.addErrorListener(() => { });

        const errorPromise = action.errorPromise();
        setTimeout(() => void action.invoke(), 10);

        const result = await errorPromise;
        expect(result[0].error.message).toBe("Promise error");
    });
});

