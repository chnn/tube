import * as React from "react"
import { TaskProp } from "../../../src"

import * as api from "./api"
import { connect, task } from "./store"

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
            <td>{props.onIncrement.isRunning ? "..." : props.count}</td>
          </tr>
          <tr>
            <td>Called: </td>
            <td>{props.onIncrement.called}</td>
          </tr>
        </tbody>
      </table>
      <button onClick={props.onIncrement}>+ Increment</button>
    </div>
  )
}

const increment = task(function*(state) {
  const x = yield api.getCount() // Gets random integer

  return { count: state.count + x }
}).restartable()

const additionalProps = (state: any) => ({
  count: state.count,
  onIncrement: increment
})

export default connect(
  additionalProps,
  Counter
)
