import { Button, H2 } from '@blueprintjs/core'
import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useRef } from 'react'
import Hero from '../components/Hero'
import cyan from '../lib/game/textures/sheep/cyan.avif'

const Home: NextPage = () => {
  const router = useRouter()
  const banner = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const init = async (): Promise<void> => {
      if (!banner.current) return

      banner.current.innerHTML = `<img src="${cyan.blurDataURL}" width=96 height=96>`

      const fullres = await new Promise<HTMLImageElement>((resolve) => {
        const img = new Image(96, 96)
        img.src = cyan.src
        img.onload = () => resolve(img)
      })

      banner.current.innerHTML = ''
      banner.current.appendChild(fullres)
    }
    init()
  }, [])

  return (
    <>
      <Head>
        <title>sheepcraft</title>
      </Head>
      <Hero>
        <div className="flex flex-col items-center prose prose-invert">
          <div ref={banner} className="-mb-2" />
          <div className="flex">
            <H2 className="m-0 mr-4">sheepcraft</H2>
            <Button icon="play" intent="success" onClick={() => router.push('/level/1')}>
              play
            </Button>
          </div>
        </div>
      </Hero>
    </>
  )
}

export default Home
