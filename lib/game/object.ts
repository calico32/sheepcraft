import { StaticImageData } from 'next/image'
import { generateId } from '../util'
import { TEXTURE_SCALE, TEXTURE_SIZE, type Board } from './board'
import { Point } from './point'

const scaleToFit = (image: CanvasImageSource): CanvasImageSource => {
  // scale image to fit in one cell (TEXTURE_SIZE * TEXTURE_SCALE)
  const scale = Math.min(
    (TEXTURE_SIZE * TEXTURE_SCALE) / (image.width as number),
    (TEXTURE_SIZE * TEXTURE_SCALE) / (image.height as number)
  )
  const canvas = document.createElement('canvas')
  canvas.width = (image.width as number) * scale
  canvas.height = (image.height as number) * scale
  const ctx = canvas.getContext('2d')!
  // draw image, centered
  ctx.drawImage(
    image,
    (canvas.width - (image.width as number) * scale) / 2,
    (canvas.height - (image.height as number) * scale) / 2,
    (image.width as number) * scale,
    (image.height as number) * scale
  )
  return canvas
}

export const loadImage = async (
  data: StaticImageData | { default: StaticImageData } | Promise<{ default: StaticImageData }>
): Promise<CanvasImageSource> => {
  if (data instanceof Promise) {
    const { default: img } = await data
    return loadImage(img)
  }
  if ('default' in data) {
    return loadImage(data.default)
  }
  return new Promise((resolve) => {
    const img = new Image(data.width, data.height)
    img.src = data.src
    img.onload = async () => {
      const image = await createImageBitmap(img)
      resolve(image)
    }
  })
}

export type BaseLayerType = 'grass' | 'dirt'

export abstract class GameObject {
  abstract readonly name: string
  id: string
  baseLayer: BaseLayerType = 'dirt'
  walkable = false
  priority = 0

  constructor(public pos: Point) {
    this.id = generateId()
  }

  async init(board: Board): Promise<void> {}
  async draw(ctx: CanvasRenderingContext2D, board: Board): Promise<void> {}
}

export class Player extends GameObject {
  readonly name = 'Player'
  facing = Point.north
  baseLayer: BaseLayerType = 'grass'
  #texture!: CanvasImageSource
  carrying: Sheep | null = null

  facingName(): string {
    if (this.facing.equals(Point.north)) {
      return 'north'
    }
    if (this.facing.equals(Point.south)) {
      return 'south'
    }
    if (this.facing.equals(Point.east)) {
      return 'east'
    }
    if (this.facing.equals(Point.west)) {
      return 'west'
    }
    throw new Error('invalid facing')
  }

  get angle(): number {
    if (this.facing.equals(Point.north)) {
      return 0
    }
    if (this.facing.equals(Point.east)) {
      return Math.PI / 2
    }
    if (this.facing.equals(Point.south)) {
      return Math.PI
    }
    if (this.facing.equals(Point.west)) {
      return -Math.PI / 2
    }
    throw new Error('invalid facing')
  }

  async init(): Promise<void> {
    this.#texture = scaleToFit(await loadImage(import('./textures/steve.png')))
  }

  async draw(ctx: CanvasRenderingContext2D, board: Board): Promise<void> {
    const [x, y] = board.pos(this.pos).map((v) => v * TEXTURE_SCALE)
    ctx.restore()
    ctx.save()
    // rotate to face direction
    ctx.translate(x + (TEXTURE_SIZE * TEXTURE_SCALE) / 2, y + (TEXTURE_SIZE * TEXTURE_SCALE) / 2)
    ctx.rotate(this.angle)
    ctx.drawImage(
      this.#texture,
      -(TEXTURE_SIZE * TEXTURE_SCALE) / 2,
      -(TEXTURE_SIZE * TEXTURE_SCALE) / 2
    )
    ctx.restore()
    ctx.save()
    ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE)
  }
}

