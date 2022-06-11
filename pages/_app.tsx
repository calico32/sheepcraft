import { Toaster } from '@blueprintjs/core'
import { useMonaco } from '@monaco-editor/react'
import * as Comlink from 'comlink'
import type { AppProps } from 'next/app'
import { useEffect, useState } from 'react'
import { GooseContext, GooseContextData, ToasterContext } from '../lib/context'
import { initMonaco } from '../lib/monaco'
import '../styles/globals.scss'

const toaster = typeof window !== 'undefined' ? Toaster.create({ position: 'top' }) : null

function App({ Component, pageProps }: AppProps): JSX.Element {
  const [goose, setGoose] = useState<GooseContextData>({})
  const monaco = useMonaco()

  useEffect(() => {
    const init = async (): Promise<void> => {
      if (monaco != null) {
        console.debug('initializing monaco')
        await initMonaco(monaco)
        console.debug('monaco ready')
      } else {
        console.debug('monaco not ready')
      }

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
  }, [monaco, goose])

  return (
    <GooseContext.Provider value={goose}>
      <ToasterContext.Provider value={toaster!}>
        <Component {...pageProps} />
      </ToasterContext.Provider>
    </GooseContext.Provider>
  )
}

export default App
