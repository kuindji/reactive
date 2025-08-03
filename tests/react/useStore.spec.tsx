import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useEffect } from "react";
import { useStore } from "../../src/react/useStore";
import { ChangeEventName } from "../../src/store";

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
                            return a * a;
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
});
