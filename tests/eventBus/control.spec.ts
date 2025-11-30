import { describe, expect, it } from "bun:test";
import { EventEmitter } from "events";
import { createEventBus } from "../../src/eventBus";
import { MapKey, ProxyType } from "../../src/lib/types";

describe("eventBus", () => {
    it("should work with tags", () => {
        const o = createEventBus<{
            a: () => void;
        }>();
        const triggered: number[] = [];
        const a = () => triggered.push(1);
        const b = () => triggered.push(2);
        const c = () => triggered.push(3);

        o.on("a", a, { tags: [ "a" ] });
        o.on("a", b, { tags: [ "b" ] });
        o.on("a", c, { tags: [ "a", "b" ] });

        o.withTags([ "a" ], () => o.trigger("a"));
        expect(triggered).toEqual([ 1, 3 ]);
        o.trigger("a");
        expect(triggered).toEqual([ 1, 3, 1, 2, 3 ]);

        expect(o.get("a")?.hasListener(null, null, "a")).toBe(true);
        expect(o.get("a")?.hasListener(null, null, "c")).toBe(false);
        expect(o.get("a")?.hasListener(a, null, "a")).toBe(true);
        expect(o.get("a")?.hasListener(b, null, "a")).toBe(false);

        o.un("a", a, null, "a");
        o.un("a", b, null, "a");

        expect(o.get("a")?.hasListener(a, null, "a")).toBe(false);
        expect(o.get("a")?.hasListener(b)).toBe(true);
        expect(o.get("a")?.hasListener(null, null, "a")).toBe(true);

        o.get("a")?.removeAllListeners();
        expect(o.get("a")?.hasListener(c)).toBe(false);
    });

    it("intercept events", () => {
        const o = createEventBus<{ event: (value: number) => void; }>();
        const triggered: number[] = [];
        const events: MapKey[] = [];
        const args: number[] = [];
        const l = function(arg: number) {
            triggered.push(arg);
        };
        const interceptor = function(event: MapKey, a: number[]) {
            events.push(event);
            args.push(a[0]);
            return false;
        };

        o.on("event", l);
        o.trigger("event", 1);
        o.intercept(interceptor);
        o.trigger("event", 2);
        o.stopIntercepting();
        o.trigger("event", 3);

        expect(triggered).toEqual([ 1, 3 ]);
        expect(args).toEqual([ 2 ]);
        expect(events).toEqual([ "event" ]);
    });

    it("should relay from external event buses", () => {
        const o = createEventBus<{ event: (a: number, b: number) => void; }>();
        const ee = new EventEmitter();
        let triggered = true;
        const params: number[] = [];

        ee.on("event-source", (...args: unknown[]) =>
            o.get("event").trigger(args[0] as number, args[1] as number)
        );
        o.on("event", (a: number, b: number) => {
            params.push(a);
            params.push(b);
            triggered = true;
        });

        ee.emit("event-source", 1, 2);

        expect(params).toEqual([ 1, 2 ]);
        expect(triggered).toBe(true);
    });

    it("should relay other events", () => {
        const o1 = createEventBus<{ event: (a: number) => void; }>();
        const o2 = createEventBus<{ event: (a: number) => void; }>();
        const args: number[] = [];
        const triggered: boolean[] = [];

        o1.relay({ eventSource: o2, remoteEventName: "event" });
        o1.on("event", (a: number) => {
            args.push(a);
            triggered.push(true);
        });
        o2.on("event", (a: number) => {
            args.push(a);
        });
        o2.trigger("event", 1);

        o1.unrelay({ eventSource: o2, remoteEventName: "event" });
        o2.trigger("event", 2);

        expect(args).toEqual([ 1, 1, 2 ]);
        expect(triggered).toEqual([ true ]);
    });

    it("should relay * events", () => {
        const o1 = createEventBus<{
            event1: (a: number) => void;
            event2: (a: number) => void;
        }>();
        const o2 = createEventBus<{
            event1: (a: number) => void;
            event2: (a: number) => void;
        }>();
        const triggered: number[] = [];

        o1.relay({ eventSource: o2, remoteEventName: "*" });
        o1.on("event1", (a: number) => {
            triggered.push(a);
        });
        o1.on("event2", (a: number) => {
            triggered.push(a);
        });
        o2.trigger("event1", 1);
        o2.trigger("event2", 2);

        expect(triggered).toEqual([ 1, 2 ]);
    });

    it("should relay * events with prefix", () => {
        const o1 = createEventBus<{
            "pfx-event1": (a: number) => void;
            "pfx-event2": (a: number) => void;
        }>();
        const o2 = createEventBus<{
            "event1": (a: number) => void;
            "event2": (a: number) => void;
        }>();
        const triggered: number[] = [];

        o1.relay({
            eventSource: o2,
            remoteEventName: "*",
            localEventNamePrefix: "pfx-",
        });
        o1.on("pfx-event1", (a: number) => {
            triggered.push(a);
        });
        o1.on("pfx-event2", (a: number) => {
            triggered.push(a);
        });
        o2.trigger("event1", 1);
        o2.trigger("event2", 2);

        expect(triggered).toEqual([ 1, 2 ]);
    });

    it("should pass results back to relay", () => {
        const o1 = createEventBus<{ event: () => number; }>();
        const o2 = createEventBus<{ event: () => number; }>();

        o1.relay({
            eventSource: o2,
            remoteEventName: "event",
            proxyType: ProxyType.ALL,
        });
        o1.on("event", () => 1);
        o1.on("event", () => 2);
        const res = o2.first("event");

        expect(res).toEqual([ 1, 2 ]);
    });
});
