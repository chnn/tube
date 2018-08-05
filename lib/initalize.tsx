import * as React from "react"

import createTaskFactory, { Task, TaskFactory, TaskProp } from "./tasks"

interface TaskProps {
  [k: string]: TaskProp
}

type MapStateToProps<S> = ((state: S) => { [k: string]: any })

interface MapTasksToProps<S> {
  [k: string]: Task<S>
}

type Connect<S> = (
  mstp: MapStateToProps<S>,
  mttp: MapTasksToProps<S>,
  componentClass: React.ComponentClass<any, any> | React.StatelessComponent<any>
) => React.ComponentClass

interface InitializeResult<S> {
  connect: Connect<S>
  task: TaskFactory<S>
}

interface StateProps {
  [k: string]: any
}

interface TubeConsumerState {
  stateProps: StateProps
  taskProps: TaskProps
}

function deriveTaskProps<S>(mttp: MapTasksToProps<S>): TaskProps {
  return Object.entries(mttp).reduce(
    (acc, [k, task]) => ({
      ...acc,
      [k]: task.getTaskProp()
    }),
    {}
  )
}

export default function initialize<S extends object>(
  initialState: S
): InitializeResult<S> {
  let state: S = initialState

  function getState(): S {
    return state
  }

  function setState(partialState: Partial<S> | null) {
    if (!partialState) {
      return
    }

    // Lots of yucky type assertions here until
    // https://github.com/Microsoft/TypeScript/pull/13288 lands
    state = { ...(state as object), ...(partialState as object) } as S
  }

  const taskFactory = createTaskFactory<S>(getState, setState)

  function connect(
    mstp: MapStateToProps<S>,
    mttp: MapTasksToProps<S>,
    Component: React.ComponentClass | React.StatelessComponent
  ) {
    return class extends React.PureComponent<any, TubeConsumerState> {
      private unsubscribes: Array<() => void>

      constructor(props: any) {
        super(props)

        this.unsubscribes = Object.values(mttp).map(task =>
          task.subscribe(this.handleUpdate)
        )

        this.state = {
          stateProps: mstp(getState()),
          taskProps: deriveTaskProps(mttp)
        }
      }

      public componentWillUnmount() {
        this.unsubscribes.forEach(unsubscribe => unsubscribe())
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
        stateChanged: boolean,
        tasksStateChanged: boolean
      ): void => {
        const nextState: any = {}

        if (stateChanged) {
          nextState.stateProps = mstp(getState())
        }

        if (tasksStateChanged) {
          nextState.taskProps = deriveTaskProps(mttp)
        }

        this.setState(nextState)
      }
    }
  }

  return {
    connect,
    task: taskFactory
  }
}
