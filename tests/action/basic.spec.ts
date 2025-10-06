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

        action.invoke(1).then(({ response }) => {
            expect(response).toBe(2);
            done();
        });
    });

    it("should work when untyped", (done) => {
        const action = createAction(function(a) {
            return a + a;
        });

        action.addListener(({ response }) => {
            expect(response).toBe(2);
        });

        action.invoke(1).then(({ response }) => {
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

        action.invoke(1).then(({ response }) => {
            expect(response).toBe(null);
        });
        action.invoke(2).then(({ response }) => {
            expect(response).toBe(4);
            expect(beforeTriggered).toBe(true);
            expect(afterTriggered).toBe(true);
            done();
        });
    });
});
