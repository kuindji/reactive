import { ActionDefinitionHelper, createAction } from "./action.js";
import { createEvent, ListenerOptions } from "./event.js";
import type {
    ApiType,
    BaseHandler,
    ErrorListenerSignature,
    KeyOf,
    MapKey,
} from "./lib/types.js";

export interface BaseActionsMap {
    [key: MapKey]: BaseHandler;
}

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
    errorListener?: ErrorListenerSignature<any[]>,
) {
    type ActionBus = ActionBusDefinitionHelper<ActionsMap>;
    type ActionTypes = ActionBus["actionTypes"];
    type Actions = ActionBus["actions"];

    const actions = new Map<KeyOf<Actions>, any>();
    const errorEvent = createEvent<ErrorListenerSignature<any[]>>();

    if (errorListener) {
        errorEvent.addListener(errorListener);
    }

    const add = (name: MapKey, action: BaseHandler) => {
        if (!actions.has(name)) {
            const a = createAction(action);
            a.addErrorListener(({ error, args }) => {
                errorEvent.emit({ name, error, args, type: "action" });
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

    const has = (name: MapKey) => {
        return actions.has(name as KeyOf<Actions>);
    };

    // Replace an action's function in place when it exists (preserving all of
    // its listeners and the bus error-forwarding listener, which is attached to
    // the action's error event, not the function); otherwise add it.
    const replace = (name: MapKey, action: BaseHandler) => {
        const existing = actions.get(name as KeyOf<Actions>);
        if (existing) {
            existing.setAction(action);
        }
        else {
            add(name, action);
        }
    };

    // Named removeAction (not remove) because `remove` is an existing alias for
    // removeListener. The removed action's listeners and its error-forwarding
    // listener are dropped with it (they lived on the action's own events).
    const removeAction = (name: MapKey) => {
        actions.delete(name as KeyOf<Actions>);
    };

    const invoke = <K extends KeyOf<Actions>>(
        name: K,
        ...args: Actions[K]["actionArguments"]
    ) => {
        const action = get(name);
        if (!action) {
            throw new Error(`Action ${name as string} not found`);
        }
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

    const updateListenerOptions = <K extends KeyOf<Actions>>(
        name: K,
        handler: Actions[K]["listenerSignature"],
        context?: object | null,
        nextOptions?: ListenerOptions,
    ) => {
        const action: ActionTypes[K] | undefined = get(name);
        if (!action) {
            return false;
        }
        return action.updateListenerOptions(handler, context, nextOptions);
    };

    const api = {
        add,
        replace,
        removeAction,
        has,
        get,
        invoke,

        addListener: on,
        /** @alias addListener */
        on,
        /** @alias addListener */
        subscribe: on,
        /** @alias addListener */
        listen: on,

        once,

        removeListener: un,
        /** @alias removeListener */
        off: un,
        /** @alias removeListener */
        remove: un,
        /** @alias removeListener */
        un: un,
        /** @alias removeListener */
        unsubscribe: un,

        updateListenerOptions,

        addErrorListener: errorEvent.addListener,
        removeErrorListener: errorEvent.removeListener,
    } as const;
    return api as ApiType<ActionBus, typeof api>;
}

export type BaseActionBusDefinition = ActionBusDefinitionHelper<BaseActionsMap>;
export type BaseActionBus = ReturnType<typeof createActionBus<BaseActionsMap>>;
