import { stripIndent, stripIndents } from 'common-tags'
import { flatten, generateId } from '../util'

const wrap =
  (begin: string, end: string) =>
  (strings: TemplateStringsArray, ...values: string[]): string =>
    `${begin} ${flatten(strings, ...values)} ${end}`

const repeatN = wrap('repeat n times', 'end')

export interface ZooLibExec {
  actions: string[]
  calls: { [action: string]: number }
  size: number
  callCount: number
}

export class ZooLib {
  readonly id: string
  constructor() {
    this.id = generateId(2)
  }

  action(name: string): string {
    return stripIndents`
      let __${this.id}__${name}__calls__ = 0
      fn ${name}(n = 1)
        __${this.id}__${name}__calls__++
        ${repeatN`print("__${this.id}__${name}__")`}
      end
    `
  }

  actionEnd(name: string): string {
    return stripIndents`
      print("__${this.id}__${name}__calls__\${__${this.id}__${name}__calls__}__")
    `
  }

  documentation(): { [key: string]: string } {
    return {
      'forward(n = 1)': 'move forward n steps',
      'backward(n = 1)': 'move backward n steps',
      'left(n = 1)': 'move left n steps',
      'right(n = 1)': 'move right n steps',
      'turnLeft(n = 1)': 'turn left n times',
      'turnRight(n = 1)': 'turn right n times',
    }
  }

  addScript(source: string): string {
    return stripIndent`\
      print("__${this.id}_codesize__${source.length}__")
      ${this.action('forward')}
      ${this.action('backward')}
      ${this.action('left')}
      ${this.action('right')}
      ${this.action('turnLeft')}
      ${this.action('turnRight')}

      ${source}

      ${this.actionEnd('forward')}
      ${this.actionEnd('backward')}
      ${this.actionEnd('left')}
      ${this.actionEnd('right')}
      ${this.actionEnd('turnLeft')}
      ${this.actionEnd('turnRight')}
    `
  }

  exec(output: string): ZooLibExec {
    const lines = output.split('\n')
    const actions: ZooLibExec = {
      actions: [],
      calls: {},
      size: 0,
      callCount: 0,
    }
    for (const line of lines) {
      if (line.startsWith('__' + this.id + '__')) {
        const exec = /^__[^_]+__(.+?)__(?:calls__(\d+)__)?$/.exec(line)
        if (!exec) {
          throw new Error('unexpected line: ' + line)
        }
        if (exec[2]) {
          const n = parseInt(exec[2])
          actions.calls[exec[1]] = n
          actions.callCount += n
        } else {
          actions.actions.push(exec[1])
        }
      } else if (line.startsWith('__' + this.id + '_codesize__')) {
        const exec = /^__[^_]+_codesize__(\d+)__$/.exec(line)
        if (!exec) {
          throw new Error('unexpected line: ' + line)
        }
        actions.size = parseInt(exec[1])
      }
    }

    return actions
  }
}
