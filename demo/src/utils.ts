export const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

let id = "0"

export const generateId = () => {
  id = String(+id + 1)

  return id
}
