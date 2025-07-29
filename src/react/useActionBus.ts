import { useMemo } from "react";
import { type BaseActionsMap, createActionBus } from "../actionBus";

export function useActionBus<
    ActionsMap extends BaseActionsMap = BaseActionsMap,
>(initialActions?: ActionsMap) {
    const actionBus = useMemo(
        () => createActionBus<ActionsMap>(initialActions),
        [],
    );
    return actionBus;
}
