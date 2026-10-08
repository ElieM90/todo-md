import type { Todo } from '../types'

// any list line (-, *, +, 1. or 1)) is a todo, nested ones included; headings and prose ignored
const ITEM = /^(\s*(?:[-*+]|\d+[.)])\s+)(?:\[([ xX])\]\s*)?(.+)$/
const FENCE = /^\s*(?:```|~~~)/

const isDone = (m: RegExpExecArray) => m[2] === 'x' || m[2] === 'X'

// walks the todo lines outside code fences, in order; fn returns a replacement line,
// null to drop the line, or undefined to keep it. Line endings are preserved.
const scan = (md: string, fn: (m: RegExpExecArray, n: number) => string | null | undefined): string => {
  let fenced = false
  let n = -1
  return md.split(/(?<=\n)/).map(raw => {
    const eol = /\r?\n$/.exec(raw)?.[0] ?? ''
    const line = raw.slice(0, raw.length - eol.length)
    if (FENCE.test(line)) {
      fenced = !fenced
      return raw
    }
    const m = fenced ? null : ITEM.exec(line)
    if (!m?.[3]?.trim()) return raw
    const out = fn(m, ++n)
    return out === null ? '' : out === undefined ? raw : out + eol
  }).join('')
}

export const parse = (md: string): Todo[] => {
  const list: Todo[] = []
  scan(md, m => void list.push({ text: m[3]!.trim(), done: isDone(m) }))
  return list
}

// one todo per non-empty line; a pasted "- [ ] x" / "* x" / "1. x" keeps just its text
export const append = (md: string, text: string): string => {
  const items = text.split(/\r?\n/).map(l => l.replace(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s*)?/, '').trim()).filter(Boolean)
  if (!items.length) return md
  return `${md}${md === '' || md.endsWith('\n') ? '' : '\n'}${items.map(i => `- [ ] ${i}\n`).join('')}`
}

// flips the index-th todo between [ ] and [x]; other lines untouched
export const toggle = (md: string, index: number): string =>
  scan(md, (m, n) => n === index ? `${m[1]}[${isDone(m) ? ' ' : 'x'}] ${m[3]}` : undefined)

// drops every done todo line; other lines untouched
export const clearDone = (md: string): string => scan(md, m => isDone(m) ? null : undefined)

// where a todo shown at `index` with `text` is now: the file may have changed since it was drawn
export const locate = (list: Todo[], index: number, text: string): number =>
  list[index]?.text === text ? index : list.findIndex(t => t.text === text)
