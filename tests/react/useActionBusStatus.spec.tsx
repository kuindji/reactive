import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { createActionBus } from "../../src/actionBus";
import { useActionBusStatus } from "../../src/react/useActionBusStatus";

describe("useActionBusStatus", () => {
    it("tracks loading/response for a named action", async () => {
        const bus = createActionBus({
            save: async (x: number) => {
                await new Promise((r) => setTimeout(r, 10));
                return x + 1;
            },
        });

        function Component() {
            const { loading, response } = useActionBusStatus(bus, "save");
            return (
                <div>
                    <span data-testid="loading">{String(loading)}</span>
                    <span data-testid="response">{String(response)}</span>
                </div>
            );
        }

        render(<Component />);
        expect(screen.getByTestId("loading")).toHaveTextContent("false");

        act(() => {
            void bus.invoke("save", 41);
        });
        await waitFor(() =>
            expect(screen.getByTestId("loading")).toHaveTextContent("true")
        );
        await waitFor(() =>
            expect(screen.getByTestId("response")).toHaveTextContent("42")
        );
        expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    it("surfaces errors without re-throwing", async () => {
        const bus = createActionBus({
            fail: (): void => {
                throw new Error("nope");
            },
        });

        function Component() {
            const { error } = useActionBusStatus(bus, "fail");
            return <span data-testid="error">{error?.message ?? ""}</span>;
        }

        render(<Component />);
        act(() => {
            void bus.invoke("fail");
        });

        await waitFor(() =>
            expect(screen.getByTestId("error")).toHaveTextContent("nope")
        );
    });

    it("renders an idle status for an unregistered name", () => {
        const bus = createActionBus({ a: (x: number) => x });
        function Component() {
            const { loading, error, response } = useActionBusStatus(
                bus,
                "missing" as "a",
            );
            return (
                <span data-testid="v">
                    {String(loading)}/{String(error)}/{String(response)}
                </span>
            );
        }
        render(<Component />);
        expect(screen.getByTestId("v")).toHaveTextContent("false/null/null");
    });
});
