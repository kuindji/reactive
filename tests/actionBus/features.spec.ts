import { describe, expect, it } from "bun:test";
import { createActionBus } from "../../src/actionBus";

describe("actionBus error handling", () => {
    it("catches errors with error listener", async () => {
        const bus = createActionBus({
            failing: () => {
                throw new Error("Bus error");
            },
        });

        const errors: { name?: string; message: string }[] = [];
        bus.addErrorListener(({ name, error }) => {
            errors.push({ name, message: error.message });
        });

        await bus.invoke("failing");

        expect(errors).toHaveLength(1);
        expect(errors[0].name).toBe("failing");
        expect(errors[0].message).toBe("Bus error");
    });

    it("includes args in error response", async () => {
        const bus = createActionBus({
            argsAction: (_a: number, _b: string) => {
                throw new Error("Args");
            },
        });

        let receivedArgs: unknown[] = [];
        bus.addErrorListener(({ args }) => {
            receivedArgs = args;
        });

        await bus.invoke("argsAction", 42, "hello");

        expect(receivedArgs).toEqual([42, "hello"]);
    });

    it("removes error listener", async () => {
        const bus = createActionBus({
            failing: () => {
                throw new Error("Error");
            },
        });

        const errors: string[] = [];
        const errorListener = ({ error }: { error: Error }) => {
            errors.push(error.message);
        };

        bus.addErrorListener(errorListener);
        await bus.invoke("failing");
        expect(errors).toEqual(["Error"]);

        bus.removeErrorListener(errorListener);
        // ActionBus registers internal error listeners on each action,
        // so after removing our listener, the internal one still catches errors
        // and the action won't throw - it just won't call our removed listener
        const result = await bus.invoke("failing");
        expect(result.error).toBe("Error");
        expect(errors).toEqual(["Error"]); // Our listener wasn't called again
    });
});

describe("actionBus once", () => {
    it("triggers listener only once", async () => {
        const bus = createActionBus({
            action: (x: number) => x * 2,
        });

        const results: number[] = [];
        bus.once("action", ({ response }) => {
            if (response !== null) {
                results.push(response);
            }
        });

        await bus.invoke("action", 1);
        await bus.invoke("action", 2);
        await bus.invoke("action", 3);

        expect(results).toEqual([2]);
    });

    it("throws when action not found", () => {
        const bus = createActionBus({
            existing: () => 1,
        });

        expect(() =>
            bus.once("nonexistent" as any, () => { })
        ).toThrow("Action nonexistent not found");
    });
});

describe("actionBus get", () => {
    it("returns action object", () => {
        const bus = createActionBus({
            action: (x: number) => x * 2,
        });

        const action = bus.get("action");
        expect(action).toBeDefined();
        expect(typeof action.invoke).toBe("function");
    });

    it("returns undefined for non-existent action", () => {
        const bus = createActionBus({
            existing: () => 1,
        });

        const action = bus.get("nonexistent" as any);
        expect(action).toBeUndefined();
    });
});

describe("actionBus add", () => {
    it("adds action dynamically", async () => {
        const bus = createActionBus();

        bus.add("dynamic", (x: number) => x * 3);

        const result = await bus.invoke("dynamic", 5);
        expect(result.response).toBe(15);
    });

    it("does not override existing action", async () => {
        const bus = createActionBus({
            action: (x: number) => x * 2,
        });

        bus.add("action", (x: number) => x * 100);

        const result = await bus.invoke("action", 5);
        expect(result.response).toBe(10);
    });

    it("registers error listener for dynamically added actions", async () => {
        const bus = createActionBus();
        const errors: string[] = [];

        bus.addErrorListener(({ error }) => {
            errors.push(error.message);
        });

        bus.add("failing", () => {
            throw new Error("Dynamic error");
        });

        await bus.invoke("failing");

        expect(errors).toEqual(["Dynamic error"]);
    });
});

describe("actionBus listener management", () => {
    it("throws when adding listener to non-existent action", () => {
        const bus = createActionBus({
            existing: () => 1,
        });

        expect(() =>
            bus.on("nonexistent" as any, () => { })
        ).toThrow("Action nonexistent not found");
    });

    it("throws when removing listener from non-existent action", () => {
        const bus = createActionBus({
            existing: () => 1,
        });

        expect(() =>
            bus.un("nonexistent" as any, () => { })
        ).toThrow("Action nonexistent not found");
    });

    it("removes listener correctly", async () => {
        const bus = createActionBus({
            action: (x: number) => x,
        });

        const results: number[] = [];
        const listener = ({ response }: { response: number | null }) => {
            if (response !== null) {
                results.push(response);
            }
        };

        bus.on("action", listener);
        await bus.invoke("action", 1);
        expect(results).toEqual([1]);

        bus.un("action", listener);
        await bus.invoke("action", 2);
        expect(results).toEqual([1]);
    });
});

describe("actionBus aliases", () => {
    it("supports all listener aliases", () => {
        const bus = createActionBus({
            action: () => 1,
        });

        // Check that all aliases exist and are functions
        expect(typeof bus.addListener).toBe("function");
        expect(typeof bus.on).toBe("function");
        expect(typeof bus.subscribe).toBe("function");
        expect(typeof bus.listen).toBe("function");

        expect(typeof bus.removeListener).toBe("function");
        expect(typeof bus.off).toBe("function");
        expect(typeof bus.remove).toBe("function");
        expect(typeof bus.un).toBe("function");
        expect(typeof bus.unsubscribe).toBe("function");
    });
});

describe("actionBus with async actions", () => {
    it("handles async actions correctly", async () => {
        const bus = createActionBus({
            asyncAction: async (x: number) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return x * 2;
            },
        });

        const result = await bus.invoke("asyncAction", 5);
        expect(result.response).toBe(10);
    });

    it("catches async errors", async () => {
        const bus = createActionBus({
            asyncFailing: async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                throw new Error("Async failure");
            },
        });

        const errors: string[] = [];
        bus.addErrorListener(({ error }) => {
            errors.push(error.message);
        });

        await bus.invoke("asyncFailing");

        expect(errors).toEqual(["Async failure"]);
    });
});

describe("actionBus with global error listener", () => {
    it("receives errors from all actions", async () => {
        const bus = createActionBus({
            failing1: () => {
                throw new Error("Error 1");
            },
            failing2: () => {
                throw new Error("Error 2");
            },
        });

        const errors: { name?: string; message: string }[] = [];
        bus.addErrorListener(({ name, error }) => {
            errors.push({ name, message: error.message });
        });

        await bus.invoke("failing1");
        await bus.invoke("failing2");

        expect(errors).toHaveLength(2);
        expect(errors[0]).toEqual({ name: "failing1", message: "Error 1" });
        expect(errors[1]).toEqual({ name: "failing2", message: "Error 2" });
    });
});

describe("actionBus result args", () => {
    it("includes args in successful response", async () => {
        const bus = createActionBus({
            action: (a: number, b: string) => `${a}-${b}`,
        });

        let receivedArgs: unknown[] = [];
        bus.on("action", ({ args }) => {
            receivedArgs = args;
        });

        await bus.invoke("action", 42, "test");

        expect(receivedArgs).toEqual([42, "test"]);
    });

    it("includes args in error response", async () => {
        const bus = createActionBus({
            failing: (_a: number, _b: string) => {
                throw new Error("Fail");
            },
        });

        bus.addErrorListener(() => { });

        let receivedArgs: unknown[] = [];
        bus.on("failing", ({ args }) => {
            receivedArgs = args;
        });

        await bus.invoke("failing", 42, "test");

        expect(receivedArgs).toEqual([42, "test"]);
    });
});

