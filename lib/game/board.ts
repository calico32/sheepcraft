import { Colors } from '@blueprintjs/core'
import { Exit, GameObject, loadImage, Player, Sheep, SheepTarget } from './object'
import { Point } from './point'
import { ZooLibExec } from './zoolib'

export const TEXTURE_SIZE = 16
export const TEXTURE_SCALE = 3.5
export const BOARD_SCALE = 0.8

interface SolveState {
  solved: boolean
  playerOnExit: boolean
  sheepOnTargets: {
    current: number
    total: number
    solved: boolean
  }
  actions?: {
    current: number
    max: number
    solved: boolean
  }
  calls?: {
    current: number
    max: number
    solved: boolean
  }
  size?: {
    current: number
    max: number
    solved: boolean
  }
}

interface BoardOptions {
  maxActions?: number
  maxCalls?: number
  maxChars?: number
}

interface BoardInitOptions extends BoardOptions {
  size: number
  container: HTMLElement
  player: Player
  exit: Exit
}

export class Board {
  readonly size: number
  container: HTMLElement
  player: Player
  exit: Exit

  objects: GameObject[] = []
  dirt!: CanvasImageSource
  grass!: CanvasImageSource
  canvas: HTMLCanvasElement
  lastFrameTime: number = 1
  currentFrameTime: number = 1
  animHandle: number | undefined
  #ready = false
  options: BoardOptions = {}

  constructor(options: BoardInitOptions) {
    this.size = options.size
    this.container = options.container
    this.player = options.player
    this.exit = options.exit

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.size * TEXTURE_SIZE * TEXTURE_SCALE
    this.canvas.height = this.size * TEXTURE_SIZE * TEXTURE_SCALE
    this.canvas.style.width = `${this.canvas.width * BOARD_SCALE}px`
    this.canvas.style.height = `${this.canvas.height * BOARD_SCALE}px`
    this.container.appendChild(this.canvas)

    this.objects.push(options.player)
    this.objects.push(options.exit)

    this.options = {
      maxActions: options.maxActions,
      maxCalls: options.maxCalls,
      maxChars: options.maxChars,
    }
  }

  async init(): Promise<void> {
    this.player.priority = 9999
    await this.player.init()
    await this.exit.init()
    this.dirt = await loadImage(import('./textures/dirt.png'))
    this.grass = await loadImage(import('./textures/grass.png'))
    this.#ready = true
  }

  async addObjects(...objects: GameObject[]): Promise<void> {
    await Promise.all(objects.map(async (o) => await o.init(this)))
    this.objects.push(...objects)
  }

  solveState(exec?: ZooLibExec): SolveState {
    const state = {
      solved: false,
      playerOnExit: false,
      sheepOnTargets: { current: 0 },
    } as SolveState

    if (this.player.pos.equals(this.exit.pos)) state.playerOnExit = true

    const sheep = this.objects.filter((o) => o instanceof Sheep) as Sheep[]
    const targets = this.objects.filter((o) => o instanceof SheepTarget) as SheepTarget[]
    const occupiedTargets = new Set<SheepTarget>()

    state.sheepOnTargets.total = sheep.length

    for (const s of sheep) {
      const target = targets.find((t) => t.color === s.color && s.pos.equals(t.pos))
      if (target == null) continue
      if (occupiedTargets.has(target)) continue
      state.sheepOnTargets.solved = true
      state.sheepOnTargets.current++
      occupiedTargets.add(target)
    }

    state.sheepOnTargets.solved = state.sheepOnTargets.current === state.sheepOnTargets.total

    if (exec) {
      state.actions = {
        current: exec.actions.length,
        max: this.options.maxActions || Infinity,
        solved: false,
      }
      state.actions.solved = state.actions.current <= state.actions.max

      state.calls = {
        current: exec.callCount,
        max: this.options.maxCalls || Infinity,
        solved: false,
      }
      state.calls.solved = state.calls.current <= state.calls.max

      state.size = {
        current: exec.size,
        max: this.options.maxChars || Infinity,
        solved: false,
      }
      state.size.solved = state.size.current <= state.size.max
    }

    state.solved =
      state.playerOnExit &&
      state.sheepOnTargets.solved &&
      (state.actions ?? { solved: true }).solved &&
      (state.calls ?? { solved: true }).solved

    return state
  }

