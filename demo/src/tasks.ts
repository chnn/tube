import { task } from "./store"
import { delay, generateId } from "./utils"

export const notify = task(function*(getState, message) {
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
