import { type BaseEventMap, createEventBus } from "../../src/eventBus";

type OmitIndexSignature<ObjectType> = {
    [
        KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
            ? never
            : KeyType
    ]: ObjectType[KeyType];
};

export interface EventBusEvents extends BaseEventMap {}

type Events = OmitIndexSignature<EventBusEvents>;

export const eventBus = createEventBus<Events>();
