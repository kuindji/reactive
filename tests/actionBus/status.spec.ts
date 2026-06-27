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

    it("delivers status updates when the action is registered after subscribing", async () => {
        const bus = createActionBus<{ load: () => Promise<number>; }>();

        const seen: boolean[] = [];
        bus.onStatusChange("load", (status) => {
            seen.push(status.pending);
        });

        // Action registered AFTER the status subscription was set up.
        bus.add("load", () => Promise.resolve(7));
        await bus.invoke("load");

        expect(seen).toEqual([ true, false ]);
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

    it("notifies status subscribers with idle when an action is removed", async () => {
        const bus = createActionBus({ load: (x: number) => x });
        const seen: Array<{ pending: boolean; response: unknown }> = [];
        bus.onStatusChange("load", (status) => {
            seen.push({ pending: status.pending, response: status.response });
        });

        await bus.invoke("load", 5);
        seen.length = 0;

        bus.removeAction("load");

        expect(seen).toEqual([ { pending: false, response: null } ]);
        expect(bus.getStatus("load")).toEqual({
            pending: false,
            error: null,
            response: null,
        });
    });

    it("detaches retained status listeners from a removed action", async () => {
        const bus = createActionBus({ load: (x: number) => x });
        // Hold a direct reference obtained before removal.
        const action = bus.get("load");
        const seen: boolean[] = [];
        bus.onStatusChange("load", (status) => seen.push(status.pending));

        bus.removeAction("load");
        seen.length = 0;

        // Invoking the held reference must not notify the now-unsubscribed
        // listener: removeAction should have detached it from the action.
        await action.invoke(1);

        expect(seen).toEqual([]);
    });

    it("detaches and notifies all subscribers on removal even if one throws", () => {
        const bus = createActionBus({ load: (x: number) => x });
        const calls: string[] = [];
        bus.onStatusChange("load", () => {
            calls.push("a");
            throw new Error("subscriber boom");
        });
        bus.onStatusChange("load", () => {
            calls.push("b");
        });

        expect(() => bus.removeAction("load")).not.toThrow();
        expect(calls).toContain("a");
        expect(calls).toContain("b");
    });

    it("forwards a throwing removal subscriber to the bus error listener", () => {
        const bus = createActionBus({ load: (x: number) => x });
        const errors: string[] = [];
        bus.addErrorListener(({ error }) => errors.push(error.message));
        bus.onStatusChange("load", () => {
            throw new Error("subscriber boom");
        });

        bus.removeAction("load");

        expect(errors).toContain("subscriber boom");
    });

    it("throws when adding an action to a destroyed bus", () => {
        const bus = createActionBus<{ a: () => number }>();
        bus.destroy();
        expect(() => bus.add("a", () => 1)).toThrow("destroyed");
    });

    it("throws when replacing an action on a destroyed bus", () => {
        const bus = createActionBus<{ a: () => number }>();
        bus.destroy();
        expect(() => bus.replace("a", () => 1)).toThrow("destroyed");
    });

    it("throws when subscribing to status on a destroyed bus", () => {
        const bus = createActionBus<{ a: () => number }>();
        bus.destroy();
        expect(() => bus.onStatusChange("a", () => {})).toThrow("destroyed");
    });

    it("returns a frozen idle status so mutation cannot corrupt future snapshots", () => {
        const bus = createActionBus<{ load: (x: number) => number }>();
        const status = bus.getStatus("load");

        expect(Object.isFrozen(status)).toBe(true);
        try {
            (status as { pending: boolean }).pending = true;
        }
        catch {
            // Frozen object throws in strict mode; acceptable.
        }
        expect(bus.getStatus("load").pending).toBe(false);
    });

    it("contains a throwing bus error listener during action removal", () => {
        const bus = createActionBus({ load: (x: number) => x });
        bus.addErrorListener(() => {
            throw new Error("error listener boom");
        });
        const calls: string[] = [];
        bus.onStatusChange("load", () => {
            calls.push("a");
            throw new Error("subscriber boom");
        });
        bus.onStatusChange("load", () => {
            calls.push("b");
        });

        expect(() => bus.removeAction("load")).not.toThrow();
        expect(calls).toContain("a");
        expect(calls).toContain("b");
    });

    it("does not notify status subscribers when removing a missing action", () => {
        const bus = createActionBus<{ load: (x: number) => number }>();
        const seen: unknown[] = [];
        bus.onStatusChange("load", (status) => seen.push(status));

        bus.removeAction("load");

        expect(seen).toEqual([]);
    });
});
