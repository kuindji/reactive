import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { useEvent } from "../../src/react/useEvent";
import { useEventListen } from "../../src/react/useListenToEvent";

describe("useEventListen", () => {
    it("should listen to event", () => {
        let triggered = false;
        function Component() {
            const event = useEvent<(a: number) => string>();

            const handler = useCallback(
                (a: number) => {
                    triggered = true;
                    return "test";
                },
                [],
            );

            useEventListen(event, handler);

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
