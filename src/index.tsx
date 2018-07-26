import * as React from "react"
import { ComponentClass, PureComponent, StatelessComponent } from "react"

interface NextPromise {
  value: Promise<any>
  done: boolean
}

interface NextState<S> {
  value: Partial<S>
  done: boolean
}

interface TubeGenerator<S> {
  next: () => NextState<S> | NextPromise
}

type TubeGeneratorFunction<S> = (...args: any[]) => TubeGenerator<S>

interface UnboundAdditionalProps {
  [k: string]: any
}

interface BoundAdditionalProps {
  [k: string]: any
}

export interface EmitterProp {
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
interface initializeResult {}

export default function initialize<S extends object>(
  initialState: S
): initializeResult {
  const { Provider, Consumer } = React.createContext<S>(initialState)

  let state: S = initialState
  const withTubes: WithTube[] = []

  function updateState(partialState: Partial<S>) {
    // Lots of yucky type assertions here until
    // https://github.com/Microsoft/TypeScript/pull/13288 lands
    //
    // TODO: Event log
    state = { ...(state as object), ...(partialState as object) } as S

    withTubes.forEach(t => t.forceUpdate())
  }

  class WithTube extends PureComponent<{}, {}> {
    public constructor(props: {}) {
      super(props)

      withTubes.push(this)
    }

    public render() {
      return <Provider value={state}>{this.props.children}</Provider>
    }
  }

  class EmitterChild {
    private g: TubeGenerator<S>

    constructor(g: TubeGenerator<S>) {
      this.g = g
    }

    public async start() {
      // g.next until done while not cancelled, then call instance.setState
      let next = this.g.next()

      while (!next.done) {
        next = await this.g.next()
      }

      // Last yielded value assumed to be a state update
      const partialState = next.value as Partial<S>

      updateState(partialState)

      return this
    }

    public cancel() {}
  }

  class Emitter {
    private f: TubeGeneratorFunction<S>
    private concurrencyType: ConcurrencyType
    private children: EmitterChild[]

    constructor(f: TubeGeneratorFunction<S>) {
      this.f = f
      this.concurrencyType = ConcurrencyType.Racey
      this.children = []
    }

    public do = (...args: any[]): Promise<void> => {
      if (this.concurrencyType === ConcurrencyType.Restartable) {
        for (const child of this.children) {
          child.cancel()
        }
      }

      const g = this.f(...args)
      const child = new EmitterChild(g)

      this.children.push(child)

      child.start()

      // TODO: Return a promise that resolves when all children are done
      // (perhaps by keeping an oustanding child count)
      return Promise.resolve()
    }

    public cancelAll = (): void => {}

    public racey(): Emitter {
      this.concurrencyType = ConcurrencyType.Racey

      return this
    }

    public restartable(): Emitter {
      this.concurrencyType = ConcurrencyType.Restartable

      return this
    }
  }

  function emitterProp(e: Emitter): EmitterProp {
    return Object.assign(
      function() {
        return e.do(...arguments)
      },
      {
        isRunning: false,
        isIdle: true,
        called: 0,
        cancelAll: e.cancelAll
      }
    )
  }

  function deriveEmitterProps(
    additionalProps: UnboundAdditionalProps
  ): BoundAdditionalProps {
    const boundAdditionalProps: BoundAdditionalProps = {}

    for (const [k, v] of Object.entries(additionalProps)) {
      if (v instanceof Emitter) {
        boundAdditionalProps[k] = emitterProp(v)
      } else {
        boundAdditionalProps[k] = v
      }
    }

    return boundAdditionalProps
  }

  function emitter(f: TubeGeneratorFunction<S>): Emitter {
    return new Emitter(f)
  }

  function connect(
    additionalPropsFn: (state: S) => UnboundAdditionalProps,
    Component: ComponentClass | StatelessComponent
  ) {
    // TODO: Initialize `Emmiter`s here to handle multiple `Component` instances
    // TODO: Should cache additional props as agressively as possible
    return (props: any) => (
      <Consumer>
        {state => (
          <Component
            {...props}
            {...deriveEmitterProps(additionalPropsFn(state))}
          />
        )}
      </Consumer>
    )
  }

  return { WithTube, emitter, connect }
}
