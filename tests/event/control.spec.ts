import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event control", () => {
    it("should suspend and resume events", () => {
        const o = createEvent<() => void>();
        const triggered: number[] = [];
        const l = function() {
            triggered.push(1);
        };

        o.addListener(l);
        o.trigger();
        o.suspend();
        o.trigger();
        o.resume();
        o.trigger();

        expect(triggered).toEqual([ 1, 1 ]);
    });

    it("should return correct suspended state", () => {
        const o1 = createEvent<() => void>();
        const o2 = createEvent<() => void>();
        const o3 = createEvent<() => void>();

        o1.suspend();
        o2.suspend(true);

        expect(o1.isSuspended()).toBe(true);
        expect(o1.isQueued()).toBe(false);

        expect(o2.isSuspended()).toBe(true);
        expect(o2.isQueued()).toBe(true);

        expect(o3.isSuspended()).toBe(false);
        expect(o3.isQueued()).toBe(false);
    });

    it("should suspend and resume events with queue", () => {
        const o = createEvent<() => void>();
        const triggered: number[] = [];
        const l = function() {
            triggered.push(1);
        };

        o.addListener(l);
        o.trigger();
        o.suspend(true);
        o.trigger();
        o.trigger();
        o.resume();

        expect(triggered).toEqual([ 1, 1, 1 ]);
    });

    it("should indicate if it has a listener or not", () => {
        const o = createEvent<() => void>();
        const contextL = function() {};
        const contextL2 = function() {};
        const context = {
            l: contextL,
            l2: contextL2,
        };
        const l = function() {};

        o.addListener(l);
        o.addListener(contextL, { context });

        expect(o.hasListener()).toBe(true);
        expect(o.hasListener(l)).toBe(true);
        expect(o.hasListener(contextL, context)).toBe(true);
        expect(o.hasListener(contextL2)).toBe(false);
        expect(o.hasListener(contextL2, context)).toBe(false);

        o.removeAllListeners();
        expect(o.hasListener()).toBe(false);
        expect(o.hasListener(l)).toBe(false);
        expect(o.hasListener(contextL, context)).toBe(false);
        expect(o.hasListener(contextL2)).toBe(false);
        expect(o.hasListener(contextL2, context)).toBe(false);
    });

    it("should work with tags", () => {
        const o = createEvent<() => void>();
        const triggered: number[] = [];
        const a = () => triggered.push(1);
        const b = () => triggered.push(2);
        const c = () => triggered.push(3);

        o.addListener(a, { tags: [ "a" ] });
        o.addListener(b, { tags: [ "b" ] });
        o.addListener(c, { tags: [ "a", "b" ] });

        o.withTags([ "a" ], () => o.trigger());
        expect(triggered).toEqual([ 1, 3 ]);
        o.trigger();
        expect(triggered).toEqual([ 1, 3, 1, 2, 3 ]);

        expect(o.hasListener(null, null, "a")).toBe(true);
        expect(o.hasListener(null, null, "c")).toBe(false);
        expect(o.hasListener(a, null, "a")).toBe(true);
        expect(o.hasListener(b, null, "a")).toBe(false);

        o.removeListener(a, null, "a");
        o.removeListener(b, null, "a");

        expect(o.hasListener(a, null, "a")).toBe(false);
        expect(o.hasListener(b)).toBe(true);
        expect(o.hasListener(null, null, "a")).toBe(true);

        o.removeAllListeners("a");
        expect(o.hasListener(c)).toBe(false);
    });
});
