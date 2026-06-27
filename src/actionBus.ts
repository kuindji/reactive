import { ActionDefinitionHelper, createAction } from "./action.js";
import { createEvent, ListenerOptions } from "./event.js";
import type {
    ApiType,
    BaseHandler,
    ErrorListenerSignature,
    ErrorResponse,
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
    let destroyed = false;

    // The error-forwarding listener attached to each action's error event is
    // retained per name so removeAction can detach it. Otherwise a held action
    // reference keeps forwarding errors into the bus after removal, and — since
    // the forwarder counts as an error listener — its invoke resolves with an
    // error response instead of rejecting.
    const errorForwarders = new Map<MapKey, BaseHandler>();

    // Status subscriptions for actions that are not registered yet. They are
    // recorded here so a later add()/replace() can attach them — otherwise a
    // hook subscribing before registration (e.g. useActionBusStatus) would stay
    // unsubscribed forever. Kept after attach so a re-added action reattaches.
    const pendingStatusListeners = new Map<MapKey, Set<BaseHandler>>();

    if (errorListener) {
        errorEvent.addListener(errorListener);
    }

    const add = (name: MapKey, action: BaseHandler) => {
        if (destroyed) {
            throw new Error("ActionBus is destroyed");
        }
        if (!actions.has(name)) {
            const a = createAction(action);
            // Preserve the original error type (e.g. "action-status") rather
            // than hardcoding "action", so consumers can distinguish a failed
            // invocation from a throwing status listener.
            const forwarder = ({ error, args, type }: {
                error: Error;
                args: any[];
                type: ErrorResponse["type"];
            }) => {
                errorEvent.emit({ name, error, args, type });
            };
            errorForwarders.set(name, forwarder as BaseHandler);
            a.addErrorListener(forwarder);
            actions.set(name, a);
            // Attach any status subscriptions that were registered before this
            // action existed.
            const pending = pendingStatusListeners.get(name);
            if (pending) {
                pending.forEach((handler) => {
                    a.onStatusChange(handler);
                });
            }
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
        if (destroyed) {
            throw new Error("ActionBus is destroyed");
        }
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
        const action = actions.get(name as KeyOf<Actions>);
        const existed = actions.delete(name as KeyOf<Actions>);
        // Detach the bus error-forwarding listener from the removed action so a
        // held reference no longer feeds the bus error event (and so its invoke
        // rejects rather than resolving via the forwarder acting as an error
        // listener). A later re-add() installs a fresh forwarder.
        const forwarder = errorForwarders.get(name);
        if (forwarder) {
            action?.removeErrorListener(forwarder);
            errorForwarders.delete(name);
        }
        // getStatus() now reports idle for this name, but status subscribers
        // (e.g. useActionBusStatus via useSyncExternalStore) were attached to
        // the removed action's own status event and will never be notified of
        // the drop. Detach each retained subscription from the removed action
        // (otherwise invoking a held action reference keeps notifying a
        // listener that bus.removeStatusListener can no longer reach), then push
        // an idle status so they re-read and clear stale state. Subscriptions
        // stay in pendingStatusListeners so a later re-add() reattaches them.
        if (existed) {
            const pending = pendingStatusListeners.get(name);
            pending?.forEach((handler) => {
                action?.removeStatusListener(handler);
                // Isolate each notify: one throwing subscriber must not abort
                // the loop and leave the remaining subscribers attached and
                // un-notified. Route the failure to the bus error event.
                try {
                    (handler as (status: typeof idleStatus) => void)(idleStatus);
                }
                catch (error) {
                    // The error forwarding must not re-escape either: a throwing
                    // bus error listener would abort the loop and leave later
                    // subscribers attached and un-notified.
                    try {
                        errorEvent.emit({
                            name,
                            error: error instanceof Error
                                ? error
                                : new Error(String(error)),
                            args: [],
                            type: "action-status",
                        });
                    }
                    catch {
                        // Nothing left to route to; swallow to keep the loop going.
                    }
                }
            });
        }
    };

    const invoke = <K extends KeyOf<Actions>>(
        name: K,
        ...args: Actions[K]["actionArguments"]
    ) => {
        if (destroyed) {
            throw new Error("ActionBus is destroyed");
        }
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
        if (destroyed) {
            throw new Error("ActionBus is destroyed");
        }
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

    // Frozen and shared: getStatus() hands this single object to every missing
    // action, so a consumer mutating it would corrupt all future idle snapshots
    // (e.g. leaving a hook reporting false loading). Matches action status,
    // whose snapshots are also frozen.
    const idleStatus = Object.freeze({
        pending: false,
        error: null,
        response: null,
    });

    // Status lives on the underlying action (the single in-flight point);
    // the bus just delegates per name. An unregistered name reports idle and
    // is a no-op to (un)subscribe.
    const getStatus = <K extends KeyOf<Actions>>(
        name: K,
    ): Actions[K]["statusType"] => {
        const action: ActionTypes[K] | undefined = get(name);
        if (!action) {
            return idleStatus as Actions[K]["statusType"];
        }
        return action.getStatus();
    };

    const onStatusChange = <K extends KeyOf<Actions>>(
        name: K,
        handler: Actions[K]["statusListenerSignature"],
    ) => {
        if (destroyed) {
            throw new Error("ActionBus is destroyed");
        }
        // Record the subscription so it survives (re)registration, then attach
        // to the action now if it already exists.
        let pending = pendingStatusListeners.get(name);
        if (!pending) {
            pending = new Set();
            pendingStatusListeners.set(name, pending);
        }
        pending.add(handler as BaseHandler);
        const action: ActionTypes[K] | undefined = get(name);
        if (!action) {
            return;
        }
        return action.onStatusChange(handler);
    };

    const removeStatusListener = <K extends KeyOf<Actions>>(
        name: K,
        handler: Actions[K]["statusListenerSignature"],
    ) => {
        const pending = pendingStatusListeners.get(name);
        if (pending) {
            pending.delete(handler as BaseHandler);
            if (pending.size === 0) {
                pendingStatusListeners.delete(name);
            }
        }
        const action: ActionTypes[K] | undefined = get(name);
        if (!action) {
            return;
        }
        return action.removeStatusListener(handler);
    };

    // One-call teardown: destroy each owned action and the error event, then
    // drop them all. Post-destroy invoke/addListener throw rather than silently
    // no-op.
    const destroy = () => {
        actions.forEach((action: ActionTypes[KeyOf<Actions>]) => {
            action.destroy();
        });
        actions.clear();
        pendingStatusListeners.clear();
        errorForwarders.clear();
        errorEvent.destroy();
        destroyed = true;
    };

    const isDestroyed = () => destroyed;

    const api = {
        add,
        replace,
        removeAction,
        has,
        get,
        invoke,
        destroy,
        isDestroyed,

        getStatus,
        onStatusChange,
        removeStatusListener,

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
