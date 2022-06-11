import { IToaster } from '@blueprintjs/core'
import { Remote } from 'comlink'
import { createContext, useContext } from 'react'

export const ToasterContext = createContext<IToaster>(undefined!)

export const useToaster = (): IToaster => {
  const toaster = useContext(ToasterContext)
  return toaster
}

export interface GooseContextData {
  worker?: Remote<GooseWorker> | null
}

export const GooseContext = createContext<GooseContextData>(undefined!)

export const useGoose = (): GooseContextData => {
  const goose = useContext(GooseContext)
  return goose
}
