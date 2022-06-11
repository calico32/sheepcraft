import { expose } from 'comlink'
import './wasm_exec.js'

{
  const log = console.log
  const error = console.error
  const debug = console.debug
  console.log = (...args: any[]) => log('[worker]', ...args)
  console.error = (...args: any[]) => error('[worker]', ...args)
  console.debug = (...args: any[]) => debug('[worker]', ...args)
}

type GoWebAssemblyInstance = WebAssembly.Instance & {
  exports: WebAssembly.Exports & GooseWASM & GoExports
}

interface GoExports {
  memory: WebAssembly.Memory
  malloc: (size: number) => number
}

const writeString = (s: string): [ptr: number, size: number] => {
  const mem = new Uint8Array(instance.exports.memory.buffer)
  const ptr = instance.exports.malloc(s.length)

  const str = new TextEncoder().encode(s)
  mem.set(str, ptr)

  return [ptr, s.length]
}

const readPackedString = (bufptr: number): string => {
  // the special value 0 means empty string
  if (bufptr === 0) {
    return ''
  }
  // ret is a pointer to a 8 byte buffer in wasm memory
  // the first 4 bytes is the pointer to the string (LE), the last 4 bytes is the length of the string (LE)
  const view = new DataView(instance.exports.memory.buffer)
  const ptr = view.getUint32(bufptr, true)
  const len = view.getUint32(bufptr + 4, true)
  return readString(ptr, len)
}

const readString = (ptr: number, size: number): string => {
  if (ptr === 0 || size === 0) {
    return ''
  }
  const mem = instance.exports.memory.buffer
  const buf = mem.slice(ptr, ptr + size)
  return new TextDecoder('utf-8').decode(buf)
}

let go: Go
let wasm: Promise<Response>
let mod: WebAssembly.Module
let instance: GoWebAssemblyInstance

const ready = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      console.debug('waiting for goose to be ready')
      if (typeof instance?.exports?.tokenize === 'function') {
        clearInterval(interval)
        resolve()
      }
    }, 100)
  })
  console.debug('goose is ready')
}

const MEM_PAGES = 40

const gooseWorker: GooseWorker = {
  isReady: false,
  init: async (): Promise<void> => {
    go = new Go()
    go.importObject.env = {
      ...go.importObject.env,
      'main._log': (ptr: number, size: number) => {
        const mem: ArrayBuffer = instance.exports.memory.buffer
        const buf = mem.slice(ptr, ptr + size)
        const str = new TextDecoder('utf-8').decode(buf)
        console.log(str)
      },
    }

    // next doesn't think fetch() can take a URL, but it can
    wasm = fetch(new URL('./goose.wasm', import.meta.url) as any)

    mod = await WebAssembly.compileStreaming(wasm)
    instance = (await WebAssembly.instantiate(mod, go.importObject)) as GoWebAssemblyInstance
    instance.exports.memory.grow(MEM_PAGES)
    go.run(instance)
    await ready()
    gooseWorker.isReady = true
  },

  tokenize: (name: string, source: string): string => {
    try {
      return readPackedString(
        instance.exports.tokenize(...writeString(name), ...writeString(source))
      )
    } catch (err: any) {
      console.error(err)
      return err.message
    }
  },
  parse: (name: string, source: string): string => {
    try {
      return readPackedString(instance.exports.parse(...writeString(name), ...writeString(source)))
    } catch (err: any) {
      console.error(err)
      return err.message
    }
  },
  execute: (name: string, source: string): ExecuteResult => {
    let str: string
    try {
      const result = instance.exports.execute(...writeString(name), ...writeString(source))
      str = readPackedString(result)
    } catch (err: any) {
      if (err.message === 'unreachable') {
        // panic
        const output = (go as any).printOutput
        str = output[output.length - 1]
      } else {
        str = err.message
      }
      console.error(err)
      return {
        exitCode: -1,
        stdout: '',
        stderr: str,
        trace: '',
      }
    }

    if (!str.startsWith('{')) {
      return {
        exitCode: -1,
        stdout: str,
        stderr: '',
        trace: '',
      }
    }

    try {
      const json: WASMExecuteResult = JSON.parse(str)

      return {
        exitCode: json.exitCode,
        stdout: readString(...json.stdout),
        stderr: readString(...json.stderr),
        trace: readString(...json.trace),
      }
    } catch (err) {
      console.error(err)
      return {
        exitCode: -1,
        stdout: str,
        stderr: '',
        trace: '',
      }
    }
  },
  restart: async () => {
    gooseWorker.isReady = false
    instance = (await WebAssembly.instantiate(mod, go.importObject)) as GoWebAssemblyInstance
    instance.exports.memory.grow(MEM_PAGES)
    go.run(instance)
    await ready()
    gooseWorker.isReady = true
  },
}

expose(gooseWorker)
