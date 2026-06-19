/**
 * Internal-only symbol used to expose an in-place setter for an action map's
 * forwarded error listeners. Lives under src/lib (which is not re-exported by
 * the package root in index.ts) so it does not become part of the public API
 * surface. Imported by createActionMap (to attach the setter) and by
 * useActionMap (to call it during reconciliation).
 */
export const ActionMapSetErrorListeners: unique symbol = Symbol(
    "actionMapSetErrorListeners",
);
