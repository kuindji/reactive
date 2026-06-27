import { describe, expect, it } from "bun:test";
import { createAction } from "../../src/action";

describe("action destroy()", () => {
    it("reports destroyed state via isDestroyed", () => {
        const action = createAction((x: number) => x + 1);
        expect(action.isDestroyed()).toBe(false);
        action.destroy();
        expect(action.isDestroyed()).toBe(true);
    });

    it("throws when adding a listener to a destroyed action", () => {
        const action = createAction((x: number) => x + 1);
        action.destroy();
        expect(() => action.addListener(() => {})).toThrow("destroyed");
    });

    it("throws when invoking a destroyed action", () => {
        const action = createAction((x: number) => x + 1);
        action.destroy();
        expect(() => action.invoke(1)).toThrow("destroyed");
    });

    it("still resolves an in-flight invocation when destroyed mid-flight", async () => {
        let release!: (value: number) => void;
        const action = createAction(
            () => new Promise<number>((resolve) => {
                release = resolve;
            }),
        );

        const pending = action.invoke();
        action.destroy();
        release(42);

        const result = await pending;
        expect(result).toEqual({ response: 42, error: null, args: [] });
    });

    it("keeps the error-handling policy from invoke start when destroyed mid-flight", async () => {
        let reject!: (reason: Error) => void;
        const action = createAction(
            () => new Promise<number>((_resolve, rej) => {
                reject = rej;
            }),
        );
        // With an error listener present at invoke start, a failing invocation
        // resolves with an error response rather than rejecting.
        action.addErrorListener(() => {});

        const pending = action.invoke();
        // destroy() tears down the error listeners mid-flight; the policy must
        // stay as captured at invoke start (errors handled -> resolve).
        action.destroy();
        reject(new Error("boom"));

        const result = await pending;
        expect(result).toEqual({ response: null, error: "boom", args: [] });
    });

    it("drops response listeners on destroy", () => {
        const action = createAction((x: number) => x + 1);
        let calls = 0;
        action.onStatusChange(() => calls++);
        action.destroy();
        expect(() => action.onStatusChange(() => calls++)).toThrow("destroyed");
        expect(calls).toBe(0);
    });
});
