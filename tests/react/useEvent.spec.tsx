import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { useEvent } from "../../src/react/useEvent";
import { useListenToEvent } from "../../src/react/useListenToEvent";

describe("useListenToEvent", () => {
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

    it("should listen to event via useEvent", () => {
        let triggered = false;
        function Component() {
            const handler = useCallback(
                (a: number) => {
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
                (a: number): string => {
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
