# Tube

> Easy state management for React, inspired by [Redux](https://redux.js.org/) and [ember-concurrency](http://ember-concurrency.com/docs/introduction/).

Features:

- Single source of truth
- Immutable state updates / event sourcing pattern
- Powerful concurrency primitives
- Derived state (no more `isLoading` bookkeeping)
- In-progress task cancellation
- Made for TypeScript

Design goals:

- Ease of use
- Lack of boilerplate
- Testable API design

### Installation

```
npm install @chnn/tube
```

### Quickstart

Define your application state and initialize Tube's `task` and `connect` utilities:

```tsx
// src/store.tsx

import initalize from "@chnn/tube"

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
import {TaskProp} from '@chnn/tube'

import * as api from "./api"
import { AppState, connect, task } from "./store"

interface Props {
  count: number
  onIncrement: TaskProp
}

const Counter: React.SFC<Props> = ({ count, onIncrement }) => (
  <div className="counter">
    <div className="value">
      Value: {onIncrement.isRunning ? <div className="loader" /> : count}
    </div>
    <button onClick={onIncrement}>+ Add 1</button>
  </div>
)

const increment = task(function*(getState) {
  const x = yield api.getCount(1) // Returns 1 after one second

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

You can [run this example](./demo) yourself.
