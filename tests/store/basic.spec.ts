import { describe, expect, it } from "bun:test";
import { createStore } from "store";

describe("store basic", () => {
    it("performs basic get/set operations", () => {
        const store = createStore({
            a: 1,
            b: 2,
            c: 3,
        });

        expect(store.get("a")).toBe(1);
        expect(store.get("b")).toBe(2);
        store.set("a", 4);
        expect(store.get("a")).toBe(4);
        expect(store.get([ "a", "b" ])).toEqual({ a: 4, b: 2 });
    });
});
