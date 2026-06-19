import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useCallback, useEffect } from "react";
import { useListenToStoreChanges } from "../../src/react/useListenToStoreChanges";
import { useStore } from "../../src/react/useStore";
import { ChangeEventName, createStore } from "../../src/store";

const initialData = {
    a: 1,
};

describe("useStore", () => {
    it("should listen to all events", () => {
        let onChangeTriggered = false;
        let pipeTriggered = false;
        let controlTriggered = false;
        function Component() {
            const store = useStore(
                initialData,
                {
                    onChange: {
                        a: (a) => {
                            expect(a).toBe(4);
                            onChangeTriggered = true;
                        },
                    },
                    pipes: {
                        a: (a) => {
                            pipeTriggered = true;
                            return a! * a!;
                        },
                    },
                    control: {
                        [ChangeEventName]: (names) => {
                            expect(names).toEqual([ "a" ]);
                            controlTriggered = true;
                        },
                    },
                },
            );

            useEffect(
                () => {
                    store.set("a", 2);
                },
                [],
            );

            return null;
        }

        function App() {
            return <Component />;
        }

        render(<App />);

        expect(onChangeTriggered).toBe(true);
        expect(pipeTriggered).toBe(true);
        expect(controlTriggered).toBe(true);
    });

    it("should listen to a single event", () => {
        let onChangeTriggered = false;
        function Component() {
            const store = useStore(initialData);
            const listener = useCallback(
                (_a: number | undefined) => {
                    onChangeTriggered = true;
                },
                [],
            );
            useListenToStoreChanges(store, "a", listener);

            useEffect(
                () => {
                    store.set("a", 2);
                },
                [],
            );

            return null;
        }

        function App() {
            return <Component />;
        }

        render(<App />);

        expect(onChangeTriggered).toBe(true);
    });

    it("should remove context listener on unmount", () => {
        const store = createStore<{ a: number; }>({ a: 1 });
        const context = {};
        let triggered = 0;

        function Component() {
            useListenToStoreChanges(
                store,
                "a",
                () => {
                    triggered++;
                },
                { context },
            );

            return null;
        }

        const { unmount } = render(<Component />);

        store.set("a", 2);
        expect(triggered).toBe(1);

        unmount();
        store.set("a", 3);

        expect(triggered).toBe(1);
    });
});

describe("useStore config reconciliation", () => {
    type Props = {
        config?: Parameters<typeof useStore<{ a: number }>>[1];
    };
    function makeHarness() {
        let store: ReturnType<typeof useStore<{ a: number }>> | null = null;
        function Comp({ config }: Props) {
            store = useStore<{ a: number }>({ a: 0 }, config);
            return null;
        }
        return { Comp, getStore: () => store! };
    }

    it("inline semantically equal config does not duplicate listeners", () => {
        let calls = 0;
        const a = () => {
            calls++;
        };
        const h = makeHarness();
        const { rerender } = render(<h.Comp config={{ onChange: { a } }} />);
        // fresh config object, same handler reference
        rerender(<h.Comp config={{ onChange: { a } }} />);
        h.getStore().set("a", 1);
        expect(calls).toBe(1);
    });

    it("changed onChange handler replaces previous", () => {
        let aCalls = 0;
        let bCalls = 0;
        const a = () => {
            aCalls++;
        };
        const b = () => {
            bCalls++;
        };
        const h = makeHarness();
        const { rerender } = render(<h.Comp config={{ onChange: { a } }} />);
        rerender(<h.Comp config={{ onChange: { a: b } }} />);
        h.getStore().set("a", 1);
        expect(aCalls).toBe(0);
        expect(bCalls).toBe(1);
    });

    it("removed onChange handler unsubscribes", () => {
        let calls = 0;
        const a = () => {
            calls++;
        };
        const h = makeHarness();
        const { rerender } = render(<h.Comp config={{ onChange: { a } }} />);
        rerender(<h.Comp config={{}} />);
        h.getStore().set("a", 1);
        expect(calls).toBe(0);
    });

    it("changed pipe handler replaces previous", () => {
        const double = (v?: number) => (v ?? 0) * 2;
        const triple = (v?: number) => (v ?? 0) * 3;
        const h = makeHarness();
        const { rerender } = render(
            <h.Comp config={{ pipes: { a: double } }} />,
        );
        rerender(<h.Comp config={{ pipes: { a: triple } }} />);
        h.getStore().set("a", 5);
        expect(h.getStore().get("a")).toBe(15);
    });

    it("removed pipe handler unsubscribes", () => {
        const double = (v?: number) => (v ?? 0) * 2;
        const h = makeHarness();
        const { rerender } = render(
            <h.Comp config={{ pipes: { a: double } }} />,
        );
        rerender(<h.Comp config={{}} />);
        h.getStore().set("a", 5);
        expect(h.getStore().get("a")).toBe(5);
    });

    it("changed control handler replaces previous", () => {
        let aCalls = 0;
        let bCalls = 0;
        const a = () => {
            aCalls++;
        };
        const b = () => {
            bCalls++;
        };
        const h = makeHarness();
        const { rerender } = render(
            <h.Comp config={{ control: { [ChangeEventName]: a } }} />,
        );
        rerender(<h.Comp config={{ control: { [ChangeEventName]: b } }} />);
        h.getStore().set("a", 1);
        expect(aCalls).toBe(0);
        expect(bCalls).toBe(1);
    });

    it("removed control handler unsubscribes", () => {
        let calls = 0;
        const a = () => {
            calls++;
        };
        const h = makeHarness();
        const { rerender } = render(
            <h.Comp config={{ control: { [ChangeEventName]: a } }} />,
        );
        rerender(<h.Comp config={{}} />);
        h.getStore().set("a", 1);
        expect(calls).toBe(0);
    });
});

describe("useStore initialData (seed-only)", () => {
    it("ignores initialData changes and preserves local edits", () => {
        let store: ReturnType<typeof useStore<{ a: number }>> | null = null;
        function Comp({ initial }: { initial: number }) {
            store = useStore<{ a: number }>({ a: initial });
            return null;
        }
        const { rerender } = render(<Comp initial={1} />);
        expect(store!.get("a")).toBe(1);

        // local edit owns the data from here on
        store!.set("a", 42);
        // a new initialData must NOT overwrite the live store
        rerender(<Comp initial={99} />);
        expect(store!.get("a")).toBe(42);
    });
});
