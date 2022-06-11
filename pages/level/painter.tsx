import { Button, Label, NumericInput, Radio, RadioGroup } from '@blueprintjs/core'
import type { NextPage } from 'next'
import { useCallback, useEffect, useRef, useState } from 'react'
import YAML from 'yaml'
import { Board, BOARD_SCALE, TEXTURE_SCALE, TEXTURE_SIZE } from '../../lib/game/board'
import {
  Exit,
  GameObject,
  Leaves,
  Player,
  Sheep,
  SheepColor,
  SheepTarget,
  Wall,
  Water,
} from '../../lib/game/object'
import { Point } from '../../lib/game/point'
const updateBoardSize = (board: Board, size: number): Board => {
  board.container.innerHTML = ''
  if (board.animHandle) cancelAnimationFrame(board.animHandle)

  const newBoard = new Board({
    size,
    container: board.container,
    player: board.player,
    exit: board.exit,
  })

  newBoard.objects = board.objects.filter(({ pos }) => {
    if (pos.x === 0) return false
    if (pos.y === 0) return false
    if (pos.x === board.size - 1) return false
    if (pos.y === board.size - 1) return false
    return true
  })
  newBoard.draw()

  return newBoard
}

const blockOf = (
  type: SelectableObject | 'none'
):
  | typeof Player
  | typeof Exit
  | typeof Wall
  | typeof Water
  | typeof Leaves
  | typeof Sheep
  | typeof SheepTarget
  | 'none' => {
  switch (type) {
    case 'player':
      return Player
    case 'exit':
      return Exit
    case 'wall':
      return Wall
    case 'water':
      return Water
    case 'leaves':
      return Leaves
    case 'sheep':
      return Sheep
    case 'target':
      return SheepTarget
    case 'none':
      return 'none'
    default:
      throw new Error(`Unknown object type: ${type}`)
  }
}

let listener: ((e: MouseEvent) => void) | null

type SelectableObject = 'player' | 'exit' | 'wall' | 'water' | 'leaves' | 'sheep' | 'target'

