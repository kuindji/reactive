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

    it("triggeredCount does not count autoTrigger replays to new listeners", () => {
        const o = createEvent<(n: number) => void>({ autoTrigger: true });
        o.trigger(1);
        // Each of these additions internally replays the last trigger to the
        // new listener; those replays must not inflate the public counter.
        o.addListener(() => {});
        o.addListener(() => {});
        expect(o.triggeredCount()).toBe(1);
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

    it("returns a copy so mutating it does not change subsequent autoTrigger", () => {
        const o = createEvent<(a: number) => void>({ autoTrigger: true });
        o.trigger(1);

        const args = o.lastTriggerArgs();
        expect(args).toEqual([ 1 ]);
        args![0] = 999;

        // The recorded snapshot must be unchanged...
        expect(o.lastTriggerArgs()).toEqual([ 1 ]);

        // ...and a newly added listener auto-triggered with the last args must
        // see the original value, not the mutated one.
        const received: number[] = [];
        o.addListener((a) => received.push(a));
        expect(received).toEqual([ 1 ]);
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

    it("getListeners returns extraData defensively so the projection cannot mutate internals", () => {
        const o = createEvent<() => void>();
        o.addListener(() => {}, { extraData: { flag: true } });

        const info = o.getListeners()[0];
        info.extraData.flag = false;

        expect(o.getListeners()[0].extraData.flag).toBe(true);
    });

    it("getListeners deep-copies nested extraData so nested mutation cannot reach internals", () => {
        const o = createEvent<() => void>();
        o.addListener(() => {}, { extraData: { nested: { flag: true }, list: [ 1 ] } });

        const info = o.getListeners()[0];
        info.extraData.nested.flag = false;
        info.extraData.list.push(2);

        expect(o.getListeners()[0].extraData.nested.flag).toBe(true);
        expect(o.getListeners()[0].extraData.list).toEqual([ 1 ]);
    });

    it("getListeners projects cyclic extraData without throwing", () => {
        const o = createEvent<() => void>();
        const cyclic: Record<string, any> = { name: "x" };
        cyclic.self = cyclic;
        o.addListener(() => {}, { extraData: cyclic });

        let projected: any;
        expect(() => {
            projected = o.getListeners()[0].extraData;
        }).not.toThrow();
        // The cycle is preserved structurally (a fresh copy, not the original).
        expect(projected).not.toBe(cyclic);
        expect(projected.self).toBe(projected);
        expect(projected.name).toBe("x");
    });

    it("getListeners clones Date and Map extraData so mutation cannot reach internals", () => {
        const o = createEvent<() => void>();
        const when = new Date(1000);
        const map = new Map<string, { n: number }>([ [ "k", { n: 1 } ] ]);
        o.addListener(() => {}, { extraData: { when, map } });

        const info = o.getListeners()[0];
        expect(info.extraData.when).not.toBe(when);
        expect(info.extraData.when.getTime()).toBe(1000);
        expect(info.extraData.map).not.toBe(map);

        info.extraData.when.setTime(5000);
        info.extraData.map.get("k").n = 99;
        info.extraData.map.set("k2", { n: 2 });

        const fresh = o.getListeners()[0];
        expect(fresh.extraData.when.getTime()).toBe(1000);
        expect(fresh.extraData.map.get("k").n).toBe(1);
        expect(fresh.extraData.map.has("k2")).toBe(false);
    });
});
