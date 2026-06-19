import { describe, expect, it } from "bun:test";
import { createAction } from "../../src/action";

describe("action setAction", () => {
    it("uses the new function on the next invoke", async () => {
        const action = createAction((n: number) => n + 1);
        const r1 = await action.invoke(1);
        expect(r1.response).toBe(2);

        action.setAction((n: number) => n * 10);
        const r2 = await action.invoke(1);
        expect(r2.response).toBe(10);
    });

    it("preserves response/error/before listeners across a swap", async () => {
        const action = createAction((n: number) => n + 1);
        const responses: number[] = [];
        const befores: number[] = [];
        const errors: string[] = [];
        action.addListener(({ response }) => {
            if (response !== null) {
                responses.push(response);
            }
        });
        action.addBeforeActionListener((n) => {
            befores.push(n);
        });
        action.addErrorListener(({ error }) => {
            errors.push(error.message);
        });

        await action.invoke(1);
        action.setAction((n: number) => {
            if (n < 0) {
                throw new Error("neg");
            }
            return n * 2;
        });
        await action.invoke(3);
        await action.invoke(-1);

        expect(responses).toEqual([ 2, 6 ]);
        expect(befores).toEqual([ 1, 3, -1 ]);
        expect(errors).toEqual([ "neg" ]);
    });

    it("before-action cancellation still works after a swap", async () => {
        const action = createAction((n: number) => n + 1);
        action.addBeforeActionListener(() => false);
        action.setAction((n: number) => n * 2);
        const res = await action.invoke(5);
        expect(res.error).toBe("Action cancelled");
    });
});
