import { IToaster } from '@blueprintjs/core'
import * as Comlink from 'comlink'
import { Remote } from 'comlink'
import { createContext, Dispatch, SetStateAction, useContext } from 'react'
import { TimerWorker } from '../worker/timer.worker'

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

export interface HardcoreState {
  hardcore: boolean
  setHardcore: Dispatch<SetStateAction<boolean>>
  timer: Comlink.Remote<TimerWorker>
}

export const HardcoreContext = createContext<HardcoreState>(undefined!)

export const useHardcore = (): HardcoreState => {
  const hardcore = useContext(HardcoreContext)
  return hardcore
}