export type SheepColor =
  | 'black'
  | 'blue'
  | 'brown'
  | 'cyan'
  | 'gray'
  | 'green'
  | 'lightblue'
  | 'lightgray'
  | 'lime'
  | 'magenta'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'red'
  | 'white'
  | 'yellow'

export class Sheep extends GameObject {
  readonly name = 'Sheep'
  readonly color: SheepColor
  #texture!: CanvasImageSource
  baseLayer: BaseLayerType = 'grass'
  walkable = true
  target: SheepTarget | null = null
  priority = 1

  constructor(pos: Point, color?: SheepColor) {
    super(pos)
    this.color = color ?? 'white'
  }

  async init(): Promise<void> {
    this.#texture = scaleToFit(await loadImage(import(`./textures/sheep/${this.color}.avif`)))
  }

  async draw(ctx: CanvasRenderingContext2D, board: Board): Promise<void> {
    const [x, y] = board.pos(this.pos)
    ctx.restore()
    ctx.drawImage(this.#texture, x * TEXTURE_SCALE, y * TEXTURE_SCALE)
    ctx.save()
    ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE)
    return await Promise.resolve()
  }
}

export class Wall extends GameObject {
  readonly name = 'Wall'
  #texture!: CanvasImageSource

  async init(): Promise<void> {
    this.#texture = await loadImage(import('./textures/stone_bricks.png'))
  }

  async draw(ctx: CanvasRenderingContext2D, board: Board): Promise<void> {
    ctx.drawImage(this.#texture, ...board.pos(this.pos))
  }
}

export class SheepTarget extends GameObject {
  readonly name = 'SheepTarget'
  #texture!: CanvasImageSource
  color: SheepColor = 'white'
  sheep: Sheep | null = null
  walkable = true

  constructor(pos: Point, color?: SheepColor) {
    super(pos)
    this.color = color ?? 'white'
  }

  async init(): Promise<void> {
    this.#texture = await loadImage(import(`./textures/target/${this.color}.png`))
  }

  async draw(ctx: CanvasRenderingContext2D, board: Board): Promise<void> {
    ctx.drawImage(this.#texture, ...board.pos(this.pos))
  }
}

export class Exit extends GameObject {
  readonly name = 'Exit'
  #texture!: CanvasImageSource
  walkable = true
  priority = 2

  async init(): Promise<void> {
    this.#texture = await loadImage(import('./textures/exit.png'))
  }

  async draw(ctx: CanvasRenderingContext2D, board: Board): Promise<void> {
    ctx.drawImage(this.#texture, ...board.pos(this.pos))
  }
}

export class Leaves extends GameObject {
  readonly name = 'Leaves'
  #texture!: CanvasImageSource

  async init(): Promise<void> {
    this.#texture = await loadImage(import('./textures/leaves.png'))
  }

  async draw(ctx: CanvasRenderingContext2D, board: Board): Promise<void> {
    ctx.drawImage(this.#texture, ...board.pos(this.pos))
  }
}

export class Water extends GameObject {
  readonly name = 'Water'
  #frames: CanvasImageSource[] = []
  #frame = 0
  #lastUpdated = 0

  #img!: HTMLImageElement

  async init(): Promise<void> {
    const full = await import('./textures/water.png') // 16x512
    const img = new Image(16, 512)
    this.#img = img
    img.src = full.default.src
    return new Promise((resolve) => {
      img.onload = async () => {
        const promises = []
        for (let y = 0; y < 512; y += 16) {
          promises.push(createImageBitmap(img, 0, y, 16, 16))
        }
        this.#frames = await Promise.all(promises)
        this.#frame = Math.floor(Math.random() * this.#frames.length)
        resolve()
      }
    })
  }

  async draw(ctx: CanvasRenderingContext2D, board: Board): Promise<void> {
    if (board.currentFrameTime - this.#lastUpdated > 1000 / 5) {
      this.#lastUpdated = board.currentFrameTime
      this.#frame = (this.#frame + 1) % this.#frames.length
    }
    ctx.drawImage(this.#frames[this.#frame], ...board.pos(this.pos))
  }
}
