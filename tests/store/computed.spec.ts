import { describe, expect, it } from "bun:test";
import { ChangeEventName, createStore } from "../../src/store";

type UserStore = {
    first: string;
    last: string;
    fullName: string;
};

describe("store computed", () => {
    it("computes an initial value available via get/getData", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        store.computed("fullName", [ "first", "last" ], (f, l) => `${f} ${l}`);

        expect(store.get("fullName")).toBe("Jane Doe");
        expect(store.getData().fullName).toBe("Jane Doe");
    });

    it("recomputes when a dependency changes", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        store.computed("fullName", [ "first", "last" ], (f, l) => `${f} ${l}`);

        store.set("first", "John");
        expect(store.get("fullName")).toBe("John Doe");
    });

    it("notifies onChange subscribers of the computed key", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        store.computed("fullName", [ "first", "last" ], (f, l) => `${f} ${l}`);

        const seen: string[] = [];
        store.onChange("fullName", (v) => {
            seen.push(v as string);
        });

        store.set("first", "John");
        expect(seen).toEqual([ "John Doe" ]);
    });

    it("includes the computed key in the control change names (single set)", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        store.computed("fullName", [ "first", "last" ], (f, l) => `${f} ${l}`);

        const batches: string[][] = [];
        store.control(ChangeEventName, (names) => {
            batches.push(names);
        });

        store.set("first", "John");

        expect(batches.length).toBe(1);
        expect(batches[0]).toContain("first");
        expect(batches[0]).toContain("fullName");
        // no duplicate computed key
        expect(batches[0].filter((n) => n === "fullName").length).toBe(1);
    });

    it("recomputes once with the computed key deduped on a multi-key set", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        store.computed("fullName", [ "first", "last" ], (f, l) => `${f} ${l}`);

        const batches: string[][] = [];
        store.control(ChangeEventName, (names) => {
            batches.push(names);
        });

        store.set({ first: "John", last: "Roe" });

        expect(store.get("fullName")).toBe("John Roe");
        expect(batches.length).toBe(1);
        expect(batches[0].filter((n) => n === "fullName").length).toBe(1);
    });

    it("invokes the compute fn once and emits only the final value on a multi-key set", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        let calls = 0;
        store.computed("fullName", [ "first", "last" ], (f, l) => {
            calls++;
            return `${f} ${l}`;
        });
        const callsAfterInit = calls;

        const seen: string[] = [];
        store.onChange("fullName", (v) => {
            seen.push(v as string);
        });

        store.set({ first: "John", last: "Roe" });

        // Recompute exactly once from the final state — no intermediate value.
        expect(calls).toBe(callsAfterInit + 1);
        expect(seen).toEqual([ "John Roe" ]);
    });

    it("settles a computed-of-computed chain on a multi-key set", () => {
        type S = { a: number; b: number; c: number; d: number; };
        const store = createStore<S>({ a: 1, b: 1 });
        // c derives from b; d derives from a AND the computed c. On a multi-key
        // set the base effects replay in key order (a before b), so d would
        // recompute from a stale c first — it must still settle to the final
        // value once c updates, not be skipped as "already recomputed".
        store.computed("c", [ "b" ], (b) => b ?? 0);
        store.computed("d", [ "a", "c" ], (a, c) => (a ?? 0) + (c ?? 0));

        expect(store.get("d")).toBe(2);

        store.set({ a: 2, b: 10 });

        expect(store.get("c")).toBe(10);
        expect(store.get("d")).toBe(12);
    });

    it("supports computed-of-computed chains", () => {
        type S = { n: number; doubled: number; quad: number; };
        const store = createStore<S>({ n: 1 });
        store.computed("doubled", [ "n" ], (n) => (n ?? 0) * 2);
        store.computed("quad", [ "doubled" ], (d) => (d ?? 0) * 2);

        expect(store.get("quad")).toBe(4);
        store.set("n", 3);
        expect(store.get("doubled")).toBe(6);
        expect(store.get("quad")).toBe(12);
    });

    it("throws when setting a computed key (string form)", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        store.computed("fullName", [ "first", "last" ], (f, l) => `${f} ${l}`);

        expect(() => store.set("fullName", "x")).toThrow(/computed/i);
    });

    it("throws and does not partially apply when an object set targets a computed key", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        store.computed("fullName", [ "first", "last" ], (f, l) => `${f} ${l}`);

        expect(() =>
            store.set({ first: "Changed", fullName: "x" } as Partial<UserStore>)
        ).toThrow(/computed/i);
        // first must NOT have been written
        expect(store.get("first")).toBe("Jane");
    });

    it("throws on a cyclic computed dependency", () => {
        type S = { a: number; b: number; };
        const store = createStore<S>({ a: 1, b: 1 });
        store.computed("a", [ "b" ], (b) => (b ?? 0) + 1);
        store.computed("b", [ "a" ], (a) => (a ?? 0) + 1);

        expect(() => store.set("b" as never, 5 as never)).toThrow();
    });

    it("recomputes once per dependent when deps are independent", () => {
        type S = { a: number; b: number; sum: number; };
        const store = createStore<S>({ a: 1, b: 2 });
        let calls = 0;
        store.computed("sum", [ "a", "b" ], (a, b) => {
            calls++;
            return (a ?? 0) + (b ?? 0);
        });
        const callsAfterInit = calls;

        store.set("a", 10);
        expect(store.get("sum")).toBe(12);
        expect(calls).toBe(callsAfterInit + 1);
    });

    it("composes with batch()", () => {
        const store = createStore<UserStore>({ first: "Jane", last: "Doe" });
        store.computed("fullName", [ "first", "last" ], (f, l) => `${f} ${l}`);

        const batches: string[][] = [];
        store.control(ChangeEventName, (names) => {
            batches.push(names);
        });

        store.batch(() => {
            store.set("first", "John");
            store.set("last", "Roe");
        });

        expect(store.get("fullName")).toBe("John Roe");
        expect(batches.length).toBe(1);
        expect(batches[0]).toContain("fullName");
    });
});
