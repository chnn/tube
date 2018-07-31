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

export interface Task<S> {
  activeCount: number
  totalCount: number
  do: (...args: any[]) => Promise<void>
  subscribe: (
    onStateUpdate: (s: Partial<S>) => void,
    onTasksUpdate: () => void
  ) => Unsubscribe
  cancelAll: () => void
}

export interface TaskBuilder<S> {
  restartable: () => TaskBuilder<S>
  droppable: () => TaskBuilder<S>
  build: () => Task<S>
}

export type TaskBuilderFactory<S> = (
  f: TubeGeneratorFunction<S>
) => TaskBuilder<S>

export default function createTaskBuilderFactory<S>(
  getState: () => S
): TaskBuilderFactory<S> {
  class ChildTask {
    private g: TubeIterator<S>
    private canceled: boolean

    constructor(g: TubeIterator<S>) {
      this.g = g
      this.canceled = false
    }

    public async do(): Promise<Partial<S>> {
      let next: TubeIteratorResult<S> = this.g.next()

      while (!next.done && !this.canceled) {
        const value = await next.value

        next = await this.g.next(value)
      }

      if (this.canceled) {
        return {}
      }

      return next.value as Partial<S>
    }

    public cancel() {
      this.canceled = true
    }
  }

  class TaskImpl implements Task<S> {
    public activeCount: number
    public totalCount: number

    private f: TubeGeneratorFunction<S>
    private concurrencyType: ConcurrencyType
    private children: ChildTask[]
    private deferred?: Deferred
    private currentSubscriptionId: number
    private subscribers: {
      [subscriptionId: string]: [(s: Partial<S>) => void, () => void]
    }

    constructor(f: TubeGeneratorFunction<S>, concurrencyType: ConcurrencyType) {
      this.f = f
      this.concurrencyType = concurrencyType
      this.children = []
      this.activeCount = 0
      this.totalCount = 0
      this.currentSubscriptionId = 0
      this.subscribers = {}
    }

    public do = async (...args: any[]): Promise<void> => {
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
      const child = new ChildTask(g)

      this.children.push(child) // TODO: Remove after complete
      this.activeCount = this.activeCount + 1
      this.totalCount = this.totalCount + 1

      this.publishTasksUpdate()

      const partialState = await child.do()

      this.activeCount = this.activeCount - 1

      this.publishStateUpdates(partialState)

      const { promise } = this.deferred

      if (this.activeCount === 0) {
        this.deferred.resolve()
        this.deferred = undefined
      }

      return promise
    }

    public subscribe(
      onStateUpdate: (s: Partial<S>) => void,
      onTasksUpdate: () => void
    ) {
      const id = String(this.currentSubscriptionId)
      const unsubscribe = () => {
        delete this.subscribers[id]
      }

      this.subscribers[id] = [onStateUpdate, onTasksUpdate]
      this.currentSubscriptionId += 1

      return unsubscribe
    }

    public cancelAll = (): void => {
      for (const child of this.children) {
        child.cancel()
      }
    }

    private publishTasksUpdate = (): void => {
      for (const [_, onTasksUpdate] of Object.values(this.subscribers)) {
        onTasksUpdate()
      }
    }

    private publishStateUpdates = (stateUpdate: Partial<S> = {}): void => {
      for (const [onStateUpdate] of Object.values(this.subscribers)) {
        onStateUpdate(stateUpdate)
      }
    }
  }

  class TaskBuilderImpl implements TaskBuilder<S> {
    private f: TubeGeneratorFunction<S>
    private concurrencyType = ConcurrencyType.Default

    constructor(f: TubeGeneratorFunction<S>) {
      this.f = f
    }

    public restartable(): TaskBuilder<S> {
      this.concurrencyType = ConcurrencyType.Restartable

      return this
    }

    public droppable(): TaskBuilder<S> {
      this.concurrencyType = ConcurrencyType.Droppable

      return this
    }

    public build(): Task<S> {
      return new TaskImpl(this.f, this.concurrencyType)
    }
  }

  function task(f: TubeGeneratorFunction<S>) {
    return new TaskBuilderImpl(f)
  }

  return task
}
