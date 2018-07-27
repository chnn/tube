import * as React from "react"
import { render } from "react-dom"

import App from "./App"
import { Tube } from "./store"

render(
  <Tube>
    <App />
  </Tube>,
  document.getElementById("root")
)
