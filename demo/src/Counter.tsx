import { TaskProp } from "@chnn/tube"
import * as React from "react"

import * as api from "./api"
import { AppState, connect, task } from "./store"
import { delay, generateId } from "./utils"

interface Props {
  count: number
  onIncrement: TaskProp
  onNotify: TaskProp
}

const Counter: React.SFC<Props> = ({ count, onIncrement, onNotify }) => {
  const onClick = () => {
    onIncrement()
    onNotify("You clicked the button.")
  }

  return (
    <div className="counter">
      <div className="value">
        Value: {onIncrement.isRunning ? <div className="loader" /> : count}
      </div>
      <button onClick={onClick}>+ Add 1</button>
    </div>
  )
}

const increment = task(function*(getState) {
  const x = yield api.getCount(1) // Returns 1 after one second

  return { count: getState().count + x }
}).restartable()

const notify = task(function*(getState, message) {
  const id = generateId()

  yield {
    notifications: {
      ...getState().notifications,
      [id]: {
        message,
        time: Date.now()
      }
    }
  }

  yield delay(3000)

  yield {
    notifications: {
      ...getState().notifications,
      [id]: null
    }
  }
})

const mapStateToProps = (state: AppState) => ({
  count: state.count
})

const mapTasksToProps = {
  onIncrement: increment,
  onNotify: notify
}

export default connect(
  mapStateToProps,
  mapTasksToProps,
  Counter
)
