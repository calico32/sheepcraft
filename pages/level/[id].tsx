import { Button, ButtonGroup, Checkbox, H1, H3, HTMLTable } from '@blueprintjs/core'
import Editor from '@monaco-editor/react'
import { type editor } from 'monaco-editor'
import type { NextPage } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import HardcoreTimer from '../../components/HardcoreTimer'
import { useGoose, useHardcore, useToaster } from '../../lib/context'
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
import { ZooLib, ZooLibExec } from '../../lib/game/zoolib'
import { chunk, deepClone } from '../../lib/util'

interface RunResult {
  canRerun: boolean
  success: boolean
  actionCount: number
  callCount: number
  exec: ZooLibExec
}

const runResult = (): RunResult => ({
  canRerun: true,
  success: true,
  actionCount: 0,
  callCount: 0,
  exec: { calls: {}, actions: [], callCount: 0, size: 0 },
})

const makeBoard = async (
  levelDef: { [key: string]: any },
  gameRoot: HTMLElement
): Promise<Board> => {
  levelDef = deepClone(levelDef)

  const player = new Player(Point.from(levelDef.player))
  switch (levelDef.facing) {
    case undefined:
    case null:
    case 'north':
      player.facing = Point.north
      break
    case 'east':
      player.facing = Point.east
      break
    case 'south':
      player.facing = Point.south
      break
    case 'west':
      player.facing = Point.west
      break
    default:
      throw new Error(`Invalid facing: ${levelDef.facing}`)
  }

  gameRoot.innerHTML = ''
  const board = new Board({
    size: levelDef.size,
    container: gameRoot,
    player,
    exit: new Exit(Point.from(levelDef.exit)),
    maxCalls: levelDef.max_calls,
    maxActions: levelDef.max_steps,
    maxChars: levelDef.max_chars,
  })
  const objs: GameObject[] = []

  if (Array.isArray(levelDef.walls)) {
    if (levelDef.walls.includes('surround')) {
      levelDef.walls.splice(levelDef.walls.indexOf('surround'), 1)
      objs.push(...Point.surround(board.size).map((p) => new Wall(p)))
    }

    for (const point of levelDef.walls) {
      objs.push(new Wall(Point.from(point)))
    }
  }

  if (Array.isArray(levelDef.leaves)) {
    if (levelDef.leaves.includes('surround')) {
      levelDef.leaves.splice(levelDef.leaves.indexOf('surround'), 1)
      objs.push(...Point.surround(board.size).map((p) => new Leaves(p)))
    }

    for (const point of levelDef.leaves) {
      objs.push(new Leaves(Point.from(point)))
    }
  }

  if (Array.isArray(levelDef.water)) {
    if (levelDef.water.includes('surround')) {
      levelDef.water.splice(levelDef.water.indexOf('surround'), 1)
      objs.push(...Point.surround(board.size).map((p) => new Water(p)))
    }

    for (const point of levelDef.water) {
      objs.push(new Water(Point.from(point)))
    }
  }

  if (typeof levelDef.sheep === 'object') {
    for (const [pos, color] of Object.entries(levelDef.sheep)) {
      objs.push(new Sheep(Point.from(pos), String(color) as SheepColor))
    }
  }

  if (typeof levelDef.targets === 'object') {
    for (const [pos, color] of Object.entries(levelDef.targets)) {
      objs.push(new SheepTarget(Point.from(pos), String(color) as SheepColor))
    }
  }

  await board.addObjects(...objs)

  board.draw()

  return board
}

