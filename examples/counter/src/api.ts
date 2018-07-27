const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export const getCount = async () => {
  await delay(1000)

  return Math.floor(Math.random() * 10)
}
