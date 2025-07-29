import { useMemo } from "react";
import { createAction } from "../action";
import { BaseHandler } from "../lib/types";

export function useAction<
    actionSignature extends BaseHandler,
>(action: actionSignature) {
    const event = useMemo(
        () => createAction<actionSignature>(action),
        [],
    );
    return event;
}
