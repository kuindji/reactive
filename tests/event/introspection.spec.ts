import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event once()", () => {
    it("calls the listener only once and auto-removes it", () => {
        const o = createEvent<(value: number) => void>();
        const triggered: number[] = [];
        o.once((value) => triggered.push(value));

        o.trigger(1);
        o.trigger(2);
        o.trigger(3);

        expect(triggered).toEqual([ 1 ]);
        expect(o.hasListener()).toBe(false);
    });

    it("merges extra options with the enforced limit of 1", () => {
        const o = createEvent<() => void>();
        const triggered: number[] = [];
        o.addListener(() => triggered.push(1));
        o.once(() => triggered.push(2), { first: true });
        o.trigger();

        expect(triggered).toEqual([ 2, 1 ]);
    });
});

describe("event introspection", () => {
    it("listenerCount reports the number of listeners", () => {
        const o = createEvent<() => void>();
        expect(o.listenerCount()).toBe(0);
        const a = () => {};
        const b = () => {};
        o.addListener(a);
        o.addListener(b);
        expect(o.listenerCount()).toBe(2);
        o.removeListener(a);
        expect(o.listenerCount()).toBe(1);
    });

    it("listenerCount can filter by tag", () => {
        const o = createEvent<() => void>();
        o.addListener(() => {}, { tags: [ "a" ] });
        o.addListener(() => {}, { tags: [ "a", "b" ] });
        o.addListener(() => {});

        expect(o.listenerCount()).toBe(3);
        expect(o.listenerCount("a")).toBe(2);
        expect(o.listenerCount("b")).toBe(1);
        expect(o.listenerCount("c")).toBe(0);
    });

    it("triggeredCount exposes how many times the event fired", () => {
        const o = createEvent<() => void>();
        expect(o.triggeredCount()).toBe(0);
        o.trigger();
        o.trigger();
        expect(o.triggeredCount()).toBe(2);
    });

    it("lastTriggerArgs returns the most recent trigger arguments", () => {
        const o = createEvent<(a: number, b: string) => void>();
        expect(o.lastTriggerArgs()).toBe(null);
        o.trigger(1, "x");
        expect(o.lastTriggerArgs()).toEqual([ 1, "x" ]);
        o.trigger(2, "y");
        expect(o.lastTriggerArgs()).toEqual([ 2, "y" ]);
    });

    it("lastTriggerArgs is not affected by pipe mutating the args", () => {
        const o = createEvent<(value: number) => number>();
        o.addListener((value) => value + 1);
        o.pipe(5);
        expect(o.lastTriggerArgs()).toEqual([ 5 ]);
    });

    it("getListeners returns a read-only projection without mutable internals", () => {
        const o = createEvent<() => void>();
        const handler = () => {};
        o.addListener(handler, { tags: [ "x" ], limit: 3 });
        o.trigger();

        const listeners = o.getListeners();
        expect(listeners.length).toBe(1);
        expect(listeners[0].handler).toBe(handler);
        expect(listeners[0].tags).toEqual([ "x" ]);
        expect(listeners[0].limit).toBe(3);
        expect(listeners[0].called).toBe(1);
        expect(listeners[0].count).toBe(1);

        // Mutating the projection must not affect internal state.
        listeners[0].tags.push("mutated");
        expect(o.getListeners()[0].tags).toEqual([ "x" ]);
    });
});
