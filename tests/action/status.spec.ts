import { describe, expect, it } from "bun:test";
import { createAction } from "../../src/action";

describe("action status", () => {
    it("starts with an idle status", () => {
        const action = createAction((x: number) => x * 2);
        expect(action.getStatus()).toEqual({
            pending: false,
            error: null,
            response: null,
        });
    });

    it("flips pending true while in flight and false with response on settle", async () => {
        const action = createAction(async (x: number) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return x * 2;
        });

        const promise = action.invoke(21);
        expect(action.getStatus().pending).toBe(true);
        expect(action.getStatus().response).toBe(null);

        await promise;
        expect(action.getStatus()).toEqual({
            pending: false,
            error: null,
            response: 42,
        });
    });

    it("emits status changes to onStatusChange listeners", async () => {
        const action = createAction(async (x: number) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return x;
        });

        const seen: Array<{ pending: boolean; response: number | null; }> = [];
        action.onStatusChange((status) => {
            seen.push({ pending: status.pending, response: status.response });
        });

        await action.invoke(7);

        expect(seen).toEqual([
            { pending: true, response: null },
            { pending: false, response: 7 },
        ]);
    });

    it("records the error on settle and keeps response null", async () => {
        const action = createAction(() => {
            throw new Error("boom");
        });
        action.addErrorListener(() => { });

        await action.invoke();

        const status = action.getStatus();
        expect(status.pending).toBe(false);
        expect(status.response).toBe(null);
        expect(status.error).toBeInstanceOf(Error);
        expect(status.error?.message).toBe("boom");
    });

    it("records the error even when invoke re-throws (no error listener)", () => {
        const action = createAction(() => {
            throw new Error("unhandled");
        });

        expect(() => action.invoke()).toThrow("unhandled");

        const status = action.getStatus();
        expect(status.pending).toBe(false);
        expect(status.error?.message).toBe("unhandled");
    });

    it("treats a before-cancellation as a settle, not an error", async () => {
        const action = createAction((x: number) => x * 2);
        action.addBeforeActionListener(() => false);

        await action.invoke(5);

        expect(action.getStatus()).toEqual({
            pending: false,
            error: null,
            response: null,
        });
    });

    it("clears a previous error on the next successful settle", async () => {
        const action = createAction((ok: boolean) => {
            if (!ok) {
                throw new Error("nope");
            }
            return "fine";
        });
        action.addErrorListener(() => { });

        await action.invoke(false);
        expect(action.getStatus().error?.message).toBe("nope");

        await action.invoke(true);
        const status = action.getStatus();
        expect(status.error).toBe(null);
        expect(status.response).toBe("fine");
    });

    it("returns a stable status reference when nothing changed", async () => {
        const action = createAction((x: number) => x);
        const a = action.getStatus();
        const b = action.getStatus();
        expect(a).toBe(b);

        await action.invoke(1);
        const c = action.getStatus();
        expect(c).not.toBe(a);
        expect(action.getStatus()).toBe(c);
    });

    it("stays pending until all concurrent invokes settle", async () => {
        const action = createAction(async (ms: number, value: number) => {
            await new Promise((resolve) => setTimeout(resolve, ms));
            return value;
        });

        const slow = action.invoke(30, 1);
        const fast = action.invoke(5, 2);
        expect(action.getStatus().pending).toBe(true);

        await fast;
        expect(action.getStatus().pending).toBe(true);

        await slow;
        expect(action.getStatus().pending).toBe(false);
    });

    it("removes a status listener", async () => {
        const action = createAction((x: number) => x);
        const seen: boolean[] = [];
        const listener = (status: { pending: boolean; }) => {
            seen.push(status.pending);
        };
        action.onStatusChange(listener);
        await action.invoke(1);
        const countAfterFirst = seen.length;

        action.removeStatusListener(listener);
        await action.invoke(2);
        expect(seen.length).toBe(countAfterFirst);
    });

    it("a throwing status listener does not block execution or strand pending", async () => {
        let ran = false;
        const action = createAction((x: number) => {
            ran = true;
            return x * 2;
        });
        let calls = 0;
        action.onStatusChange(() => {
            calls++;
            // Throw on the first (pending: true) emission.
            if (calls === 1) {
                throw new Error("status listener boom");
            }
        });

        const result = await action.invoke(21);

        expect(result.response).toBe(42);
        expect(ran).toBe(true);
        expect(action.getStatus().pending).toBe(false);
    });

    it("routes a throwing status listener to the action error listeners", async () => {
        const action = createAction((x: number) => x);
        const errors: string[] = [];
        action.addErrorListener(({ error }) => {
            errors.push(error.message);
        });
        action.onStatusChange(() => {
            throw new Error("status boom");
        });

        await action.invoke(1);

        expect(errors).toContain("status boom");
    });

    it("contains a throwing status listener even when the error listener also throws", async () => {
        let ran = false;
        const action = createAction((x: number) => {
            ran = true;
            return x * 2;
        });
        action.onStatusChange(() => {
            throw new Error("status boom");
        });
        action.addErrorListener(() => {
            throw new Error("error boom");
        });

        const result = await action.invoke(21);

        expect(result.response).toBe(42);
        expect(ran).toBe(true);
        expect(action.getStatus().pending).toBe(false);
    });
});
