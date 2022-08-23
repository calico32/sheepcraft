import { Toaster } from '@blueprintjs/core'
import { useMonaco } from '@monaco-editor/react'
import * as Comlink from 'comlink'
import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { GooseContext, GooseContextData, HardcoreContext, ToasterContext } from '../lib/context'
import { initMonaco, isMonacoReady } from '../lib/monaco'
import '../styles/globals.scss'
import { TimerWorker } from '../worker/timer.worker'

const toaster = typeof window !== 'undefined' ? Toaster.create({ position: 'top' }) : null

function App({ Component, pageProps }: AppProps): JSX.Element {
  const [goose, setGoose] = useState<GooseContextData>({})
  const [timer, setTimer] = useState<{ worker?: Comlink.Remote<TimerWorker> }>({})
  const [hardcore, setHardcore] = useState(false)
  const monaco = useMonaco()

  useEffect(() => {
    const init = async (): Promise<void> => {
      if (monaco != null) {
        if (!isMonacoReady()) {
          console.debug('initializing monaco')
          await initMonaco(monaco)
          console.debug('monaco ready')
        }
      } else {
        console.debug('monaco not ready')
      }
    }

    init()
  }, [monaco])

  useEffect(() => {
    const init = async (): Promise<void> => {
      if (!goose?.worker?.isReady) {
        const worker = Comlink.wrap<GooseWorker>(
          new Worker(new URL('../worker/goose.worker.ts', import.meta.url))
        )

        console.debug('initializing worker')
        await worker.init()
        console.debug('goose worker ready')
        setGoose({ worker })
      }
    }

    init()
  }, [goose])

  useEffect(() => {
    if (timer.worker == null) {
      const worker = Comlink.wrap<TimerWorker>(
        new Worker(new URL('../worker/timer.worker.ts', import.meta.url))
      )
      setTimer({ worker })
      console.debug('timer worker ready')
    }
  }, [timer])

  return (
    <HardcoreContext.Provider value={{ hardcore, setHardcore, timer: timer.worker! }}>
      <GooseContext.Provider value={goose}>
        <ToasterContext.Provider value={toaster!}>
          <Component {...pageProps} />
        </ToasterContext.Provider>
      </GooseContext.Provider>
    </HardcoreContext.Provider>
  )
}

export default App
