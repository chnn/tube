import * as React from "react"
import { render } from "react-dom"

import App from "./App"
import { TubeProvider } from "./store"

render(
  <TubeProvider>
    <App />
  </TubeProvider>,
  document.getElementById("root")
)
