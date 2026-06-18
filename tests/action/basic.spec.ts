import { describe, expect, it } from "bun:test";
import { createAction } from "../../src/action";

describe("action basic", () => {
    it("triggers basic action", (done) => {
        const action = createAction(function(a: number) {
            return a + a;
        });

        action.addListener(({ response }) => {
            expect(response).toBe(2);
        });

        void action.invoke(1).then(({ response }) => {
            expect(response).toBe(2);
            done();
        });
    });

    it("should work when untyped", (done) => {
        const action = createAction(function(a: number) {
            return a + a;
        });

        action.addListener(({ response }) => {
            expect(response).toBe(2);
        });

        void action.invoke(1).then(({ response }) => {
            expect(response).toBe(2);
            done();
        });
    });

    it("allows before action listeners and action cancellation", (done) => {
        let beforeTriggered = false;
        let afterTriggered = false;

        const action = createAction(function(a: number) {
            return a + a;
        });

        action.addBeforeActionListener((a) => {
            beforeTriggered = true;
            if (a === 1) {
                return false;
            }
        });

        action.addListener(({ response, args }) => {
            afterTriggered = true;
            if (args[0] === 1) {
                expect(response).toBe(null);
            }
            else {
                expect(response).toBe(4);
            }
        });

        void action.invoke(1).then(({ response }) => {
            expect(response).toBe(null);
        });
        void action.invoke(2).then(({ response }) => {
            expect(response).toBe(4);
            expect(beforeTriggered).toBe(true);
            expect(afterTriggered).toBe(true);
            done();
        });
    });

    it("awaits promise-like action results", async () => {
        const thenable = {
            then(resolve: (value: number) => void) {
                resolve(42);
            },
        } as PromiseLike<number>;
        const action = createAction(() => thenable);

        const result = await action.invoke();

        expect(result.response).toBe(42);
    });

    it("awaits promise-like before action listeners", async () => {
        const action = createAction((value: number) => value * 2);
        const cancellation = {
            then(resolve: (value: false) => void) {
                resolve(false);
            },
        } as PromiseLike<false>;

        action.addBeforeActionListener(() => cancellation as Promise<false>);

        const result = await action.invoke(21);

        expect(result.response).toBe(null);
        expect(result.error).toBe("Action cancelled");
    });
});
