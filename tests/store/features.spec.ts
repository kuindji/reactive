import { describe, expect, it } from "bun:test";
import { createStore, ErrorEventName, ResetEventName } from "../../src/store";

describe("store reset", () => {
    it("clears all data", () => {
        const store = createStore({
            a: 1,
            b: 2,
            c: "hello",
        });

        expect(store.get("a")).toBe(1);
        expect(store.get("b")).toBe(2);

        store.reset();

        expect(store.get("a")).toBeUndefined();
        expect(store.get("b")).toBeUndefined();
        expect(store.get("c")).toBeUndefined();
    });

    it("triggers reset event", () => {
        const store = createStore({
            a: 1,
        });

        let resetTriggered = false;
        store.control(ResetEventName, () => {
            resetTriggered = true;
        });

        store.reset();

        expect(resetTriggered).toBe(true);
    });
});

describe("store isEmpty", () => {
    it("returns true for empty store", () => {
        const store = createStore();
        expect(store.isEmpty()).toBe(true);
    });

    it("returns true for store with only null/undefined values", () => {
        const store = createStore({
            a: null as any,
            b: undefined as any,
        });

        expect(store.isEmpty()).toBe(true);
    });

    it("returns false for store with values", () => {
        const store = createStore({
            a: 1,
        });

        expect(store.isEmpty()).toBe(false);
    });

    it("returns false for store with zero or empty string", () => {
        const store = createStore({
            num: 0,
            str: "",
        });

        expect(store.isEmpty()).toBe(false);
    });

    it("returns true after reset", () => {
        const store = createStore({
            a: 1,
            b: 2,
        });

        expect(store.isEmpty()).toBe(false);

        store.reset();

        expect(store.isEmpty()).toBe(true);
    });
});

describe("store getData", () => {
    it("returns all data as object", () => {
        const store = createStore({
            a: 1,
            b: "hello",
            c: true,
        });

        const data = store.getData();

        expect(data).toEqual({
            a: 1,
            b: "hello",
            c: true,
        });
    });

    it("returns empty object for empty store", () => {
        const store = createStore();
        expect(store.getData()).toEqual({});
    });

    it("reflects changes", () => {
        const store = createStore({
            a: 1,
        });

        store.set("a", 100);
        store.set("b" as any, 200);

        const data = store.getData();

        expect(data.a).toBe(100);
        expect((data as any).b).toBe(200);
    });
});

describe("store asyncSet", () => {
    it("sets value asynchronously with key/value", (done) => {
        const store = createStore({
            a: 1,
        });

        store.asyncSet("a", 100);

        // Value should not be changed immediately
        expect(store.get("a")).toBe(1);

        setTimeout(() => {
            expect(store.get("a")).toBe(100);
            done();
        }, 10);
    });

    it("sets multiple values asynchronously with object", (done) => {
        const store = createStore({
            a: 1,
            b: 2,
        });

        store.asyncSet({ a: 100, b: 200 });

        // Values should not be changed immediately
        expect(store.get("a")).toBe(1);
        expect(store.get("b")).toBe(2);

        setTimeout(() => {
            expect(store.get("a")).toBe(100);
            expect(store.get("b")).toBe(200);
            done();
        }, 10);
    });

    it("triggers change events after async set", (done) => {
        const store = createStore({
            a: 1,
        });

        let changeTriggered = false;
        store.onChange("a", () => {
            changeTriggered = true;
        });

        store.asyncSet("a", 100);

        expect(changeTriggered).toBe(false);

        setTimeout(() => {
            expect(changeTriggered).toBe(true);
            done();
        }, 10);
    });
});

describe("store error handling", () => {
    it("catches errors in pipe listeners", () => {
        const store = createStore({
            a: 1,
        });

        const errors: string[] = [];
        store.control(ErrorEventName, ({ error }) => {
            errors.push(error.message);
        });

        store.pipe("a", () => {
            throw new Error("Pipe error");
        });

        store.set("a", 2);

        expect(errors).toEqual([ "Pipe error" ]);
        expect(store.get("a")).toBe(1); // Value should not change
    });

    it("catches errors in onChange listeners", () => {
        const store = createStore({
            a: 1,
        });

        const errors: string[] = [];
        store.control(ErrorEventName, ({ error }) => {
            errors.push(error.message);
        });

        store.onChange("a", () => {
            throw new Error("Change error");
        });

        store.set("a", 2);

        expect(errors).toEqual([ "Change error" ]);
        expect(store.get("a")).toBe(2); // Value should still change
    });

    it("includes name in error response", () => {
        const store = createStore({
            myProp: 1,
        });

        let receivedName: string | undefined;
        store.control(ErrorEventName, ({ name }) => {
            receivedName = name;
        });

        store.pipe("myProp", () => {
            throw new Error("Named error");
        });

        store.set("myProp", 2);

        expect(receivedName).toBe("myProp");
    });

    it("includes type in error response", () => {
        const store = createStore({
            a: 1,
        });

        let receivedType: string | undefined;
        store.control(ErrorEventName, ({ type }) => {
            receivedType = type;
        });

        store.pipe("a", () => {
            throw new Error("Type error");
        });

        store.set("a", 2);

        expect(receivedType).toBe("store-pipe");
    });

    it("throws error when no error listener is registered", () => {
        const store = createStore({
            a: 1,
        });

        store.pipe("a", () => {
            throw new Error("Unhandled");
        });

        expect(() => store.set("a", 2)).toThrow("Unhandled");
    });
});

