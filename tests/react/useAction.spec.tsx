import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { useAction } from "../../src/react/useAction";
import { useListenToAction } from "../../src/react/useListenToAction";

describe("useAction", () => {
    it("should listen to event via useListenToAction", () => {
        let triggered = false;
        let beforeTriggered = false;
        function Component() {
            const action = useAction((a: number): string => a.toString());

            const handler = useCallback(
                (
                    { response }: {
                        response: string | null;
                        args: [ number ];
                    },
                ) => {
                    expect(response).toBe("1");
                    triggered = true;
                },
                [],
            );

            const beforeHandler = useCallback(
                (a: number) => {
                    expect(a).toBe(1);
                    beforeTriggered = true;
                },
                [],
            );

            useListenToAction(action, handler, null, beforeHandler);

            useEffect(
                () => {
                    void action.invoke(1);
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
        expect(beforeTriggered).toBe(true);
    });

    it("should listen to event via useAction", () => {
        let triggered = false;
        function Component() {
            const handler = useCallback(
                (
                    { response }: {
                        response: string | null;
                        args: [ number ];
                    },
                ) => {
                    expect(response).toBe("1");
                    triggered = true;
                },
                [],
            );

            const { invoke } = useAction(
                (a: number): string => a.toString(),
                handler,
            );

            useEffect(
                () => {
                    void invoke(1);
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

    it("should listen to event error via useAction", () => {
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
            const action = useAction(
                (_a: number): string => {
                    throw new Error("test");
                },
                null,
                handler,
            );

            useEffect(
                () => {
                    void action.invoke(1);
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
