import { BaseHandler } from "lib/types";
import { useMemo } from "react";
import { Simplify } from "type-fest";
import {
    createEvent,
    DefaultEventArgsOptions,
    EventArgsOptions,
    EventOptions,
} from "../event";

export function useEvent<
    TriggerSignature extends BaseHandler = BaseHandler,
    HandlerOptions extends EventArgsOptions = DefaultEventArgsOptions,
>(eventOptions: Simplify<EventOptions> = {}) {
    const event = useMemo(
        () => createEvent<TriggerSignature, HandlerOptions>(eventOptions),
        [],
    );
    return event;
}
