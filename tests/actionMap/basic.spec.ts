import { describe, expect, it, } from "bun:test";
import { createActionMap } from "../../src/actionMap";

describe("actionMap basic", () => {
    it("creates action map from actions object", async () => {
        const actions = createActionMap({
            sum: (a: number, b: number) => a + b,
            multiply: (a: number, b: number) => a * b,
        });

        const sumResult = await actions.sum.invoke(2, 3);
        const multiplyResult = await actions.multiply.invoke(4, 5);

        expect(sumResult.response).toBe(5);
        expect(sumResult.error).toBe(null);
        expect(multiplyResult.response).toBe(20);
        expect(multiplyResult.error).toBe(null);
    });

    it("supports async actions", async () => {
        const actions = createActionMap({
            asyncSum: async (a: number, b: number) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return a + b;
            },
        });

        const result = await actions.asyncSum.invoke(5, 7);
        expect(result.response).toBe(12);
        expect(result.error).toBe(null);
    });

    it("allows subscribing to action results", async () => {
        const actions = createActionMap({
            getValue: (x: number) => x * 2,
        });

        const receivedResults: number[] = [];
        actions.getValue.on(({ response }) => {
            if (response !== null) {
                receivedResults.push(response);
            }
        });

        await actions.getValue.invoke(5);
        await actions.getValue.invoke(10);

        expect(receivedResults).toEqual([10, 20]);
    });

    it("forwards errors to single error listener", async () => {
        const errors: { name: string; message: string }[] = [];

        const actions = createActionMap(
            {
                failing: () => {
                    throw new Error("Test error");
                },
            },
            ({ name, error }) => {
                errors.push({ name: name!, message: error.message });
            },
        );

        await actions.failing.invoke();

        expect(errors).toHaveLength(1);
        expect(errors[0].name).toBe("failing");
        expect(errors[0].message).toBe("Test error");
    });

    it("forwards errors to multiple error listeners", async () => {
        const errors1: string[] = [];
        const errors2: string[] = [];

        const actions = createActionMap(
            {
                failing: () => {
                    throw new Error("Multi-listener error");
                },
            },
            [
                ({ name }) => {
                    errors1.push(name!);
                },
                ({ error }) => {
                    errors2.push(error.message);
                },
            ],
        );

        await actions.failing.invoke();

        expect(errors1).toEqual(["failing"]);
        expect(errors2).toEqual(["Multi-listener error"]);
    });

    it("includes action name in error response", async () => {
        let receivedName: string | undefined;

        const actions = createActionMap(
            {
                namedAction: () => {
                    throw new Error("Named error");
                },
            },
            ({ name }) => {
                receivedName = name;
            },
        );

        await actions.namedAction.invoke();
        expect(receivedName).toBe("namedAction");
    });

    it("includes args in error response", async () => {
        let receivedArgs: unknown[] = [];

        const actions = createActionMap(
            {
                argAction: (_a: number, _b: string) => {
                    throw new Error("Args error");
                },
            },
            ({ args }) => {
                receivedArgs = args;
            },
        );

        await actions.argAction.invoke(42, "hello");
        expect(receivedArgs).toEqual([42, "hello"]);
    });

    it("supports before action listeners", async () => {
        const actions = createActionMap({
            cancellable: (x: number) => x * 2,
        });

        actions.cancellable.addBeforeActionListener((x) => {
            if (x < 0) {
                return false;
            }
        });

        const result1 = await actions.cancellable.invoke(5);
        const result2 = await actions.cancellable.invoke(-5);

        expect(result1.response).toBe(10);
        expect(result1.error).toBe(null);
        expect(result2.response).toBe(null);
        expect(result2.error).toBe("Action cancelled");
    });

    it("allows removing listeners", async () => {
        const actions = createActionMap({
            testAction: (x: number) => x,
        });

        const results: number[] = [];
        const listener = ({ response }: { response: number | null }) => {
            if (response !== null) {
                results.push(response);
            }
        };

        actions.testAction.on(listener);
        await actions.testAction.invoke(1);

        actions.testAction.off(listener);
        await actions.testAction.invoke(2);

        expect(results).toEqual([1]);
    });

    it("returns proper type for action response", async () => {
        const actions = createActionMap({
            getObject: () => ({ id: 1, name: "test" }),
            getArray: () => [1, 2, 3],
            getString: () => "hello",
        });

        const objectResult = await actions.getObject.invoke();
        const arrayResult = await actions.getArray.invoke();
        const stringResult = await actions.getString.invoke();

        expect(objectResult.response).toEqual({ id: 1, name: "test" });
        expect(arrayResult.response).toEqual([1, 2, 3]);
        expect(stringResult.response).toBe("hello");
    });

    it("works without global error listeners but has per-action error handling", async () => {
        const actions = createActionMap({
            throwing: () => {
                throw new Error("Unhandled");
            },
        });

        // When no global error listener is passed, errors still bubble up
        // but the action map creates internal error listeners that prevent throws
        const result = await actions.throwing.invoke();

        // Check error is captured in result
        expect(result.error).toBe("Unhandled");
        expect(result.response).toBe(null);
    });

    it("handles promise rejection in async actions", async () => {
        const errors: string[] = [];

        const actions = createActionMap(
            {
                asyncFailing: async () => {
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    throw new Error("Async failure");
                },
            },
            ({ error }) => {
                errors.push(error.message);
            },
        );

        await actions.asyncFailing.invoke();
        expect(errors).toEqual(["Async failure"]);
    });
});

