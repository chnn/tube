import { Store } from "./store"
import { deferred, Deferred } from "./utils"

export interface Task<S> {
  restartable: () => Task<S>
  droppable: () => Task<S>
  getTaskProp: () => TaskProp
}

export interface TaskProp {
  (...args: any[]): Promise<void>
  isRunning: boolean
  isIdle: boolean
  called: number
  cancelAll: () => void
}

export interface TaskProps {
  [k: string]: TaskProp
}

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

export type TaskFactory<S> = (f: TubeGeneratorFunction<S>) => Task<S>

export default function createTaskFactory<S>(store: Store<S>): TaskFactory<S> {
  class ChildTask {
    public canceled: boolean

    private g: TubeIterator<S>

    constructor(g: TubeIterator<S>) {
      this.g = g
      this.canceled = false
    }

    public async perform(): Promise<void> {
      let next: TubeIteratorResult<S> = this.g.next()
      let shouldAdvance = true

      while (shouldAdvance) {
        if (this.canceled) {
          return
        }

        shouldAdvance = !next.done

        const isPromise = next.value instanceof Promise
        const result = await next.value

        if (!isPromise && !!result) {
          store.setState(result)
          store.publish("STATE_UPDATED")
        }

        next = this.g.next(result)
      }
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

      const g = this.f(store.getState, ...args)
      const child = new ChildTask(g)

      this.children.push(child) // TODO: Remove after complete

      this.activeCount = this.activeCount + 1
      this.totalCount = this.totalCount + 1
      store.publish("TASKS_UPDATED")

      let childError

      try {
        await child.perform()
      } catch (error) {
        childError = error
      }

      this.activeCount = this.activeCount - 1
      store.publish("TASKS_UPDATED")

      if (!!childError && child.canceled) {
        return
      }

      const { promise } = this.deferred

      if (!!childError && !child.canceled) {
        this.cancelAll()
        this.deferred.reject(childError)
        this.deferred = undefined
      } else if (this.activeCount === 0) {
        this.deferred.resolve()
        this.deferred = undefined
      }

      return promise
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

      const that = this
      const taskProp = Object.assign(
        function() {
          return that.perform(...arguments)
        },
        {
          isRunning,
          isIdle: !isRunning,
          called: this.totalCount,
          cancelAll() {
            return that.cancelAll()
          }
        }
      )

      this.lastTaskProp = { hash, taskProp }

      return taskProp
    }
  }

  function task(f: TubeGeneratorFunction<S>) {
    return new TaskImpl(f)
  }

  return task
}