const Level: NextPage = () => {
  const router = useRouter()
  const toaster = useToaster()
  const goose = useGoose()
  const gameRoot = useRef<HTMLDivElement>(null)

  const { hardcore, timer } = useHardcore()
  const [zoolib] = useState<ZooLib>(new ZooLib())
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor | null>(null)
  const [needReset, setNeedReset] = useState(false)
  const [board, setBoard] = useState<Board | null>(null)
  const [source, setSource] = useState(defaultSource)
  const [result, setResult] = useState<RunResult | null>(null)

  const level = useMemo(() => parseInt(router.query.id as string) || 1, [router])
  const [levelDef, setLevelDef] = useState<{ [key: string]: any } | null>(null)

  useEffect(() => {
    if (!hardcore) return

    navigator.clipboard.writeText('frog')

    const clobberClipboard = (e: ClipboardEvent): void => {
      e.preventDefault()
      navigator.clipboard.writeText('frog')
    }

    document.addEventListener('cut', clobberClipboard)
    document.addEventListener('copy', clobberClipboard)

    const blurListener = (): void => {
      timer.setStartTime(-1)
      toaster.show({
        message: 'your time is now invalid (you lost focus)',
        intent: 'danger',
        icon: 'cross',
      })
    }

    window.addEventListener('blur', blurListener, { once: true })

    return () => {
      document.removeEventListener('cut', clobberClipboard)
      document.removeEventListener('copy', clobberClipboard)
      window.removeEventListener('blur', blurListener)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const init = async (): Promise<void> => {
      const ldef = await import(`../../lib/game/levels/${level}.yml`)
        .then((m) => m.default)
        .catch(() => null)

      if (!ldef) {
        throw new Error(`Level ${level} not found`)
      }

      if (gameRoot.current) {
        gameRoot.current.innerHTML = ''
        if (board?.animHandle) cancelAnimationFrame(board.animHandle)
        setBoard(await makeBoard(ldef, gameRoot.current))
        setLevelDef(ldef)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, router])

  useEffect(() => {
    if (board && result?.exec?.actions.length) {
      if (result.exec.actions.length === 1) {
        setTimeout(() => {
          board.handleAction(result.exec.actions[0])
          setResult({
            ...runResult(),
            ...result,
            canRerun: true,
            exec: { ...result.exec, actions: [] },
          })
          setNeedReset(true)
        }, levelDef?.delay ?? 400)
      } else {
        setTimeout(() => {
          board.handleAction(result.exec.actions[0])
          setResult({
            ...result,
            exec: {
              ...result.exec,
              actions: result.exec.actions.slice(1),
            },
          })
        }, levelDef?.delay ?? 400)
      }
    }
  }, [result, board, levelDef])

  const run = useCallback(async (): Promise<void> => {
    if (!!result && !result.canRerun) return
    if (!goose.worker) return console.error('worker not ready')
    await goose.worker.restart()

    const code = editor?.getValue() || source

    if (needReset) {
      setNeedReset(false)
      setResult(null)
      gameRoot.current!.innerHTML = ''
      if (!levelDef) throw new Error('levelDef not set')
      if (board?.animHandle) cancelAnimationFrame(board.animHandle)
      setBoard(await makeBoard(levelDef, gameRoot.current!))
    }

    const allSource = zoolib.addScript(code)
    try {
      const res = await goose.worker.execute('main.goose', allSource)

      if (res.exitCode !== 0 || res.stderr.length > 0) {
        setResult({ ...runResult(), canRerun: true, success: false })
      }

      const actions = zoolib.exec(res.stdout)
      setResult({
        ...runResult(),
        canRerun: false,
        exec: actions,
        actionCount: actions.actions.length,
        callCount: actions.callCount,
      })
    } catch (err: any) {
      toaster.show({
        message: `Error: ${err.message || err}`,
        intent: 'danger',
        icon: 'error',
      })
      setResult({ ...runResult(), canRerun: true, success: false })
    }
  }, [goose, result, needReset, zoolib, editor, source, levelDef, board, toaster])

  useEffect(() => {
    if (editor) {
      const addCommand = async (): Promise<void> => {
        const { KeyCode, KeyMod } = await import('monaco-editor')
        editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, run)
      }

      addCommand()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, run])

  const chunked = useMemo(() => chunk(Object.entries(zoolib.documentation()), 6), [zoolib])

  const solveState = board?.solveState(result?.exec)

  const nextLevel = useCallback(
    (levelNum = level + 1) => {
      if (level === 8) {
        router.push('/end')
        return
      }
      // level change, reset
      setResult(null)
      setNeedReset(true)
      setSource(defaultSource)
      editor?.setValue(defaultSource)
      router.push(`/level/${levelNum}`)
    },
    [router, level, editor]
  )

  return (
    <>
      <Head>
        <title>sheepcraft - Level {level}</title>
      </Head>
      <div className="flex flex-col h-full p-4">
        <div className="flex flex-grow pb-4">
          <div className="flex flex-col flex-grow mr-4">
            <div className="flex-grow mb-3 prose prose-invert">
              <H1 className="mb-2">Level {level}</H1>
              {levelDef?.description && (
                <p className="mt-0" dangerouslySetInnerHTML={{ __html: levelDef.description }} />
              )}
            </div>
            <div>
              {solveState && (
                <>
                  <H3>Objectives</H3>
                  <div className="flex flex-col">
                    <div className="flex">
                      <Checkbox disabled checked={solveState.playerOnExit} className="w-16" />
                      <span>Player on exit</span>
                    </div>
                    {solveState.sheepOnTargets.total > 0 && (
                      <div className="flex">
                        {solveState.sheepOnTargets.solved ? (
                          <Checkbox disabled checked={true} className="w-16" />
                        ) : (
                          <span
                            className={`w-16 mb-[10px] ${
                              solveState.sheepOnTargets.current > 0 ? 'text-red-3' : 'text-gray-3'
                            }`}
                          >
                            {solveState.sheepOnTargets.current}/{solveState.sheepOnTargets.total}
                          </span>
                        )}
                        <span>Sheep on targets</span>
                      </div>
                    )}
                    {board?.options.maxActions &&
                      (!solveState.actions || solveState.actions.solved ? (
                        <div className="flex">
                          <Checkbox disabled checked className="w-16" />
                          <span>Under step limit ({board.options.maxActions})</span>
                        </div>
                      ) : (
                        <div className="flex">
                          <span className="w-16 mb-[10px] text-red-3">
                            {solveState.actions.current}/{solveState.actions.max}
                          </span>
                          <span>Step limit exceeded</span>
                        </div>
                      ))}
                    {board?.options.maxCalls &&
                      (!solveState.calls || solveState.calls.solved ? (
                        <div className="flex">
                          <Checkbox disabled checked className="w-16" />
                          <span>Under function call limit ({board.options.maxCalls})</span>
                        </div>
                      ) : (
                        <div className="flex">
                          <span className="w-16 mb-[10px] text-red-3">
                            {solveState.calls.current}/{solveState.calls.max}
                          </span>
                          <span>Function call limit exceeded</span>
                        </div>
                      ))}
                    {board?.options.maxChars &&
                      (!solveState.size || solveState.size.solved ? (
                        <div className="flex">
                          <Checkbox disabled checked className="w-16" />
                          <span>Code under size limit ({board.options.maxChars} chars)</span>
                        </div>
                      ) : (
                        <div className="flex">
                          <span className="w-16 mb-[10px] text-red-3">
                            {solveState.size.current}/{solveState.size.max}
                          </span>
                          <span>Code size limit exceeded</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <aside className="min-w-[324.36px] flex flex-col">
            <div className="flex-grow flex">
              <div className="flex-grow" />
              <div className="flex flex-col gap-2 items-end">
                <Button className="w-max" onClick={() => router.push('/')} intent="primary">
                  Home
                </Button>

                {process.env.NODE_ENV === 'development' && (
                  <Button className="w-max" onClick={() => nextLevel(8)}>
                    Skip to level 8
                  </Button>
                )}

                <HardcoreTimer />
              </div>
            </div>
            <H3>Function Reference</H3>
            <HTMLTable bordered striped condensed>
              <thead>
                <tr>
                  {chunked.map((_, i) => (
                    <Fragment key={i}>
                      <th>Function</th>
                      <th>Description</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chunked[0].map((_, i) => (
                  <tr key={i}>
                    {chunked.map(
                      (col, j) =>
                        col[i] && (
                          <Fragment key={j}>
                            <td>
                              <code>{col[i][0]}</code>
                            </td>
                            <td>{col[i][1]}</td>
                          </Fragment>
                        )
                    )}
                  </tr>
                ))}
              </tbody>
            </HTMLTable>
          </aside>
        </div>
        <div className="flex flex-shrink">
          <div ref={gameRoot}></div>
          <div className="flex flex-col flex-grow h-full ml-4">
            <Editor
              theme="oneDark"
              options={{
                minimap: { enabled: false },
                fontLigatures: true,
                cursorSmoothCaretAnimation: true,
                smoothScrolling: true,
                scrollBeyondLastLine: false,
                tabSize: 2,
                detectIndentation: false,
                wordWrap: 'on',
              }}
              wrapperProps={{
                className: 'shadow-xl',
              }}
              defaultLanguage="goose"
              height={`calc(${
                BOARD_SCALE * (board?.size ?? 10) * TEXTURE_SCALE * TEXTURE_SIZE
              }px - 32px)`}
              width={`calc(100vw - ${
                BOARD_SCALE * (board?.size ?? 10) * TEXTURE_SCALE * TEXTURE_SIZE
              }px - 48px)`}
              defaultValue={defaultSource}
              onChange={(e) => setSource(e ?? '')}
              onMount={(editor) => setEditor(editor)}
            />
            <div className="flex">
              <ButtonGroup fill>
                <Button onClick={run} disabled={!!result && !result.canRerun} intent="primary">
                  Run
                </Button>
                <Button onClick={nextLevel} disabled={!solveState?.solved} intent="success">
                  {level === 8 ? 'Finish' : 'Next Level'}
                </Button>
              </ButtonGroup>
            </div>
            {result != null && !result?.success && !result?.exec.actions.length && (
              <div className="text-red-3">Error</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Level

const defaultSource = `\
// Write your code here
`
