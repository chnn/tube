import initialize from "@chnn/tube"

export interface AppState {
  count: number
  notifications: {
    [id: string]: {
      message: string
      time: number
    } | null
  }
}

const initialState: AppState = { count: 0, notifications: {} }

export const { task, connect } = initialize<AppState>(initialState)