describe("store edge cases", () => {
    it("throws for invalid key type in set", () => {
        const store = createStore();

        expect(() => store.set(123 as any, "value")).toThrow("Invalid key");
    });

    it("throws for invalid key type in get", () => {
        const store = createStore({ a: 1 });

        expect(() => store.get({} as any)).toThrow("Invalid key");
    });

    it("does not trigger change when value is same", () => {
        const store = createStore({
            a: 1,
        });

        let changeCount = 0;
        store.onChange("a", () => {
            changeCount++;
        });

        store.set("a", 1);
        store.set("a", 1);
        store.set("a", 2);
        store.set("a", 2);

        expect(changeCount).toBe(1);
    });

    it("handles undefined as valid value", () => {
        const store = createStore({
            a: 1 as number | undefined,
        });

        let changeTriggered = false;
        store.onChange("a", (value) => {
            changeTriggered = true;
            expect(value).toBeUndefined();
        });

        store.set("a", undefined);

        expect(changeTriggered).toBe(true);
        expect(store.get("a")).toBeUndefined();
    });

    it("pipe can transform values", () => {
        const store = createStore({
            a: 0,
        });

        store.pipe("a", (value) => {
            if (value !== undefined) {
                return Math.max(0, value);
            }
            return 0;
        });

        store.set("a", -5);
        expect(store.get("a")).toBe(0);

        store.set("a", 10);
        expect(store.get("a")).toBe(10);
    });

    it("multiple pipe listeners chain correctly", () => {
        const store = createStore({
            a: 0,
        });

        store.pipe("a", (value) => (value ?? 0) + 1);
        store.pipe("a", (value) => (value ?? 0) * 2);

        store.set("a", 5);
        expect(store.get("a")).toBe(12); // (5+1)*2
    });
});

describe("store removeOnChange", () => {
    it("removes onChange listener", () => {
        const store = createStore({
            a: 1,
        });

        const changes: number[] = [];
        const listener = (value: number | undefined) => {
            if (value !== undefined) {
                changes.push(value);
            }
        };

        store.onChange("a", listener);
        store.set("a", 2);
        expect(changes).toEqual([ 2 ]);

        store.removeOnChange("a", listener);
        store.set("a", 3);
        expect(changes).toEqual([ 2 ]);
    });
});

describe("store removeControl", () => {
    it("removes control listener", () => {
        const store = createStore({
            a: 1,
        });

        let resetCount = 0;
        const listener = () => {
            resetCount++;
        };

        store.control(ResetEventName, listener);
        store.reset();
        expect(resetCount).toBe(1);

        store.removeControl(ResetEventName, listener);
        store.reset();
        expect(resetCount).toBe(1);
    });
});

describe("store removePipe", () => {
    it("removes pipe listener", () => {
        const store = createStore({
            a: 0,
        });

        const doubler = (value: number | undefined) =>
            value !== undefined ? value * 2 : 0;

        store.pipe("a", doubler);
        store.set("a", 5);
        expect(store.get("a")).toBe(10);

        store.removePipe("a", doubler);
        store.set("a", 5);
        expect(store.get("a")).toBe(5);
    });
});

describe("store batch operations", () => {
    it("triggers all property changes after batch completes", () => {
        const store = createStore({
            a: 1,
            b: 2,
        });

        const changes: { prop: string; value: number; }[] = [];
        store.onChange("a", (value) => {
            changes.push({ prop: "a", value: value! });
        });
        store.onChange("b", (value) => {
            changes.push({ prop: "b", value: value! });
        });

        store.batch(() => {
            store.set("a", 10);
            store.set("b", 20);
        });

        // Both changes should be triggered after batch
        expect(changes).toEqual([
            { prop: "a", value: 10 },
            { prop: "b", value: 20 },
        ]);
        expect(store.get("a")).toBe(10);
        expect(store.get("b")).toBe(20);
    });

    it("collects all changed keys in single control event", () => {
        const store = createStore({
            a: 1,
            b: 2,
            c: 3,
        });

        let changedKeys: string[] = [];
        store.control("change", (keys) => {
            changedKeys = keys as string[];
        });

        store.batch(() => {
            store.set("a", 10);
            store.set("c", 30);
        });

        expect(changedKeys).toEqual([ "a", "c" ]);
    });
});

describe("store with complex types", () => {
    it("stores objects", () => {
        const store = createStore({
            user: { name: "John", age: 30 },
        });

        expect(store.get("user")).toEqual({ name: "John", age: 30 });

        store.set("user", { name: "Jane", age: 25 });
        expect(store.get("user")).toEqual({ name: "Jane", age: 25 });
    });

    it("stores arrays", () => {
        const store = createStore({
            items: [ 1, 2, 3 ],
        });

        expect(store.get("items")).toEqual([ 1, 2, 3 ]);

        store.set("items", [ 4, 5, 6 ]);
        expect(store.get("items")).toEqual([ 4, 5, 6 ]);
    });

    it("stores functions", () => {
        const fn1 = () => "hello";
        const fn2 = () => "world";

        const store = createStore({
            callback: fn1,
        });

        expect(store.get("callback")).toBe(fn1);

        store.set("callback", fn2);
        expect(store.get("callback")).toBe(fn2);
    });
});
