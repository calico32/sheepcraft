/* eslint-disable @next/next/no-img-element */
import { Button, H2 } from '@blueprintjs/core'
import type { NextPage } from 'next'
import Head from 'next/head'
import router from 'next/router'
import { useEffect, useRef, useState } from 'react'
import Hero from '../components/Hero'
import { useHardcore } from '../lib/context'

import black from '../lib/game/textures/sheep/black.avif'
import blue from '../lib/game/textures/sheep/blue.avif'
import brown from '../lib/game/textures/sheep/brown.avif'
import cyan from '../lib/game/textures/sheep/cyan.avif'
import gray from '../lib/game/textures/sheep/gray.avif'
import green from '../lib/game/textures/sheep/green.avif'
import lightblue from '../lib/game/textures/sheep/lightblue.avif'
import lightgray from '../lib/game/textures/sheep/lightgray.avif'
import lime from '../lib/game/textures/sheep/lime.avif'
import magenta from '../lib/game/textures/sheep/magenta.avif'
import orange from '../lib/game/textures/sheep/orange.avif'
import pink from '../lib/game/textures/sheep/pink.avif'
import purple from '../lib/game/textures/sheep/purple.avif'
import red from '../lib/game/textures/sheep/red.avif'
import white from '../lib/game/textures/sheep/white.avif'
import yellow from '../lib/game/textures/sheep/yellow.avif'
import steve from '../lib/game/textures/steve.png'

const End: NextPage = () => {
  const banner = useRef<HTMLDivElement>(null)
  const { hardcore, timer } = useHardcore()
  const [time, setTime] = useState('')

  useEffect(() => {
    const init = async (): Promise<void> => {
      if (!time) {
        setTime(await timer.latestTime())
      }

      if (!banner.current) return

      const sheepData = [
        steve,
        red,
        orange,
        yellow,
        lime,
        green,
        cyan,
        blue,
        magenta,
        purple,
        white,
        pink,
        lightblue,
        brown,
        black,
        gray,
        lightgray,
      ]

      banner.current.innerHTML = sheepData
        .map((sheep) => `<img src="${sheep.blurDataURL}" width=96 height=96>`)
        .join('')

      const fullres = await Promise.all(
        sheepData.map(
          (data) =>
            new Promise<HTMLImageElement>((resolve) => {
              const img = new Image()
              img.style.width = '5%'
              img.style.height = 'auto'
              img.src = data.src
              img.onload = () => resolve(img)
            })
        )
      )

      banner.current.innerHTML = ''
      fullres.forEach((img) => {
        banner.current!.appendChild(img)
      })
    }
    init()
  }, [time, timer])

  return (
    <>
      <Head>
        <title>sheepcraft - win</title>
      </Head>
      <Hero>
        <div className="flex flex-col items-center w-full gap-4 max-w-none prose-invert">
          <div className="flex justify-center" ref={banner}></div>

          <div className="flex">
            <H2 className="m-0 mr-4">congrats</H2>
            <Button icon="undo" intent="success" onClick={() => router.push('/')}>
              return to title
            </Button>
          </div>
          <p>you did it</p>

          {hardcore && (
            <p>
              your time is <span dangerouslySetInnerHTML={{ __html: time }} />
            </p>
          )}
        </div>
      </Hero>
    </>
  )
}

export default End
