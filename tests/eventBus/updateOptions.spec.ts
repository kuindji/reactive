import { describe, expect, it } from "bun:test";
import { createEventBus } from "../../src/eventBus";

describe("eventBus updateListenerOptions", () => {
    it("returns false when event does not exist", () => {
        const bus = createEventBus<{ a: () => void }>();
        expect(bus.updateListenerOptions("a", () => {}, null, { limit: 2 }))
            .toBe(false);
    });

    it("updates a live listener's options in place", () => {
        const bus = createEventBus<{ a: () => void }>();
        let calls = 0;
        const handler = () => {
            calls++;
        };
        bus.addListener("a", handler, { limit: 3 });
        bus.trigger("a");
        expect(calls).toBe(1);

        expect(bus.updateListenerOptions("a", handler, null, { limit: 2 }))
            .toBe(true);
        bus.trigger("a");
        expect(calls).toBe(2);
        bus.trigger("a");
        expect(calls).toBe(2);
    });
});