  removeObject(object: GameObject): void {
    this.objects = this.objects.filter((o) => o !== object)
  }

  pos(point: Point, scale = 1): [number, number] {
    return [point.x * TEXTURE_SIZE * scale, point.y * TEXTURE_SIZE * scale]
  }

  handleAction(action: string): void {
    const p = this.player
    switch (action) {
      case 'forward': {
        const target = p.pos.add(p.facing).clamp(this.size)
        const existing = this.objects.find((o) => o.pos.equals(target))
        if (existing != null && !existing.walkable) break
        p.pos = target
        break
      }
      case 'backward': {
        const target = p.pos.sub(p.facing).clamp(this.size)
        const existing = this.objects.find((o) => o.pos.equals(target))
        if (existing != null && !existing.walkable) break
        p.pos = target
        break
      }
      case 'left': {
        const target = p.pos.add(p.facing.left()).clamp(this.size)
        const existing = this.objects.find((o) => o.pos.equals(target))
        if (existing != null && !existing.walkable) break
        p.pos = target
        break
      }
      case 'right': {
        const target = p.pos.add(p.facing.right()).clamp(this.size)
        const existing = this.objects.find((o) => o.pos.equals(target))
        if (existing != null && !existing.walkable) break
        p.pos = target
        break
      }
      case 'turnLeft': {
        p.facing = p.facing.left()
        break
      }
      case 'turnRight': {
        p.facing = p.facing.right()
        break
      }
    }

    this.update()
  }

  update(): void {
    const playerPos = this.player.pos
    const atPlayer = this.objects.filter((o) => o.pos.equals(playerPos))
    const targetAtPlayer = atPlayer.find((o) => o instanceof SheepTarget) as SheepTarget | undefined
    const sheepAtPlayer = atPlayer.filter((o) => o instanceof Sheep) as Sheep[]
    if (this.player.carrying) {
      // currently carrying a sheep
      if (targetAtPlayer != null && targetAtPlayer.color === this.player.carrying.color) {
        // we can potentially put down a sheep
        const sheepOfCorrectColor = sheepAtPlayer.find((s) => s.color === targetAtPlayer.color)
        if (sheepOfCorrectColor != null) {
          // do nothing, target already occupied
        } else {
          // put down sheep
          targetAtPlayer.sheep = this.player.carrying
          this.player.carrying.pos = targetAtPlayer.pos
          this.player.carrying.target = targetAtPlayer
          this.player.carrying = null
        }
      }
    }

    if (this.player.carrying == null) {
      if (sheepAtPlayer) {
        // let's try to pick up a sheep
        for (const sheep of sheepAtPlayer) {
          // make sure it's not already down
          if (sheep.target == null) {
            this.player.carrying = sheep
            this.player.carrying.priority = 9998
          }
        }
      }
    }

    if (this.player.carrying) {
      // move sheep to us
      this.player.carrying.pos = this.player.pos
    }
  }

  async draw(): Promise<void> {
    if (!this.#ready) {
      await this.init()
    }
    this.currentFrameTime = performance.now()
    const ctx = this.canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    // draw base texture
    ctx.save()
    ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE)
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        ctx.drawImage(this.grass, x * TEXTURE_SIZE, y * TEXTURE_SIZE)
      }
    }

    this.objects.sort((a, b) => a.priority - b.priority)

    for (const object of this.objects) {
      if (object.baseLayer === 'dirt') {
        ctx.drawImage(this.dirt, ...this.pos(object.pos))
      }
      await object.draw(ctx, this)
    }

    ctx.restore()

    // draw grid
    ctx.save()
    ctx.strokeStyle = Colors.WHITE + '80'
    for (let x = 1; x < this.size; x++) {
      ctx.beginPath()
      ctx.moveTo(x * TEXTURE_SCALE * TEXTURE_SIZE, 0)
      ctx.lineTo(x * TEXTURE_SCALE * TEXTURE_SIZE, ctx.canvas.height)
      ctx.stroke()
    }
    for (let y = 1; y < this.size; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * TEXTURE_SCALE * TEXTURE_SIZE)
      ctx.lineTo(ctx.canvas.width, y * TEXTURE_SCALE * TEXTURE_SIZE)
      ctx.stroke()
    }
    ctx.restore()

    this.lastFrameTime = this.currentFrameTime
    this.animHandle = requestAnimationFrame(this.draw.bind(this))
  }
}
