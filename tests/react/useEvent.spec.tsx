import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { createEvent, type EventOptions } from "../../src/event";
import { useEvent } from "../../src/react/useEvent";
import { useListenToEvent } from "../../src/react/useListenToEvent";

describe("useListenToEvent", () => {
    it("should listen to event", () => {
        let triggered = false;
        function Component() {
            const event = useEvent<(a: number) => string>();

            const handler = useCallback(
                (_a: number) => {
                    triggered = true;
                    return "test";
                },
                [],
            );

            useListenToEvent(event, handler);

            useEffect(
                () => {
                    event.trigger(1);
                },
                [],
            );

            return null;
        }

        function App() {
            return <Component />;
        }

        render(<App />);

        expect(triggered).toBe(true);
    });

    it("should remove context listener on unmount", () => {
        const event = createEvent<() => void>();
        const context = {};
        let triggered = 0;

        function Component() {
            useListenToEvent(
                event,
                () => {
                    triggered++;
                },
                { context },
            );

            return null;
        }

        const { unmount } = render(<Component />);

        event.trigger();
        expect(triggered).toBe(1);

        unmount();
        event.trigger();

        expect(triggered).toBe(1);
    });

    it("should listen to event via useEvent", () => {
        let triggered = false;
        function Component() {
            const handler = useCallback(
                (_a: number) => {
                    triggered = true;
                    return "test";
                },
                [],
            );

            const event = useEvent<(a: number) => string>(
                {},
                handler,
            );

            useEffect(
                () => {
                    event.trigger(1);
                },
                [],
            );

            return null;
        }

        function App() {
            return <Component />;
        }

        render(<App />);

        expect(triggered).toBe(true);
    });

    it("should listen to event error via useEvent", () => {
        let triggered = false;
        function Component() {
            const handler = useCallback(
                (
                    { error, args }: {
                        error: Error;
                        args: any[];
                    },
                ) => {
                    expect(error).toBeDefined();
                    expect(args).toEqual([ 1 ]);
                    expect(error.message).toBe("test");
                    triggered = true;
                },
                [],
            );
            const event = useEvent(
                {},
                (_a: number): string => {
                    throw new Error("test");
                },
                handler,
            );

            useEffect(
                () => {
                    event.trigger(1);
                },
                [],
            );

            return null;
        }

        function App() {
            return <Component />;
        }

        render(<App />);

        expect(triggered).toBe(true);
    });
});

describe("useEvent option reconciliation", () => {
    function makeHarness() {
        const events: ReturnType<typeof createEvent<() => void>>[] = [];
        function Comp(
            { options }: { options?: EventOptions<() => void> },
        ) {
            const event = useEvent<() => void>(options);
            events.push(event);
            return null;
        }
        return { Comp, getEvent: () => events[events.length - 1] };
    }

    it("inline semantically equal options do not reset event state", () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp options={{ limit: 1 }} />);
        const event = h.getEvent();
        let calls = 0;
        event.addListener(() => {
            calls++;
        });
        event.trigger();
        expect(calls).toBe(1);
        event.trigger();
        expect(calls).toBe(1); // event limit reached

        rerender(<h.Comp options={{ limit: 1 }} />);
        event.trigger();
        expect(calls).toBe(1);
    });

    it("changed limit preserves triggered count", () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp options={{ limit: 1 }} />);
        const event = h.getEvent();
        let calls = 0;
        event.addListener(() => {
            calls++;
        });
        event.trigger();
        expect(calls).toBe(1);

        rerender(<h.Comp options={{ limit: 2 }} />);
        event.trigger(); // one more allowed
        expect(calls).toBe(2);
        event.trigger();
        expect(calls).toBe(2);
    });

    it("removed option fields reset to defaults", () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp options={{ limit: 1 }} />);
        const event = h.getEvent();
        let calls = 0;
        event.addListener(() => {
            calls++;
        });
        event.trigger();
        event.trigger();
        expect(calls).toBe(1); // limit 1

        // removing limit should restore unlimited triggering
        rerender(<h.Comp options={{}} />);
        event.trigger();
        event.trigger();
        expect(calls).toBe(3);
    });

    it("changed autoTrigger affects future listeners", () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp options={{}} />);
        const event = h.getEvent();
        rerender(<h.Comp options={{ autoTrigger: true }} />);
        event.trigger();
        let fired = false;
        event.addListener(() => {
            fired = true;
        });
        expect(fired).toBe(true);
    });

    it("changed filter / filterContext / maxListeners take effect", () => {
        const ctx = { allow: false };
        const filter = function(this: typeof ctx) {
            return this.allow;
        };
        const h = makeHarness();
        const { rerender } = render(<h.Comp options={{}} />);
        const event = h.getEvent();
        let calls = 0;
        event.addListener(() => {
            calls++;
        });

        rerender(
            <h.Comp options={{ filter, filterContext: ctx, maxListeners: 1 }} />,
        );
        event.trigger();
        expect(calls).toBe(0);
        ctx.allow = true;
        event.trigger();
        expect(calls).toBe(1);

        // maxListeners now 1, one listener already present
        expect(() => event.addListener(() => {})).toThrow();
    });
});
