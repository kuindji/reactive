import { describe, expect, it } from "bun:test";
import { createEventBus } from "../../src/eventBus";

describe("eventBus once", () => {
    it("triggers listener only once with once()", () => {
        const bus = createEventBus<{ event: (value: number) => void }>();
        const values: number[] = [];

        bus.once("event", (value) => {
            values.push(value);
        });

        bus.trigger("event", 1);
        bus.trigger("event", 2);
        bus.trigger("event", 3);

        expect(values).toEqual([1]);
    });

    it("allows multiple once listeners", () => {
        const bus = createEventBus<{ event: () => void }>();
        const triggered: number[] = [];

        bus.once("event", () => triggered.push(1));
        bus.once("event", () => triggered.push(2));

        bus.trigger("event");
        bus.trigger("event");

        expect(triggered).toEqual([1, 2]);
    });
});

describe("eventBus promise", () => {
    it("resolves promise on trigger", async () => {
        const bus = createEventBus<{ event: (value: number) => void }>();

        const promiseResult = bus.promise("event");
        setTimeout(() => bus.trigger("event", 42), 10);

        const result = await promiseResult;
        expect(result).toEqual([42]);
    });

    it("resolves promise only once", async () => {
        const bus = createEventBus<{
            event: (a: number, b: string) => void;
        }>();

        const promiseResult = bus.promise("event");

        bus.trigger("event", 1, "first");
        bus.trigger("event", 2, "second");

        const result = await promiseResult;
        expect(result).toEqual([1, "first"]);
    });
});

describe("eventBus reset", () => {
    it("clears all events and listeners", () => {
        const bus = createEventBus<{
            event1: () => void;
            event2: () => void;
        }>();
        let count = 0;

        bus.on("event1", () => count++);
        bus.on("event2", () => count++);

        bus.trigger("event1");
        bus.trigger("event2");
        expect(count).toBe(2);

        bus.reset();

        bus.trigger("event1");
        bus.trigger("event2");
        expect(count).toBe(2); // Should not increase
    });

    it("clears interceptor on reset", () => {
        const bus = createEventBus<{ event: (value: number) => void }>();
        let intercepted = false;

        bus.intercept(() => {
            intercepted = true;
            return false;
        });

        bus.reset();

        bus.on("event", () => {});
        bus.trigger("event", 1);

        expect(intercepted).toBe(false);
    });
});

describe("eventBus suspendAll/resumeAll", () => {
    it("suspends all events", () => {
        const bus = createEventBus<{
            event1: () => void;
            event2: () => void;
        }>();
        const triggered: string[] = [];

        bus.on("event1", () => triggered.push("event1"));
        bus.on("event2", () => triggered.push("event2"));

        // Pre-create events by triggering them first
        bus.trigger("event1");
        bus.trigger("event2");
        expect(triggered).toEqual(["event1", "event2"]);

        bus.suspendAll();

        bus.trigger("event1");
        bus.trigger("event2");

        expect(triggered).toEqual(["event1", "event2"]);
    });

    it("suspends all events with queue", () => {
        const bus = createEventBus<{
            event1: () => void;
            event2: () => void;
        }>();
        const triggered: string[] = [];

        bus.on("event1", () => triggered.push("event1"));
        bus.on("event2", () => triggered.push("event2"));

        // Pre-create events
        bus.trigger("event1");
        expect(triggered).toEqual(["event1"]);

        bus.suspendAll(true);

        bus.trigger("event1");
        bus.trigger("event2");

        expect(triggered).toEqual(["event1"]);

        bus.resumeAll();

        expect(triggered).toEqual(["event1", "event1", "event2"]);
    });
});

