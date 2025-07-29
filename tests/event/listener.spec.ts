import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event listener", () => {
    it("should respect event's append and prepend arguments", () => {
        const options = {
            prependArgs: [ 1, 2 ] as const,
            appendArgs: [ 3, 4 ] as const,
        };
        const o = createEvent<(value: string) => void, typeof options>(
            options,
        );

        const triggered: any[] = [];

        o.addListener((...args) => {
            args.forEach((arg) => triggered.push(arg));
        });
        o.trigger("!");

        expect(triggered).toEqual([ 1, 2, "!", 3, 4 ]);
    });

    it("should respect listener's first option", () => {
        const o = createEvent<() => void>();
        const triggered: any[] = [];

        o.addListener(() => triggered.push(1));
        o.addListener(() => triggered.push(2), { first: true });
        o.trigger();

        expect(triggered).toEqual([ 2, 1 ]);
    });

    it("should respect listener's alwaysFirst option", () => {
        const o = createEvent<() => void>();
        const triggered: any[] = [];

        o.addListener(() => triggered.push(1));
        o.addListener(() => triggered.push(2), { alwaysFirst: true });
        o.addListener(() => triggered.push(3), { first: true });
        o.trigger();

        expect(triggered).toEqual([ 2, 3, 1 ]);
    });

    it("should respect listener's alwaysLast option", () => {
        const o = createEvent<() => void>();
        const triggered: any[] = [];

        o.addListener(() => triggered.push(1));
        o.addListener(() => triggered.push(2), { alwaysLast: true });
        o.addListener(() => triggered.push(3));
        o.trigger();

        expect(triggered).toEqual([ 1, 3, 2 ]);
    });

    it("should respect event's replaceArgs argument", () => {
        const options = {
            replaceArgs: [ 1, 2 ] as const,
        };
        const o = createEvent<(value: string) => void, typeof options>(
            options,
        );

        const triggered: any[] = [];

        o.addListener((...args) => {
            args.forEach((arg) => triggered.push(arg));
        });
        o.trigger("!");

        expect(triggered).toEqual([ 1, 2 ]);
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

        expect(triggered).toEqual([ 1, 1, 2, 2 ]);
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

        expect(triggered).toEqual([ 1, 1 ]);
    });

    it("should respect given context and control dupes", () => {
        const o = createEvent<() => void>();
        const triggered: any[] = [];
        const context = {
            a: 1,
            b: 2,
            l: function() {
                triggered.push(this.a);
            },
            d: function() {
                triggered.push(this.b);
            },
        };

        o.addListener(context.l, { context });
        o.addListener(context.l, { context });
        o.addListener(context.d, { context });

        o.trigger();

        expect(triggered).toEqual([ 1, 2 ]);
    });

    it("should run listeners asynchronously when asked", (done) => {
        let startTime = Date.now();
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

        expect(triggered).toEqual([ 1 ]);
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

        o.addListener(h1.handler, { context: h1 });
        o.addListener(h2.handler, { context: h2 });
        o.addListener(h3.handler, { context: h3 });

        o.trigger();
        o.removeListener(h3.handler, h3);
        o.trigger();

        expect(res).toEqual(5);
    });

    it("wait for first trigger", (done) => {
        const o = createEvent<(value: number) => void>();
        o.promise().then(([ payload ]) => {
            expect(payload).toEqual(1);
            done();
        });
        setTimeout(() => o.trigger(1), 50);
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
});
