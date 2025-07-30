import { useMemo } from "react";
import { createEvent, EventOptions } from "../event";
import { BaseHandler } from "../lib/types";

export function useEvent<
    ListenerSignature extends BaseHandler = BaseHandler,
>(eventOptions: EventOptions<ListenerSignature> = {}) {
    const event = useMemo(
        () => createEvent<ListenerSignature>(eventOptions),
        [],
    );
    return event;
}