describe("eventBus error handling", () => {
    it("catches errors with error listener", () => {
        const bus = createEventBus<{ event: () => void }>();
        const errors: string[] = [];

        bus.addErrorListener(({ error }) => {
            errors.push(error.message);
        });

        bus.on("event", () => {
            throw new Error("Test error");
        });

        bus.trigger("event");

        expect(errors).toEqual(["Test error"]);
    });

    it("includes event name in error response", () => {
        const bus = createEventBus<{ namedEvent: () => void }>();
        let receivedName: string | undefined;

        bus.addErrorListener(({ name }) => {
            receivedName = name;
        });

        bus.on("namedEvent", () => {
            throw new Error("Named error");
        });

        bus.trigger("namedEvent");

        expect(receivedName).toBe("namedEvent");
    });

    it("throws error when no error listener is registered", () => {
        const bus = createEventBus<{ event: () => void }>();

        bus.on("event", () => {
            throw new Error("Unhandled");
        });

        expect(() => bus.trigger("event")).toThrow("Unhandled");
    });

    it("removes error listener", () => {
        const bus = createEventBus<{ event: () => void }>();
        const errors: string[] = [];

        const errorListener = ({ error }: { error: Error }) => {
            errors.push(error.message);
        };

        bus.addErrorListener(errorListener);
        bus.on("event", () => {
            throw new Error("Error");
        });

        bus.trigger("event");
        expect(errors).toEqual(["Error"]);

        bus.removeErrorListener(errorListener);

        expect(() => bus.trigger("event")).toThrow("Error");
    });
});

describe("eventBus add", () => {
    it("adds event with custom options", () => {
        const bus = createEventBus<{ event: () => void }>();
        let count = 0;

        bus.add("event", { limit: 2 });
        bus.on("event", () => count++);

        bus.trigger("event");
        bus.trigger("event");
        bus.trigger("event");

        expect(count).toBe(2);
    });

    it("does not override existing event", () => {
        const bus = createEventBus<{ event: () => void }>();
        let count = 0;

        bus.add("event", { limit: 2 });
        bus.on("event", () => count++);

        // Try to add again with different options
        bus.add("event", { limit: 5 });

        bus.trigger("event");
        bus.trigger("event");
        bus.trigger("event");

        // Original limit of 2 should still apply
        expect(count).toBe(2);
    });
});

describe("eventBus get", () => {
    it("returns event object", () => {
        const bus = createEventBus<{ event: (value: number) => void }>();

        const event = bus.get("event");
        expect(event).toBeDefined();
        expect(typeof event.trigger).toBe("function");
        expect(typeof event.addListener).toBe("function");
    });

    it("creates event if not exists", () => {
        const bus = createEventBus<{ newEvent: () => void }>();

        const event = bus.get("newEvent");
        expect(event).toBeDefined();
        expect(event.hasListener()).toBe(false);
    });
});

describe("eventBus isIntercepting", () => {
    it("returns true when intercepting", () => {
        const bus = createEventBus<{ event: () => void }>();

        expect(bus.isIntercepting()).toBe(false);

        bus.intercept(() => true);
        expect(bus.isIntercepting()).toBe(true);

        bus.stopIntercepting();
        expect(bus.isIntercepting()).toBe(false);
    });
});

describe("eventBus result methods", () => {
    it("firstNonEmpty returns first non-null/undefined result", () => {
        const bus = createEventBus<{ event: () => number | null }>();

        bus.on("event", () => null);
        bus.on("event", () => 42);
        bus.on("event", () => 100);

        const result = bus.firstNonEmpty("event");
        expect(result).toBe(42);
    });

    it("resolveFirstNonEmpty handles async", async () => {
        const bus = createEventBus<{
            event: () => Promise<number | null>;
        }>();

        bus.on("event", () => Promise.resolve(null));
        bus.on("event", () => Promise.resolve(42));

        const result = await bus.resolveFirstNonEmpty("event");
        expect(result).toBe(42);
    });

    it("untilTrue stops at first true", () => {
        const bus = createEventBus<{ event: () => boolean }>();
        const called: number[] = [];

        bus.on("event", () => {
            called.push(1);
            return false;
        });
        bus.on("event", () => {
            called.push(2);
            return true;
        });
        bus.on("event", () => {
            called.push(3);
            return false;
        });

        bus.untilTrue("event");
        expect(called).toEqual([1, 2]);
    });

    it("untilFalse stops at first false", () => {
        const bus = createEventBus<{ event: () => boolean }>();
        const called: number[] = [];

        bus.on("event", () => {
            called.push(1);
            return true;
        });
        bus.on("event", () => {
            called.push(2);
            return false;
        });
        bus.on("event", () => {
            called.push(3);
            return true;
        });

        bus.untilFalse("event");
        expect(called).toEqual([1, 2]);
    });
});

describe("eventBus ignores asterisk trigger", () => {
    it("does not trigger when name is asterisk", () => {
        const bus = createEventBus();
        let triggered = false;

        bus.on("*" as any, () => {
            triggered = true;
        });

        bus.trigger("*" as any);
        expect(triggered).toBe(false);
    });
});

