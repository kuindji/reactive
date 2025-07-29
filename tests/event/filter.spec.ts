import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event filter", () => {
    it("should be filtered with events's filter option", () => {
        const o = createEvent<(value: number) => void>({
            filter: (params: any[]) => {
                return params[0] === 2;
            },
        });
        const l1res: any[] = [];

        o.addListener((value) => l1res.push(value));
        o.trigger(1);
        o.trigger(2);

        expect(l1res).toEqual([ 2 ]);
    });

    it("should pass listener to event's filter", () => {
        const o = createEvent<() => void>({
            filter: (_params: any[], listener) => {
                return !!listener && listener.extraData === 1;
            },
        });
        const lres: any[] = [];

        o.addListener(() => lres.push(1), { extraData: 1 });
        o.addListener(() => lres.push(2), { extraData: 2 });
        o.trigger();

        expect(lres).toEqual([ 1 ]);
    });
});
