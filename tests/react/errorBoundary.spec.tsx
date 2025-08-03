import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { ErrorBoundary } from "../../src/react/ErrorBoundary";
import { useAction } from "../../src/react/useAction";
import { useActionBus } from "../../src/react/useActionBus";
import { useActionMap } from "../../src/react/useActionMap";
import { useEvent } from "../../src/react/useEvent";
import { useEventBus } from "../../src/react/useEventBus";

describe("ErrorBoundary", () => {
    it("should listen to action errors", () => {
        let triggered = false;
        function Component() {
            const action = useAction((a: number): string => {
                throw new Error("test");
            });

            useEffect(
                () => {
                    action.invoke(1);
                },
                [],
            );

            return null;
        }

        function App() {
            const errorListener = useCallback(
                ({ error, args }: { error: Error; args: any[]; }) => {
                    expect(error).toBeDefined();
                    expect(args).toEqual([ 1 ]);
                    expect(error.message).toBe("test");
                    triggered = true;
                },
                [],
            );

            return (
                <ErrorBoundary listener={errorListener}>
                    <Component />
                </ErrorBoundary>
            );
        }

        render(<App />);

        expect(triggered).toBe(true);
    });

    it("should listen to event errors", () => {
        let triggered = false;
        function Component() {
            const event = useEvent({}, (a: string): string => {
                throw new Error("test");
            });

            useEffect(
                () => {
                    event.trigger("test");
                },
                [],
            );

            return null;
        }

        function App() {
            const errorListener = useCallback(
                ({ error, args }: { error: Error; args: any[]; }) => {
                    expect(error).toBeDefined();
                    expect(args).toEqual([ "test" ]);
                    expect(error.message).toBe("test");
                    triggered = true;
                },
                [],
            );

            return (
                <ErrorBoundary listener={errorListener}>
                    <Component />
                </ErrorBoundary>
            );
        }

        render(<App />);

        expect(triggered).toBe(true);
    });

    it("should listen to eventBus errors", () => {
        let triggered = false;
        function Component() {
            const eventBus = useEventBus<{ a: (a: string) => string; }>();

            useEffect(
                () => {
                    eventBus.addListener("a", (a: string) => {
                        throw new Error("test");
                    });
                    eventBus.trigger("a", "test");
                },
                [],
            );

            return null;
        }

        function App() {
            const errorListener = useCallback(
                (
                    { error, args, name }: {
                        name?: string;
                        error: Error;
                        args: any[];
                    },
                ) => {
                    expect(error).toBeDefined();
                    expect(args).toEqual([ "test" ]);
                    expect(error.message).toBe("test");
                    expect(name).toBe("a");
                    triggered = true;
                },
                [],
            );

            return (
                <ErrorBoundary listener={errorListener}>
                    <Component />
                </ErrorBoundary>
            );
        }

        render(<App />);

        expect(triggered).toBe(true);
    });

    it("should listen to actionMap errors", () => {
        let triggered = false;
        function Component() {
            const actionMap = useActionMap({
                a: (a: string) => {
                    throw new Error("test");
                },
            });

            useEffect(
                () => {
                    actionMap.a.invoke("test");
                },
                [],
            );

            return null;
        }

        function App() {
            const errorListener = useCallback(
                (
                    { error, args, name }: {
                        name?: string;
                        error: Error;
                        args: any[];
                    },
                ) => {
                    expect(error).toBeDefined();
                    expect(args).toEqual([ "test" ]);
                    expect(error.message).toBe("test");
                    expect(name).toBe("a");
                    triggered = true;
                },
                [],
            );

            return (
                <ErrorBoundary listener={errorListener}>
                    <Component />
                </ErrorBoundary>
            );
        }

        render(<App />);

        expect(triggered).toBe(true);
    });

    it("should listen to actionBus errors", () => {
        let triggered = false;
        function Component() {
            const actionBus = useActionBus<{ a: (a: string) => string; }>({
                a: (a: string) => {
                    throw new Error("test");
                },
            });

            useEffect(
                () => {
                    actionBus.invoke("a", "test");
                },
                [],
            );

            return null;
        }

        function App() {
            const errorListener = useCallback(
                (
                    { error, args, name }: {
                        name?: string;
                        error: Error;
                        args: any[];
                    },
                ) => {
                    expect(error).toBeDefined();
                    expect(args).toEqual([ "test" ]);
                    expect(error.message).toBe("test");
                    expect(name).toBe("a");
                    triggered = true;
                },
                [],
            );

            return (
                <ErrorBoundary listener={errorListener}>
                    <Component />
                </ErrorBoundary>
            );
        }

        render(<App />);

        expect(triggered).toBe(true);
    });

    it("should should pass to outer boundary", () => {
        let triggered = false;
        function Component() {
            const action = useAction((a: number): string => {
                throw new Error("test");
            });

            useEffect(
                () => {
                    action.invoke(1);
                },
                [],
            );

            return null;
        }

        function App() {
            const errorListener = useCallback(
                ({ error, args }: { error: Error; args: any[]; }) => {
                    expect(error).toBeDefined();
                    expect(args).toEqual([ 1 ]);
                    expect(error.message).toBe("test");
                    triggered = true;
                },
                [],
            );

            return (
                <ErrorBoundary listener={errorListener}>
                    <ErrorBoundary>
                        <Component />
                    </ErrorBoundary>
                </ErrorBoundary>
            );
        }

        render(<App />);

        expect(triggered).toBe(true);
    });
});
