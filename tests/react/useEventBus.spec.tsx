import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
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
});
