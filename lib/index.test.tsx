import * as React from "react"

import { mount } from "enzyme"

import initialize from "./"

test("basic smoke test", () => {
  interface State {
    a: number
    b: string
  }

  const initalState = {
    a: 1,
    b: "foo"
  }

  const { TubeProvider, connect } = initialize<State>(initalState)

  const MyComponent = (props: any) => (
    <div className="my-component">
      <div className="x">{props.x}</div>
      <div className="y">{props.y}</div>
    </div>
  )

  const mstp = (state: State) => ({
    x: state.a,
    y: state.b
  })

  const ConnectedMyComponent = connect(
    mstp,
    {},
    MyComponent
  )

  const wrapper = mount(
    <TubeProvider>
      <ConnectedMyComponent />
    </TubeProvider>
  )

  expect(wrapper.find(".x").text()).toEqual("1")
  expect(wrapper.find(".y").text()).toEqual("foo")
})

// test('connected components should not shared task instances', () => {})
