declare interface ParseResult {
  trace: string
}

declare interface ExecuteResult {
  exitCode: number
  stdout: string
  stderr: string
  trace: string
}

declare interface GooseWASM {
  tokenize: (namePtr: number, nameSize: number, sourcePtr: number, sourceSize: number) => number
  parse: (namePtr: number, nameSize: number, sourcePtr: number, sourceSize: number) => number
  execute: (namePtr: number, nameSize: number, sourcePtr: number, sourceSize: number) => number
}

type PtrSize = [ptr: number, size: number]

declare interface WASMExecuteResult {
  exitCode: number
  stdout: PtrSize
  stderr: PtrSize
  trace: PtrSize
}

declare interface GooseWorker {
  isReady: bool
  init: () => Promise<void>
  tokenize: (name: string, source: string) => string
  parse: (name: string, source: string) => string
  execute: (name: string, source: string) => ExecuteResult
  restart: () => Promise<void>
}

declare const Goose: GooseWorker
