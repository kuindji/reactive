import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event basic", () => {
    it("triggers basic event", () => {
        const o = createEvent<(value: number) => void>();
        let arg: number = 0;

        o.addListener((value) => {
            arg = value;
        });

        o.trigger(1);

        expect(arg).toBe(1);
    });

    it("triggers listeners in right order", () => {
        const o = createEvent<() => void>();
        const triggered: number[] = [];

        o.addListener(() => {
            triggered.push(1);
        });

        o.addListener(() => {
            triggered.push(2);
        });

        o.addListener(() => {
            triggered.push(3);
        });

        o.trigger();

        expect(triggered).toEqual([ 1, 2, 3 ]);
    });

    it("should work when untyped", () => {
        const o = createEvent();
        let arg: unknown;

        o.addListener((value) => {
            arg = value;
        });

        o.trigger(1);
        expect(arg).toBe(1);
    });
});
