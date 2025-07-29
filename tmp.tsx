import { useCallback } from "react";
import { useEvent } from "./src/react/useEvent";
import { useEventListen } from "./src/react/useEventListen";

function Component() {
    const event = useEvent<(a: number) => string>();

    const handler = useCallback(
        (a: number) => {
            console.log("event", a);
            return "test";
        },
        [],
    );

    useEventListen(event, handler);

    return null;
}
