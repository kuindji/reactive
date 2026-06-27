import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useState } from "react";
import { createStore } from "../../src/store";
import { useStoreSelector } from "../../src/react/useStoreSelector";

type S = {
    first: string;
    last: string;
    other: number;
    a: boolean;
    b: boolean;
    c: boolean;
};

function shallowEqual(x: Record<string, unknown>, y: Record<string, unknown>) {
    const kx = Object.keys(x);
    const ky = Object.keys(y);
    if (kx.length !== ky.length) {
        return false;
    }
    return kx.every((k) => x[k] === y[k]);
}

describe("useStoreSelector", () => {
    it("selector form derives and updates on relevant change", () => {
        const store = createStore<S>({ first: "Jane", last: "Doe", other: 0 });

        function Component() {
            const label = useStoreSelector(
                store,
                (s) => `${s.first} ${s.last}`,
            );
            return <span data-testid="v">{label}</span>;
        }

        render(<Component />);
        expect(screen.getByTestId("v")).toHaveTextContent("Jane Doe");

        act(() => {
            store.set("first", "John");
        });
        expect(screen.getByTestId("v")).toHaveTextContent("John Doe");
    });

    it("does not re-render when the selected result is equal", () => {
        const store = createStore<S>({ first: "Jane", last: "Doe", other: 0 });
        let renders = 0;

        function Component() {
            renders++;
            const label = useStoreSelector(
                store,
                (s) => `${s.first} ${s.last}`,
            );
            return <span data-testid="v">{label}</span>;
        }

        render(<Component />);
        const initial = renders;

        // "other" is not part of the selected result -> same string -> no render
        act(() => {
            store.set("other", 5);
        });
        expect(renders).toBe(initial);
    });

    it("supports a custom shallow-equal fn for object results", () => {
        const store = createStore<S>({ first: "Jane", last: "Doe", other: 0 });
        let renders = 0;

        function Component() {
            renders++;
            const obj = useStoreSelector(
                store,
                (s) => ({ name: `${s.first} ${s.last}` }),
                shallowEqual,
            );
            return <span data-testid="v">{obj.name}</span>;
        }

        render(<Component />);
        const initial = renders;

        act(() => {
            store.set("other", 9);
        });
        // shallowEqual sees an equal object -> cached ref -> no re-render
        expect(renders).toBe(initial);
        expect(screen.getByTestId("v")).toHaveTextContent("Jane Doe");
    });

    it("deps-keyed form recomputes only when a listed key changes", () => {
        const store = createStore<S>({
            a: true,
            b: false,
            c: false,
            first: "x",
            last: "y",
            other: 0,
        });
        let computeCalls = 0;

        function Component() {
            const anyLoading = useStoreSelector(
                store,
                [ "a", "b", "c" ],
                (a, b, c) => {
                    computeCalls++;
                    return Boolean(a) || Boolean(b) || Boolean(c);
                },
            );
            return <span data-testid="v">{String(anyLoading)}</span>;
        }

        render(<Component />);
        expect(screen.getByTestId("v")).toHaveTextContent("true");
        const callsAfterMount = computeCalls;

        // Unrelated key: deps-keyed form should ignore the batch entirely
        act(() => {
            store.set("other", 1);
        });
        expect(computeCalls).toBe(callsAfterMount);

        // Relevant key flips the OR result false -> re-render
        act(() => {
            store.set("a", false);
        });
        expect(screen.getByTestId("v")).toHaveTextContent("false");
    });

    it("re-selects when the selector changes between renders without a store change", () => {
        const store = createStore<S>({ first: "Jane", last: "Doe", other: 0 });
        let setUpper: (v: boolean) => void = () => {};

        function Component() {
            const [ upper, setU ] = useState(false);
            setUpper = setU;
            const label = useStoreSelector(
                store,
                (s) => (upper ? s.first.toUpperCase() : s.first),
            );
            return <span data-testid="v">{label}</span>;
        }

        render(<Component />);
        expect(screen.getByTestId("v")).toHaveTextContent("Jane");

        // The selector closure changes (captures the new `upper`) with no store
        // change; the displayed selection must update from the latest selector.
        act(() => {
            setUpper(true);
        });
        expect(screen.getByTestId("v")).toHaveTextContent("JANE");
    });

    it("reads computed keys (composes with Feature 1)", () => {
        const s2 = createStore<{ first: string; last: string; full: string; }>({
            first: "Jane",
            last: "Doe",
        });
        s2.computed("full", [ "first", "last" ], (f, l) => `${f} ${l}`);

        function Component() {
            const full = useStoreSelector(s2, [ "full" ], (f) => f);
            return <span data-testid="v">{full}</span>;
        }

        render(<Component />);
        expect(screen.getByTestId("v")).toHaveTextContent("Jane Doe");

        act(() => {
            s2.set("first", "John");
        });
        expect(screen.getByTestId("v")).toHaveTextContent("John Doe");
    });
});
