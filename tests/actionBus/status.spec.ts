import { describe, expect, it } from "bun:test";
import { createActionBus } from "../../src/actionBus";

describe("actionBus status", () => {
    it("delegates status to the underlying action", async () => {
        const bus = createActionBus({
            "user/login": async (name: string) => {
                await new Promise((resolve) => setTimeout(resolve, 10));
                return `hi ${name}`;
            },
        });

        const promise = bus.invoke("user/login", "jane");
        expect(bus.getStatus("user/login").pending).toBe(true);

        await promise;
        expect(bus.getStatus("user/login")).toEqual({
            pending: false,
            error: null,
            response: "hi jane",
        });
    });

    it("emits status changes per name", async () => {
        const bus = createActionBus({
            save: (x: number) => x,
        });

        const seen: boolean[] = [];
        bus.onStatusChange("save", (status) => {
            seen.push(status.pending);
        });

        await bus.invoke("save", 1);

        expect(seen).toEqual([true, false]);
    });

    it("records errors without re-throwing (bus attaches an error listener)", async () => {
        const bus = createActionBus({
            fail: () => {
                throw new Error("nope");
            },
        });

        const result = await bus.invoke("fail");
        expect(result.error).toBe("nope");

        const status = bus.getStatus("fail");
        expect(status.pending).toBe(false);
        expect(status.error?.message).toBe("nope");
    });

    it("returns an idle default for an unregistered name", () => {
        const bus = createActionBus({ a: (x: number) => x });
        expect(bus.getStatus("missing" as "a")).toEqual({
            pending: false,
            error: null,
            response: null,
        });
    });

    it("no-ops subscribing to an unregistered name", () => {
        const bus = createActionBus({ a: (x: number) => x });
        expect(() => {
            bus.onStatusChange("missing" as "a", () => { });
            bus.removeStatusListener("missing" as "a", () => { });
        }).not.toThrow();
    });

    it("preserves status-event identity across replace", async () => {
        const bus = createActionBus({ a: (x: number) => x });
        const seen: number[] = [];
        bus.onStatusChange("a", (status) => {
            if (!status.pending && status.response !== null) {
                seen.push(status.response);
            }
        });

        await bus.invoke("a", 1);
        bus.replace("a", (x: number) => x * 10);
        await bus.invoke("a", 2);

        expect(seen).toEqual([1, 20]);
    });
});
