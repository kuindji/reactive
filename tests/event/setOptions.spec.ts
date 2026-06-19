import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event setOptions (expanded)", () => {
    it("changing limit does not reset triggered count", () => {
        const o = createEvent<() => void>({ limit: 1 });
        let calls = 0;
        o.addListener(() => {
            calls++;
        });
        o.trigger();
        expect(calls).toBe(1);
        o.trigger();
        expect(calls).toBe(1); // event limit reached

        o.setOptions({ limit: 2 });
        o.trigger(); // one more allowed, triggered was preserved
        expect(calls).toBe(2);
        o.trigger();
        expect(calls).toBe(2);
    });

    it("updates filter by reference", () => {
        const o = createEvent<(n: number) => void>();
        const seen: number[] = [];
        o.addListener((n) => {
            seen.push(n);
        });
        o.setOptions({ filter: (args) => args[0] > 0 });
        o.trigger(-1);
        o.trigger(5);
        expect(seen).toEqual([ 5 ]);
    });

    it("updates filterContext", () => {
        const o = createEvent<() => void>();
        const ctx = { allow: false };
        let calls = 0;
        o.addListener(() => {
            calls++;
        });
        o.setOptions({
            filter: function(this: typeof ctx) {
                return this.allow;
            },
            filterContext: ctx,
        });
        o.trigger();
        expect(calls).toBe(0);
        ctx.allow = true;
        o.trigger();
        expect(calls).toBe(1);
    });

    it("updates maxListeners for future addListener", () => {
        const o = createEvent<() => void>();
        o.setOptions({ maxListeners: 1 });
        o.addListener(() => {});
        expect(() => o.addListener(() => {})).toThrow();
    });

    it("updates autoTrigger so late listeners fire immediately", () => {
        const o = createEvent<(n: number) => void>();
        o.setOptions({ autoTrigger: true });
        o.trigger(7);
        const received: number[] = [];
        o.addListener((n) => {
            received.push(n);
        });
        expect(received).toEqual([ 7 ]);
    });
});
