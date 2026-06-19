import { describe, expect, it } from "bun:test";
import { createActionBus } from "../../src/actionBus";

describe("actionBus updateListenerOptions", () => {
    it("returns false when no matching listener exists", () => {
        const bus = createActionBus<{ a: () => number }>({ a: () => 1 });
        expect(bus.updateListenerOptions("a", () => {}, null, { limit: 2 }))
            .toBe(false);
    });

    it("updates a live response listener's options in place", async () => {
        const bus = createActionBus<{ a: () => number }>({ a: () => 1 });
        let calls = 0;
        const handler = () => {
            calls++;
        };
        bus.addListener("a", handler, { limit: 3 });
        await bus.invoke("a");
        expect(calls).toBe(1);

        expect(bus.updateListenerOptions("a", handler, null, { limit: 2 }))
            .toBe(true);
        await bus.invoke("a");
        expect(calls).toBe(2);
        await bus.invoke("a");
        expect(calls).toBe(2);
    });
});
