import * as React from "react"

import Counter from "./Counter"
import NotificationCenter from "./NotificationCenter"
import "./styles.css"

const App: React.SFC = () => {
  return (
    <div className="app">
      <NotificationCenter />
      <Counter />
    </div>
  )
}

export default App
