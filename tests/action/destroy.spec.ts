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

    it("drops response listeners on destroy", () => {
        const action = createAction((x: number) => x + 1);
        let calls = 0;
        action.onStatusChange(() => calls++);
        action.destroy();
        expect(() => action.onStatusChange(() => calls++)).toThrow("destroyed");
        expect(calls).toBe(0);
    });
});
