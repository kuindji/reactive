import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event result", function() {
    describe("returnResult", function() {
        it("all", function() {
            const o = createEvent<() => number>();
            o.addListener(() => 1);
            o.addListener(() => 2);
            const res = o.all();
            expect(res).toEqual([ 1, 2 ]);
        });

        it("resolveAll", function() {
            const o = createEvent<() => Promise<number>>();
            o.addListener(() => Promise.resolve(1));
            o.addListener(() => Promise.resolve(2));
            const res = o.resolveAll();
            expect(res).resolves.toEqual([ 1, 2 ]);

            const o1 = createEvent<() => number>();
            o1.addListener(() => 1);
            o1.addListener(() => 2);
            const res1 = o1.resolveAll();
            expect(res1).resolves.toEqual([ 1, 2 ]);
        });

        it("first", function() {
            const o = createEvent<() => number>();
            let triggered = false;
            o.addListener(() => 1);
            o.addListener(() => {
                triggered = true;
                return 2;
            });
            const res = o.first();
            expect(res).toEqual(1);
            expect(triggered).toBe(false);
        });

        it("resolveFirst", function() {
            const o = createEvent<() => Promise<number>>();
            let triggered = false;
            o.addListener(() => Promise.resolve(1));
            o.addListener(() => {
                triggered = true;
                return Promise.resolve(2);
            });
            const res = o.resolveFirst();
            expect(res).resolves.toEqual(1);
            expect(triggered).toBe(false);

            const o1 = createEvent<() => number>();
            o1.addListener(() => 1);
            const res1 = o1.resolveFirst();
            expect(res1).resolves.toEqual(1);
        });

        it("false", function() {
            const o = createEvent<() => number | false>();
            let firstTriggered = false;
            let secondTriggered = false;
            o.addListener(() => {
                firstTriggered = true;
                return false;
            });
            o.addListener(() => {
                secondTriggered = true;
                return 2;
            });
            o.untilFalse();
            expect(firstTriggered).toBe(true);
            expect(secondTriggered).toBe(false);
        });

        it("true", function() {
            const o = createEvent<() => number | true>();
            let firstTriggered = false;
            let secondTriggered = false;
            o.addListener(() => {
                firstTriggered = true;
                return true;
            });
            o.addListener(() => {
                secondTriggered = true;
                return 2;
            });
            o.untilTrue();
            expect(firstTriggered).toBe(true);
            expect(secondTriggered).toBe(false);
        });

        it("concat", function() {
            const o = createEvent<() => number[]>();
            o.addListener(() => [ 1 ]);
            o.addListener(() => [ 2 ]);
            const res = o.concat();
            expect(res).toEqual([ 1, 2 ]);
        });
        it("resolveConcat", function() {
            const o = createEvent<() => Promise<number[]>>();
            o.addListener(() => Promise.resolve([ 1 ]));
            o.addListener(() => Promise.resolve([ 2 ]));
            const res = o.resolveConcat();
            expect(res).resolves.toEqual([ 1, 2 ]);

            const o1 = createEvent<() => number[]>();
            o1.addListener(() => [ 1 ]);
            o1.addListener(() => [ 2 ]);
            const res1 = o1.resolveConcat();
            expect(res1).resolves.toEqual([ 1, 2 ]);
        });

        it("merge", function() {
            const o = createEvent<() => { a?: number; b?: number; }>();
            o.addListener(() => ({ a: 1 }));
            o.addListener(() => ({ b: 2 }));
            const res = o.merge();
            expect(res).toEqual({ a: 1, b: 2 });
        });

        it("resolveMerge", function() {
            const o = createEvent<() => Promise<{ a?: number; b?: number; }>>();
            o.addListener(() => Promise.resolve({ a: 1 }));
            o.addListener(() => Promise.resolve({ b: 2 }));
            const res = o.resolveMerge();
            expect(res).resolves.toEqual({ a: 1, b: 2 });

            const o1 = createEvent<() => { a?: number; b?: number; }>();
            o1.addListener(() => ({ a: 1 }));
            o1.addListener(() => ({ b: 2 }));
            const res1 = o1.resolveMerge();
            expect(res1).resolves.toEqual({ a: 1, b: 2 });
        });

        it("nonempty", function() {
            const o = createEvent<() => any>();
            let triggered = false;
            o.addListener(() => {});
            o.addListener(() => 1);
            o.addListener(() => {
                triggered = true;
            });
            const res = o.firstNonEmpty();
            expect(res).toEqual(1);
            expect(triggered).toBe(false);
        });

        it("resolveNonempty", function() {
            const o = createEvent<() => Promise<any>>();
            o.addListener(() => Promise.resolve());
            o.addListener(() => Promise.resolve(1));
            o.addListener(() => Promise.resolve({}));
            const res = o.resolveFirstNonEmpty();
            expect(res).resolves.toEqual(1);

            const o1 = createEvent<() => any>();
            o1.addListener(() => {});
            o1.addListener(() => 1);
            o1.addListener(() => {});
            const res1 = o1.resolveFirstNonEmpty();
            expect(res1).resolves.toEqual(1);
        });

        it("last", function() {
            const o = createEvent<() => number>();
            o.addListener(() => 3);
            o.addListener(() => 2);
            o.addListener(() => 1);
            const res = o.last();
            expect(res).toEqual(1);
        });

        it("resolveLast", function() {
            const o = createEvent<() => Promise<number>>();
            o.addListener(() => Promise.resolve(3));
            o.addListener(() => Promise.resolve(2));
            o.addListener(() => Promise.resolve(1));
            const res = o.resolveLast();
            expect(res).resolves.toEqual(1);

            const o1 = createEvent<() => number | Promise<number>>();
            o1.addListener(() => 3);
            o1.addListener(() => 2);
            o1.addListener(() => Promise.resolve(1));
            const res1 = o1.resolveLast();
            expect(res1).resolves.toEqual(1);
        });

        it("pipe", function() {
            const o = createEvent<(value: number) => number>();
            o.addListener((value) => value + value);
            o.addListener((value) => value * value);
            const res = o.pipe(1);
            expect(res).toEqual(4);
        });

        it("resolvePipe", function() {
            const o = createEvent<(value: number) => Promise<number>>();
            o.addListener((value) => Promise.resolve(value + value));
            o.addListener((value) => Promise.resolve(value * value));
            const res = o.resolvePipe(1);
            expect(res).resolves.toEqual(4);

            const o1 = createEvent<(value: number) => number>();
            o1.addListener((value) => value + value);
            o1.addListener((value) => value * value);
            const res1 = o1.resolvePipe(1);
            expect(res1).resolves.toEqual(4);
        });

        it("raw", function() {
            const o = createEvent<() => number | Promise<number>>();
            o.addListener(() => new Promise((resolve) => resolve(1)));
            o.addListener(() => 2);
            const res = o.raw();
            expect(res[0] instanceof Promise).toBe(true);
            expect(res[1]).toEqual(2);
        });
    });
});
