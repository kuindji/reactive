import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../../src/react/useStore";
import { useStoreState } from "../../src/react/useStoreState";
import { createStore } from "../../src/store";

describe("useStoreState", () => {
    it("should work with store", (done) => {
        function Component() {
            const store = useStore<{ a: number; }>({
                a: 1,
            });
            const valueRef = useRef(0);

            const [ value, setValue ] = useStoreState(store, "a");
            valueRef.current = value;

            useEffect(
                () => {
                    setValue((previousValue) => {
                        return (previousValue || 0) + 1;
                    });
                },
                [],
            );

            setTimeout(() => {
                expect(valueRef.current).toBe(2);
                done();
            }, 100);
            return null;
        }

        function App() {
            return <Component />;
        }

        render(<App />);
    });

    it("renders the current key value immediately after key changes", () => {
        const store = createStore({
            a: 1,
            b: 2,
        });
        const renderLog: string[] = [];

        function Component({ stateKey }: { stateKey: "a" | "b"; }) {
            const [ value ] = useStoreState(store, stateKey);
            renderLog.push(`${stateKey}:${value}`);
            return <div data-testid="value">{value}</div>;
        }

        const { rerender } = render(<Component stateKey="a" />);

        expect(screen.getByTestId("value")).toHaveTextContent("1");

        rerender(<Component stateKey="b" />);

        expect(screen.getByTestId("value")).toHaveTextContent("2");
        expect(renderLog).not.toContain("b:1");
    });

    it("keeps rendering after the store is destroyed while mounted", () => {
        const store = createStore({ a: 1 });

        let rerender!: (n: number) => void;
        function Component() {
            const [ tick, setTick ] = useState(0);
            rerender = setTick;
            const [ value ] = useStoreState(store, "a");
            return <span data-testid="v">{value}-{tick}</span>;
        }

        render(<Component />);
        expect(screen.getByTestId("v")).toHaveTextContent("1-0");

        act(() => {
            store.destroy();
        });

        // A render after destroy (e.g. a parent re-render before unmount) must
        // not throw out of getSnapshot.
        expect(() =>
            act(() => {
                rerender(1);
            })).not.toThrow();
    });
});
