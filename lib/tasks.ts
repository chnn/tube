import { deferred, Deferred } from "./utils"

interface TubeIteratorResult<S> {
  done: boolean
  value: Partial<S> | Promise<any>
}

interface TubeIterator<S> {
  next(value?: any): TubeIteratorResult<S>
  return?(value?: any): TubeIteratorResult<S>
  throw?(e?: any): IteratorResult<any> // TODO
}

export type TubeGeneratorFunction<S> = (
  getState: (() => S),
  ...args: any[]
) => TubeIterator<S>

enum ConcurrencyType {
  Default = "DEFAULT",
  Restartable = "RESTARTABLE",
  Droppable = "DROPPABLE"
}

type Unsubscribe = () => void

type Subscriber = (stateChanged: boolean, taskStateChanged: boolean) => void

export interface TaskProp {
  (...args: any[]): Promise<void>
  isRunning: boolean
  isIdle: boolean
  called: number
  cancelAll: () => void
}

export interface Task<S> {
  restartable: () => Task<S>
  droppable: () => Task<S>
  subscribe: (s: Subscriber) => Unsubscribe
  getTaskProp: () => TaskProp
}

export type TaskFactory<S> = (f: TubeGeneratorFunction<S>) => Task<S>

export default function createTaskFactory<S>(
  getState: () => S,
  setState: (partialState: Partial<S> | null) => void
): TaskFactory<S> {
  class ChildTask {
    private g: TubeIterator<S>
    private onStateUpdate: () => void
    private canceled: boolean

    constructor(g: TubeIterator<S>, onStateUpdate: () => void) {
      this.g = g
      this.canceled = false
      this.onStateUpdate = onStateUpdate
    }

    public async perform(): Promise<void> {
      let next: TubeIteratorResult<S> = this.g.next()

      while (!next.done && !this.canceled) {
        const value = next.value

        if (value instanceof Promise) {
          await value
        } else {
          setState(value)
          this.onStateUpdate()
        }

        next = this.g.next(value)
      }

      if (this.canceled) {
        return
      }

      // Final value assumed to be a state update
      setState(next.value as Partial<S>)

      return
    }

    public cancel() {
      this.canceled = true
    }
  }

  class TaskImpl implements Task<S> {
    private f: TubeGeneratorFunction<S>
    private activeCount: number
    private totalCount: number
    private concurrencyType: ConcurrencyType
    private children: ChildTask[]
    private deferred?: Deferred
    private currentSubscriptionId: number

    private subscribers: {
      [subscriptionId: string]: Subscriber
    }

    private lastTaskProp?: {
      hash: string
      taskProp: TaskProp
    }

    constructor(f: TubeGeneratorFunction<S>) {
      this.f = f
      this.concurrencyType = ConcurrencyType.Default
      this.children = []
      this.activeCount = 0
      this.totalCount = 0
      this.currentSubscriptionId = 0
      this.subscribers = {}
    }

    public perform = async (...args: any[]): Promise<void> => {
      if (this.concurrencyType === ConcurrencyType.Restartable) {
        this.cancelAll()
      } else if (
        this.concurrencyType === ConcurrencyType.Droppable &&
        this.activeCount > 0
      ) {
        return (this.deferred as Deferred).promise
      }

      if (!this.deferred) {
        this.deferred = deferred()
      }

      const g = this.f(getState, ...args)
      const child = new ChildTask(g, this.handleChildStateUpdate)

      this.children.push(child) // TODO: Remove after complete

      this.activeCount = this.activeCount + 1
      this.totalCount = this.totalCount + 1
      this.publish(false, true)

      await child.perform()

      this.activeCount = this.activeCount - 1
      this.publish(false, true)

      const { promise } = this.deferred

      if (this.activeCount === 0) {
        this.deferred.resolve()
        this.deferred = undefined
      }

      return promise
    }

    public subscribe(subscriber: Subscriber) {
      const id = String(this.currentSubscriptionId)
      const unsubscribe = () => {
        delete this.subscribers[id]
      }

      this.subscribers[id] = subscriber
      this.currentSubscriptionId += 1

      return unsubscribe
    }

    public cancelAll = (): void => {
      for (const child of this.children) {
        child.cancel()
      }
    }

    public restartable(): Task<S> {
      this.concurrencyType = ConcurrencyType.Restartable

      return this
    }

    public droppable(): Task<S> {
      this.concurrencyType = ConcurrencyType.Droppable

      return this
    }

    public getTaskProp = (): TaskProp => {
      const isRunning = this.activeCount > 0
      const hash = `${this.totalCount}-${isRunning}`

      if (this.lastTaskProp && this.lastTaskProp.hash === hash) {
        return this.lastTaskProp.taskProp
      }

      const task = this
      const taskProp = Object.assign(
        function() {
          return task.perform(...arguments)
        },
        {
          isRunning,
          isIdle: !isRunning,
          called: this.totalCount,
          cancelAll() {
            return task.cancelAll()
          }
        }
      )

      this.lastTaskProp = { hash, taskProp }

      return taskProp
    }

    private publish = (
      stateChanged: boolean,
      taskStateChanged: boolean
    ): void => {
      // TODO: What's a better public API for a Subscriber?
      for (const subscriber of Object.values(this.subscribers)) {
        subscriber(stateChanged, taskStateChanged)
      }
    }

    private handleChildStateUpdate = () => {
      this.publish(true, false)
    }
  }

  function task(f: TubeGeneratorFunction<S>) {
    return new TaskImpl(f)
  }

  return task
}
