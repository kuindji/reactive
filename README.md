# @kuindji/reactive

A comprehensive JavaScript/TypeScript utility library for building reactive applications with events, actions, stores, and React hooks.

## Features

- **Event System**: Powerful event emitter with advanced filtering, tagging, and return value handling
- **Action System**: Async action handling with success/error responses and listeners
- **Event Bus**: Centralized event management with event source integration
- **Store**: Reactive state management with change events and data transformation
- **React Hooks**: Seamless React integration for all core functionality
- **TypeScript**: Full TypeScript support with advanced type inference

## Installation

```bash
npm install @kuindji/reactive
```

## Table of Contents

- [Events](#events)
- [Actions](#actions)
- [Event Bus](#event-bus)
- [Store](#store)
- [React Hooks](#react-hooks)
- [Types](#types)

## Events

The event system provides a powerful event emitter with advanced features like filtering, tagging, and various return value handling modes.

### createEvent

Creates a new event emitter with optional configuration.

```typescript
import { createEvent } from "@kuindji/reactive";

const event = createEvent<(message: string) => void>();
```

#### Event Options

```typescript
interface EventOptions {
    /** Call this event this number of times; 0 for unlimited */
    limit?: number | null;
    /** Trigger newly added listeners automatically with last trigger arguments */
    autoTrigger?: boolean | null;
    /** A function that decides whether event should trigger a listener this time */
    filter?:
        | ((args: any[], listener: ListenerPrototype<BaseHandler>) => boolean)
        | null;
    /** TriggerFilter's this object, if needed */
    filterContext?: object | null;
    /** Call this event asynchronously */
    async?: boolean | number | null;
}
```

#### Methods

##### addListener(handler, options?)

Adds a listener to the event.

**Aliases**: `on`, `listen`

```typescript
event.addListener((message: string) => {
    console.log(message);
});
```

##### removeListener(handler, context?, tag?)

Removes a listener from the event.

**Aliases**: `un`, `off`, `remove`

```typescript
event.removeListener(handler);
```

##### trigger(...args)

Triggers the event with the given arguments.

**Aliases**: `emit`, `dispatch`

```typescript
event.trigger("Hello, World!");
```

##### hasListener(handler?, context?, tag?)

Checks if a listener exists.

**Alias**: `has`

```typescript
const hasHandler = event.hasListener(handler);
```

##### removeAllListeners(tag?)

Removes all listeners, optionally filtered by tag.

```typescript
event.removeAllListeners();
event.removeAllListeners("my-tag");
```

##### suspend(withQueue?)

Suspends event triggering, optionally queuing events.

```typescript
event.suspend();
event.suspend(true); // Queue events
```

##### resume()

Resumes event triggering and processes queued events.

```typescript
event.resume();
```

##### setOptions(options)

Updates event options.

```typescript
event.setOptions({ limit: 10, async: true });
```

##### reset()

Resets the event to initial state.

```typescript
event.reset();
```

##### isSuspended()

Checks if the event is suspended.

```typescript
const suspended = event.isSuspended();
```

##### isQueued()

Checks if events are being queued.

```typescript
const queued = event.isQueued();
```

##### withTags(tags, callback)

Executes a callback with tag filtering.

```typescript
event.withTags([ "tag1", "tag2" ], () => {
    event.trigger("filtered message");
});
```

##### promise(options?)

Returns a promise that resolves when the event is triggered.

```typescript
const promise = event.promise();
event.trigger("data");
const result = await promise; // ["data"]
```

#### Return Value Methods

##### first(...args)

Returns the result of the first listener.

```typescript
const result = event.first("test");
```

##### resolveFirst(...args)

Returns a promise that resolves with the first listener result.

```typescript
const result = await event.resolveFirst("test");
```

##### all(...args)

Returns an array of all listener results.

```typescript
const results = event.all("test");
```

##### resolveAll(...args)

Returns a promise that resolves with all listener results.

```typescript
const results = await event.resolveAll("test");
```

##### last(...args)

Returns the result of the last listener.

```typescript
const result = event.last("test");
```

##### resolveLast(...args)

Returns a promise that resolves with the last listener result.

```typescript
const result = await event.resolveLast("test");
```

##### merge(...args)

Merges all listener results using Object.assign.

```typescript
const merged = event.merge("test");
```

##### resolveMerge(...args)

Returns a promise that resolves with merged results.

```typescript
const merged = await event.resolveMerge("test");
```

##### concat(...args)

Concatenates all listener results (flattens arrays).

```typescript
const concatenated = event.concat("test");
```

##### resolveConcat(...args)

Returns a promise that resolves with concatenated results.

```typescript
const concatenated = await event.resolveConcat("test");
```

##### firstNonEmpty(...args)

Returns the first non-null/undefined result.

```typescript
const result = event.firstNonEmpty("test");
```

##### resolveFirstNonEmpty(...args)

Returns a promise that resolves with the first non-empty result.

```typescript
const result = await event.resolveFirstNonEmpty("test");
```

##### untilTrue(...args)

Triggers listeners until one returns true.

```typescript
event.untilTrue("test");
```

##### untilFalse(...args)

Triggers listeners until one returns false.

```typescript
event.untilFalse("test");
```

##### pipe(...args)

Pipes the result of each listener to the next.

```typescript
const result = event.pipe("initial");
```

##### resolvePipe(...args)

Returns a promise that resolves with the piped result.

```typescript
const result = await event.resolvePipe("initial");
```

##### raw(...args)

Returns raw listener results without processing.

```typescript
const results = event.raw("test");
```

#### Listener Options

```typescript
interface ListenerOptions {
    /** Call this listener asynchronously */
    async?: boolean | number | null;
    /** Call handler this number of times; 0 for unlimited */
    limit?: number;
    /** True to prepend to the list of listeners */
    first?: boolean;
    /** True to always run this listener before others */
    alwaysFirst?: boolean;
    /** True to always run this listener after others */
    alwaysLast?: boolean;
    /** Start calling listener after this number of calls */
    start?: number;
    /** Listener's context (this) object */
    context?: object | null;
    /** Listener tags */
    tags?: string[];
    /** Additional data passed to filter functions */
    extraData?: any;
}
```

## Actions

The action system provides async action handling with success/error responses and listeners.

### createAction

Creates a new action with automatic error handling and response formatting.

```typescript
import { createAction } from "@kuindji/reactive";

const fetchUser = createAction(async (id: string) => {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
});
```

#### Methods

##### invoke(...args)

Invokes the action with the given arguments.

```typescript
const result = await fetchUser.invoke("123");
// Returns: { response: userData, error: null, request: ["123"] }
// Or: { response: null, error: "Error message", request: ["123"] }
```

##### addListener(handler)

Adds a listener for successful action invocations.

**Aliases**: `on`, `listen`

```typescript
fetchUser.addListener(({ response, error, request }) => {
    if (error) {
        console.error(error);
    }
    else {
        console.log(response);
    }
});
```

##### removeListener(handler, context?, tag?)

Removes a listener.

**Aliases**: `un`, `off`, `remove`

```typescript
fetchUser.removeListener(handler);
```

##### removeAllListeners()

Removes all listeners.

```typescript
fetchUser.removeAllListeners();
```

##### addErrorListener(handler)

Adds a listener for action errors.

```typescript
fetchUser.addErrorListener(({ error, request }) => {
    console.error(`Action failed: ${error}`);
});
```

##### removeErrorListener(handler, context?, tag?)

Removes an error listener.

```typescript
fetchUser.removeErrorListener(handler);
```

##### removeAllErrorListeners()

Removes all error listeners.

```typescript
fetchUser.removeAllErrorListeners();
```

##### promise()

Returns a promise that resolves when the action is invoked.

```typescript
const promise = fetchUser.promise();
await fetchUser.invoke("123");
const result = await promise;
```

##### errorPromise()

Returns a promise that resolves when the action fails.

```typescript
const promise = fetchUser.errorPromise();
await fetchUser.invoke("invalid-id");
const error = await promise;
```

## Action Bus

The action bus provides centralized action management with multiple named actions.

### createActionBus

Creates a new action bus for managing multiple actions.

```typescript
import { createActionBus } from "@kuindji/reactive";

const actionBus = createActionBus({
    fetchUser: async (id: string) => {
        const response = await fetch(`/api/users/${id}`);
        return response.json();
    },
    updateUser: async (id: string, data: any) => {
        const response = await fetch(`/api/users/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });
        return response.json();
    },
});
```

#### Methods

##### add(name, action)

Adds a new action to the bus.

```typescript
actionBus.add("deleteUser", async (id: string) => {
    await fetch(`/api/users/${id}`, { method: "DELETE" });
});
```

##### get(name)

Gets an action by name.

```typescript
const fetchUserAction = actionBus.get("fetchUser");
```

##### invoke(name, ...args)

Invokes an action by name.

```typescript
const result = await actionBus.invoke("fetchUser", "123");
```

##### on(name, handler, options?)

Adds a listener for an action.

**Alias**: `addListener`

```typescript
actionBus.on("fetchUser", ({ response, error, request }) => {
    console.log(response);
});
```

##### once(name, handler, options?)

Adds a one-time listener for an action.

```typescript
actionBus.once("fetchUser", ({ response }) => {
    console.log("First fetch completed:", response);
});
```

##### un(name, handler, context?, tag?)

Removes a listener for an action.

**Aliases**: `removeListener`, `off`

```typescript
actionBus.un("fetchUser", handler);
```

##### onError(handler)

Adds a listener for all action errors.

```typescript
actionBus.onError(({ name, error, request }) => {
    console.error(`Action ${name} failed:`, error);
});
```

##### unError(handler)

Removes an error listener.

```typescript
actionBus.unError(handler);
```

## Event Bus

The event bus provides centralized event management with event source integration.

### createEventBus

Creates a new event bus for managing multiple events.

```typescript
import { createEventBus } from '@kuindji/reactive';

const eventBus = createEventBus({
  userLogin: (user: any) => void,
  userLogout: () => void,
  dataUpdate: (data: any) => void
});
```

#### Event Bus Options

```typescript
interface EventBusOptions {
    /** Event-specific options */
    eventOptions?: {
        [key: MapKey]: EventOptions;
    };
    /** Include default events like "*" */
    includeDefaultEvents?: boolean;
}
```

#### Methods

##### add(name, options?)

Adds a new event to the bus.

```typescript
eventBus.add("customEvent");
```

##### get(name)

Gets an event by name.

```typescript
const event = eventBus.get("userLogin");
```

##### on(name, handler, options?)

Adds a listener for an event.

**Aliases**: `addListener`, `listen`

```typescript
eventBus.on("userLogin", (user) => {
    console.log("User logged in:", user);
});
```

##### once(name, handler, options?)

Adds a one-time listener for an event.

```typescript
eventBus.once("userLogin", (user) => {
    console.log("First login:", user);
});
```

##### un(name, handler, context?, tag?)

Removes a listener for an event.

**Aliases**: `removeListener`, `off`, `remove`

```typescript
eventBus.un("userLogin", handler);
```

##### trigger(name, ...args)

Triggers an event by name.

**Aliases**: `emit`, `dispatch`

```typescript
eventBus.trigger("userLogin", { id: "123", name: "John" });
```

##### promise(name, options?)

Returns a promise that resolves when an event is triggered.

```typescript
const promise = eventBus.promise("userLogin");
eventBus.trigger("userLogin", user);
const result = await promise;
```

##### withTags(tags, callback)

Executes a callback with tag filtering.

```typescript
eventBus.withTags([ "tag1", "tag2" ], () => {
    eventBus.trigger("filteredEvent", "data");
});
```

##### intercept(fn)

Sets an interceptor function for all events.

```typescript
eventBus.intercept((name, args, tags, returnType) => {
    console.log(`Event ${name} triggered with:`, args);
    return true; // Allow event to proceed
});
```

##### stopIntercepting()

Removes the interceptor function.

```typescript
eventBus.stopIntercepting();
```

##### reset()

Resets the event bus to initial state.

```typescript
eventBus.reset();
```

##### suspendAll(withQueue?)

Suspends all events in the bus.

```typescript
eventBus.suspendAll();
eventBus.suspendAll(true); // Queue events
```

##### resumeAll()

Resumes all events in the bus.

```typescript
eventBus.resumeAll();
```

#### Return Value Methods

All return value methods from the event system are available with the event name as the first parameter:

- `first(name, ...args)`
- `resolveFirst(name, ...args)`
- `all(name, ...args)`
- `resolveAll(name, ...args)`
- `last(name, ...args)`
- `resolveLast(name, ...args)`
- `merge(name, ...args)`
- `resolveMerge(name, ...args)`
- `concat(name, ...args)`
- `resolveConcat(name, ...args)`
- `firstNonEmpty(name, ...args)`
- `resolveFirstNonEmpty(name, ...args)`
- `untilTrue(name, ...args)`
- `untilFalse(name, ...args)`
- `pipe(name, ...args)`
- `resolvePipe(name, ...args)`
- `raw(name, ...args)`

#### Event Source Integration

##### addEventSource(eventSource)

Adds an event source for relaying events.

```typescript
const eventSource = {
    name: "external",
    on: (name, handler) => {/* ... */},
    un: (name, handler) => {/* ... */},
    accepts: (name) => true,
    proxyType: ProxyType.TRIGGER,
};

eventBus.addEventSource(eventSource);
```

##### removeEventSource(eventSource)

Removes an event source.

```typescript
eventBus.removeEventSource(eventSource);
// or
eventBus.removeEventSource("external");
```

##### relay(options)

Relays events to an external event source.

```typescript
eventBus.relay({
    eventSource: externalBus,
    remoteEventName: "externalEvent",
    localEventName: "localEvent",
    proxyType: ProxyType.ALL,
});
```

##### unrelay(options)

Stops relaying events to an external event source.

```typescript
eventBus.unrelay({
    eventSource: externalBus,
    remoteEventName: "externalEvent",
    localEventName: "localEvent",
});
```

## Store

The store provides reactive state management with change events and data transformation.

### createStore

Creates a new store for managing application state.

```typescript
import { createStore } from "@kuindji/reactive";

const store = createStore({
    user: null,
    theme: "light",
    settings: {},
});
```

#### Methods

##### set(key, value)

Sets a single property value.

```typescript
store.set("user", { id: "123", name: "John" });
```

##### set(properties)

Sets multiple properties at once.

```typescript
store.set({
    user: { id: "123", name: "John" },
    theme: "dark",
});
```

##### asyncSet(key, value)

Sets a property value asynchronously (next tick).

```typescript
store.asyncSet("user", { id: "123", name: "John" });
```

##### asyncSet(properties)

Sets multiple properties asynchronously.

```typescript
store.asyncSet({
    user: { id: "123", name: "John" },
    theme: "dark",
});
```

##### get(key)

Gets a single property value.

```typescript
const user = store.get("user");
```

##### get(keys)

Gets multiple property values as an object.

```typescript
const { user, theme } = store.get([ "user", "theme" ]);
```

##### getData()

Gets all store data as an object.

```typescript
const allData = store.getData();
```

##### isEmpty()

Checks if the store is empty or contains only null/undefined values.

```typescript
const empty = store.isEmpty();
```

##### batch(fn)

Executes multiple set operations in a batch, triggering change events only once.

```typescript
store.batch(() => {
    store.set("user", user);
    store.set("theme", "dark");
    store.set("settings", settings);
});
```

##### reset()

Clears all store data.

```typescript
store.reset();
```

##### onChange(handler)

Adds a listener for property changes.

```typescript
store.onChange((names) => {
    console.log("Properties changed:", names);
});
```

##### removeOnChange(handler)

Removes a change listener.

```typescript
store.removeOnChange(handler);
```

##### pipe(handler)

Adds a data transformation listener.

```typescript
store.pipe("user", (user) => {
    return { ...user, displayName: `${user.firstName} ${user.lastName}` };
});
```

##### control(handler)

Adds a control event listener.

```typescript
store.control("beforeChange", (name, value) => {
    if (name === "user" && !value) {
        return false; // Prevent setting user to null
    }
    return true;
});
```

#### Store Events

- `beforeChange`: Fired before a property changes, can return false to prevent the change
- `change`: Fired when properties change, receives array of changed property names
- `reset`: Fired when the store is reset

## React Hooks

The library provides React hooks for seamless integration with React components.

### useEvent

Creates an event that persists across component re-renders.

```typescript
import { useEvent } from "@kuindji/reactive/react";

function MyComponent() {
    const event = useEvent<(message: string) => void>();

    useEffect(() => {
        event.addListener((message) => {
            console.log(message);
        });
    }, []);

    return <button onClick={() => event.trigger("Hello!")}>Trigger</button>;
}
```

### useEventBus

Creates an event bus that persists across component re-renders.

```typescript
import { useEventBus } from '@kuindji/reactive/react';

function MyComponent() {
  const eventBus = useEventBus({
    userLogin: (user: any) => void,
    userLogout: () => void
  });
  
  useEffect(() => {
    eventBus.on("userLogin", (user) => {
      console.log("User logged in:", user);
    });
  }, []);
  
  return <button onClick={() => eventBus.trigger("userLogin", user)}>Login</button>;
}
```

### useEventListen

Automatically manages event listener lifecycle.

```typescript
import { useEventListen } from "@kuindji/reactive/react";

function MyComponent({ event }) {
    useEventListen(event, (message) => {
        console.log(message);
    });

    return <div>Listening to events...</div>;
}
```

### useEventBusListen

Automatically manages event bus listener lifecycle.

```typescript
import { useEventBusListen } from "@kuindji/reactive/react";

function MyComponent({ eventBus }) {
    useEventBusListen(eventBus, "userLogin", (user) => {
        console.log("User logged in:", user);
    });

    return <div>Listening to user login events...</div>;
}
```

### useAction

Creates an action that persists across component re-renders.

```typescript
import { useAction } from "@kuindji/reactive/react";

function MyComponent() {
    const fetchUser = useAction(async (id: string) => {
        const response = await fetch(`/api/users/${id}`);
        return response.json();
    });

    useEffect(() => {
        fetchUser.addListener(({ response, error }) => {
            if (error) {
                console.error(error);
            }
            else {
                console.log(response);
            }
        });
    }, []);

    return <button onClick={() => fetchUser.invoke("123")}>Fetch User</button>;
}
```

### useActionBus

Creates an action bus that persists across component re-renders.

```typescript
import { useActionBus } from "@kuindji/reactive/react";

function MyComponent() {
    const actionBus = useActionBus({
        fetchUser: async (id: string) => {
            const response = await fetch(`/api/users/${id}`);
            return response.json();
        },
    });

    useEffect(() => {
        actionBus.on("fetchUser", ({ response, error }) => {
            if (error) {
                console.error(error);
            }
            else {
                console.log(response);
            }
        });
    }, []);

    return (
        <button onClick={() => actionBus.invoke("fetchUser", "123")}>
            Fetch User
        </button>
    );
}
```

### useActionListen

Automatically manages action listener lifecycle.

```typescript
import { useActionListen } from "@kuindji/reactive/react";

function MyComponent({ action }) {
    useActionListen(action, ({ response, error }) => {
        if (error) {
            console.error(error);
        }
        else {
            console.log(response);
        }
    });

    return <div>Listening to action results...</div>;
}
```

### useStore

Creates a store that persists across component re-renders.

```typescript
import { useStore } from "@kuindji/reactive/react";

function MyComponent() {
    const store = useStore({
        user: null,
        theme: "light",
    });

    useEffect(() => {
        store.onChange((names) => {
            console.log("Properties changed:", names);
        });
    }, []);

    return (
        <button onClick={() => store.set("theme", "dark")}>
            Toggle Theme
        </button>
    );
}
```

### useStoreState

Creates a React state that syncs with a store property.

```typescript
import { useStoreState } from "@kuindji/reactive/react";

function MyComponent({ store }) {
    const [ user, setUser ] = useStoreState(store, "user");

    return (
        <div>
            <p>User: {user?.name || "Not logged in"}</p>
            <button onClick={() => setUser({ id: "123", name: "John" })}>
                Set User
            </button>
            <button onClick={() => setUser(null)}>
                Clear User
            </button>
        </div>
    );
}
```

### useStoreValue

Creates a read-only React state that syncs with a store property.

```typescript
import { useStoreValue } from "@kuindji/reactive/react";

function MyComponent({ store }) {
    const theme = useStoreValue(store, "theme");

    return (
        <div className={`theme-${theme}`}>
            Current theme: {theme}
        </div>
    );
}
```

## Types

### TriggerReturnType

Enum for different return value handling modes:

- `RAW`: Returns raw listener results
- `ALL`: Returns array of all listener results
- `CONCAT`: Concatenates all listener results (flattens arrays)
- `MERGE`: Merges all listener results using Object.assign
- `LAST`: Returns the result of the last listener
- `PIPE`: Pipes the result of each listener to the next
- `FIRST`: Returns the result of the first listener
- `UNTIL_TRUE`: Triggers listeners until one returns true
- `UNTIL_FALSE`: Triggers listeners until one returns false
- `FIRST_NON_EMPTY`: Returns the first non-null/undefined result

### ProxyType

Enum for event source proxy types:

- `TRIGGER`: Simple event triggering
- `RAW`: Raw result handling
- `ALL`: All results handling
- `CONCAT`: Concatenated results handling
- `MERGE`: Merged results handling
- `LAST`: Last result handling
- `PIPE`: Piped results handling
- `FIRST`: First result handling
- `UNTIL_TRUE`: Until true handling
- `UNTIL_FALSE`: Until false handling
- `FIRST_NON_EMPTY`: First non-empty handling
- `RESOLVE_ALL`: Promise-based all results handling
- `RESOLVE_MERGE`: Promise-based merged results handling
- `RESOLVE_CONCAT`: Promise-based concatenated results handling
- `RESOLVE_FIRST`: Promise-based first result handling
- `RESOLVE_FIRST_NON_EMPTY`: Promise-based first non-empty handling
- `RESOLVE_LAST`: Promise-based last result handling
- `RESOLVE_PIPE`: Promise-based piped results handling

## Examples

### Basic Event Usage

```typescript
import { createEvent } from "@kuindji/reactive";

const userEvent = createEvent<(user: any) => void>();

userEvent.addListener((user) => {
    console.log("User updated:", user);
});

userEvent.trigger({ id: "123", name: "John" });
```

### Action with Error Handling

```typescript
import { createAction } from "@kuindji/reactive";

const fetchUser = createAction(async (id: string) => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
        throw new Error("Failed to fetch user");
    }
    return response.json();
});

