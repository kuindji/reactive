import { useMemo } from "react";
import {
    BaseEventMap,
    createEventBus,
    DefaultEventMap,
    EventBusOptions,
} from "../eventBus";

export function useEventBus<
    EventsMap extends BaseEventMap = DefaultEventMap,
>(eventBusOptions?: EventBusOptions) {
    const eventBus = useMemo(
        () => createEventBus<EventsMap>(eventBusOptions),
        [],
    );
    return eventBus;
}
