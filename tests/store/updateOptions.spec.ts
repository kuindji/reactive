import { describe, expect, it } from "bun:test";
import { createStore } from "../../src/store";

describe("store updateOnChangeOptions", () => {
    it("returns false when no change listener exists", () => {
        const store = createStore<{ a: number }>();
        expect(store.updateOnChangeOptions("a", () => {}, null, { limit: 2 }))
            .toBe(false);
    });

    it("updates a live onChange listener's options in place", () => {
        const store = createStore<{ a: number }>({ a: 0 });
        let calls = 0;
        const handler = () => {
            calls++;
        };
        store.onChange("a", handler, { limit: 3 });
        store.set("a", 1);
        expect(calls).toBe(1);

        expect(store.updateOnChangeOptions("a", handler, null, { limit: 2 }))
            .toBe(true);
        store.set("a", 2);
        expect(calls).toBe(2);
        store.set("a", 3);
        expect(calls).toBe(2);
    });
});
