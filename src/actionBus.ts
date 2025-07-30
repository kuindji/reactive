import { ActionDefinitionHelper, createAction, ErrorResponse } from "./action";
import { createEvent, ListenerOptions } from "./event";
import { ApiType, BaseHandler, KeyOf, MapKey } from "./lib/types";

export interface BaseActionsMap {
    [key: MapKey]: BaseHandler;
}

type ErrorEventSignature = (
    ...args: [ ErrorResponse<any[]> & { name: MapKey; } ]
) => void;

type GetActionTypesMap<
    ActionsMap extends BaseActionsMap,
> = {
    [key in KeyOf<ActionsMap>]: [ ActionsMap[key] ] extends [ never ] ? never
        : ReturnType<typeof createAction<ActionsMap[key]>>;
};

type GetActionDefinitionsMap<
    ActionsMap extends BaseActionsMap,
> = {
    [key in KeyOf<ActionsMap>]: [ ActionsMap[key] ] extends [ never ] ? never
        : ActionDefinitionHelper<ActionsMap[key]>;
};

export type ActionBusDefinitionHelper<ActionsMap extends BaseActionsMap> = {
    actions: GetActionDefinitionsMap<ActionsMap>;
    actionTypes: GetActionTypesMap<ActionsMap>;
};

export function createActionBus<ActionsMap extends BaseActionsMap>(
    initialActions: ActionsMap = {} as ActionsMap,
) {
    type ActionBus = ActionBusDefinitionHelper<ActionsMap>;
    type ActionTypes = ActionBus["actionTypes"];
    type Actions = ActionBus["actions"];

    const actions = new Map<KeyOf<Actions>, any>();
    const errorEvent = createEvent<ErrorEventSignature>();

    const add = (name: MapKey, action: BaseHandler) => {
        if (!actions.has(name)) {
            const a = createAction(action);
            a.addErrorListener(({ error, request }) => {
                errorEvent.emit({ name, error, request });
            });
            actions.set(name, a);
        }
    };

    Object.entries(initialActions).forEach(([ name, action ]) => {
        add(name, action);
    });

    const get = <K extends KeyOf<Actions>>(name: K) => {
        return actions.get(name) as ActionTypes[K];
    };

    const invoke = <K extends KeyOf<Actions>>(
        name: K,
        ...args: Actions[K]["actionArguments"]
    ) => {
        const action = get(name);
        return action.invoke(...args);
    };

    const on = <K extends KeyOf<Actions>>(
        name: K,
        handler: Actions[K]["listenerSignature"],
        options?: ListenerOptions,
    ) => {
        const action: ActionTypes[K] = get(name);
        if (!action) {
            throw new Error(`Action ${name as string} not found`);
        }
        return action.addListener(handler, options);
    };

    const once = <K extends KeyOf<Actions>>(
        name: K,
        handler: Actions[K]["listenerSignature"],
        options?: ListenerOptions,
    ) => {
        options = options || {};
        options.limit = 1;
        const action: ActionTypes[K] = get(name);
        if (!action) {
            throw new Error(`Action ${name as string} not found`);
        }
        return action.addListener(handler, options);
    };

    const un = <K extends KeyOf<Actions>>(
        name: K,
        handler: Actions[K]["listenerSignature"],
        context?: object | null,
        tag?: string | null,
    ) => {
        const action: ActionTypes[K] = get(name);
        if (!action) {
            throw new Error(`Action ${name as string} not found`);
        }
        return action.removeListener(handler, context, tag);
    };

    const api = {
        add,
        get,
        invoke,
        on,
        addListener: on,
        once,
        un,
        removeListener: un,
        off: un,
        onError: errorEvent.addListener,
        unError: errorEvent.removeListener,
    } as const;
    return api as ApiType<ActionBus, typeof api>;
}

export type BaseActionBusDefinition = ActionBusDefinitionHelper<BaseActionsMap>;
export type BaseActionBus = ReturnType<typeof createActionBus<BaseActionsMap>>;
