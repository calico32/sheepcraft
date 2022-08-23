import * as Comlink from 'comlink'
import { useEffect, useRef, useState } from 'react'
import { useHardcore } from '../lib/context'

const HardcoreTimer = (): JSX.Element => {
  const { hardcore, timer } = useHardcore()
  const [subscription, setSubscription] = useState<number>()
  const timerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const init = async (): Promise<void> => {
      if (subscription == null && timerRef.current != null) {
        const sub = await timer.subscribe(
          Comlink.proxy((time) => {
            if (timerRef.current) {
              timerRef.current.innerHTML = time
            }
          }),
          100
        )
        setSubscription(sub)
      }
    }
    init()

    return (): void => {
      if (subscription != null) {
        timer.unsubscribe(subscription)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRef.current])

  if (!hardcore) {
    return (
      <div>
        <p>
          <strong>normal</strong> mode
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end">
      <p>
        <strong>hardcore</strong> mode
      </p>
      <p>
        time: <span ref={timerRef} />
      </p>
    </div>
  )
}

export default HardcoreTimer
