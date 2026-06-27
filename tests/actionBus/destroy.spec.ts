import { describe, expect, it } from "bun:test";
import { createActionBus } from "../../src/actionBus";

describe("actionBus destroy()", () => {
    it("reports destroyed state via isDestroyed", () => {
        const bus = createActionBus({ inc: (x: number) => x + 1 });
        expect(bus.isDestroyed()).toBe(false);
        bus.destroy();
        expect(bus.isDestroyed()).toBe(true);
    });

    it("throws when invoking a destroyed bus", () => {
        const bus = createActionBus({ inc: (x: number) => x + 1 });
        bus.destroy();
        expect(() => bus.invoke("inc", 1)).toThrow("destroyed");
    });

    it("throws when subscribing on a destroyed bus", () => {
        const bus = createActionBus({ inc: (x: number) => x + 1 });
        bus.destroy();
        expect(() => bus.on("inc", () => {})).toThrow("destroyed");
    });

    it("destroys the underlying actions", () => {
        const bus = createActionBus({ inc: (x: number) => x + 1 });
        const action = bus.get("inc");
        bus.destroy();
        expect(action.isDestroyed()).toBe(true);
    });
});
