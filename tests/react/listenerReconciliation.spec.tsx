import { render } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { StrictMode } from "react";
import { createActionBus } from "../../src/actionBus";
import { createEvent, type ListenerOptions } from "../../src/event";
import { createEventBus } from "../../src/eventBus";
import { createStore } from "../../src/store";
import { useListenToActionBus } from "../../src/react/useListenToActionBus";
import { useListenToEvent } from "../../src/react/useListenToEvent";
import { useListenToEventBus } from "../../src/react/useListenToEventBus";
import { useListenToStoreChanges } from "../../src/react/useListenToStoreChanges";

describe("useListenToEvent reconciliation", () => {
    it("inline semantically equal options do not resubscribe", () => {
        const event = createEvent<() => void>();
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToEvent(event, () => {
                calls++;
            }, options);
            return null;
        }
        const { rerender } = render(<Comp options={{ limit: 1 }} />);
        event.trigger();
        expect(calls).toBe(1);

        // fresh, equal object - listener already auto-removed, must not re-add
        rerender(<Comp options={{ limit: 1 }} />);
        event.trigger();
        expect(calls).toBe(1);
    });

    it("changed tags take effect", () => {
        const event = createEvent<() => void>();
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToEvent(event, () => {
                calls++;
            }, options);
            return null;
        }
        const { rerender } = render(<Comp options={{ tags: [ "a" ] }} />);
        rerender(<Comp options={{ tags: [ "b" ] }} />);

        event.withTags([ "b" ], () => event.trigger());
        expect(calls).toBe(1);
        event.withTags([ "a" ], () => event.trigger());
        expect(calls).toBe(1);
    });

    it("order-insensitive equal tags do not resubscribe", () => {
        const event = createEvent<() => void>();
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToEvent(event, () => {
                calls++;
            }, options);
            return null;
        }
        const { rerender } = render(
            <Comp options={{ limit: 1, tags: [ "a", "b" ] }} />,
        );
        event.withTags([ "a" ], () => event.trigger());
        expect(calls).toBe(1);
        // reordered tags = semantically equal -> no re-add of auto-removed
        rerender(<Comp options={{ limit: 1, tags: [ "b", "a" ] }} />);
        event.withTags([ "a" ], () => event.trigger());
        expect(calls).toBe(1);
    });

    it("changed context resubscribes using OLD context and cleans up", () => {
        const event = createEvent<() => void>();
        const ctxA = {};
        const ctxB = {};
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToEvent(event, () => {
                calls++;
            }, options);
            return null;
        }
        const { rerender, unmount } = render(
            <Comp options={{ limit: 3, context: ctxA }} />,
        );
        rerender(<Comp options={{ limit: 3, context: ctxB }} />);

        // only one effective listener (calls === 1 proves old ctxA was removed;
        // an undeleted ctxA registration would make this 2)
        event.trigger();
        expect(calls).toBe(1);
        expect(event.hasListener()).toBe(true);

        unmount();
        event.trigger();
        expect(calls).toBe(1);
        expect(event.hasListener()).toBe(false);
    });

    it("changed limit updates the existing listener in place", () => {
        const event = createEvent<() => void>();
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToEvent(event, () => {
                calls++;
            }, options);
            return null;
        }
        const { rerender } = render(<Comp options={{ limit: 3 }} />);
        event.trigger();
        expect(calls).toBe(1);

        rerender(<Comp options={{ limit: 2 }} />);
        event.trigger();
        expect(calls).toBe(2); // called === limit -> auto-removed
        event.trigger();
        expect(calls).toBe(2);
    });

    it("lowering limit below called removes immediately", () => {
        const event = createEvent<() => void>();
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToEvent(event, () => {
                calls++;
            }, options);
            return null;
        }
        const { rerender } = render(<Comp options={{ limit: 3 }} />);
        event.trigger();
        event.trigger();
        expect(calls).toBe(2);

        rerender(<Comp options={{ limit: 1 }} />);
        expect(event.hasListener()).toBe(false);
        event.trigger();
        expect(calls).toBe(2);
    });

    it("does not duplicate listeners in StrictMode", () => {
        const event = createEvent<() => void>();
        let calls = 0;
        function Comp() {
            useListenToEvent(event, () => {
                calls++;
            }, { context: {} });
            return null;
        }
        render(
            <StrictMode>
                <Comp />
            </StrictMode>,
        );
        event.trigger();
        expect(calls).toBe(1);
    });

    it("uses latest listener function without resubscribe", () => {
        const event = createEvent<() => void>();
        const seen: number[] = [];
        function Comp({ n }: { n: number }) {
            useListenToEvent(event, () => {
                seen.push(n);
            }, { limit: 0 });
            return null;
        }
        const { rerender } = render(<Comp n={1} />);
        event.trigger();
        rerender(<Comp n={2} />);
        event.trigger();
        expect(seen).toEqual([ 1, 2 ]);
    });
});

describe("useListenToEventBus reconciliation", () => {
    it("changed limit updates in place", () => {
        const bus = createEventBus<{ a: () => void }>();
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToEventBus(bus, "a", () => {
                calls++;
            }, options);
            return null;
        }
        const { rerender } = render(<Comp options={{ limit: 3 }} />);
        bus.trigger("a");
        expect(calls).toBe(1);
        rerender(<Comp options={{ limit: 2 }} />);
        bus.trigger("a");
        expect(calls).toBe(2);
        bus.trigger("a");
        expect(calls).toBe(2);
    });
});

describe("useListenToStoreChanges reconciliation", () => {
    it("changed limit updates in place", () => {
        const store = createStore<{ a: number }>({ a: 0 });
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToStoreChanges(store, "a", () => {
                calls++;
            }, options);
            return null;
        }
        const { rerender } = render(<Comp options={{ limit: 3 }} />);
        store.set("a", 1);
        expect(calls).toBe(1);
        rerender(<Comp options={{ limit: 2 }} />);
        store.set("a", 2);
        expect(calls).toBe(2);
        store.set("a", 3);
        expect(calls).toBe(2);
    });
});

describe("useListenToActionBus reconciliation", () => {
    it("object-form changed limit updates in place", async () => {
        const bus = createActionBus<{ a: () => number }>({ a: () => 1 });
        let calls = 0;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToActionBus(bus, "a", {
                listener: () => {
                    calls++;
                },
                options,
            });
            return null;
        }
        const { rerender } = render(<Comp options={{ limit: 3 }} />);
        await bus.invoke("a");
        expect(calls).toBe(1);
        rerender(<Comp options={{ limit: 2 }} />);
        await bus.invoke("a");
        expect(calls).toBe(2);
        await bus.invoke("a");
        expect(calls).toBe(2);
    });

    it("beforeAction cancellation survives option change", async () => {
        const bus = createActionBus<{ a: () => number }>({ a: () => 1 });
        let cancelled = false;
        function Comp({ options }: { options?: ListenerOptions }) {
            useListenToActionBus(bus, "a", {
                options,
                beforeActionListener: () => false,
            });
            return null;
        }
        const { rerender } = render(<Comp options={{ limit: 3 }} />);
        rerender(<Comp options={{ limit: 5 }} />);
        const res = await bus.invoke("a");
        cancelled = res.error === "Action cancelled";
        expect(cancelled).toBe(true);
    });
});
