# @kuindji/reactive

A JavaScript/TypeScript utility library for building reactive applications with events, actions, stores, and React hooks.

[![npm version](https://badge.fury.io/js/%40kuindji%2Freactive.svg)](https://badge.fury.io/js/%40kuindji%2Freactive)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## Features

- **Event System**: Event emitter with subscriber/dispatcher and collector modes
- **Action System**: Async action handling with error management and response tracking
- **Store System**: Reactive state management with change tracking and validation
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
});
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
- `removeListener(listener, context?, tag?)` - Remove specific listener
  - **Aliases**: `un()`, `off()`, `remove()`, `unsubscribe()`
- `hasListener(listener?, context?, tag?)` - Check if listener exists
  - **Aliases**: `has()`
- `removeAllListeners(tag?)` - Remove all listeners (optionally by tag)
- `trigger(...args)` - Trigger the event
  - **Aliases**: `emit()`, `dispatch()`

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
- `withTags(tags: string[], callback: () => CallbackResponse) => CallbackResponse` - Execute callback with specific tags

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
- `trigger(name, ...args)` - Trigger specific event
  - **Aliases**: `emit()`, `dispatch()`
- `get(name)` - Get event instance by name
- `add(name, options?)` - Add new event to bus

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
- `reset()` - Reset all events
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
- `addListener(handler, options?)` - Add response listener
  - **Aliases**: `on()`, `listen()`, `subscribe()`
- `removeListener(handler, context?, tag?)` - Remove listener
  - **Aliases**: `un()`, `off()`, `remove()`, `unsubscribe()`
- `hasListener(handler?, context?, tag?)` - Check if listener exists
  - **Aliases**: `has()`
- `removeAllListeners(tag?)` - Remove all listeners

#### Error Handling

- `addErrorListener(handler, context?)` - Add error listener
- `removeErrorListener(handler, context?)` - Remove error listener
- `hasErrorListeners()` - Check if error listeners exist
- `removeAllErrorListeners(tag?)` - Remove all error listeners

#### Utility Methods

- `promise(options?)` - Get promise for next invocation
- `suspend(withQueue?)` - Suspend action execution
- `resume()` - Resume action execution
- `reset()` - Reset action state

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

- `add(name, action)` - Add action to bus
- `get(name)` - Get action by name
- `invoke(name, ...args)` - Invoke action by name
- `addListener(name, handler, options?)` - Add listener to action
  - **Aliases**: `on()`, `listen()`, `subscribe()`
- `once(name, handler, options?)` - Add one-time listener
- `removeListener(name, handler, context?, tag?)` - Remove listener
  - **Aliases**: `un()`, `off()`, `remove()`, `unsubscribe()`
- `has(name)` - Check if action exists
- `remove(name)` - Remove action

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
- `isEmpty()` - Check if store is empty
- `getData()` - Get all store data
- `reset()` - Reset store to initial state

#### Event Methods

- `onChange(key, handler)` - Listen to property changes
- `pipe(key, handler)` - Add data transformation pipeline
- `control(event, handler)` - Control store events

#### Control Events

- `beforeChange` - Fired before property changes (can prevent change)
- `change` - Fired after properties change
- `reset` - Fired when store is reset
- `error` - Fired when errors occur

#### Utility Methods

- `batch(fn)` - Batch multiple changes

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
