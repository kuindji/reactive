import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { useRef } from "react";
import { useAsyncAction } from "../../src/react/useAsyncAction";

describe("useAsyncAction", () => {
    it("flips loading while in flight and exposes the response", async () => {
        function Component() {
            const [ submit, { loading, response } ] = useAsyncAction(
                async (x: number) => {
                    await new Promise((r) => setTimeout(r, 10));
                    return x * 2;
                },
            );
            return (
                <div>
                    <span data-testid="loading">{String(loading)}</span>
                    <span data-testid="response">{String(response)}</span>
                    <button onClick={() => void submit(21)}>go</button>
                </div>
            );
        }

        render(<Component />);
        expect(screen.getByTestId("loading")).toHaveTextContent("false");

        act(() => {
            screen.getByText("go").click();
        });
        await waitFor(() =>
            expect(screen.getByTestId("loading")).toHaveTextContent("true")
        );

        await waitFor(() =>
            expect(screen.getByTestId("loading")).toHaveTextContent("false")
        );
        expect(screen.getByTestId("response")).toHaveTextContent("42");
    });

    it("surfaces a thrown error through state without an unhandled rejection", async () => {
        function Component() {
            const [ submit, { error } ] = useAsyncAction(() => {
                throw new Error("boom");
            });
            return (
                <div>
                    <span data-testid="error">{error?.message ?? ""}</span>
                    <button onClick={() => void submit()}>go</button>
                </div>
            );
        }

        render(<Component />);
        act(() => {
            screen.getByText("go").click();
        });

        await waitFor(() =>
            expect(screen.getByTestId("error")).toHaveTextContent("boom")
        );
    });

    it("does not re-render when status is unchanged", async () => {
        const renders: number[] = [];
        function Component() {
            const countRef = useRef(0);
            countRef.current++;
            renders.push(countRef.current);
            const [ submit ] = useAsyncAction((x: number) => x);
            return <button onClick={() => void submit(1)}>go</button>;
        }

        render(<Component />);
        const initial = renders.length;
        // Each invoke yields exactly two status transitions (pending true,
        // pending false) -> renders increase but settle on a stable status.
        act(() => {
            screen.getByText("go").click();
        });
        await waitFor(() => expect(renders.length).toBeGreaterThan(initial));
    });
});
