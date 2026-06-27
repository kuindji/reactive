import { describe, expect, it } from "bun:test";
import { EventEmitter } from "events";
import { createEventBus } from "../../src/eventBus";

describe("eventBus destroy()", () => {
    it("reports destroyed state via isDestroyed", () => {
        const o = createEventBus<{ event: () => void; }>();
        expect(o.isDestroyed()).toBe(false);
        o.destroy();
        expect(o.isDestroyed()).toBe(true);
    });

    it("throws when triggering a destroyed bus", () => {
        const o = createEventBus<{ event: () => void; }>();
        o.destroy();
        expect(() => o.trigger("event")).toThrow("destroyed");
    });

    it("throws when adding a listener to a destroyed bus", () => {
        const o = createEventBus<{ event: () => void; }>();
        o.destroy();
        expect(() => o.on("event", () => {})).toThrow("destroyed");
    });

    it("removes all local listeners on destroy", () => {
        const o = createEventBus<{ event: () => void; }>();
        let called = 0;
        o.on("event", () => called++);
        o.destroy();
        // The underlying event is gone; nothing references the listener.
        expect(called).toBe(0);
    });

    it("unrelays tracked relays so external sources no longer feed it", () => {
        const o1 = createEventBus<{ event: (a: number) => void; }>();
        const o2 = createEventBus<{ event: (a: number) => void; }>();
        const triggered: number[] = [];

        o1.relay({ eventSource: o2, remoteEventName: "event" });
        o1.on("event", (a) => triggered.push(a));
        o2.trigger("event", 1);

        o1.destroy();
        o2.trigger("event", 2);

        expect(triggered).toEqual([ 1 ]);
    });

    it("removes event sources so external emitters detach on destroy", () => {
        const em = new EventEmitter();
        const o = createEventBus<{ event: () => void; }>();
        o.addEventSource({
            name: "ev",
            accepts: () => true,
            on: (name, fn) => em.on(name, fn),
            un: (name, fn) => em.off(name, fn),
        });
        o.on("event", () => {});
        expect(em.listenerCount("event")).toBe(1);

        o.destroy();
        expect(em.listenerCount("event")).toBe(0);
    });
});
