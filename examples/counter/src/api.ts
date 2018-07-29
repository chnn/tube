const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export const getCount = async (max: number = 1) => {
  await delay(2000)

  return 1 + Math.floor(Math.random() * max)
}
