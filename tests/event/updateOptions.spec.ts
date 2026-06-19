import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event updateListenerOptions", () => {
    it("returns false when no matching listener", () => {
        const o = createEvent<() => void>();
        const handler = () => {};
        expect(o.updateListenerOptions(handler, null, { limit: 2 })).toBe(false);
    });

    it("updates soft fields in place preserving called/count", () => {
        const o = createEvent<() => void>();
        let calls = 0;
        const handler = () => {
            calls++;
        };
        o.addListener(handler, { limit: 3 });
        o.trigger();
        expect(calls).toBe(1);

        // lower limit to 2 in place; called is already 1
        const found = o.updateListenerOptions(handler, null, { limit: 2 });
        expect(found).toBe(true);

        o.trigger();
        // called becomes 2 === limit -> auto-removed
        expect(calls).toBe(2);
        o.trigger();
        expect(calls).toBe(2);
    });

    it("lowering limit at/below called removes immediately", () => {
        const o = createEvent<() => void>();
        let calls = 0;
        const handler = () => {
            calls++;
        };
        o.addListener(handler, { limit: 3 });
        o.trigger();
        o.trigger();
        expect(calls).toBe(2);

        // new limit 1 <= called 2 -> remove immediately
        const found = o.updateListenerOptions(handler, null, { limit: 1 });
        expect(found).toBe(true);
        expect(o.hasListener(handler)).toBe(false);

        o.trigger();
        expect(calls).toBe(2);
    });

    it("does not remove on limit lowering when new limit is 0 (unlimited)", () => {
        const o = createEvent<() => void>();
        let calls = 0;
        const handler = () => {
            calls++;
        };
        o.addListener(handler, { limit: 3 });
        o.trigger();
        o.updateListenerOptions(handler, null, { limit: 0 });
        o.trigger();
        o.trigger();
        o.trigger();
        expect(calls).toBe(4);
    });

    it("updates tags in place", () => {
        const o = createEvent<() => void>();
        let calls = 0;
        const handler = () => {
            calls++;
        };
        o.addListener(handler, { tags: ["a"] });
        o.withTags(["a"], () => o.trigger());
        expect(calls).toBe(1);

        o.updateListenerOptions(handler, null, { tags: ["b"] });
        o.withTags(["a"], () => o.trigger());
        expect(calls).toBe(1);
        o.withTags(["b"], () => o.trigger());
        expect(calls).toBe(2);
    });

    it("re-sorts when alwaysFirst/alwaysLast change", () => {
        const o = createEvent<() => void>();
        const order: number[] = [];
        const h1 = () => order.push(1);
        const h2 = () => order.push(2);
        o.addListener(h1);
        o.addListener(h2);
        o.trigger();
        expect(order).toEqual([1, 2]);

        order.length = 0;
        o.updateListenerOptions(h1, null, { alwaysLast: true });
        o.trigger();
        expect(order).toEqual([2, 1]);
    });

    it("clearing alwaysLast restores insertion order (index preserved)", () => {
        const o = createEvent<() => void>();
        const order: number[] = [];
        const h1 = () => order.push(1);
        const h2 = () => order.push(2);
        const h3 = () => order.push(3);
        o.addListener(h1);
        o.addListener(h2, { alwaysLast: true });
        o.addListener(h3);
        o.trigger();
        expect(order).toEqual([ 1, 3, 2 ]);

        order.length = 0;
        o.updateListenerOptions(h2, null, {});
        o.trigger();
        expect(order).toEqual([ 1, 2, 3 ]);
    });

    it("normalizes async true to 1", () => {
        const o = createEvent<() => void>();
        const handler = () => {};
        o.addListener(handler);
        expect(o.updateListenerOptions(handler, null, { async: true })).toBe(
            true,
        );
    });

    it("matches listener by context", () => {
        const o = createEvent<() => void>();
        const ctxA = {};
        const ctxB = {};
        let calls = 0;
        const handler = function(this: any) {
            calls++;
        };
        o.addListener(handler, { context: ctxA, limit: 5 });
        o.addListener(handler, { context: ctxB, limit: 5 });

        // update only ctxA listener's limit down to 1; trigger once removes it
        o.updateListenerOptions(handler, ctxA, { limit: 1, context: ctxA });
        o.trigger();
        expect(calls).toBe(2);
        // ctxA removed, ctxB remains
        o.trigger();
        expect(calls).toBe(3);
    });
});
