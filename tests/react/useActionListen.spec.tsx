import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { useAction } from "../../src/react/useAction";
import { useActionListen } from "../../src/react/useActionListen";

describe("useActionListen", () => {
    it("should listen to event", () => {
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
});
