Features:

- Single source of truth
- Immutable state updates / event sourcing pattern
- Powerful concurrency primatives
- Derived state
- TypeScript-first design
- Not much boilerplate
- Testable?

```tsx
// src/store.ts

import initialize from 'tube'

interface AppState {
 count: number
}

const initialState = {count: 0}

export const {WithTube, connect, emitter} = initialize<AppState>(initialState)
```

```tsx
// src/index.tsx

import * as React from 'react'
import * as ReactDOM from 'react-dom'

import {WithTube} from 'src/store'

ReactDOM.render(
  <WithTube><App /></WithTube>,
  document.getElementById('root')
)
```

```tsx
// src/components/Counter.tsx

import {EmitterProp} from 'tube'

import {emitter} from 'src/store'

interface Props {
  count: number
  onIncrement: () => EmitterProp
}

const Counter: SFC<Props> = props => {
  return (
    <div>
      {props.onIncrement.isLoading ? 'Loading...', : props.count}
      <button onClick={props.onIncrement}>+</button>
      <hr>
      Called: {props.onIncrement.called} times
    </div>
  )
}

const increment = emitter(function*(state) {
  const x = yield api.getCount()  // Gets random integer

  return { count: state.count + x }
}).restartable()

const additionalProps = state => {
  count: state.count,
  onIncrement: increment,
}

export default connect(additionalProps, MyComponent)
```

### Concurrency Types

- Race (default)
- Restartable
- Queued
- Dropping
- KeepLatest

### Utilities

- `setter`
- `namespacedEmitter`
