# @kuindji/reactive

A JavaScript/TypeScript utility library for building reactive applications with events, actions, stores, and React hooks.

[![npm version](https://badge.fury.io/js/%40kuindji%2Freactive.svg)](https://badge.fury.io/js/%40kuindji%2Freactive)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## Features

- **Event System**: Event emitter with subscriber/dispatcher and collector modes
- **Action System**: Async action handling with error management, response tracking and loading/error/response status
- **Store System**: Reactive state management with change tracking, validation and computed/derived values
- **EventBus**: Centralized event management for complex applications
- **ActionBus & ActionMap**: Organized action management with error handling
- **React Integration**: Full React hooks support with error boundaries
- **TypeScript**: First-class TypeScript support with full type safety
- **Async Support**: Built-in async/await support for all operations
- **Error Handling**: Comprehensive error handling and recovery mechanisms

## Installation

```bash
npm install @kuindji/reactive
# or
yarn add @kuindji/reactive
# or
bun add @kuindji/reactive
```

## Table of Contents

- [Event](#event)
- [EventBus](#eventbus)
- [Action](#action)
- [ActionMap](#actionmap)
- [ActionBus](#actionbus)
- [Store](#store)
- [React Hooks](#react-hooks)
- [ErrorBoundary](#errorboundary)
- [Examples](#examples)

## Event

Event emitter with three distinct modes:

- **Subscriber/Dispatcher Mode**: Traditional event emitter pattern where listeners are notified of events
- **Collector Mode**: Trigger collects data from listeners in various ways (first, last, all, merge, etc.)
- **Pipe Mode**: Data flows through listeners in a pipeline, each transforming the data

### Basic Usage

```typescript
import { createEvent } from "@kuindji/reactive";

// Create a typed event
// When creating event, provide a listener signature generic to make full event api typed.
const userLoginEvent = createEvent<(userId: string, timestamp: Date) => void>();

// Add listeners
userLoginEvent.addListener((userId, timestamp) => {
    console.log(`User ${userId} logged in at ${timestamp}`);
});

// Trigger the event
userLoginEvent.trigger("user123", new Date());
```

### Event Options

```typescript
// all settings are optional
const event = createEvent({
    async: boolean, // Call listeners asynchronously; default false
    limit: number, // Event can be triggered 10 times; default 0 (unlimited)
    autoTrigger: boolean, // Auto-trigger new listeners with last args; default false
    maxListeners: number, // Maximum number of listeners; default: 1000
    // default: undefined
    filter: (args: TriggerArgs[], listener: ListenerOptions): boolean => {
        // Custom filter logic
        // args: arguments passed to trigger()
        // listener: an object with listener options and handler itself
        return true;
    },
});
```

### Listener Options

```typescript
// all settings are optional
event.addListener(handler, {
    limit: number, // Call this listener 5 times; default 0 (unlimited)
    first: boolean, // Add to beginning of listener list; default false
    alwaysFirst: boolean, // Always call before other listeners; default false
    alwaysLast: boolean, // Always call after other listeners; default false
    start: number, // Start calling after 3rd trigger; default 0
    context: object, // Listener context (this); default undefined
    tags: string[], // Listener tags for filtering; default undefined
    async: booleantrue, // Call this listener asynchronously; default false
    extraData: object, // Custom data will be passed to filter()
    signal: AbortSignal, // Auto-remove the listener when this signal aborts
});
```

When a `signal` is provided, the listener is removed automatically once the
signal aborts (and is not added at all if the signal is already aborted). The
abort subscription is cleaned up if the listener is removed first, so there is no
dangling reference into a still-live signal:

```typescript
const controller = new AbortController();
event.addListener(handler, { signal: controller.signal });
controller.abort(); // handler is now removed
```

### Collector

Collector allows you to gather data from listeners.

```typescript
type ApplicationData = {
    user: {
        username?: string;
        role?: string;
        loggedIn: boolean;
    };
    notifications: {
        type: string;
        message: string;
    }[];
};
const event = createEvent<() => Partial<ApplicationData>>();
event.addListener(() => {
    return {
        user: {
            username: "john",
            role: "admin",
            loggedIn: true,
        },
    };
});
event.addListener(() => {
    return {
        notifications: [
            {
                type: "chat",
                message: "You've got a new message!",
            },
        ],
    };
});

const applicationData = event.merge();
```

### Pipe

Data flows through listeners in a pipeline, each transforming the data

```typescript
const event = createEvent((value: number) => number);
event.addListener(value => value + value);
event.addListener(value => value * value);
const value = event.pipe(1); // value = 4
```

### Event API

#### Core Methods

- `addListener(listener, options?)` - Add event listener
  - **Aliases**: `on()`, `listen()`, `subscribe()`
- `once(listener, options?)` - Add a listener that is removed after a single call (sugar for `addListener(listener, { ...options, limit: 1 })`)
- `removeListener(listener, context?, tag?)` - Remove specific listener
  - **Aliases**: `un()`, `off()`, `remove()`, `unsubscribe()`
- `updateListenerOptions(listener, context?, nextOptions?)` - Update a registered listener's soft options (`limit`, `start`, `async`, `tags`, `extraData`, `alwaysFirst`/`alwaysLast`) **in place**, preserving its `called`/`count` counters. Matches the listener by `listener` + `context`. Returns `true` if a listener was found. `context` is an identity field and is not updated here (resubscribe to change it); `first` is insertion-time only and ignored. Lowering `limit` to at/below the current `called` removes the listener immediately.
- `hasListener(listener?, context?, tag?)` - Check if listener exists
  - **Aliases**: `has()`
- `removeAllListeners(tag?)` - Remove all listeners (optionally by tag)
- `trigger(...args)` - Trigger the event
  - **Aliases**: `emit()`, `dispatch()`
- `setOptions(options)` - Update event options in place. Accepts any `EventOptions` field (`async`, `limit`, `autoTrigger`, `filter`, `filterContext`, `maxListeners`). Does not reset the internal `triggered` count.

#### Collector Methods

- `first(...args)` - Get first listener's result
- `last(...args)` - Get last listener's result
- `all(...args)` - Get all listener results
- `merge(...args)` - Merge all results (for arrays/objects)
- `concat(...args)` - Concatenate all results
- `firstNonEmpty(...args)` - Get first non-empty result
- `untilTrue(...args)` - Stop when listener returns true
- `untilFalse(...args)` - Stop when listener returns false
- `pipe(...args)` - Pipe data through listeners

#### Async Versions

- `resolveFirst(...args)` - Async version of first()
- `resolveLast(...args)` - Async version of last()
- `resolveAll(...args)` - Async version of all()
- `resolveMerge(...args)` - Async version of merge()
- `resolveConcat(...args)` - Async version of concat()
- `resolveFirstNonEmpty(...args)` - Async version of firstNonEmpty()
- `resolvePipe(...args)` - Async version of pipe()

#### Utility Methods

- `promise(options?: ListenerOptions)` - Get a promise that resolves on next trigger
- `suspend(withQueue?: boolean)` - Suspend event triggering; When `withQueue=true`, all trigger calls will be queued and replayed after resume()
- `resume()` - Resume event triggering
- `reset()` - Reset event state
- `destroy()` - Tear down the event: remove all listeners (unwinding any `AbortSignal` subscriptions) and mark it dead. After `destroy()`, `trigger()` and `addListener()` throw rather than silently no-op.
- `isDestroyed()` - Returns `true` once `destroy()` has been called
- `withTags(tags: string[], callback: () => CallbackResponse) => CallbackResponse` - Execute callback with specific tags

#### Introspection

- `listenerCount(tag?)` - Number of registered listeners, optionally filtered by tag
- `triggeredCount()` - How many times the event has been triggered
- `lastTriggerArgs()` - The most recent trigger arguments (a copy), or `null` if never triggered
- `getListeners()` - Read-only projection of registered listeners (`handler`, `context`, `tags`, `limit`, `start`, `called`, `count`, `async`, ordering flags, `extraData`). Mutating the returned objects does not affect the event.

## EventBus

### Description

EventBus provides centralized event management for applications. It allows you to define multiple named events and manage them together with features like event source integration, proxying, and interception.

### Basic Usage

```typescript
import { createEventBus } from "@kuindji/reactive";

// Define event signatures
type AppEvents = {
    userLogin: (userId: string) => void;
    userLogout: (userId: string) => void;
    dataUpdate: (data: any) => void;
};

// Create event bus
const eventBus = createEventBus<AppEvents>();

// Add listeners
eventBus.on("userLogin", (userId) => {
    console.log(`User ${userId} logged in`);
});

// Trigger events
eventBus.trigger("userLogin", "user123");
```

### Relay

Relay allows you to forward events from one EventBus to another EventBus.

```typescript
import { createEventBus, ProxyType } from "@kuindji/reactive";
// Create event buses
const mainBus = createEventBus<{
    userLogin: (userId: string) => void;
    userLogout: (userId: string) => void;
    dataUpdate: (data: any) => void;
}>();

const externalBus = createEventBus<{
    login: (userId: string) => void;
    logout: (userId: string) => void;
    update: (data: any) => void;
}>();

// Relay events from external bus to main bus
mainBus.relay({
    eventSource: externalBus,
    remoteEventName: "login",
    localEventName: "userLogin",
});

mainBus.relay({
    eventSource: externalBus,
    remoteEventName: "logout",
    localEventName: "userLogout",
});

mainBus.relay({
    eventSource: externalBus,
    remoteEventName: "update",
    localEventName: "dataUpdate",
});

// Listen to events on main bus
mainBus.on("userLogin", (userId) => {
    console.log(`User ${userId} logged in via relay`);
});

// Trigger on external bus - will be relayed to main bus
externalBus.trigger("login", "user123");
```

#### Relay with Prefix

You can use prefixes to organize relayed events:

```typescript
// Relay all events with a prefix
mainBus.relay({
    eventSource: externalBus,
    remoteEventName: "*", // Relay all events
    localEventNamePrefix: "external-",
});

// Now external events will be available as:
// external-login, external-logout, external-update
mainBus.on("external-login", (userId) => {
    console.log(`External login: ${userId}`);
});
```

#### Relay with Different Proxy Types

You can control how relayed events handle return values:

```typescript
// Relay with pipe proxy type - data flows through listeners
mainBus.relay({
    eventSource: externalBus,
    remoteEventName: "processData",
    localEventName: "transformData",
    proxyType: ProxyType.PIPE,
});
// now when you call remote "processData" event
// it will passed through mainBus's "transformData" pipeline and returned to externalBus.
const transformedData = externalBus.first("processData", { some: data });

// Relay with merge proxy type - merge results from all listeners
mainBus.relay({
    eventSource: externalBus,
    remoteEventName: "collectData",
    localEventName: "aggregateData",
    proxyType: ProxyType.MERGE,
});

// Relay with async resolve proxy type
mainBus.relay({
    eventSource: externalBus,
    remoteEventName: "asyncOperation",
    localEventName: "handleAsync",
    proxyType: ProxyType.RESOLVE_ALL,
});
```

#### Unrelay

Stop relaying events:

```typescript
// Stop relaying specific event
mainBus.unrelay({
    eventSource: externalBus,
    remoteEventName: "login",
    localEventName: "userLogin",
});

// Stop relaying all events
mainBus.unrelay({
    eventSource: externalBus,
    remoteEventName: "*",
    localEventNamePrefix: "external-",
});
```

### Event Source

Event sources allow you to integrate with external event systems that follow the EventSource interface. This is useful for WebSocket connections, Node.js EventEmitter, or custom event systems.

```typescript
import { createEventBus } from "@kuindji/reactive";
import { EventEmitter } from "events";

// Create a Node.js EventEmitter as an event source
const nodeEmitter = new EventEmitter();

// Define the event source interface
const eventSource = {
    name: "node-emitter",
    on: (name: string, fn: (...args: any[]) => void) => {
        nodeEmitter.on(name, fn);
    },
    un: (name: string, fn: (...args: any[]) => void) => {
        nodeEmitter.off(name, fn);
    },
    accepts: (name: string) => true, // Accept all events
    proxyType: ProxyType.TRIGGER,
};

// Create event bus
const eventBus = createEventBus<{
    userAction: (action: string, userId: string) => void;
    systemEvent: (event: string, data: any) => void;
}>();

// Add event source
eventBus.addEventSource(eventSource);

// Listen to events
eventBus.on("userAction", (action, userId) => {
    console.log(`User ${userId} performed action: ${action}`);
});

// Emit on the external source - will be relayed to event bus
nodeEmitter.emit("userAction", "login", "user123");
```

#### WebSocket Event Source

```typescript
// Create WebSocket event source
const createWebSocketEventSource = (ws: WebSocket) => ({
    name: "websocket",
    on: (name: string, fn: (...args: any[]) => void) => {
        ws.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            if (data.type === name) {
                fn(data.payload);
            }
        });
    },
    un: (name: string, fn: (...args: any[]) => void) => {
        ws.removeEventListener("message", fn);
    },
    accepts: (name: string) => true,
    proxyType: ProxyType.TRIGGER,
});

// Usage
const ws = new WebSocket("ws://localhost:8080");
const wsEventSource = createWebSocketEventSource(ws);

const eventBus = createEventBus<{
    chatMessage: (message: string, userId: string) => void;
    userJoined: (userId: string) => void;
    userLeft: (userId: string) => void;
}>();

eventBus.addEventSource(wsEventSource);

// Listen to WebSocket events
eventBus.on("chatMessage", (message, userId) => {
    console.log(`${userId}: ${message}`);
});
```

#### Custom Event Source with Filtering

```typescript
// Create custom event source with filtering
const createCustomEventSource = () => {
    const listeners = new Map<string, Set<(...args: any[]) => void>>();

    return {
        name: "custom-source",
        on: (name: string, fn: (...args: any[]) => void) => {
            if (!listeners.has(name)) {
                listeners.set(name, new Set());
            }
            listeners.get(name)!.add(fn);
        },
        un: (name: string, fn: (...args: any[]) => void) => {
            listeners.get(name)?.delete(fn);
        },
        accepts: (name: string) => name.startsWith("app-"), // Only accept app-* events
        proxyType: ProxyType.TRIGGER,

        // Custom method to trigger events
        trigger: (name: string, ...args: any[]) => {
            listeners.get(name)?.forEach(fn => fn(...args));
        },
    };
};

const customSource = createCustomEventSource();
const eventBus = createEventBus<{
    appStart: () => void;
    appStop: () => void;
}>();

eventBus.addEventSource(customSource);

// Listen to custom events
eventBus.on("appStart", () => {
    console.log("Application started");
});

// Trigger on custom source
customSource.trigger("appStart");
```

### EventBus API

#### Core Methods

- `addListener(name, handler, options?)` - Add listener to specific event
  - **Aliases**: `on()`, `listen()`, `subscribe()`
- `once(name, handler, options?)` - Add one-time listener
- `removeListener(name, handler, context?, tag?)` - Remove listener
  - **Aliases**: `un()`, `off()`, `remove()`, `unsubscribe()`
- `updateListenerOptions(name, handler, context?, nextOptions?)` - Update a registered listener's soft options in place (see Event's `updateListenerOptions`). Returns `false` if the event does not exist.
- `trigger(name, ...args)` - Trigger specific event
  - **Aliases**: `emit()`, `dispatch()`
- `get(name)` - Get event instance by name
- `add(name, options?)` - Add new event to bus
- `setOptions(options?)` - Update bus options. Present per-event entries in `eventOptions` are applied to already-created events via `event.setOptions`, and future events use the latest stored options. A removed event-name entry leaves the existing event unchanged.

#### Collector Methods

- `first(name, ...args)` - Get first listener result
- `last(name, ...args)` - Get last listener result
- `all(name, ...args)` - Get all listener results
- `merge(name, ...args)` - Merge all results
- `concat(name, ...args)` - Concatenate all results
- `firstNonEmpty(name, ...args)` - Get first non-empty result
- `untilTrue(name, ...args)` - Stop when listener returns true
- `untilFalse(name, ...args)` - Stop when listener returns false
- `pipe(name, ...args)` - Pipe data through listeners

#### Async Versions

- `resolveFirst(name, ...args)` - Async version of first()
- `resolveLast(name, ...args)` - Async version of last()
- `resolveAll(name, ...args)` - Async version of all()
- `resolveMerge(name, ...args)` - Async version of merge()
- `resolveConcat(name, ...args)` - Async version of concat()
- `resolveFirstNonEmpty(name, ...args)` - Async version of firstNonEmpty()
- `resolvePipe(name, ...args)` - Async version of pipe()

#### Advanced Features

- `intercept(fn)` - Intercept all event triggers
- `stopIntercepting()` - Stop interception
- `relay(options)` - Relay events from external sources
- `unrelay(options)` - Stop relaying events
- `addEventSource(source)` - Add external event source
- `removeEventSource(source)` - Remove event source
- `suspendAll(withQueue?)` - Suspend all events
- `resumeAll()` - Resume all events
- `reset()` - Reset all events: unrelay all relays and remove all event sources (detaching their external listeners), then clear every owned event and interception/tag state. The bus stays usable afterwards.
- `destroy()` - Tear down the bus: unrelay all relays, remove all event sources (detaching their external listeners), destroy every owned event, and mark the bus dead. After `destroy()`, `trigger()`/`on()` throw.
- `isDestroyed()` - Returns `true` once `destroy()` has been called
- `withTags(tags, callback)` - Execute callback with specific tags

## Action

### Description

Actions are async operations with built-in error handling and response tracking. They provide a structured way to handle async operations and their results.

### Basic Usage

```typescript
import { createAction } from "@kuindji/reactive";

// Define an async action
const fetchUserAction = createAction(async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
        throw new Error("User not found");
    }
    return response.json();
});

// Add listeners for success/error
fetchUserAction.addListener(({ response, error, args }) => {
    if (error) {
        console.error("Action failed:", error);
    }
    else {
        console.log("User data:", response);
    }
});

// Invoke the action
const result = await fetchUserAction.invoke("user123");
```

### Action API

#### Core Methods

- `invoke(...args)` - Execute the action
- `setAction(fn)` - Replace the action function in place. Subsequent `invoke()` calls use the new function; all response, before-action and error listeners are preserved (they live in separate events). The replacement must keep a compatible signature.
- `addListener(handler, options?)` - Add response listener
  - **Aliases**: `on()`, `listen()`, `subscribe()`
- `removeListener(handler, context?, tag?)` - Remove listener
  - **Aliases**: `un()`, `off()`, `remove()`, `unsubscribe()`
- `updateListenerOptions(handler, context?, nextOptions?)` - Update a response listener's soft options in place (see Event's `updateListenerOptions`)
- `removeAllListeners(tag?)` - Remove all listeners
- `destroy()` - Tear down the action: destroy its response, before-action, error and status events and mark it dead. After `destroy()`, `invoke()`/`addListener()` throw.
- `isDestroyed()` - Returns `true` once `destroy()` has been called

#### Error Handling

- `addErrorListener(handler, context?)` - Add error listener
- `removeErrorListener(handler, context?)` - Remove error listener
- `removeAllErrorListeners(tag?)` - Remove all error listeners

#### Status (loading / error / response)

An action tracks the status of its `invoke` lifecycle so UI can drive
`loading`/`disabled` without a hand-rolled `useState(false)`. `pending` is true
while one or more invocations are in flight; `response`/`error` hold the last
settled outcome (a before-action veto settles to neither). This is **not** a
cache — `response` is just the last value.

- `getStatus()` - Returns `{ pending: boolean, error: Error | null, response: T | null }`. The reference is stable while unchanged (safe for `useSyncExternalStore`).
- `onStatusChange(handler)` - Subscribe to status changes
- `removeStatusListener(handler)` - Remove a status listener

```typescript
const saveAction = createAction(async (data: FormData) => save(data));

saveAction.onStatusChange(({ pending, error }) => {
    button.disabled = pending;
});

await saveAction.invoke(form); // pending -> true, then false on settle
```

In React, prefer the `useAsyncAction` / `useActionBusStatus` hooks (see React Hooks).

#### Utility Methods

- `promise(options?)` - Get promise for next invocation
- `beforeActionPromise(options?)` - Get promise for the next before-action call
- `errorPromise(options?)` - Get promise for the next action error

#### Before Action Methods

- `addBeforeActionListener(handler, options?)` - Add listener that runs before invocation
- `removeBeforeActionListener(handler, context?, tag?)` - Remove before-action listener
- `removeAllBeforeActionListeners(tag?)` - Remove all before-action listeners

## ActionMap

### Description

ActionMap provides a way to organize multiple actions with centralized error handling. It's useful for managing related actions in a structured way.

### Basic Usage

```typescript
import { createActionMap } from "@kuindji/reactive";

// Define actions
const actions = {
    fetchUser: async (userId: string) => {
        const response = await fetch(`/api/users/${userId}`);
        return response.json();
    },
    updateUser: async (userId: string, data: any) => {
        const response = await fetch(`/api/users/${userId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return response.json();
    },
    deleteUser: async (userId: string) => {
        await fetch(`/api/users/${userId}`, { method: "DELETE" });
    },
};

// type ErrorResponse = {
//     args: TriggerArgs[],
//     error: Error,
//     name?: ActionName,
//     type?: "action"
// }

// Create action map with error handling
const actionMap = createActionMap(actions, (errorResponse: ErrorResponse) => {
    console.error("Action failed:", errorResponse);
});

// Use actions
const user = await actionMap.fetchUser.invoke("user123");
await actionMap.updateUser.invoke("user123", { name: "John" });
```

### ActionMap API

The ActionMap returns an object where each key corresponds to an action with the same API as individual actions created with `createAction()`.

## ActionBus

### Description

ActionBus provides centralized action management similar to EventBus but for actions. It allows you to dynamically add and manage actions with built-in error handling.

### Basic Usage

```typescript
import { createActionBus } from "@kuindji/reactive";

type Actions = {
    fetchUser: (userId: string) => Promise<UserData>;
    updateUser: (userId: string, data: UserData) => Promise<UserData>;
};

// Create action bus
const actionBus = createActionBus<Actions>();

// Add actions
actionBus.add("fetchUser", async (userId) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
});

actionBus.add("updateUser", async (userId, data) => {
    const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    return response.json();
});

// Add listeners
actionBus.on("fetchUser", ({ response, error }) => {
    if (error) {
        console.error("Failed to fetch user:", error);
    }
    else {
        console.log("User fetched:", response);
    }
});

// Invoke actions
const user = await actionBus.invoke("fetchUser", "user123");
```

### ActionBus API

#### Core Methods

- `add(name, action)` - Add action to bus (no-op if it already exists)
- `replace(name, action)` - Replace an existing action's function in place via `setAction` (preserving its listeners and the bus error-forwarding listener); adds it if the name is new
- `removeAction(name)` - Remove an action from the bus (named `removeAction` because `remove` is an alias for `removeListener`). Afterwards `invoke`/`on`/`un` for that name throw `Action <name> not found`.
- `has(name)` - Check if action exists
- `get(name)` - Get action by name
- `invoke(name, ...args)` - Invoke action by name
- `addListener(name, handler, options?)` - Add listener to action
  - **Aliases**: `on()`, `listen()`, `subscribe()`
- `once(name, handler, options?)` - Add one-time listener
- `removeListener(name, handler, context?, tag?)` - Remove listener
  - **Aliases**: `un()`, `off()`, `remove()`, `unsubscribe()`
- `updateListenerOptions(name, handler, context?, nextOptions?)` - Update a response listener's soft options in place (see Event's `updateListenerOptions`)
- `destroy()` - Tear down the bus: destroy every owned action and the error event, then drop them all. After `destroy()`, `invoke()`/`on()` throw.
- `isDestroyed()` - Returns `true` once `destroy()` has been called

#### Status (loading / error / response)

Delegates to the underlying action's status (see Action → Status). This is the
primary path for apps that route mutations through one shared ActionBus.

- `getStatus(name)` - Status for a named action; an unregistered name reports an idle status
- `onStatusChange(name, handler)` - Subscribe to a named action's status. Subscribing before the action is registered is retained and attached automatically once it is added (and re-attached if the action is later removed and re-added)
- `removeStatusListener(name, handler)` - Remove a status listener (also clears a subscription retained before registration)

#### Error Handling

- `addErrorListener(handler)` - Add global error listener
- `removeErrorListener(handler)` - Remove global error listener
- `hasErrorListeners()` - Check if error listeners exist

## Store

### Description

Store provides reactive state management with change tracking, validation, and event-driven updates. It's designed for managing application state with full TypeScript support.

### Basic Usage

```typescript
import { createStore } from "@kuindji/reactive";

// Define store schema
type UserStore = {
    id: string;
    name: string;
    email: string;
    isLoggedIn: boolean;
};

// Create store with initial data
const userStore = createStore<UserStore>({
    id: "",
    name: "",
    email: "",
    isLoggedIn: false,
});

// Listen to changes
userStore.onChange("name", (newName, oldName) => {
    console.log(`Name changed from ${oldName} to ${newName}`);
});

// Update store
userStore.set("name", "John Doe");
userStore.set("isLoggedIn", true);

// Get values
const name = userStore.get("name");
const userData = userStore.get([ "name", "email" ]); // { name: string, email: string }
```

### Store API

#### Core Methods

- `set(key, value)` - Set single property
- `set(data)` - Set multiple properties
- `asyncSet(key, value)` - Async set single property
- `asyncSet(data)` - Async set multiple properties
- `get(key)` - Get single property
- `get(keys)` - Get multiple properties
- `computed(key, deps, fn)` - Register a derived value (see Computed values)
- `isEmpty()` - Check if store is empty
- `getData()` - Get all store data
- `reset()` - Clear store data. Computed keys are re-seeded from the cleared dependencies (so they stay consistent with `fn(deps)` rather than going stale) and remain live.
- `destroy()` - Tear down the store: destroy the underlying change/pipe/control buses and drop all data. After `destroy()`, `set()`/`get()` throw.
- `isDestroyed()` - Returns `true` once `destroy()` has been called

#### Event Methods

- `onChange(key, handler, options?)` - Listen to property changes
- `removeOnChange(key, handler, context?, tag?)` - Remove a change listener
- `updateOnChangeOptions(key, handler, context?, nextOptions?)` - Update a change listener's soft options in place (see Event's `updateListenerOptions`)
- `pipe(key, handler)` - Add data transformation pipeline
- `control(event, handler)` - Control store events

#### Control Events

- `beforeChange` - Fired before property changes (can prevent change)
- `change` - Fired after properties change
- `reset` - Fired when store is reset
- `error` - Fired when errors occur

#### Utility Methods

- `batch(fn)` - Batch multiple changes

#### Computed values

Declare a derived key in the store type, then attach its derivation with
`computed(key, deps, fn)`. It recomputes automatically when any dependency
changes and notifies like any other key — `get`, `getData`, `onChange`,
`useStoreState` and `useStoreSelector` all see it transparently. Computed keys
are read-only: calling `set` on one throws. Computed-of-computed chains are
supported, and a cyclic computed throws rather than looping.

```typescript
type UserStore = {
    first: string;
    last: string;
    fullName: string; // declared in the type, registered as computed
};

const store = createStore<UserStore>({ first: "Jane", last: "Doe" });

store.computed("fullName", [ "first", "last" ], (first, last) => `${first} ${last}`);

store.get("fullName");        // "Jane Doe"
store.onChange("fullName", (v) => console.log(v));
store.set("first", "John");   // fullName recomputes -> "John Doe"
store.set("fullName", "x");   // throws: computed is read-only
```

> **Note:** recompute is registration-order, not topologically sorted, so a
> chained or diamond-shaped computed may recompute internally more than once per
> change. This is invisible to consumers: a single `set(...)`/`set({...})`/`batch`
> coalesces the `onChange` stream, so each computed fires `onChange` once with
> its settled value and the correct previous value. The final value is always
> correct. Registering base computeds before dependents reduces redundant
> internal recomputes.

## React Hooks

### Description

The library provides comprehensive React hooks for integrating reactive functionality into React components with automatic cleanup and error handling.

### Basic Usage

```typescript
import {  useListenToEvent } from "@kuindji/reactive/react";

const event = createEvent(() => void);

function FirstComponent() {
    
    // Use in component
    const handleClick = () => {
        event.trigger();
    };

    return (
        <div>
            <button onClick={handleClick}>Trigger event</button>
        </div>
    );
}

function AnotherComponent() {
    const handler = useCallback(
        () => {
            console.log("something happened in first component")
        },
        []
    );
    useListenToEvent(event, handler);
}
```

### Available Hooks

Create and use event

```typescript
const event = useEvent(
    listenerOptions?: ListenerOptions,
    listener?: Function,
    errorListener?: (errorResponse) => void
);
```

Listen to event

```typescript
useListenToEvent(
    event: Event, 
    listener?: Function, 
    errorListener?: (errorResponse) => void
)
```

Create and use event bus

```typescript
type EventBus = {
    eventName: Function
}
type EventBusOptions = {
    eventName: EventOptions
}
const eventBus = useEventBus<EventBus>(
    options?: EventBusOptions,
    allEventsListener?: Function,
    errorListener?: (errorResponse) => void
);
```

Listen to bus events

```typescript
useListenToEventBus(
    eventBus: EventBus,
    eventName: string,
    listener: Function,
    listenerOptions?: ListenerOptions,
    errorListener?: (errorResponse) => void
)
```

Create and use action

```typescript
const action = useAction(
    action: Function,
    listener?: Function,
    errorListener?: (errorResponse) => void
);
```

Listen to action events

```typescript
useListenToAction(
    action: Action,
    listener?: Function,
    errorListener?: (errorResponse) => void
)
```

Create and use action map

```typescript
const actionMap = useActionMap(
    actions: {
        actionName: Function
    },
    errorListener?: (errorResponse) => void
)
```

Create and use action bus

```typescript
type ActionsMap = {
    actionName: FunctionSignature
}
const actionBus = useActionBus<ActionsMap>(
    initialActions: Partial<ActionsMap>,
    errorListener?: (errorResponse) => void
)
```

Create and use data store

```typescript
type PropTypes = {
    propName: number
}
const store = useStore<PropTypes>(
    initialData: Partial<PropTypes>,
    config: {
        onChange: {
            [K in keyof PropTypes]: (
                value: PropTypes[K],
                prevValue: PropTypes[K] | undefined
            ) => void
        };
        pipes: {
            [K in keyof PropTypes]: (
                value: PropTypes[K]
            ) => PropTypes[K]
        };
        control: {
            beforeChange: (name, value) => boolean;
            change: (names) => void;
            error: (errorResponse) => void;
            reset: () => void;
        }
    }
);
```

Use store value as state

```typescript
const [ value: TypeOfValue, setValue: (value: TypeOfValue) => void ] = useStoreState(
    store: Store,
    key: KeyInStore
)
```

Listen to value changes

```typescript
useListenToStoreChanges(
    store: Store,
    key: KeyInStore,
    listener: (value: TypeOfValue, previousValue?: TypeOfValue) => void
    listenerOptions?: ListenerOptions
)
```

Select a derived slice with equality (bails out of re-renders while the result
is unchanged). Two forms — a selector over the whole state, or a deps-keyed form
that recomputes only when the listed keys change:

```typescript
// selector form (default equality is Object.is)
const label = useStoreSelector(store, (s) => `${s.first} ${s.last}`, shallowEqual?);

// deps-keyed form
const anyLoading = useStoreSelector(store, [ "a", "b", "c" ], (a, b, c) => a || b || c);
```

Drive `loading`/`disabled` from an action's status. `useActionBusStatus` is the
primary path for apps built around one shared ActionBus; `useAsyncAction` wraps a
standalone function:

```typescript
// shared ActionBus
const { loading, error, response } = useActionBusStatus(appActions, "user/login");

// standalone action
const [ submit, { loading, error } ] = useAsyncAction(saveProfileFn);
// <Button loading={loading} disabled={loading} onClick={() => submit(form)} />
```

### Reconciliation across renders

Hook inputs are reconciled on every render using semantic comparison, so you
can safely pass inline objects (e.g. `{ tags: [tag] }`) without object identity
forcing a resubscribe:

- **Listener options** (`useListenToEvent`/`useListenToEventBus`/`useListenToActionBus`/`useListenToStoreChanges`) are compared field by field (`tags` is an order-insensitive set). A semantically equal object is a no-op. A changed soft option updates the live listener **in place**, preserving its `called`/`count` counters. Changing `context` (an identity field) resubscribes using the old context.
- **`useEvent` event options** and **`useEventBus` options** are reconciled via `setOptions` instead of being ignored (and `useEventBus` no longer throws when options change).
- **`useAction`/`useActionBus`/`useActionMap` action functions** are replaced in place via `setAction` (compared by reference), preserving all listeners; `useActionBus` also adds/removes actions as its map changes. The `useActionMap` key set is fixed by its type contract — a runtime key-set change throws.
- **`useStore` config** (`onChange`/`pipes`/`control`) is reconciled by category + key (functions compared by reference); only handlers added by the hook are touched. **`initialData` is seed-only** — it initializes the store once and later changes are intentionally ignored (live data is owned by `set`/`useStoreState`).

## ErrorBoundary

### Description

ErrorBoundary provides catch-all error listener for actions and events. Without ErrorBoundary (or with empty "listener") and without error listener passed directly to them they will re-throw errors from listeners.

### Basic Usage

```typescript
import { ErrorBoundary } from "@kuindji/reactive/react";

function App() {
    return (
        <ErrorBoundary
            listener={(errorResponse) => {
                console.error("Reactive error:", errorResponse);
                // Send to error reporting service
            }}>
            <UserComponent />
        </ErrorBoundary>
    );
}
```

### ErrorBoundary API

- `children` - React children to render
- `listener` - Error listener function (optional)

## License

ISC License

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues or have questions, please [open an issue](https://github.com/kuindji/reactive/issues) on GitHub.
