import { describe, expect, it } from "bun:test";
import {
    ActionMapSetErrorListeners,
    createActionMap,
} from "../../src/actionMap";

describe("actionMap reconcile primitives", () => {
    it("setAction on a map entry preserves listeners and swaps impl", async () => {
        const map = createActionMap({ a: (n: number) => n + 1 });
        const responses: number[] = [];
        map.a.addListener(({ response }) => {
            if (response !== null) {
                responses.push(response);
            }
        });
        await map.a.invoke(1);
        map.a.setAction((n: number) => n * 10);
        await map.a.invoke(2);
        expect(responses).toEqual([ 2, 20 ]);
    });

    it("setErrorListeners updates forwarding without recreating actions", async () => {
        const firstErrors: string[] = [];
        const secondErrors: string[] = [];
        const map = createActionMap(
            {
                a: (_n: number): number => {
                    throw new Error("boom");
                },
            },
            ({ error }) => {
                firstErrors.push(error.message);
            },
        );
        await map.a.invoke(1);
        expect(firstErrors).toEqual([ "boom" ]);

        (map as any)[ActionMapSetErrorListeners]([
            ({ error }: { error: Error }) => {
                secondErrors.push(error.message);
            },
        ]);
        await map.a.invoke(2);
        expect(firstErrors).toEqual([ "boom" ]);
        expect(secondErrors).toEqual([ "boom" ]);
    });
});
