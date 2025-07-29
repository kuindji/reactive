import { useMemo } from "react";
import {
    createEvent,
    DefaultEventArgsOptions,
    EventArgsOptions,
    EventOptions,
} from "../event";
import { BaseHandler } from "../lib/types";

export function useEvent<
    TriggerSignature extends BaseHandler = BaseHandler,
    HandlerOptions extends EventArgsOptions = DefaultEventArgsOptions,
>(eventOptions: EventOptions = {}) {
    const event = useMemo(
        () => createEvent<TriggerSignature, HandlerOptions>(eventOptions),
        [],
    );
    return event;
}
