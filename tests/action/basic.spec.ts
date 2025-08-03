import { describe, expect, it } from "bun:test";
import { createAction } from "../../src/action";

describe("action basic", () => {
    it("triggers basic action", (done) => {
        const a = createAction(function(a: number) {
            return a + a;
        });

        a.addListener(({ response }) => {
            expect(response).toBe(2);
        });

        a.invoke(1).then(({ response }) => {
            expect(response).toBe(2);
            done();
        });
    });

    it("should work when untyped", (done) => {
        const a = createAction(function(a) {
            return a + a;
        });

        a.addListener(({ response }) => {
            expect(response).toBe(2);
        });

        a.invoke(1).then(({ response }) => {
            expect(response).toBe(2);
            done();
        });
    });
});
