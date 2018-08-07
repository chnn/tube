import * as React from "react"

import { Store, StoreEvent, Unsubscribe } from "./store"
import { Task, TaskProps } from "./tasks"

export type MapStateToProps<S> = ((state: S) => { [k: string]: any })

export interface MapTasksToProps<S> {
  [k: string]: Task<S>
}

interface StateProps {
  [k: string]: any
}

interface ConsumerProps<S> {
  store: Store<S>
  mapStateToProps: MapStateToProps<S>
  mapTasksToProps: MapTasksToProps<S>
  children: (additionalProps: { [k: string]: any }) => React.ReactNode
}

interface ConsumerState {
  stateProps: StateProps
  taskProps: TaskProps
}

export default class Consumer<S> extends React.Component<
  ConsumerProps<S>,
  ConsumerState
> {
  private unsubscribe: Unsubscribe

  constructor(props: ConsumerProps<S>) {
    super(props)

    const { store, mapStateToProps, mapTasksToProps } = props

    this.unsubscribe = store.subscribe(this.handleUpdate)
    this.state = {
      stateProps: mapStateToProps(store.getState()),
      taskProps: deriveTaskProps(mapTasksToProps)
    }
  }

  public componentWillUnmount() {
    this.unsubscribe()
  }

  public shouldComponentUpdate(_: any, nextState: ConsumerState) {
    if (nextState.stateProps !== this.state.stateProps) {
      return true
    }

    for (const [key, taskProp] of Object.entries(nextState.taskProps)) {
      if (this.state.taskProps[key] !== taskProp) {
        return true
      }
    }

    return false
  }

  public render() {
    const additionalProps = {
      ...this.state.stateProps,
      ...this.state.taskProps
    }

    return this.props.children(additionalProps)
  }

  private handleUpdate = (e: StoreEvent): void => {
    const { store, mapStateToProps, mapTasksToProps } = this.props

    switch (e) {
      case "STATE_UPDATED":
        return this.setState({
          stateProps: mapStateToProps(store.getState())
        })
      case "TASKS_UPDATED":
        return this.setState({
          taskProps: deriveTaskProps(mapTasksToProps)
        })
      case "STATE_AND_TASKS_UPDATED":
        return this.setState({
          stateProps: mapStateToProps(store.getState()),
          taskProps: deriveTaskProps(mapTasksToProps)
        })
    }
  }
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
