import { generateId } from "./utils"

export type StoreEvent =
  | "STATE_UPDATED"
  | "TASKS_UPDATED"
  | "STATE_AND_TASKS_UPDATED"

export type Subscriber = (e: StoreEvent) => void

export type Unsubscribe = () => void

export interface Store<S> {
  getState: () => S
  setState: (p: Partial<S>) => void
  subscribe: (s: Subscriber) => Unsubscribe
  publish: (e: StoreEvent) => void
}

export default class StoreImpl<S> implements Store<S> {
  private state: S

  private subscribers: {
    [subscriptionId: string]: Subscriber
  }

  constructor(initialState: S) {
    this.state = initialState
    this.subscribers = {}
  }

  // TODO: Subscriber subscribes to specific task ids
  public subscribe = (subscriber: Subscriber): Unsubscribe => {
    const id = generateId()
    const unsubscribe = () => {
      delete this.subscribers[id]
    }

    this.subscribers[id] = subscriber

    return unsubscribe
  }

  public getState = (): S => {
    return this.state
  }

  public setState = (partialState: Partial<S>) => {
    this.state = Object.assign({}, this.state, partialState)
  }

  public publish = (e: StoreEvent): void => {
    Object.values(this.subscribers).forEach(s => s(e))
  }
}
