import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { useStore } from "../../src/react/useStore";
import { useStoreState } from "../../src/react/useStoreState";

describe("useStoreState", () => {
    it("should work with store", () => {
        let triggered = false;
        function Component() {
            const store = useStore<{ a: number; }>({
                a: 1,
            });

            const [ value, setValue ] = useStoreState(store, "a");

            useEffect(
                () => {
                    setValue((value) => value + 1);
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
