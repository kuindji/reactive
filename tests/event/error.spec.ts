import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event error handling", () => {
    it("adds and triggers error listeners", () => {
        const event = createEvent<() => void>();
        const errors: Error[] = [];

        event.addErrorListener(({ error }) => {
            errors.push(error);
        });

        event.addListener(() => {
            throw new Error("Test error");
        });

        event.trigger();

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe("Test error");
    });

    it("passes args to error listener", () => {
        const event = createEvent<(a: number, b: string) => void>();
        let receivedArgs: [number, string] = null!;

        event.addErrorListener(({ args }) => {
            receivedArgs = args as [number, string];
        });

        event.addListener((_a, _b) => {
            throw new Error("Args test");
        });

        event.trigger(42, "hello");

        expect(receivedArgs).toEqual([42, "hello"]);
    });

    it("removes error listeners", () => {
        const event = createEvent<() => void>();
        const errors: string[] = [];

        const errorListener = ({ error }: { error: Error }) => {
            errors.push(error.message);
        };

        event.addErrorListener(errorListener);
        event.addListener(() => {
            throw new Error("Error 1");
        });

        event.trigger();
        expect(errors).toEqual(["Error 1"]);

        event.removeErrorListener(errorListener);

        // Without error listener, error should be thrown
        expect(() => event.trigger()).toThrow("Error 1");
    });

    it("throws error when no error listener is registered", () => {
        const event = createEvent<() => void>();

        event.addListener(() => {
            throw new Error("Unhandled");
        });

        expect(() => event.trigger()).toThrow("Unhandled");
    });

    it("continues to other listeners when error is caught", () => {
        const event = createEvent<() => number>();
        const results: number[] = [];

        event.addErrorListener(() => {
            // Just catch the error
        });

        event.addListener(() => {
            throw new Error("First throws");
        });
        event.addListener(() => {
            results.push(2);
            return 2;
        });

        const all = event.all();
        expect(results).toEqual([2]);
        expect(all).toEqual([undefined, 2] as number[]);
    });

    it("includes type in error response", () => {
        const event = createEvent<() => void>();
        let receivedType: string | undefined;

        event.addErrorListener(({ type }) => {
            receivedType = type;
        });

        event.addListener(() => {
            throw new Error("Type test");
        });

        event.trigger();

        expect(receivedType).toBe("event");
    });

    it("converts non-Error throws to Error", () => {
        const event = createEvent<() => void>();
        let receivedError: Error | undefined;

        event.addErrorListener(({ error }) => {
            receivedError = error;
        });

        event.addListener(() => {
            throw new Error("String error");
        });

        event.trigger();

        expect(receivedError).toBeInstanceOf(Error);
        expect(receivedError?.message).toBe("String error");
    });

    it("supports multiple error listeners", () => {
        const event = createEvent<() => void>();
        const errors1: string[] = [];
        const errors2: string[] = [];

        event.addErrorListener(({ error }) => {
            errors1.push(error.message);
        });

        event.addErrorListener(({ error }) => {
            errors2.push(error.message);
        });

        event.addListener(() => {
            throw new Error("Multi error");
        });

        event.trigger();

        expect(errors1).toEqual(["Multi error"]);
        expect(errors2).toEqual(["Multi error"]);
    });
});

describe("event edge cases", () => {
    it("returns empty array for all() with no listeners", () => {
        const event = createEvent<() => number>();
        const result = event.all();
        expect(result).toEqual([]);
    });

    it("returns empty array for concat() with no listeners", () => {
        const event = createEvent<() => number[]>();
        const result = event.concat();
        expect(result).toEqual([]);
    });

    it("returns empty object for merge() with no listeners", () => {
        const event = createEvent<() => { a?: number }>();
        const result = event.merge();
        expect(result).toEqual({});
    });

    it("returns undefined for first() with no listeners", () => {
        const event = createEvent<() => number>();
        const result = event.first();
        expect(result).toBeUndefined();
    });

    it("returns undefined for last() with no listeners", () => {
        const event = createEvent<() => number>();
        const result = event.last();
        expect(result).toBeUndefined();
    });

    it("returns piped value for pipe() with no listeners", () => {
        const event = createEvent<(value: number) => number>();
        const result = event.pipe(42);
        expect(result).toBe(42);
    });

    it("ignores null handler in addListener", () => {
        const event = createEvent<() => void>();
        event.addListener(null as any);
        expect(event.hasListener()).toBe(false);
    });

    it("throws when maxListeners is exceeded", () => {
        const event = createEvent<() => void>({ maxListeners: 2 });

        event.addListener(() => { });
        event.addListener(() => { });

        expect(() => event.addListener(() => { })).toThrow(
            "Max listeners (2) reached",
        );
    });

    it("does not add duplicate listeners with same handler and context", () => {
        const event = createEvent<() => void>();
        let count = 0;
        const context = { id: 1 };

        const listener = function () {
            count++;
        };

        // Duplicate check requires same handler AND same context
        event.addListener(listener, { context });
        event.addListener(listener, { context });

        event.trigger();
        expect(count).toBe(1);
    });

    it("does not add duplicate listeners with same context", () => {
        const event = createEvent<() => void>();
        let count = 0;
        const context = { id: 1 };

        const listener = function (this: typeof context) {
            count++;
        };

        event.addListener(listener, { context });
        event.addListener(listener, { context });

        event.trigger();
        expect(count).toBe(1);
    });

    it("returns false when removing non-existent listener", () => {
        const event = createEvent<() => void>();
        const listener = () => { };

        const result = event.removeListener(listener);
        expect(result).toBe(false);
    });

    it("resets event state correctly", () => {
        const event = createEvent<() => void>();
        let count = 0;

        event.addListener(() => count++);
        event.suspend(true);
        event.trigger();
        event.trigger();

        event.reset();

        expect(event.hasListener()).toBe(false);
        expect(event.isSuspended()).toBe(false);
        expect(event.isQueued()).toBe(false);

        // Queue should be cleared
        event.resume();
        expect(count).toBe(0);
    });

    it("setOptions updates event configuration", () => {
        const event = createEvent<() => void>({ limit: 5 });
        let count = 0;

        event.addListener(() => count++);

        event.trigger();
        event.trigger();

        event.setOptions({ limit: 3 });

        event.trigger();
        event.trigger(); // This should not trigger

        expect(count).toBe(3);
    });

    it("handles async listeners with true value", (done) => {
        const event = createEvent<() => void>();

        event.addListener(() => { }, { async: true });
        event.trigger();

        // If async: true, it should use setTimeout with 1ms
        setTimeout(() => {
            done();
        }, 10);
    });
});

