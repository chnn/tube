import * as React from "react"
import { TaskProp } from "../../../src"

import * as api from "./api"
import { AppState, connect, task } from "./store"

interface Props {
  count: number
  onIncrement: TaskProp
}

const Counter: React.SFC<Props> = props => {
  return (
    <div className="counter">
      <table>
        <tbody>
          <tr>
            <td>Value: </td>
            <td>
              {props.onIncrement.isRunning ? (
                <div className="loader" />
              ) : (
                props.count
              )}
            </td>
          </tr>
          <tr>
            <td>Called: </td>
            <td>{props.onIncrement.called}</td>
          </tr>
        </tbody>
      </table>
      <button onClick={props.onIncrement}>+ Add 1</button>
    </div>
  )
}

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
