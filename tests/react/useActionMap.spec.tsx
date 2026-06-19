import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { StrictMode, useCallback, useEffect } from "react";

import {
    type ActionResponse,
    type ErrorListenerSignature,
    type ErrorResponse,
    useActionMap,
} from "../../src/react/useActionMap";

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

describe("useEventListen", () => {
    it("does not throw on initial mount in StrictMode", () => {
        function Component() {
            useActionMap(actions);
            return null;
        }

        expect(() => {
            render(
                <StrictMode>
                    <Component />
                </StrictMode>,
            );
        }).not.toThrow();
    });

    it("should listen to event", (done) => {
        let squareTriggered = false;
        let lcTriggered = false;
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
            const onLcAction = useCallback(
                (_response: ActionResponse) => {
                    lcTriggered = true;
                },
                [],
            );

            const actionMap = useActionMap(actions, onAnyError);

            useEffect(
                () => {
                    actionMap.square.addListener(onSquareAction);
                    actionMap.lc.addListener(onLcAction);
                    void actionMap.square.invoke(1);
                    void actionMap.lc.invoke("test");
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
            expect(onAnyErrorTriggered).toBe(true);
            expect(anyErrorMessage).toBe("test");
            done();
        }, 100);
    });
});

describe("useActionMap reconciliation", () => {
    type Map = { a: (n: number) => number };
    function makeHarness() {
        let map: ReturnType<typeof useActionMap<Map>> | null = null;
        function Comp(
            { actions, onError }: {
                actions: Map;
                onError?: ErrorListenerSignature<any[]>;
            },
        ) {
            map = useActionMap(actions, onError);
            return null;
        }
        return { Comp, getMap: () => map! };
    }

    it("inline equal action map does not throw or reset", async () => {
        const a = (n: number) => n + 1;
        const h = makeHarness();
        const { rerender } = render(<h.Comp actions={{ a }} />);
        const map = h.getMap();
        const responses: number[] = [];
        map.a.addListener(({ response }) => {
            if (response !== null) {
                responses.push(response);
            }
        });
        expect(() => rerender(<h.Comp actions={{ a }} />)).not.toThrow();
        await map.a.invoke(1);
        expect(responses).toEqual([ 2 ]);
        expect(h.getMap()).toBe(map);
    });

    it("replaced action uses new impl and keeps listeners", async () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp actions={{ a: (n) => n + 1 }} />);
        const map = h.getMap();
        const responses: number[] = [];
        map.a.addListener(({ response }) => {
            if (response !== null) {
                responses.push(response);
            }
        });
        await map.a.invoke(1);
        rerender(<h.Comp actions={{ a: (n) => n * 10 }} />);
        await map.a.invoke(2);
        expect(responses).toEqual([ 2, 20 ]);
    });

    it("changed error listener forwards without duplicates", async () => {
        const first: string[] = [];
        const second: string[] = [];
        const fail = (_n: number): number => {
            throw new Error("x");
        };
        const h = makeHarness();
        const { rerender } = render(
            <h.Comp
                actions={{ a: fail }}
                onError={({ error }) => first.push(error.message)}
            />,
        );
        await h.getMap().a.invoke(1);
        rerender(
            <h.Comp
                actions={{ a: fail }}
                onError={({ error }) => second.push(error.message)}
            />,
        );
        await h.getMap().a.invoke(2);
        expect(first).toEqual([ "x" ]);
        expect(second).toEqual([ "x" ]);
    });

    it("changing the key set throws", () => {
        const h = makeHarness();
        const { rerender } = render(<h.Comp actions={{ a: (n) => n + 1 }} />);
        expect(() =>
            rerender(
                <h.Comp
                    actions={{
                        a: (n: number) => n + 1,
                        b: (n: number) => n,
                    } as any}
                />,
            )
        ).toThrow();
    });
});
