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
