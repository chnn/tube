import * as React from "react"

import Consumer, { MapStateToProps, MapTasksToProps } from "./consumer"
import StoreImpl from "./store"
import createTaskFactory, { Task, TaskFactory } from "./tasks"
import { generateId } from "./utils"

type Connect<S> = (
  mstp: MapStateToProps<S>,
  mttp: MapTasksToProps<S>,
  componentClass: React.ComponentClass<any, any> | React.StatelessComponent<any>
) => React.ComponentClass

interface InitializeResult<S> {
  connect: Connect<S>
  task: TaskFactory<S>
}

export default function initialize<S>(initialState: S): InitializeResult<S> {
  const store = new StoreImpl<S>(initialState)
  const taskFactory = createTaskFactory<S>(store)

  function connect(
    mapStateToProps: MapStateToProps<S>,
    mapTasksToProps: MapTasksToProps<S>,
    Component: React.ComponentClass | React.StatelessComponent
  ) {
    return class extends React.Component {
      public constructor(props: any) {
        super(props)

        // TODO: If mttp is function, initalize here
      }

      public render() {
        return (
          <Consumer<S>
            store={store}
            mapStateToProps={mapStateToProps}
            mapTasksToProps={mapTasksToProps}
          >
            {additionalProps => (
              <Component {...this.props} {...additionalProps} />
            )}
          </Consumer>
        )
      }
    }
  }

  return {
    connect,
    task: taskFactory
  }
}
