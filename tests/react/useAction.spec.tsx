import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { createAction } from "../../src/action";
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

    it("should move error and before listeners when action changes", async () => {
        const firstAction = createAction((value: number): string => {
            return `first:${value}`;
        });
        const secondAction = createAction((_value: number): string => {
            throw new Error("second");
        });
        const errors: string[] = [];
        const beforeArgs: number[] = [];

        const errorListener = ({ error }: { error: Error }) => {
            errors.push(error.message);
        };
        const beforeActionListener = (value: number) => {
            beforeArgs.push(value);
        };

        function Component(
            { action }: { action: typeof firstAction },
        ) {
            useListenToAction(
                action,
                null,
                errorListener,
                beforeActionListener,
            );

            return null;
        }

        const view = render(<Component action={firstAction} />);

        view.rerender(<Component action={secondAction} />);

        const secondResponse = await secondAction.invoke(2);
        const firstResponse = await firstAction.invoke(1);

        expect(secondResponse.error).toBe("second");
        expect(firstResponse.response).toBe("first:1");
        expect(errors).toEqual(["second"]);
        expect(beforeArgs).toEqual([2]);
    });
});

describe("useAction function reconciliation", () => {
    function makeHarness() {
        let action: ReturnType<typeof useAction<(n: number) => number, any, any, any>> | null = null;
        function Comp({ fn }: { fn: (n: number) => number }) {
            action = useAction(fn);
            return null;
        }
        return { Comp, getAction: () => action! };
    }

    it("same reference does not throw or change behavior", async () => {
        const fn = (n: number) => n + 1;
        const h = makeHarness();
        const { rerender } = render(<h.Comp fn={fn} />);
        rerender(<h.Comp fn={fn} />);
        const res = await h.getAction().invoke(1);
        expect(res.response).toBe(2);
    });

    it("changed function affects future invoke", async () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp fn={(n) => n + 1} />);
        rerender(<h.Comp fn={(n) => n * 10} />);
        const res = await h.getAction().invoke(2);
        expect(res.response).toBe(20);
    });

    it("listeners survive a function change", async () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp fn={(n) => n + 1} />);
        const action = h.getAction();
        const responses: number[] = [];
        action.addListener(({ response }) => {
            if (response !== null) {
                responses.push(response);
            }
        });

        await action.invoke(1);
        rerender(<h.Comp fn={(n) => n * 10} />);
        await h.getAction().invoke(2);
        expect(responses).toEqual([ 2, 20 ]);
        // action identity preserved
        expect(h.getAction()).toBe(action);
    });

    it("before-action cancellation still works after a function change", async () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp fn={(n) => n + 1} />);
        const action = h.getAction();
        action.addBeforeActionListener(() => false);
        rerender(<h.Comp fn={(n) => n * 10} />);
        const res = await h.getAction().invoke(5);
        expect(res.error).toBe("Action cancelled");
    });
});
