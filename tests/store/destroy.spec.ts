import { describe, expect, it } from "bun:test";
import { createStore } from "../../src/store";

describe("store destroy()", () => {
    it("reports destroyed state via isDestroyed", () => {
        const store = createStore<{ a: number; }>({ a: 1 });
        expect(store.isDestroyed()).toBe(false);
        store.destroy();
        expect(store.isDestroyed()).toBe(true);
    });

    it("clears data on destroy", () => {
        const store = createStore<{ a: number; }>({ a: 1 });
        store.destroy();
        expect(store.isEmpty()).toBe(true);
    });

    it("throws when setting on a destroyed store", () => {
        const store = createStore<{ a: number; }>({ a: 1 });
        store.destroy();
        expect(() => store.set("a", 2)).toThrow("destroyed");
    });

    it("throws when getting from a destroyed store", () => {
        const store = createStore<{ a: number; }>({ a: 1 });
        store.destroy();
        expect(() => store.get("a")).toThrow("destroyed");
    });

    it("ignores a pending asyncSet that resolves after destroy", async () => {
        const store = createStore<{ a: number; }>({ a: 1 });
        const errors: unknown[] = [];
        const onError = (event: unknown) => {
            errors.push(event);
        };
        (globalThis as any).addEventListener("error", onError);

        store.asyncSet("a", 2);
        store.destroy();

        await new Promise((resolve) => setTimeout(resolve, 10));
        (globalThis as any).removeEventListener("error", onError);

        expect(errors).toEqual([]);
        expect(store.isDestroyed()).toBe(true);
    });

    it("stops notifying onChange listeners after destroy", () => {
        const store = createStore<{ a: number; }>({ a: 1 });
        let calls = 0;
        store.onChange("a", () => calls++);
        store.destroy();
        // The change bus is torn down, so re-subscribing throws too.
        expect(() => store.onChange("a", () => calls++)).toThrow("destroyed");
        expect(calls).toBe(0);
    });
});
