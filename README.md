# Tube

> Easy state management for React, inspired by [Redux](https://redux.js.org/) and [ember-concurrency](http://ember-concurrency.com/docs/introduction/).

Features:

- Single source of truth
- Immutable state updates / event sourcing pattern
- Powerful concurrency primitives
- Derived state (no more `isLoading` bookkeeping)
- In-progress task cancellation

Design goals:

- Ease of use
- Lack of boilerplate
- Type safety
- Testable API design

### Quickstart

Define your application state and initialize Tube's `task` and `connect` utilities:

```tsx
// src/store.tsx

import initalize from "tube"

interface AppState {
  count: number
}

const initialState: AppState = { count: 0 }

export const { task, connect } = initialize<AppState>(initialState)
```

Then connect components to your application state using `task` and `connect`:

```tsx
// src/counter.tsx

import * as React from 'react'
import {TaskProp} from 'tube'

import * as api from './api'
import {task, connect} from './store'

interface CounterProps {
  count: number
  onIncrement: TaskProp
}

const Counter: React.SFC<CounterProps> = props => (
  <div className="counter">
    <div>Value: {props.onIncrement.isLoading ? "..." : props.count}</div>
    <button onClick={props.onIncrement}>+ Increment</button>
  </div>
)

const increment = task(function*(getState) {
  const x = yield api.getCount() // Resolves after 1 second

  return { count: getState().count + x }
}).restartable()

const mapStateToProps = (state: AppState) => ({
  count: state.count
})

const mapTasksToProps = {
  onIncrement: increment
}

export default connect(
  mapStateToProps,
  mapTasksToProps,
  Counter
)
```

You can [run this example](./examples/counter) yourself.
