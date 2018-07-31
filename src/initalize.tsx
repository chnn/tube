import * as React from "react"
import { ComponentClass, PureComponent, StatelessComponent } from "react"

import createTaskBuilderFactory, {
  Task,
  TaskBuilder,
  TaskBuilderFactory,
  TubeGeneratorFunction
} from "./tasks"
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

interface MapTaskBuildersToProps<S> {
  [k: string]: TaskBuilder<S>
}

interface MapTasksToProps<S> {
  [k: string]: Task<S>
}

type Connect<S> = (
  mapStateToProps: MapStateToProps<S>,
  mapTasksToProps: MapTaskBuildersToProps<S>,
  componentClass: ComponentClass<any, any> | StatelessComponent<any>
) => React.ComponentClass

interface InitializeResult<S> {
  TubeProvider: ComponentClass
  connect: Connect<S>
  task: TaskBuilderFactory<S>
}

export default function initialize<S extends object>(
  initialState: S
): InitializeResult<S> {
  const { Provider, Consumer } = React.createContext<S>(initialState)
  const tubes: TubeProvider[] = []

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

  class TubeProvider extends PureComponent<{}, {}> {
    public constructor(props: {}) {
      super(props)

      tubes.push(this)
    }

    public render() {
      return <Provider value={state}>{this.props.children}</Provider>
    }
  }

  const taskBuilderFactory = createTaskBuilderFactory<S>(getState)

  function connect(
    mapStateToProps: MapStateToProps<S>,
    mapTasksToProps: MapTaskBuildersToProps<S>,
    Component: ComponentClass | StatelessComponent
  ) {
    return class TubeConsumer extends React.Component {
      private tasks: {
        [k: string]: Task<S>
      }
      private unsubscribes: Array<() => void>

      constructor(props: any) {
        super(props)

        this.tasks = {}
        this.unsubscribes = []

        for (const [key, builder] of Object.entries(mapTasksToProps)) {
          const task = builder.build()

          this.tasks[key] = task
          this.unsubscribes.push(task.subscribe(updateState, updateState))
        }
      }

      public componentWillUnmount() {
        for (const unsubscribe of this.unsubscribes) {
          unsubscribe()
        }
      }

      public render() {
        // TODO: Should cache task props as agressively as possible
        return (
          <Consumer>
            {state => (
              <Component
                {...this.props}
                {...mapStateToProps(state)}
                {...deriveTaskProps(this.tasks)}
              />
            )}
          </Consumer>
        )
      }
    }
  }

  return {
    TubeProvider,
    connect,
    task: taskBuilderFactory
  }
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

function deriveTaskProps<S>(mttp: MapTasksToProps<S>) {
  const result: TaskProps = {}

  for (const [k, v] of Object.entries(mttp)) {
    result[k] = deriveTaskProp(v)
  }

  return result
}
