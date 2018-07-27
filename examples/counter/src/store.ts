import initialize from "../../../src"

interface AppState {
  count: number
}

const initialState: AppState = { count: 0 }

export const { Tube, task, connect } = initialize<AppState>(initialState)
