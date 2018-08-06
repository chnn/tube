import * as React from "react"

import Consumer, { MapStateToProps, MapTasksToProps } from "./consumer"
import StoreImpl from "./store"
import createTaskFactory, { Task, TaskFactory } from "./tasks"
import { generateId } from "./utils"

type Connect<S> = (
  mstp: MapStateToProps<S>,
  mttp: MapTasksToProps<S> | (() => MapTasksToProps<S>),
  componentClass: React.ComponentClass<any, any> | React.StatelessComponent<any>
) => React.ComponentClass<any, any>

interface InitializeResult<S> {
  connect: Connect<S>
  task: TaskFactory<S>
}

export default function initialize<S>(initialState: S): InitializeResult<S> {
  const store = new StoreImpl<S>(initialState)
  const task = createTaskFactory<S>(store)
  const connect: Connect<S> = (mapStateToProps, mapTasksToProps, Component) => {
    return class extends React.Component {
      private mapTasksToProps: MapTasksToProps<S>

      public constructor(props: any) {
        super(props)

        if (typeof mapTasksToProps === "function") {
          this.mapTasksToProps = mapTasksToProps()
        } else {
          this.mapTasksToProps = mapTasksToProps
        }
      }

      public render() {
        return (
          <Consumer<S>
            store={store}
            mapStateToProps={mapStateToProps}
            mapTasksToProps={this.mapTasksToProps}
          >
            {additionalProps => (
              <Component {...this.props} {...additionalProps} />
            )}
          </Consumer>
        )
      }
    }
  }

  return { connect, task }
}