fetchUser.addListener(({ response, error }) => {
    if (error) {
        console.error("Error:", error);
    }
    else {
        console.log("User:", response);
    }
});

await fetchUser.invoke("123");
```

### Store with React Integration

```typescript
import { createStore } from "@kuindji/reactive";
import { useStoreState } from "@kuindji/reactive/react";

const store = createStore({
    user: null,
    theme: "light",
});

function UserProfile() {
    const [ user, setUser ] = useStoreState(store, "user");
    const [ theme, setTheme ] = useStoreState(store, "theme");

    return (
        <div className={`theme-${theme}`}>
            {user
                ? (
                    <div>
                        <h1>{user.name}</h1>
                        <button
                            onClick={() =>
                                setTheme(theme === "light" ? "dark" : "light")}>
                            Toggle Theme
                        </button>
                    </div>
                )
                : (
                    <button
                        onClick={() => setUser({ id: "123", name: "John" })}>
                        Login
                    </button>
                )}
        </div>
    );
}
```

### Event Bus with Multiple Events

```typescript
import { createEventBus } from '@kuindji/reactive';

const appEvents = createEventBus({
  userLogin: (user: any) => void,
  userLogout: () => void,
  dataUpdate: (data: any) => void
});

appEvents.on("userLogin", (user) => {
  console.log("User logged in:", user);
});

appEvents.on("userLogout", () => {
  console.log("User logged out");
});

appEvents.trigger("userLogin", { id: "123", name: "John" });
appEvents.trigger("userLogout");
```

## License

ISC
