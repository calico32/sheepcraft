import { expose } from 'comlink'
import { Duration } from 'luxon'

let startTime = 0
let endTime = 0
let formattedTime = ''
let updateHandle: number | undefined
const subscriptions = new Map<number, SubscriptionDetails>()

interface SubscriptionDetails {
  lastCall: number
  lastValue: string
  interval: number
  callback: (time: string) => void
}

let lastSubscriptionId = 0

const updateTime = (newValue?: string): void => {
  if (newValue) {
    formattedTime = newValue
    callSubscriptions(formattedTime)
    return
  }

  const duration = Duration.fromMillis(Date.now() - startTime).normalize()

  let formatString = 'mm:ss.SSS'

  if (duration.hours > 0) {
    formatString = 'hh:' + formatString
  }

  if (duration.days > 0) {
    formatString = "d'd' " + formatString
  }

  formattedTime = duration.toFormat(formatString)
  callSubscriptions(formattedTime)
}

const callSubscriptions = (currentValue: string): void => {
  for (const [, subscription] of subscriptions) {
    if (
      (Date.now() - subscription.lastCall > subscription.interval &&
        subscription.lastValue !== currentValue) ||
      (!subscription.lastValue.includes('INVALID') && currentValue.includes('INVALID'))
    ) {
      subscription.callback(currentValue)
      subscription.lastCall = Date.now()
      subscription.lastValue = currentValue
    }
  }
}

export interface TimerWorker {
  setStartTime(time: number): void
  setEndTime(time: number): string
  latestTime(): string

  subscribe(callback: (time: string) => void, interval?: number): number
  unsubscribe(id: number): void

  isInvalid(): boolean
  invalidate(): void
}

const timer: TimerWorker = {
  setStartTime(time) {
    startTime = time

    clearInterval(updateHandle)

    if (startTime <= 0) {
      updateTime('<strong class="text-red-3">INVALID</strong>')
    } else {
      updateHandle = setInterval(updateTime, 10) as unknown as number
    }
  },
  setEndTime(time) {
    endTime = time

    clearInterval(updateHandle)

    if (startTime <= 0 || endTime <= 0) {
      updateTime('<strong class="text-red-3">INVALID</strong>')
    } else {
      updateTime()
    }

    return formattedTime
  },
  latestTime() {
    return formattedTime
  },
  subscribe(callback: (time: string) => void, interval = 100) {
    const id = ++lastSubscriptionId

    callback(formattedTime)

    subscriptions.set(id, {
      lastCall: Date.now(),
      lastValue: formattedTime,
      interval,
      callback,
    })

    return id
  },
  unsubscribe(id) {
    subscriptions.delete(id)
  },
  isInvalid() {
    return startTime <= 0 || endTime <= 0
  },
  invalidate() {
    this.setStartTime(-1)
  },
}

expose(timer)
