import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { createActionBus } from "../../src/actionBus";
import {
    type ActionResponse,
    type ErrorListenerSignature,
    type ErrorResponse,
    useActionBus,
} from "../../src/react/useActionBus";
import { useListenToActionBus } from "../../src/react/useListenToActionBus";

function square(a: number) {
    return a * a;
}
function lc(s: string) {
    if (s === "test") {
        throw new Error("test");
    }
    return s.toLowerCase();
}

const actions = {
    square,
    lc,
};

describe("useListenToActionBus", () => {
    it("should listen to action bus", (done) => {
        let squareTriggered = false;
        let lcTriggered = false;
        let beforeLcTriggered = false;
        let onAnyErrorTriggered = false;
        let anyErrorMessage = "";
        function Component() {
            const onAnyError = useCallback<ErrorListenerSignature<any[]>>(
                (response: ErrorResponse) => {
                    onAnyErrorTriggered = true;
                    anyErrorMessage = response.error.message;
                },
                [],
            );

            const onSquareAction = useCallback(
                (_response: ActionResponse) => {
                    squareTriggered = true;
                },
                [],
            );
            const onBeforeLcAction = useCallback(
                (_s: string) => {
                    beforeLcTriggered = true;
                },
                [],
            );
            const onLcAction = useCallback(
                (_response: ActionResponse) => {
                    lcTriggered = true;
                },
                [],
            );

            const actionBus = useActionBus(actions, onAnyError);

            useListenToActionBus(actionBus, "square", onSquareAction);
            useListenToActionBus(actionBus, "lc", {
                listener: onLcAction,
                beforeActionListener: onBeforeLcAction,
            });

            useEffect(
                () => {
                    void actionBus.invoke("square", 1);
                    void actionBus.invoke("lc", "test");
                },
                [],
            );

            return null;
        }

        function App() {
            return <Component />;
        }

        render(<App />);

        setTimeout(() => {
            expect(squareTriggered).toBe(true);
            expect(lcTriggered).toBe(true);
            expect(beforeLcTriggered).toBe(true);
            expect(onAnyErrorTriggered).toBe(true);
            expect(anyErrorMessage).toBe("test");
            done();
        }, 100);
    });

    it("should remove context listener on unmount", async () => {
        const actionBus = createActionBus({
            action: () => 1,
        });
        const context = {};
        let triggered = 0;

        function Component() {
            useListenToActionBus(actionBus, "action", {
                listener: () => {
                    triggered++;
                },
                options: { context },
            });

            return null;
        }

        const { unmount } = render(<Component />);

        await actionBus.invoke("action");
        expect(triggered).toBe(1);

        unmount();
        await actionBus.invoke("action");

        expect(triggered).toBe(1);
    });

    it("should allow before action listener to cancel action", async () => {
        let actionRan = false;
        const receivedErrors: Array<string | null> = [];
        const actionBus = createActionBus({
            action: () => {
                actionRan = true;
                return 1;
            },
        });

        function Component() {
            useListenToActionBus(actionBus, "action", {
                listener: ({ error }) => {
                    receivedErrors.push(error);
                },
                beforeActionListener: () => false,
            });

            return null;
        }

        render(<Component />);

        const result = await actionBus.invoke("action");

        expect(actionRan).toBe(false);
        expect(result.response).toBe(null);
        expect(result.error).toBe("Action cancelled");
        expect(receivedErrors).toEqual(["Action cancelled"]);
    });
});

describe("useActionBus action reconciliation", () => {
    type Map = { a: (n: number) => number; b?: (n: number) => number };
    function makeHarness() {
        let bus: ReturnType<typeof useActionBus<any>> | null = null;
        function Comp({ actions }: { actions: Partial<Map> }) {
            bus = useActionBus(actions as any);
            return null;
        }
        return { Comp, getBus: () => bus! };
    }

    it("inline equal actions map does not recreate the bus", async () => {
        const a = (n: number) => n + 1;
        const h = makeHarness();
        const { rerender } = render(<h.Comp actions={{ a }} />);
        const bus = h.getBus();
        rerender(<h.Comp actions={{ a }} />);
        expect(h.getBus()).toBe(bus);
        const res = await bus.invoke("a", 1);
        expect(res.response).toBe(2);
    });

    it("child can subscribe to an action added in the same rerender", () => {
        // Child passive effects run before parent passive effects, so a newly
        // added action must exist before the child subscribes to it.
        function Child({ bus }: { bus: any }) {
            useListenToActionBus(bus, "b", () => {});
            return null;
        }
        function Parent(
            { actions, showChild }: { actions: any; showChild: boolean },
        ) {
            const bus = useActionBus(actions);
            return showChild ? <Child bus={bus} /> : null;
        }
        const a = (n: number) => n + 1;
        const b = (n: number) => n * 3;
        const { rerender } = render(
            <Parent actions={{ a }} showChild={false} />,
        );
        expect(() =>
            rerender(<Parent actions={{ a, b }} showChild={true} />)
        ).not.toThrow();
    });

    it("added action becomes available after rerender", async () => {
        const a = (n: number) => n + 1;
        const b = (n: number) => n * 3;
        const h = makeHarness();
        const { rerender } = render(<h.Comp actions={{ a }} />);
        rerender(<h.Comp actions={{ a, b }} />);
        const res = await h.getBus().invoke("b", 2);
        expect(res.response).toBe(6);
    });

    it("replaced action uses new impl and keeps listeners", async () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp actions={{ a: (n) => n + 1 }} />);
        const bus = h.getBus();
        const responses: number[] = [];
        bus.on("a", ({ response }) => {
            if (response !== null) {
                responses.push(response);
            }
        });
        await bus.invoke("a", 1);
        rerender(<h.Comp actions={{ a: (n) => n * 10 }} />);
        await h.getBus().invoke("a", 2);
        expect(responses).toEqual([ 2, 20 ]);
    });

    it("removed action throws on invoke/on/un", () => {
        const a = (n: number) => n + 1;
        const b = (n: number) => n * 3;
        const h = makeHarness();
        const { rerender } = render(<h.Comp actions={{ a, b }} />);
        rerender(<h.Comp actions={{ a }} />);
        const bus = h.getBus();
        expect(() => bus.invoke("b", 1)).toThrow("Action b not found");
        expect(() => bus.on("b", () => {})).toThrow("Action b not found");
    });
});
