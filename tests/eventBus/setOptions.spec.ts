import { describe, expect, it } from "bun:test";
import { createEventBus } from "../../src/eventBus";

describe("eventBus setOptions", () => {
    it("applies changed options to an already-created event", () => {
        const bus = createEventBus<{ a: (n: number) => void }>({
            eventOptions: { a: { limit: 1 } },
        });
        let calls = 0;
        bus.addListener("a", () => {
            calls++;
        });
        bus.trigger("a", 1);
        bus.trigger("a", 1);
        expect(calls).toBe(1); // event limit 1

        bus.setOptions({ eventOptions: { a: { limit: 2 } } });
        bus.trigger("a", 1);
        expect(calls).toBe(2);
    });

    it("future events use the latest stored options", () => {
        const bus = createEventBus<{ a: (n: number) => void }>();
        bus.setOptions({ eventOptions: { a: { limit: 1 } } });
        let calls = 0;
        // event 'a' created here for the first time
        bus.addListener("a", () => {
            calls++;
        });
        bus.trigger("a", 1);
        bus.trigger("a", 1);
        expect(calls).toBe(1);
    });

    it("removing an event name leaves the existing event unchanged", () => {
        const bus = createEventBus<{ a: (n: number) => void }>({
            eventOptions: { a: { limit: 1 } },
        });
        let calls = 0;
        bus.addListener("a", () => {
            calls++;
        });
        // new options omit 'a' -> existing event keeps limit 1
        bus.setOptions({ eventOptions: {} as any });
        bus.trigger("a", 1);
        bus.trigger("a", 1);
        expect(calls).toBe(1);
    });
});
