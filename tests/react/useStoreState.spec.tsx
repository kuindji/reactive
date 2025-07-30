import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useEffect, useRef } from "react";
import { useStore } from "../../src/react/useStore";
import { useStoreState } from "../../src/react/useStoreState";

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
});
