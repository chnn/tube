import * as React from "react"
import { ComponentClass, PureComponent, StatelessComponent } from "react"

import createTaskFactory, { Task, TaskFactory } from "./tasks"
import { deferred, Deferred } from "./utils"

export interface TaskProp {
  (...args: any[]): Promise<void>
  isRunning: boolean
  isIdle: boolean
  called: number
  cancelAll: () => void
}

interface TaskProps {
  [k: string]: TaskProp
}

type MapStateToProps<S> = ((state: S) => { [k: string]: any })

interface MapTasksToProps<S> {
  [k: string]: Task<S>
}

type Connect<S> = (
  mapStateToProps: MapStateToProps<S>,
  mapTasksToProps: MapTasksToProps<S>,
  componentClass: ComponentClass<any, any> | StatelessComponent<any>
) => ((props: any) => JSX.Element)

interface InitializeResult<S> {
  Tube: ComponentClass
  connect: Connect<S>
  task: TaskFactory<S>
}

export default function initialize<S extends object>(
  initialState: S
): InitializeResult<S> {
  const { Provider, Consumer } = React.createContext<S>(initialState)
  const tubes: Tube[] = []

  let state: S = initialState

  function getState(): S {
    return state
  }

  function updateState(partialState: Partial<S> = {}) {
    // Lots of yucky type assertions here until
    // https://github.com/Microsoft/TypeScript/pull/13288 lands
    state = { ...(state as object), ...(partialState as object) } as S

    tubes.forEach(t => t.forceUpdate())
  }

  class Tube extends PureComponent<{}, {}> {
    public constructor(props: {}) {
      super(props)

      tubes.push(this)
    }

    public render() {
      return <Provider value={state}>{this.props.children}</Provider>
    }
  }

  const task = createTaskFactory<S>(getState)

  function connect(
    mapStateToProps: MapStateToProps<S>,
    mapTasksToProps: MapTasksToProps<S>,
    Component: ComponentClass | StatelessComponent
  ) {
    for (const t of Object.values(mapTasksToProps)) {
      t.subscribe(updateState, updateState)
    }

    // TODO: `Task`s should not be shared across component instances
    return (props: any) => (
      // TODO: Should cache itask props as agressively as possible (revision
      // counter?)
      <Consumer>
        {state => (
          <Component
            {...props}
            {...mapStateToProps(state)}
            {...deriveTaskProps(mapTasksToProps)}
          />
        )}
      </Consumer>
    )
  }

  return { Tube, task, connect }
}

// TODO: Remove unnecessary generic passing
function deriveTaskProp<S>(t: Task<S>): TaskProp {
  return Object.assign(
    function() {
      return t.do(...arguments)
    },
    {
      isRunning: t.activeCount > 0,
      isIdle: t.activeCount === 0,
      called: t.totalCount,
      cancelAll: t.cancelAll
    }
  )
}

// TODO: Remove unnecessary generic passing
function deriveTaskProps<S>(mttp: MapTasksToProps<S>) {
  const result: TaskProps = {}

  for (const [k, v] of Object.entries(mttp)) {
    result[k] = deriveTaskProp(v)
  }

  return result
}
