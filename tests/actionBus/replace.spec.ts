import { describe, expect, it } from "bun:test";
import { createActionBus } from "../../src/actionBus";

describe("actionBus replace/remove/has", () => {
    it("replace preserves listeners and uses new function", async () => {
        const bus = createActionBus<{ a: (n: number) => number }>({
            a: (n) => n + 1,
        });
        const responses: number[] = [];
        bus.on("a", ({ response }) => {
            if (response !== null) {
                responses.push(response);
            }
        });
        await bus.invoke("a", 1);

        bus.replace("a", (n: number) => n * 10);
        await bus.invoke("a", 2);

        expect(responses).toEqual([ 2, 20 ]);
    });

    it("replace on a new name adds it", async () => {
        const bus = createActionBus<{ a: (n: number) => number }>();
        bus.replace("a", (n: number) => n + 5);
        const res = await bus.invoke("a", 1);
        expect(res.response).toBe(6);
    });

    it("remove makes invoke/on/un throw", () => {
        const bus = createActionBus<{ a: () => number }>({ a: () => 1 });
        expect(bus.has("a")).toBe(true);
        bus.removeAction("a");
        expect(bus.has("a")).toBe(false);
        expect(() => bus.invoke("a")).toThrow("Action a not found");
        expect(() => bus.on("a", () => {})).toThrow("Action a not found");
        expect(() => bus.un("a", () => {})).toThrow("Action a not found");
    });

    it("error forwarding survives replace", async () => {
        const errors: string[] = [];
        const bus = createActionBus<{ a: (n: number) => number }>(
            { a: (n) => n },
            ({ error }) => {
                errors.push(error.message);
            },
        );
        bus.replace("a", () => {
            throw new Error("boom");
        });
        await bus.invoke("a", 1);
        expect(errors).toEqual([ "boom" ]);
    });
});
