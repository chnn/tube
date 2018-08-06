import * as React from "react"

import { AppState, connect } from "./store"

interface Props {
  notifications: Array<{ message: string; time: number }>
}

const NotificationCenter: React.SFC<Props> = ({ notifications }) => (
  <div className="notification-center">
    {notifications.map(n => (
      <div key={n.time} className="notification">
        {n.message}
      </div>
    ))}
  </div>
)

const mstp = (state: AppState) => ({
  notifications: Object.values(state.notifications)
    .filter(v => !!v)
    .sort((a: any, b: any) => a.time - b.time)
})

export default connect(
  mstp,
  {},
  NotificationCenter
)
