import { CASES } from '../data/mockMDEData'

const wait = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms))

export async function simulateUpload(onProgress) {
  for (let p = 5; p <= 100; p += 15) {
    await wait(120)
    onProgress(p)
  }
  await wait(150)
  return { valid: true, records: 12483 }
}

export async function fetchCases() {
  await wait(300)
  return CASES
}
