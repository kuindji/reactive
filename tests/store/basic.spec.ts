import { describe, expect, it } from "bun:test";
import {
    BeforeChangeEventName,
    ChangeEventName,
    createStore,
} from "../../src/store";

describe("store basic", () => {
    it("performs basic get/set operations", () => {
        const store = createStore({
            a: 1,
            b: 2,
            c: "hello",
        });

        expect(store.get("a")).toBe(1);
        expect(store.get("b")).toBe(2);
        store.set("a", 4);
        expect(store.get("a")).toBe(4);
        expect(store.get([ "a", "b" ])).toEqual({ a: 4, b: 2 });

        const untypedStore = createStore();
        untypedStore.set("a", 5);
        expect(untypedStore.get("a")).toBe(5);
    });

    it("triggers prop event", () => {
        const store = createStore({
            a: 1,
            b: 2,
            c: "hello",
        });

        store.onChange("a", (value, prev) => {
            expect(value).toBe(2);
            expect(prev).toBe(1);
        });
        store.set("a", 2);
    });

    it("triggers beforeChange event", () => {
        const store = createStore({
            a: 1,
            b: "hello",
        });
        let triggered = false;

        store.control(BeforeChangeEventName, (name, value) => {
            expect("a").toEqual(name);
            expect(value).toEqual(2 as any);
            triggered = true;
            return false;
        });
        store.set("a", 2);
        expect(triggered).toBe(true);
        expect(store.get("a")).toBe(1);
    });

    it("triggers change event", () => {
        const store = createStore({
            a: 1,
            b: "hello",
        });
        let triggered = false;

        store.control(ChangeEventName, (names) => {
            expect(names).toEqual([ "a" ]);
            triggered = true;
            return true;
        });
        store.set("a", 2);
        expect(triggered).toBe(true);
        expect(store.get("a")).toBe(2);
    });

    it("performs set with partial data", () => {
        const store = createStore({
            a: 1,
            b: 2,
            c: "hello",
        });
        let triggered = false;

        store.control(ChangeEventName, (names) => {
            expect(names).toEqual([ "a", "b" ]);
            triggered = true;
            return true;
        });
        store.set({
            a: 4,
            b: 5,
            c: "hello",
        });
        expect(triggered).toBe(true);
        expect(store.get("a")).toBe(4);
        expect(store.get("b")).toBe(5);
    });

    it("triggers set event", () => {
        const store = createStore({
            a: 1,
            b: "hello",
        });
        let triggered = false;

        store.pipe("a", (value) => {
            triggered = true;
            return value + value;
        });
        store.pipe("a", (value) => {
            triggered = true;
            return value * value;
        });
        store.set("a", 2);
        expect(triggered).toBe(true);
        expect(store.get("a")).toBe(16);
    });

    it("should perform batch operations", () => {
        let aChangeTriggered = false;
        let bChangeTriggered = false;
        let controlChangeTriggered = false;
        const changedKeys: any[] = [];
        const store = createStore({
            a: 1,
            b: 2,
            c: "hello",
        });
        store.onChange("a", () => {
            aChangeTriggered = true;
        });
        store.onChange("b", () => {
            bChangeTriggered = true;
        });
        store.control(ChangeEventName, (names) => {
            controlChangeTriggered = true;
            changedKeys.push(...names);
        });
        store.batch(() => {
            store.set("a", 2);
            store.set("b", 3);
            expect(aChangeTriggered).toBe(false);
            expect(bChangeTriggered).toBe(false);
            expect(controlChangeTriggered).toBe(false);
            expect(changedKeys).toEqual([]);
        });
        expect(aChangeTriggered).toBe(true);
        expect(bChangeTriggered).toBe(true);
        expect(changedKeys).toEqual([ "a", "b" ]);
        expect(controlChangeTriggered).toBe(true);
    });
});