const LevelPainter: NextPage = () => {
  const gameRoot = useRef<HTMLDivElement>(null)

  const [, updateState] = useState<any>()
  const forceUpdate = useCallback(() => updateState({}), [])

  const [board, setBoard] = useState<Board | null>(null)
  const [boardSize, setBoardSize] = useState<number>(5)
  const [playerPos, setPlayerPos] = useState<Point>(new Point(1, 1))
  const [exitPos, setExitPos] = useState<Point>(new Point(1, 1))

  const [selected, setSelected] = useState<SelectableObject | 'none'>('player')
  const [color, setColor] = useState<SheepColor>('white')
  const [surroundBlock, setSurroundBlock] = useState<SelectableObject | 'none'>('none')

  const [exported, setExported] = useState<string>('')

  const onClick = useCallback(
    (e: MouseEvent) => {
      const { offsetX, offsetY } = e
      const cellX = Math.floor(offsetX / (BOARD_SCALE * TEXTURE_SIZE * TEXTURE_SCALE))
      const cellY = Math.floor(offsetY / (BOARD_SCALE * TEXTURE_SIZE * TEXTURE_SCALE))

      if (selected === 'player') {
        setPlayerPos(new Point(cellX, cellY))
      } else if (selected === 'exit') {
        setExitPos(new Point(cellX, cellY))
      } else {
        const Object = blockOf(selected)
        const existing = board?.objects.find(
          (obj) =>
            obj.pos.x === cellX &&
            obj.pos.y === cellY &&
            !(obj instanceof Player) &&
            !(obj instanceof Exit)
        )
        if (existing) {
          board?.removeObject(existing)
          if (Object === 'none') return
          if (existing instanceof Object) {
            forceUpdate()
            return
          }
        }
        if (Object === 'none') return
        let newObject: GameObject
        if (Object === Sheep || Object === SheepTarget) {
          newObject = new Object(new Point(cellX, cellY), color)
        } else {
          newObject = new Object(new Point(cellX, cellY))
        }
        if (board?.animHandle) cancelAnimationFrame(board?.animHandle)
        board?.addObjects(newObject).then(() => {
          board?.draw()
          forceUpdate()
        })
      }
    },
    [selected, board, color, forceUpdate]
  )

  useEffect(() => {
    // prettier-ignore
    (window as any).board = board
    if (listener) board?.canvas.removeEventListener('click', listener)
    board?.canvas.addEventListener('click', (listener = onClick))
  }, [board, onClick])

  useEffect(() => {
    const init = async (): Promise<void> => {
      if (gameRoot.current) {
        if (board?.animHandle) cancelAnimationFrame(board.animHandle)
        gameRoot.current.innerHTML = ''
        const newBoard = new Board({
          size: boardSize,
          container: gameRoot.current,
          player: new Player(playerPos),
          exit: new Exit(exitPos),
        })
        newBoard.draw()
        setBoard(newBoard)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    board && (board.player.pos = playerPos)
    forceUpdate()
  }, [board, playerPos, forceUpdate])

  useEffect(() => {
    board && (board.exit.pos = exitPos)
    forceUpdate()
  }, [board, exitPos, forceUpdate])

  useEffect(() => {
    if (!gameRoot.current || !board || board.size === boardSize) return
    setBoard(updateBoardSize(board, boardSize))
  }, [board, boardSize])

  useEffect(() => {
    if (!gameRoot.current || !board) return
    const newBoard = updateBoardSize(board, boardSize)

    let Block: typeof GameObject | null

    switch (surroundBlock) {
      case 'leaves':
        Block = Leaves
        break
      case 'wall':
        Block = Wall
        break
      case 'water':
        Block = Water
        break
      case 'none':
      default:
        Block = null
        break
    }

    newBoard.objects = newBoard.objects.filter(excludeEdge(newBoard))

    if (Block != null) {
      // @ts-expect-error
      newBoard.addObjects(...Point.surround(boardSize).map((pos) => new Block!(pos)))
    }

    setBoard(newBoard)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surroundBlock])

  const doExport = useCallback(() => {
    if (!board) return
    const boardSize = board.size
    const playerPos = board.player.pos
    const exitPos = board.exit.pos
    const objects = board.objects
      .filter(excludeEdge(board))
      .filter((obj) => !(obj instanceof Player) && !(obj instanceof Exit))

    const level = {
      size: boardSize,
      player: `${playerPos.x},${playerPos.y}`,
      facing: board.player.facingName(),
      exit: `${exitPos.x},${exitPos.y}`,
      walls: [
        surroundBlock === 'wall' && 'surround',
        ...objects.filter((obj) => obj instanceof Wall).map((obj) => `${obj.pos.x},${obj.pos.y}`),
      ].filter(Boolean),
      leaves: [
        surroundBlock === 'leaves' && 'surround',
        ...objects.filter((obj) => obj instanceof Leaves).map((obj) => `${obj.pos.x},${obj.pos.y}`),
      ].filter(Boolean),
      water: [
        surroundBlock === 'water' && 'surround',
        ...objects.filter((obj) => obj instanceof Water).map((obj) => `${obj.pos.x},${obj.pos.y}`),
      ].filter(Boolean),
      sheep: Object.fromEntries(
        objects
          .filter((obj) => obj instanceof Sheep)
          .map((obj) => [`${obj.pos.x},${obj.pos.y}`, (obj as Sheep).color])
      ),
      targets: Object.fromEntries(
        objects
          .filter((obj) => obj instanceof SheepTarget)
          .map((obj) => [`${obj.pos.x},${obj.pos.y}`, (obj as SheepTarget).color])
      ),
    }

    const yaml = YAML.stringify(level).replace(/^(\s+)"([\d,]+)":/gm, '$1$2:')
    setExported(yaml)
  }, [board, surroundBlock])

  return (
    <>
      <div className="flex flex-col h-full p-4">
        <div className="flex flex-shrink">
          <div className="flex flex-col h-full mx-4">
            <Button intent="success" onClick={doExport} className="mb-4">
              Export
            </Button>

            <Label className="mb-2">
              Board Size
              <NumericInput
                min={3}
                max={15}
                title="Board Size"
                value={boardSize}
                onValueChange={(v) => setBoardSize(v)}
              />
            </Label>
            <RadioGroup
              label="Surround block"
              onChange={(e) => setSurroundBlock(e.currentTarget.value as SelectableObject)}
              selectedValue={surroundBlock}
            >
              <Radio label="wall" value="wall" />
              <Radio label="leaves" value="leaves" />
              <Radio label="water" value="water" />
              <Radio label="none" value="none" />
            </RadioGroup>
            <div>
              {board?.objects.filter(excludeEdge(board)).map((obj) => (
                <div key={obj.id} className="flex items-center">
                  <code className="flex-grow">
                    {obj.name}({obj.pos.x}, {obj.pos.y})
                  </code>
                  {!(obj instanceof Player) && !(obj instanceof Exit) && (
                    <Button
                      minimal
                      icon="small-cross"
                      onClick={() => {
                        board?.removeObject(obj)
                        forceUpdate()
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-grow mx-4">
            <Label className="mb-2">
              <RadioGroup
                key="selected-radio-group"
                label="Selected"
                onChange={(e) => setSelected(e.currentTarget.value as SelectableObject)}
                selectedValue={selected}
              >
                <Radio label="player" value="player" />
                <Radio label="exit" value="exit" />
                <Radio label="wall" value="wall" />
                <Radio label="water" value="water" />
                <Radio label="leaves" value="leaves" />
                <Radio label="sheep" value="sheep" />
                <Radio label="target" value="target" />
                <Radio label="none" value="none" />
              </RadioGroup>
            </Label>
            {(selected === 'sheep' || selected === 'target') && (
              <Label className="mb-2 ml-6">
                <RadioGroup
                  label="Color"
                  onChange={(e) => setColor(e.currentTarget.value as SheepColor)}
                  selectedValue={color}
                >
                  <Radio label="black" value="black" />
                  <Radio label="blue" value="blue" />
                  <Radio label="brown" value="brown" />
                  <Radio label="cyan" value="cyan" />
                  <Radio label="gray" value="gray" />
                  <Radio label="green" value="green" />
                  <Radio label="lightblue" value="lightblue" />
                  <Radio label="lightgray" value="lightgray" />
                  <Radio label="lime" value="lime" />
                  <Radio label="magenta" value="magenta" />
                  <Radio label="orange" value="orange" />
                  <Radio label="pink" value="pink" />
                  <Radio label="purple" value="purple" />
                  <Radio label="red" value="red" />
                  <Radio label="white" value="white" />
                  <Radio label="yellow" value="yellow" />
                </RadioGroup>
              </Label>
            )}
          </div>
          <div>
            <div ref={gameRoot} className="mx-4"></div>
            {exported && (
              <div className="mt-8 prose prose-invert">
                <pre>{exported}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default LevelPainter

const excludeEdge =
  (newBoard: Board): ((obj: GameObject) => boolean) =>
  ({ pos }) => {
    if (pos.x === 0) return false
    if (pos.y === 0) return false
    if (pos.x === newBoard.size - 1) return false
    if (pos.y === newBoard.size - 1) return false
    return true
  }
