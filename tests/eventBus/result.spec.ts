import { describe, expect, it } from "bun:test";
import { createEventBus } from "../../src/eventBus";

describe("eventBus", function() {
    describe("returnResult", function() {
        it("all", function() {
            const o = createEventBus<{
                a: () => number;
            }>();
            o.on("a", () => 1);
            o.on("a", () => 2);
            const res = o.all("a");
            expect(res).toEqual([ 1, 2 ]);
        });

        it("resolveAll", function() {
            const o = createEventBus<{
                a: () => Promise<number>;
            }>();
            o.on("a", () => Promise.resolve(1));
            o.on("a", () => Promise.resolve(2));
            const res = o.resolveAll("a");
            expect(res).resolves.toEqual([ 1, 2 ]);

            const o1 = createEventBus<{
                a: () => number;
            }>();
            o1.on("a", () => 1);
            o1.on("a", () => 2);
            const res1 = o1.resolveAll("a");
            expect(res1).resolves.toEqual([ 1, 2 ]);
        });

        it("first", function() {
            const o = createEventBus<{
                a: () => number;
            }>();
            let triggered = false;
            o.on("a", () => 1);
            o.on("a", () => {
                triggered = true;
                return 2;
            });
            const res = o.first("a");
            expect(res).toEqual(1);
            expect(triggered).toBe(false);
        });

        it("resolveFirst", function() {
            const o = createEventBus<{
                a: () => Promise<number>;
            }>();
            let triggered = false;
            o.on("a", () => Promise.resolve(1));
            o.on("a", () => {
                triggered = true;
                return Promise.resolve(2);
            });
            const res = o.resolveFirst("a");
            expect(res).resolves.toEqual(1);
            expect(triggered).toBe(false);

            const o1 = createEventBus<{
                a: () => number;
            }>();
            o1.on("a", () => 1);
            const res1 = o1.resolveFirst("a");
            expect(res1).resolves.toEqual(1);
        });

        it("false", function() {
            const o = createEventBus<{
                a: () => number | false;
            }>();
            let firstTriggered = false;
            let secondTriggered = false;
            o.on("a", () => {
                firstTriggered = true;
                return false;
            });
            o.on("a", () => {
                secondTriggered = true;
                return 2;
            });
            o.untilFalse("a");
            expect(firstTriggered).toBe(true);
            expect(secondTriggered).toBe(false);
        });

        it("true", function() {
            const o = createEventBus<{
                a: () => number | true;
            }>();
            let firstTriggered = false;
            let secondTriggered = false;
            o.on("a", () => {
                firstTriggered = true;
                return true;
            });
            o.on("a", () => {
                secondTriggered = true;
                return 2;
            });
            o.untilTrue("a");
            expect(firstTriggered).toBe(true);
            expect(secondTriggered).toBe(false);
        });

        it("concat", function() {
            const o = createEventBus<{
                a: () => number[];
            }>();
            o.on("a", () => [ 1 ]);
            o.on("a", () => [ 2 ]);
            const res = o.concat("a");
            expect(res).toEqual([ 1, 2 ]);
        });
        it("resolveConcat", function() {
            const o = createEventBus<{
                a: () => Promise<number[]>;
            }>();
            o.on("a", () => Promise.resolve([ 1 ]));
            o.on("a", () => Promise.resolve([ 2 ]));
            const res = o.resolveConcat("a");
            expect(res).resolves.toEqual([ 1, 2 ]);

            const o1 = createEventBus<{
                a: () => number[];
            }>();
            o1.on("a", () => [ 1 ]);
            o1.on("a", () => [ 2 ]);
            const res1 = o1.resolveConcat("a");
            expect(res1).resolves.toEqual([ 1, 2 ]);
        });

        it("merge", function() {
            const o = createEventBus<{
                a: () => { a?: number; b?: number; };
            }>();
            o.on("a", () => ({ a: 1 }));
            o.on("a", () => ({ b: 2 }));
            const res = o.merge("a");
            expect(res).toEqual({ a: 1, b: 2 });
        });

        it("resolveMerge", function() {
            const o = createEventBus<{
                a: () => Promise<{ a?: number; b?: number; }>;
            }>();
            o.on("a", () => Promise.resolve({ a: 1 }));
            o.on("a", () => Promise.resolve({ b: 2 }));
            const res = o.resolveMerge("a");
            expect(res).resolves.toEqual({ a: 1, b: 2 });

            const o1 = createEventBus<{
                a: () => { a?: number; b?: number; };
            }>();
            o1.on("a", () => ({ a: 1 }));
            o1.on("a", () => ({ b: 2 }));
            const res1 = o1.resolveMerge("a");
            expect(res1).resolves.toEqual({ a: 1, b: 2 });
        });

        it("nonempty", function() {
            const o = createEventBus<{
                a: () => any;
            }>();
            let triggered = false;
            o.on("a", () => {});
            o.on("a", () => 1);
            o.on("a", () => {
                triggered = true;
            });
            const res = o.firstNonEmpty("a");
            expect(res).toEqual(1);
            expect(triggered).toBe(false);
        });

        it("resolveNonempty", function() {
            const o = createEventBus<{
                a: () => Promise<any>;
            }>();
            o.on("a", () => Promise.resolve());
            o.on("a", () => Promise.resolve(1));
            o.on("a", () => Promise.resolve({}));
            const res = o.resolveFirstNonEmpty("a");
            expect(res).resolves.toEqual(1);

            const o1 = createEventBus<{
                a: () => any;
            }>();
            o1.on("a", () => {});
            o1.on("a", () => 1);
            o1.on("a", () => {});
            const res1 = o1.resolveFirstNonEmpty("a");
            expect(res1).resolves.toEqual(1);
        });

        it("last", function() {
            const o = createEventBus<{
                a: () => number;
            }>();
            o.on("a", () => 3);
            o.on("a", () => 2);
            o.on("a", () => 1);
            const res = o.last("a");
            expect(res).toEqual(1);
        });

        it("resolveLast", function() {
            const o = createEventBus<{
                a: () => Promise<number>;
            }>();
            o.on("a", () => Promise.resolve(3));
            o.on("a", () => Promise.resolve(2));
            o.on("a", () => Promise.resolve(1));
            const res = o.resolveLast("a");
            expect(res).resolves.toEqual(1);

            const o1 = createEventBus<{
                a: () => number | Promise<number>;
            }>();
            o1.on("a", () => 3);
            o1.on("a", () => 2);
            o1.on("a", () => Promise.resolve(1));
            const res1 = o1.resolveLast("a");
            expect(res1).resolves.toEqual(1);
        });

        it("pipe", function() {
            const o = createEventBus<{
                a: (value: number) => number;
            }>();
            o.on("a", (value) => value + value);
            o.on("a", (value) => value * value);
            const res = o.pipe("a", 1);
            expect(res).toEqual(4);
        });

        it("resolvePipe", function() {
            const o = createEventBus<{
                a: (value: number) => Promise<number>;
            }>();
            o.on("a", (value) => Promise.resolve(value + value));
            o.on("a", (value) => Promise.resolve(value * value));
            const res = o.resolvePipe("a", 1);
            expect(res).resolves.toEqual(4);

            const o1 = createEventBus<{
                a: (value: number) => number;
            }>();
            o1.on("a", (value) => value + value);
            o1.on("a", (value) => value * value);
            const res1 = o1.resolvePipe("a", 1);
            expect(res1).resolves.toEqual(4);
        });

        it("raw", function() {
            const o = createEventBus<{
                a: () => number | Promise<number>;
            }>();
            o.on("a", () => new Promise((resolve) => resolve(1)));
            o.on("a", () => 2);
            const res = o.raw("a");
            expect(res[0] instanceof Promise).toBe(true);
            expect(res[1]).toEqual(2);
        });
    });
});
