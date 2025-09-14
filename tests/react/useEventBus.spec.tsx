import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { createEventBus } from "../../src/eventBus";
import { useEventBus } from "../../src/react/useEventBus";
import { useListenToEventBus } from "../../src/react/useListenToEventBus";

describe("useListenToEventBus", () => {
    it("should listen to event", () => {
        let triggered = false;
        function Component() {
            const eventBus = useEventBus<{ a: (a: number) => string; }>();

            const handler = useCallback(
                (a: number) => {
                    triggered = true;
                    return "test";
                },
                [],
            );

            useListenToEventBus(eventBus, "a", handler);

            useEffect(
                () => {
                    eventBus.trigger("a", 1);
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

    it("should listen to event from multiple hooks", () => {
        const eventBus = createEventBus<{ a: (a: number) => string; }>();
        let triggered = 0;

        const useCustomHook = () => {
            const handler = useCallback(
                (a: number) => {
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
});
