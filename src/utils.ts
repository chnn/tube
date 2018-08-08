export interface Deferred {
  promise: Promise<any>
  resolve: (...args: any[]) => void
  reject: (...args: any[]) => void
}

export function deferred(): Deferred {
  const d: any = {}

  d.promise = new Promise((resolve, reject) => {
    d.resolve = resolve
    d.reject = reject
  })

  return d as Deferred
}

let id = "0"

export function generateId() {
  id = String(+id + 1)

  return id
}
