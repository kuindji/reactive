import { describe, expect, it } from "bun:test";
import { createEventBus } from "../../src/eventBus";

describe("eventBus", () => {
    it("triggers basic event", () => {
        const o = createEventBus<{ event: (value: number) => void; }>();
        let arg: number = 0;

        o.on("event", (value) => {
            arg = value;
        });

        o.trigger("event", 1);

        expect(arg).toBe(1);
    });

    it("triggers listeners in right order", () => {
        const o = createEventBus<{ event: () => void; }>();
        const triggered: number[] = [];

        o.on("event", () => {
            triggered.push(1);
        });

        o.on("event", () => {
            triggered.push(2);
        });

        o.on("event", () => {
            triggered.push(3);
        });

        o.trigger("event");

        expect(triggered).toEqual([ 1, 2, 3 ]);
    });

    it("triggers asterisk event", () => {
        const o = createEventBus();
        const triggered: any[] = [];

        o.on("*", (name, args, tags) => {
            triggered.push(name, args, tags);
        });

        o.trigger("event", 1);

        expect(triggered).toEqual([ "event", [ 1 ], null ]);
    });
});
