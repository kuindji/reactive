import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event listener", () => {
    it("should respect listener's first option", () => {
        const o = createEvent<() => void>();
        const triggered: any[] = [];

        o.addListener(() => triggered.push(1));
        o.addListener(() => triggered.push(2), { first: true });
        o.trigger();

        expect(triggered).toEqual([2, 1]);
    });

    it("should respect listener's alwaysFirst option", () => {
        const o = createEvent<() => void>();
        const triggered: any[] = [];

        o.addListener(() => triggered.push(1));
        o.addListener(() => triggered.push(2), { alwaysFirst: true });
        o.addListener(() => triggered.push(3), { first: true });
        o.trigger();

        expect(triggered).toEqual([2, 3, 1]);
    });

    it("should respect listener's alwaysLast option", () => {
        const o = createEvent<() => void>();
        const triggered: any[] = [];

        o.addListener(() => triggered.push(1));
        o.addListener(() => triggered.push(2), { alwaysLast: true });
        o.addListener(() => triggered.push(3));
        o.trigger();

        expect(triggered).toEqual([1, 3, 2]);
    });

    it("should respect start and limit options", () => {
        const o = createEvent<() => void>();
        const triggered: any[] = [];

        o.addListener(() => triggered.push(1), { limit: 2 });
        o.addListener(() => triggered.push(2), { start: 3 });

        o.trigger();
        o.trigger();
        o.trigger();
        o.trigger();

        expect(triggered).toEqual([1, 1, 2, 2]);
    });

    it("should respect event's limit option", () => {
        const options = {
            limit: 2,
        };
        const o = createEvent<() => void>(
            options,
        );
        const triggered: any[] = [];

        o.addListener(() => triggered.push(1));

        o.trigger();
        o.trigger();
        o.trigger();
        o.trigger();

        expect(triggered).toEqual([1, 1]);
    });

    it("should respect given context and control dupes", () => {
        const o = createEvent<() => void>();
        const triggered: number[] = [];
        const context = {
            a: 1,
            b: 2,
            l: function () {
                triggered.push(this.a);
            },
            d: function () {
                triggered.push(this.b);
            },
        };

        // eslint-disable-next-line @typescript-eslint/unbound-method
        o.addListener(context.l, { context });
        // eslint-disable-next-line @typescript-eslint/unbound-method
        o.addListener(context.l, { context });
        // eslint-disable-next-line @typescript-eslint/unbound-method
        o.addListener(context.d, { context });

        o.trigger();

        expect(triggered).toEqual([1, 2]);
    });

    it("should not add duplicate listeners without context", () => {
        const o = createEvent<() => void>();
        let triggered = 0;
        const listener = () => triggered++;

        o.addListener(listener);
        o.addListener(listener);
        o.trigger();

        expect(triggered).toBe(1);
    });

    it("should restore filter when auto-trigger listener throws", () => {
        const o = createEvent<() => void>({ autoTrigger: true });
        let triggered = 0;
        const stableListener = () => triggered++;

        o.addListener(stableListener);
        o.trigger();

        const throwingListener = () => {
            throw new Error("auto-trigger failed");
        };
        expect(() => {
            o.addListener(throwingListener);
        }).toThrow("auto-trigger failed");

        o.removeListener(throwingListener);
        o.trigger();

        expect(triggered).toBe(2);
    });

    it("should run listeners asynchronously when asked", (done) => {
        const startTime = Date.now();
        const options = {
            async: 100,
        };
        const o = createEvent<() => void>(options);
        o.addListener(() => {
            expect(Date.now() - startTime).toBeGreaterThan(50);
            done();
        });
        o.trigger();
    });

    it("should unsubscribe from event", () => {
        const o = createEvent<() => void>();
        const triggered: number[] = [];
        const l = () => triggered.push(1);
        o.addListener(l);
        o.trigger();
        o.removeListener(l);
        o.trigger();

        expect(triggered).toEqual([1]);
    });

    it("should unsubscribe dupes correctly", () => {
        let res = 0;
        const SomeClass = class {
            handler() {
                res++;
            }
        };

        const h1 = new SomeClass(),
            h2 = new SomeClass(),
            h3 = new SomeClass(),
            o = createEvent<() => void>();

        const h1Handler = h1.handler.bind(h1);
        const h2Handler = h2.handler.bind(h2);
        const h3Handler = h3.handler.bind(h3);

        o.addListener(h1Handler, { context: h1 });
        o.addListener(h2Handler, { context: h2 });
        o.addListener(h3Handler, { context: h3 });

        o.trigger();
        o.removeListener(h3Handler, h3);
        o.trigger();

        expect(res).toEqual(5);
    });

    it("wait for first trigger", (done) => {
        const o = createEvent<(value: number) => void>();
        void o.promise().then(([payload]) => {
            expect(payload).toEqual(1);
            done();
        });
        setTimeout(() => o.trigger(1), 50);
    });

    it("creates independent promises with their own listener options", async () => {
        const o = createEvent<(value: string) => void>();

        const aPromise = o.promise({ tags: [ "a" ] });
        const bPromise = o.promise({ tags: [ "b" ] });

        expect(aPromise).not.toBe(bPromise);

        o.withTags([ "b" ], () => o.trigger("b"));
        o.withTags([ "a" ], () => o.trigger("a"));

        const [ aResult, bResult ] = await Promise.all([ aPromise, bPromise ]);
        expect(aResult).toEqual([ "a" ]);
        expect(bResult).toEqual([ "b" ]);
    });

    it("should be triggered after subscription", () => {
        const o = createEvent<(value: number) => void>({ autoTrigger: true });
        let res: number = 0;
        o.trigger(1);
        o.addListener((value) => {
            res = value;
        });

        expect(res).toEqual(1);
    });

    it("autoTrigger replay targets only the newly added listener", () => {
        const o = createEvent<(value: number) => void>({ autoTrigger: true });
        o.trigger(1);

        // Same handler under two distinct contexts: each addListener should
        // replay only to the listener just added, never re-fire the earlier
        // same-handler listener registered under a different context.
        let calls = 0;
        const handler = () => {
            calls++;
        };
        o.addListener(handler, { context: {} });
        o.addListener(handler, { context: {} });

        expect(calls).toEqual(2);
    });

    it("a real trigger fired during autoTrigger replay is a full real trigger", () => {
        const o = createEvent<(value: number) => void>({ autoTrigger: true });
        o.trigger(1);

        const existing: number[] = [];
        o.addListener((v) => existing.push(v));

        // This listener, on its replayed invocation, fires a real trigger of the
        // same event. That nested trigger must behave as a normal real trigger:
        // increment triggeredCount, update lastTriggerArgs, and reach the
        // pre-existing listener — it must not inherit the replay's
        // bookkeeping-suppression or replay-only delivery filter.
        let replayed = false;
        o.addListener((v) => {
            if (!replayed && v === 1) {
                replayed = true;
                o.trigger(2);
            }
        });

        // Pre-existing listener saw: replay of 1, then the nested real trigger 2.
        expect(existing).toEqual([1, 2]);
        // Two real triggers total (the initial trigger(1) and the nested
        // trigger(2)); the replay of 1 is not a real trigger.
        expect(o.triggeredCount()).toEqual(2);
        expect(o.lastTriggerArgs()).toEqual([2]);
    });

    it("a real trigger during replay respects the trigger limit", () => {
        const o = createEvent<(value: number) => void>({
            autoTrigger: true,
            limit: 1,
        });
        o.trigger(1);

        const seen: number[] = [];
        o.addListener((v) => {
            seen.push(v);
            // Limit is already reached (1 real trigger). A real trigger fired
            // here must be dropped by the limit, not bypass it via replay state.
            if (v === 1) {
                o.trigger(99);
            }
        });

        expect(seen).toEqual([1]);
    });
});
