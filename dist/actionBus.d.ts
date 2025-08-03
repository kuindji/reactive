import { ActionDefinitionHelper, createAction } from "./action";
import { ListenerOptions } from "./event";
import type { ApiType, BaseHandler, ErrorListenerSignature, KeyOf, MapKey } from "./lib/types";
export interface BaseActionsMap {
    [key: MapKey]: BaseHandler;
}
type GetActionTypesMap<ActionsMap extends BaseActionsMap> = {
    [key in KeyOf<ActionsMap>]: [ActionsMap[key]] extends [never] ? never : ReturnType<typeof createAction<ActionsMap[key]>>;
};
type GetActionDefinitionsMap<ActionsMap extends BaseActionsMap> = {
    [key in KeyOf<ActionsMap>]: [ActionsMap[key]] extends [never] ? never : ActionDefinitionHelper<ActionsMap[key]>;
};
export type ActionBusDefinitionHelper<ActionsMap extends BaseActionsMap> = {
    actions: GetActionDefinitionsMap<ActionsMap>;
    actionTypes: GetActionTypesMap<ActionsMap>;
};
export declare function createActionBus<ActionsMap extends BaseActionsMap>(initialActions?: ActionsMap, errorListener?: ErrorListenerSignature<any[]>): ApiType<ActionBusDefinitionHelper<ActionsMap>, {
    readonly add: (name: MapKey, action: BaseHandler) => void;
    readonly get: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K) => GetActionTypesMap<ActionsMap>[K];
    readonly invoke: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, ...args: GetActionDefinitionsMap<ActionsMap>[K]["actionArguments"]) => Promise<import("./action").ActionResponse<Awaited<ReturnType<ActionsMap[K]>>, Parameters<ActionsMap[K]>>>;
    readonly addListener: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], options?: ListenerOptions) => void;
    /** @alias addListener */
    readonly on: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], options?: ListenerOptions) => void;
    /** @alias addListener */
    readonly subscribe: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], options?: ListenerOptions) => void;
    /** @alias addListener */
    readonly listen: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], options?: ListenerOptions) => void;
    readonly once: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], options?: ListenerOptions) => void;
    readonly removeListener: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly off: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly remove: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly un: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], context?: object | null, tag?: string | null) => boolean;
    /** @alias removeListener */
    readonly unsubscribe: <K extends KeyOf<GetActionDefinitionsMap<ActionsMap>>>(name: K, handler: GetActionDefinitionsMap<ActionsMap>[K]["listenerSignature"], context?: object | null, tag?: string | null) => boolean;
    readonly addErrorListener: (handler: ErrorListenerSignature<any[]>, listenerOptions?: ListenerOptions) => void;
    readonly removeErrorListener: (handler: ErrorListenerSignature<any[]>, context?: object | null, tag?: string | null) => boolean;
}>;
export type BaseActionBusDefinition = ActionBusDefinitionHelper<BaseActionsMap>;
export type BaseActionBus = ReturnType<typeof createActionBus<BaseActionsMap>>;
export {};
