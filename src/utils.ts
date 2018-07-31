export interface Deferred {
  promise: Promise<any>
  resolve: Function
  reject: Function
}

export function deferred(): Deferred {
  const d: any = {}

  d.promise = new Promise((resolve, reject) => {
    d.resolve = resolve
    d.reject = reject
  })

  return d as Deferred
}
