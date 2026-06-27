import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event destroy()", () => {
    it("reports destroyed state via isDestroyed", () => {
        const o = createEvent<() => void>();
        expect(o.isDestroyed()).toBe(false);
        o.destroy();
        expect(o.isDestroyed()).toBe(true);
    });

    it("removes all listeners on destroy", () => {
        const o = createEvent<() => void>();
        o.addListener(() => {});
        o.destroy();
        expect(o.hasListener()).toBe(false);
    });

    it("throws when triggering a destroyed event", () => {
        const o = createEvent<() => void>();
        o.destroy();
        expect(() => o.trigger()).toThrow("destroyed");
    });

    it("throws when adding a listener to a destroyed event", () => {
        const o = createEvent<() => void>();
        o.destroy();
        expect(() => o.addListener(() => {})).toThrow("destroyed");
    });

    it("detaches abort handlers on destroy", () => {
        const o = createEvent<() => void>();
        const controller = new AbortController();
        o.addListener(() => {}, { signal: controller.signal });
        o.destroy();
        expect(() => controller.abort()).not.toThrow();
    });
});
