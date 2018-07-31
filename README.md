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

Define your application state and wrap your render tree with a `TubeProvider`:

```tsx
// src/index.tsx

import * as React from "react"
import { render } from "react-dom"
import initalize from "tube"

import ConnectedCounter from "./counter"

// Define the shape of your app state
interface AppState {
  count: number
}

// Define the default application state
const initialState: AppState = { count: 0 }

// Initalize your application store
export const { TubeProvider, task, connect } = initialize<AppState>(initialState)

// Render your application tree with the `Tube` provider
render(
  <TubeProvider>
    <ConnectedCounter />
  </TubeProvider>,
  document.getElementById("root")
)
```

Then connect components to your application state via the initialized `task` and `connect` utilities.

```tsx
// src/counter.tsx

import * as React from 'react'
import {TaskProp} from 'tube'

import * as api from './api'
import {task, connect} from './'

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
