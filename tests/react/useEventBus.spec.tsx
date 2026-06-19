import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { createEventBus } from "../../src/eventBus";
import { useEventBus } from "../../src/react/useEventBus";
import { useListenToEventBus } from "../../src/react/useListenToEventBus";
import { eventBus as moduleEventBus } from "./eventBus";
import "./eventBusEvents";

describe("useListenToEventBus", () => {
    it("should listen to event", () => {
        let triggered = 0;
        function Component() {
            const eventBus = useEventBus<{ a: (a: number) => string; }>();

            const handler = useCallback(
                (_a: number) => {
                    triggered++;
                    return "test";
                },
                [],
            );

            useListenToEventBus(eventBus, "a", handler);
            useListenToEventBus(moduleEventBus, "a", handler);

            useEffect(
                () => {
                    eventBus.trigger("a", 1);
                    moduleEventBus.trigger("a", 1);
                },
                [],
            );

            return null;
        }

        function App() {
            return <Component />;
        }

        render(<App />);

        expect(triggered).toBe(2);
    });

    it("should listen to event from multiple hooks", () => {
        const eventBus = createEventBus<{ a: (a: number) => string; }>();
        let triggered = 0;

        const useCustomHook = () => {
            const handler = useCallback(
                (_a: number) => {
                    triggered++;
                    return "test";
                },
                [],
            );

            useListenToEventBus(eventBus, "a", handler);
        };

        function ComponentA() {
            useCustomHook();
            return null;
        }
        function ComponentB() {
            useCustomHook();
            return null;
        }

        function App() {
            useEffect(
                () => {
                    eventBus.trigger("a", 1);
                },
                [],
            );

            return (
                <>
                    <ComponentA />
                    <ComponentB />
                </>
            );
        }

        render(<App />);

        expect(triggered).toBe(2);
    });

    it("should remove context listener on unmount", () => {
        const eventBus = createEventBus<{ a: () => void; }>();
        const context = {};
        let triggered = 0;

        function Component() {
            useListenToEventBus(
                eventBus,
                "a",
                () => {
                    triggered++;
                },
                { context },
            );

            return null;
        }

        const { unmount } = render(<Component />);

        eventBus.trigger("a");
        expect(triggered).toBe(1);

        unmount();
        eventBus.trigger("a");

        expect(triggered).toBe(1);
    });
});

describe("useEventBus option reconciliation", () => {
    type Events = { a: (n: number) => void };

    function makeHarness() {
        const buses: ReturnType<typeof createEventBus<Events>>[] = [];
        function Comp(
            { options }: { options?: import("../../src/eventBus").EventBusOptions<Events> },
        ) {
            const bus = useEventBus<Events>(options);
            buses.push(bus);
            return null;
        }
        return { Comp, getBus: () => buses[buses.length - 1] };
    }

    it("inline semantically equal options do not throw or reset", () => {
        const h = makeHarness();
        const { rerender } = render(
            <h.Comp options={{ eventOptions: { a: { limit: 1 } } }} />,
        );
        const bus = h.getBus();
        let calls = 0;
        bus.addListener("a", () => {
            calls++;
        });
        bus.trigger("a", 1);
        bus.trigger("a", 1);
        expect(calls).toBe(1);

        rerender(<h.Comp options={{ eventOptions: { a: { limit: 1 } } }} />);
        bus.trigger("a", 1);
        expect(calls).toBe(1);
        // bus identity preserved
        expect(h.getBus()).toBe(bus);
    });

    it("changed event options affect an already-created event", () => {
        const h = makeHarness();
        const { rerender } = render(
            <h.Comp options={{ eventOptions: { a: { limit: 1 } } }} />,
        );
        const bus = h.getBus();
        let calls = 0;
        bus.addListener("a", () => {
            calls++;
        });
        bus.trigger("a", 1);
        bus.trigger("a", 1);
        expect(calls).toBe(1);

        rerender(<h.Comp options={{ eventOptions: { a: { limit: 2 } } }} />);
        bus.trigger("a", 1);
        expect(calls).toBe(2);
    });

    it("changed options affect an event created after rerender", () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp options={{}} />);
        const bus = h.getBus();
        rerender(<h.Comp options={{ eventOptions: { a: { limit: 1 } } }} />);

        let calls = 0;
        bus.addListener("a", () => {
            calls++;
        });
        bus.trigger("a", 1);
        bus.trigger("a", 1);
        expect(calls).toBe(1);
    });

    it("removed event-name options leave the existing event unchanged", () => {
        const h = makeHarness();
        const { rerender } = render(
            <h.Comp options={{ eventOptions: { a: { limit: 1 } } }} />,
        );
        const bus = h.getBus();
        let calls = 0;
        bus.addListener("a", () => {
            calls++;
        });
        rerender(<h.Comp options={{ eventOptions: {} as any }} />);
        bus.trigger("a", 1);
        bus.trigger("a", 1);
        expect(calls).toBe(1);
    });
});
