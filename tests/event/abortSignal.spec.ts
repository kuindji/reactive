import { describe, expect, it } from "bun:test";
import { createEvent } from "../../src/event";

describe("event addListener AbortSignal", () => {
    it("removes the listener when the signal aborts", () => {
        const o = createEvent<(value: number) => void>();
        const controller = new AbortController();
        const triggered: number[] = [];
        o.addListener((value) => triggered.push(value), {
            signal: controller.signal,
        });

        o.trigger(1);
        controller.abort();
        o.trigger(2);

        expect(triggered).toEqual([ 1 ]);
        expect(o.hasListener()).toBe(false);
    });

    it("does not add the listener if the signal is already aborted", () => {
        const o = createEvent<() => void>();
        const controller = new AbortController();
        controller.abort();

        let called = 0;
        o.addListener(() => called++, { signal: controller.signal });
        o.trigger();

        expect(called).toBe(0);
        expect(o.hasListener()).toBe(false);
    });

    it("detaches the abort handler when the listener is removed manually", () => {
        const o = createEvent<() => void>();
        const controller = new AbortController();
        const handler = () => {};
        o.addListener(handler, { signal: controller.signal });

        expect(o.removeListener(handler)).toBe(true);
        // Aborting after manual removal must be a harmless no-op (the abort
        // handler should have been detached, so no dangling reference fires).
        expect(() => controller.abort()).not.toThrow();
        expect(o.hasListener()).toBe(false);
    });

    it("auto-removes via signal even after the listener already fired", () => {
        const o = createEvent<() => void>();
        const controller = new AbortController();
        let called = 0;
        o.addListener(() => called++, { signal: controller.signal });

        o.trigger();
        expect(called).toBe(1);
        controller.abort();
        o.trigger();
        expect(called).toBe(1);
    });
});

describe("event updateListenerOptions AbortSignal", () => {
    it("binds to the new signal so aborting it removes the listener", () => {
        const o = createEvent<() => void>();
        const oldController = new AbortController();
        const newController = new AbortController();
        const handler = () => {};
        o.addListener(handler, { signal: oldController.signal });

        o.updateListenerOptions(handler, null, { signal: newController.signal });

        newController.abort();
        expect(o.hasListener()).toBe(false);
    });

    it("detaches the old signal so aborting it no longer removes the listener", () => {
        const o = createEvent<() => void>();
        const oldController = new AbortController();
        const newController = new AbortController();
        const handler = () => {};
        o.addListener(handler, { signal: oldController.signal });

        o.updateListenerOptions(handler, null, { signal: newController.signal });

        oldController.abort();
        expect(o.hasListener()).toBe(true);
    });

    it("preserves the signal binding when the option is omitted", () => {
        const o = createEvent<() => void>();
        const controller = new AbortController();
        const handler = () => {};
        o.addListener(handler, { signal: controller.signal });

        // Changing an unrelated option must not drop the abort wiring
        // (partial-update convention).
        o.updateListenerOptions(handler, null, { limit: 5 });

        controller.abort();
        expect(o.hasListener()).toBe(false);
    });

    it("clears the signal binding when signal is explicitly null", () => {
        const o = createEvent<() => void>();
        const controller = new AbortController();
        const handler = () => {};
        o.addListener(handler, { signal: controller.signal });

        o.updateListenerOptions(handler, null, { signal: null });

        controller.abort();
        expect(o.hasListener()).toBe(true);
    });

    it("removes the listener immediately when updated to an already-aborted signal", () => {
        const o = createEvent<() => void>();
        const handler = () => {};
        o.addListener(handler);
        const controller = new AbortController();
        controller.abort();

        o.updateListenerOptions(handler, null, { signal: controller.signal });

        expect(o.hasListener()).toBe(false);
    });
});
