import { customAlphabet } from 'nanoid'

export const generateId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

export const flatten = (strings: TemplateStringsArray, ...values: string[]): string => {
  return strings.reduce((acc, str, i) => acc + str + (i < values.length ? values[i] : ''), '')
}

export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunked = []
  let index = 0
  while (index < array.length) {
    chunked.push(array.slice(index, (index += size)))
  }
  return chunked
}

export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}
