import * as React from "react"
import { ComponentClass, PureComponent, StatelessComponent } from "react"

type Next<S> = Partial<S> | Promise<any>

type TubeGenerator<S> = Iterator<Next<S>>

type TubeGeneratorFunction<S> = (
  getState: (() => S),
  ...args: any[]
) => TubeGenerator<S>

export interface TaskProp {
  (...args: any[]): Promise<void>
  isRunning: boolean
  isIdle: boolean
  called: number
  cancelAll: () => void
}

enum ConcurrencyType {
  Racey = "RACEY",
  Restartable = "RESTARTABLE"
}

// TODO
type Task = any

type TaskCreator<S> = (f: TubeGeneratorFunction<S>) => Task

type MapStateToProps<S> = ((state: S) => { [k: string]: any })

interface MapTasksToProps {
  [k: string]: Task
}

type Connect<S> = (
  mapStateToProps: MapStateToProps<S>,
  mapTasksToProps: MapTasksToProps,
  componentClass: ComponentClass<any, any> | StatelessComponent<any>
) => ((props: any) => JSX.Element)

interface InitializeResult<S> {
  Tube: ComponentClass
  connect: Connect<S>
  task: TaskCreator<S>
}

interface Deferred {
  promise: Promise<any>
  resolve: Function
  reject: Function
}

function deferred(): Deferred {
  const d: any = {}

  d.promise = new Promise((resolve, reject) => {
    d.resolve = resolve
    d.reject = reject
  })

  return d as Deferred
}

export default function initialize<S extends object>(
  initialState: S
): InitializeResult<S> {
  const { Provider, Consumer } = React.createContext<S>(initialState)
  const tubes: Tube[] = []

  let state: S = initialState

  function getState(): S {
    return state
  }

  function update(partialState: Partial<S> = {}) {
    // Lots of yucky type assertions here until
    // https://github.com/Microsoft/TypeScript/pull/13288 lands
    //
    // TODO: Event log
    state = { ...(state as object), ...(partialState as object) } as S

    tubes.forEach(t => t.forceUpdate())
  }

  class Tube extends PureComponent<{}, {}> {
    public constructor(props: {}) {
      super(props)

      tubes.push(this)
    }

    public render() {
      return <Provider value={state}>{this.props.children}</Provider>
    }
  }

  class ChildTask {
    private g: TubeGenerator<S>

    constructor(g: TubeGenerator<S>) {
      this.g = g
    }

    public async do(): Promise<Partial<S>> {
      let next: IteratorResult<Next<S>> = this.g.next()

      while (!next.done) {
        const value = await next.value

        next = await this.g.next(value)
      }

      return next.value as Partial<S>
    }

    public cancel() {}
  }

  class Task {
    public activeCount: number
    public totalCount: number

    private f: TubeGeneratorFunction<S>
    private concurrencyType: ConcurrencyType
    private children: ChildTask[]
    private deferred?: Deferred

    constructor(f: TubeGeneratorFunction<S>) {
      this.f = f
      this.concurrencyType = ConcurrencyType.Racey
      this.children = []
      this.activeCount = 0
      this.totalCount = 0
    }

    public do = async (...args: any[]): Promise<void> => {
      if (this.concurrencyType === ConcurrencyType.Restartable) {
        for (const child of this.children) {
          child.cancel()
        }
      }

      if (!this.deferred) {
        this.deferred = deferred()
      }

      const g = this.f(getState, ...args)
      const child = new ChildTask(g)

      this.children.push(child)
      this.activeCount = this.activeCount + 1
      this.totalCount = this.totalCount + 1

      // Trigger TaskProp updates
      update()

      const partialState = await child.do()

      this.activeCount = this.activeCount - 1

      update(partialState)

      const { promise } = this.deferred

      if (this.activeCount === 0) {
        this.deferred.resolve()
        this.deferred = undefined
      }

      return promise
    }

    public cancelAll = (): void => {}

    public racey(): Task {
      this.concurrencyType = ConcurrencyType.Racey

      return this
    }

    public restartable(): Task {
      this.concurrencyType = ConcurrencyType.Restartable

      return this
    }
  }

  function taskProp(t: Task): TaskProp {
    return Object.assign(
      function() {
        return t.do(...arguments)
      },
      {
        isRunning: t.activeCount > 0,
        isIdle: t.activeCount === 0,
        called: t.totalCount,
        cancelAll: t.cancelAll
      }
    )
  }

  interface TaskProps {
    [k: string]: TaskProp
  }

  function deriveTaskProps(mapTasksToProps: MapTasksToProps): TaskProps {
    const result: TaskProps = {}

    for (const [k, v] of Object.entries(mapTasksToProps)) {
      result[k] = taskProp(v)
    }

    return result
  }

  function task(f: TubeGeneratorFunction<S>): Task {
    return new Task(f)
  }

  function connect(
    mapStateToProps: MapStateToProps<S>,
    mapTasksToProps: MapTasksToProps,
    Component: ComponentClass | StatelessComponent
  ) {
    return (props: any) => (
      // TODO: Should cache itask props as agressively as possible (revision
      // counter?)
      <Consumer>
        {state => (
          <Component
            {...props}
            {...mapStateToProps(state)}
            {...deriveTaskProps(mapTasksToProps)}
          />
        )}
      </Consumer>
    )
  }

  return { Tube, task, connect }
}
