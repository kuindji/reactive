import { describe, expect, it } from "bun:test";
import { EventEmitter } from "events";
import {
    createEventBus,
    EventSourceSubscriber,
    EventSourceUnsubscriber,
} from "../../src/eventBus";
import { ProxyType } from "../../src/lib/types";

describe("eventSource", () => {
    it("should subscribe using accepts", () => {
        const em = new EventEmitter();
        const o = createEventBus<{
            should: () => void;
            shouldnt: () => void;
        }>();
        o.addEventSource({
            name: "ev",
            accepts: (name) => name === "should",
            on: (name, fn) => em.on(name, fn),
            un: (name, fn) => em.off(name, fn),
        });

        let triggered = 0;
        const listener1 = () => triggered++;
        const listener2 = () => triggered++;
        o.on("should", listener1);
        o.on("shouldnt", listener2);
        em.emit("should");
        em.emit("shouldnt");
        o.un("should", listener1);
        o.un("shouldnt", listener2);
        em.emit("should");
        em.emit("shouldnt");

        expect(triggered).toBe(1);
    });

    it("destroy eventSource and unsubscribe", () => {
        const em = new EventEmitter();
        const o = createEventBus<{
            event: () => void;
        }>();
        o.addEventSource({
            name: "ev",
            accepts: () => true,
            on: (name, fn) => em.on(name, fn),
            un: (name, fn) => em.off(name, fn),
        });

        let triggered = 0;
        const listener = () => triggered++;
        o.on("event", listener);
        em.emit("event");
        o.removeEventSource("ev");
        em.emit("event");

        expect(triggered).toBe(1);
    });

    it("keeps event source subscription while local listeners remain", () => {
        const em = new EventEmitter();
        const o = createEventBus<{
            event: () => void;
        }>();
        o.addEventSource({
            name: "ev",
            accepts: true,
            on: (name, fn) => em.on(name, fn),
            un: (name, fn) => em.off(name, fn),
        });

        let triggered = 0;
        const listener1 = () => triggered++;
        const listener2 = () => triggered++;
        const listener3 = () => triggered++;

        o.on("event", listener1);
        o.on("event", listener2);
        expect(em.listenerCount("event")).toBe(1);

        o.un("event", listener1);
        expect(em.listenerCount("event")).toBe(1);

        o.on("event", listener3);
        expect(em.listenerCount("event")).toBe(1);

        em.emit("event");
        expect(triggered).toBe(2);

        o.un("event", listener2);
        expect(em.listenerCount("event")).toBe(1);

        o.un("event", listener3);
        expect(em.listenerCount("event")).toBe(0);
    });

    it("does not pass local listener options to the event source bridge", () => {
        const source = createEventBus<{
            event: () => void;
        }>();
        const o = createEventBus<{
            event: () => void;
        }>();
        const bridgeOptions: unknown[] = [];

        o.addEventSource({
            name: "ev",
            accepts: true,
            on: (name, fn, _eventSource, options) => {
                bridgeOptions.push(options);
                source.on(name, fn, options);
            },
            un: (name, fn) => source.un(name, fn),
        });

        const triggered: string[] = [];
        const listener1 = () => triggered.push("first");
        const listener2 = () => triggered.push("second");

        o.on("event", listener1, { limit: 1 });
        source.trigger("event");
        o.on("event", listener2);
        source.trigger("event");

        expect(bridgeOptions).toEqual([ undefined ]);
        expect(triggered).toEqual([ "first", "second" ]);
    });

    it("subscribes existing local listeners when adding event source", () => {
        const em = new EventEmitter();
        const o = createEventBus<{
            event: () => void;
        }>();

        let triggered = 0;
        o.on("event", () => triggered++);
        o.addEventSource({
            name: "ev",
            accepts: true,
            on: (name, fn) => em.on(name, fn),
            un: (name, fn) => em.off(name, fn),
        });

        expect(em.listenerCount("event")).toBe(1);

        em.emit("event");

        expect(triggered).toBe(1);
    });

    it("unsubscribes all event sources on reset", () => {
        const em1 = new EventEmitter();
        const em2 = new EventEmitter();
        const o = createEventBus<{
            event: () => void;
        }>();

        o.addEventSource({
            name: "ev1",
            accepts: true,
            on: (name, fn) => em1.on(name, fn),
            un: (name, fn) => em1.off(name, fn),
        });
        o.addEventSource({
            name: "ev2",
            accepts: true,
            on: (name, fn) => em2.on(name, fn),
            un: (name, fn) => em2.off(name, fn),
        });

        o.on("event", () => { });
        expect(em1.listenerCount("event")).toBe(1);
        expect(em2.listenerCount("event")).toBe(1);

        o.reset();

        expect(em1.listenerCount("event")).toBe(0);
        expect(em2.listenerCount("event")).toBe(0);
    });

    it("should return value based on proxyType", () => {
        const em = createEventBus<{
            event: () => number[];
        }>();
        const o = createEventBus<{
            event: () => number[];
        }>();
        o.addEventSource({
            name: "ev",
            proxyType: ProxyType.CONCAT,
            accepts: true,
            on: em.on as EventSourceSubscriber,
            un: em.un as EventSourceUnsubscriber,
        });

        const listener1 = () => [ 1, 2 ];
        const listener2 = () => [ 3, 4 ];
        o.on("event", listener1);
        o.on("event", listener2);

        const res = em.first("event");
        expect(res).toEqual([ 1, 2, 3, 4 ]);
    });
});
