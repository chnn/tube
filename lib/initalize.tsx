import * as React from "react"

import createTaskBuilderFactory, {
  Task,
  TaskBuilder,
  TaskBuilderFactory
} from "./tasks"

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

type Connect<S> = (
  mapStateToProps: MapStateToProps<S>,
  mapTasksToProps: MapTaskBuildersToProps<S>,
  componentClass: React.ComponentClass<any, any> | React.StatelessComponent<any>
) => React.ComponentClass

interface InitializeResult<S> {
  connect: Connect<S>
  task: TaskBuilderFactory<S>
}

interface StateProps {
  [k: string]: any
}

interface TubeConsumerState {
  stateProps: StateProps
  taskProps: TaskProps
}

export default function initialize<S extends object>(
  initialState: S
): InitializeResult<S> {
  let state: S = initialState

  function getState(): S {
    return state
  }

  function setState(partialState: Partial<S> = {}) {
    // Lots of yucky type assertions here until
    // https://github.com/Microsoft/TypeScript/pull/13288 lands
    state = { ...(state as object), ...(partialState as object) } as S
  }

  const taskBuilderFactory = createTaskBuilderFactory<S>(getState)

  function connect(
    mapStateToProps: MapStateToProps<S>,
    mapTasksToProps: MapTaskBuildersToProps<S>,
    Component: React.ComponentClass | React.StatelessComponent
  ) {
    return class extends React.PureComponent<{}, TubeConsumerState> {
      private tasks: { [k: string]: Task<S> }
      private unsubscribes: Array<() => void>
      private taskPropCache: {
        [taskKey: string]: {
          hash: string
          taskProp: TaskProp
        }
      }

      constructor(props: any) {
        super(props)

        this.tasks = {}
        this.unsubscribes = []
        this.taskPropCache = {}

        for (const [key, builder] of Object.entries(mapTasksToProps)) {
          const task = builder.build()
          const unsubscribe = task.subscribe(this.handleUpdate)

          this.tasks[key] = task
          this.unsubscribes.push(unsubscribe)
        }

        this.state = {
          stateProps: mapStateToProps(getState()),
          taskProps: this.deriveTaskProps()
        }
      }

      public componentWillUnmount() {
        for (const unsubscribe of this.unsubscribes) {
          unsubscribe()
        }
      }

      public render() {
        return (
          <Component
            {...this.props}
            {...this.state.stateProps}
            {...this.state.taskProps}
          />
        )
      }

      private handleUpdate = (
        newState: Partial<S> | null,
        taskStateChanged: boolean
      ): void => {
        const nextState: any = {}

        if (newState) {
          setState(newState)
          nextState.stateProps = mapStateToProps(getState())
        }

        if (taskStateChanged) {
          const newTaskProps = this.deriveTaskProps()

          if (Object.keys(newTaskProps).length > 0) {
            nextState.taskProps = {
              ...this.state.taskProps,
              ...newTaskProps
            }
          }
        }

        if (Object.keys(nextState).length > 0) {
          this.setState(nextState)
        }
      }

      private deriveTaskProps = (): TaskProps => {
        const props: TaskProps = {}

        for (const [taskKey, task] of Object.entries(this.tasks)) {
          const isRunning = task.activeCount > 0
          const isIdle = task.activeCount === 0
          const called = task.totalCount
          const hash = `${called}-${isRunning}-${isIdle}`
          const cachedTaskProp = this.taskPropCache[taskKey]

          if (!cachedTaskProp || cachedTaskProp.hash !== hash) {
            const taskProp = Object.assign(
              function() {
                return task.do(...arguments)
              },
              {
                isRunning,
                isIdle,
                called,
                cancelAll() {
                  return task.cancelAll()
                }
              }
            )

            this.taskPropCache[taskKey] = { hash, taskProp }
            props[taskKey] = taskProp
          }
        }

        return props
      }
    }
  }

  return {
    connect,
    task: taskBuilderFactory
  }
}
