import * as React from "react"
import { ComponentClass, PureComponent, StatelessComponent } from "react"

type Next<S> = Partial<S> | Promise<any>

type TubeGenerator<S> = Iterator<Next<S>>

type TubeGeneratorFunction<S> = (state: S, ...args: any[]) => TubeGenerator<S>

interface UnboundAdditionalProps {
  [k: string]: any
}

interface BoundAdditionalProps {
  [k: string]: any
}

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

type TaskCreator<S> = (f: TubeGeneratorFunction<S>) => any

type Connect<S> = (
  additionalProps: ((state: S) => UnboundAdditionalProps),
  c: ComponentClass<any, any> | StatelessComponent<any>
) => ((props: any) => JSX.Element)

interface InitializeResult<S> {
  Tube: ComponentClass
  connect: Connect<S>
  task: TaskCreator<S>
}

export default function initialize<S extends object>(
  initialState: S
): InitializeResult<S> {
  const { Provider, Consumer } = React.createContext<S>(initialState)
  const tubes: Tube[] = []

  let state: S = initialState

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

      const g = this.f(state, ...args)
      const child = new ChildTask(g)

      this.children.push(child)
      this.activeCount = this.activeCount + 1
      this.totalCount = this.totalCount + 1

      update()

      const partialState = await child.do()

      this.activeCount = this.activeCount - 1

      update(partialState)

      // TODO: Return a promise that resolves when all children are done
      // (perhaps by keeping an oustanding child count)
      return Promise.resolve()
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

  function deriveTaskProps(
    additionalProps: UnboundAdditionalProps
  ): BoundAdditionalProps {
    const boundAdditionalProps: BoundAdditionalProps = {}

    for (const [k, v] of Object.entries(additionalProps)) {
      if (v instanceof Task) {
        boundAdditionalProps[k] = taskProp(v)
      } else {
        boundAdditionalProps[k] = v
      }
    }

    return boundAdditionalProps
  }

  function task(f: TubeGeneratorFunction<S>): Task {
    return new Task(f)
  }

  function connect(
    additionalPropsFn: (state: S) => UnboundAdditionalProps,
    Component: ComponentClass | StatelessComponent
  ) {
    // TODO: Initialize `Emmiter`s here to handle multiple `Component` instances
    // TODO: Should cache additional props as agressively as possible (perhaps
    // store a “revision counter” for each task prop, a la glimmer
    return (props: any) => (
      <Consumer>
        {state => (
          <Component
            {...props}
            {...deriveTaskProps(additionalPropsFn(state))}
          />
        )}
      </Consumer>
    )
  }

  return { Tube, task, connect }
}
