import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { useAction } from "../../src/react/useAction";
import { useActionListen } from "../../src/react/useListenToAction";

describe("useActionListen", () => {
    it("should listen to event via useActionListen", () => {
        let triggered = false;
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

            useActionListen(action, handler);

            useEffect(
                () => {
                    action.invoke(1);
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
                    invoke(1);
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
                (a: number): string => {
                    throw new Error("test");
                },
                null,
                handler,
            );

            useEffect(
                () => {
                    action.invoke(1);
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
