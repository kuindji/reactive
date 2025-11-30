import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
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
});
