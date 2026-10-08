import type { Todo } from '../types'

// ponytail: any "- " / "* " line is a todo; nested lists and headings ignored
const ITEM = /^(\s*[-*]\s+)(?:\[([ xX])\]\s*)?(.+)$/

export const parse = (md: string): Todo[] =>
  md.split(/\r?\n/).flatMap(line => {
    const m = ITEM.exec(line)
    return m?.[3] ? [{ text: m[3].trim(), done: m[2] === 'x' || m[2] === 'X' }] : []
  })

// one todo per non-empty line; a pasted "- [ ] x" / "* x" keeps just its text
export const append = (md: string, text: string): string => {
  const items = text.split(/\r?\n/).map(l => l.replace(/^\s*[-*]\s+(?:\[[ xX]\]\s*)?/, '').trim()).filter(Boolean)
  if (!items.length) return md
  return `${md}${md === '' || md.endsWith('\n') ? '' : '\n'}${items.map(i => `- [ ] ${i}\n`).join('')}`
}

// flips the index-th todo line between [ ] and [x]; other lines untouched
export const toggle = (md: string, index: number): string => {
  let seen = -1
  return md.replace(/^.*$/gm, line => {
    const m = ITEM.exec(line)
    if (!m?.[3] || ++seen !== index) return line
    return `${m[1]}[${m[2] === 'x' || m[2] === 'X' ? ' ' : 'x'}] ${m[3]}`
  })
}

// drops every done todo line; other lines untouched
export const clearDone = (md: string): string =>
  md.split(/(?<=\n)/).filter(line => {
    const m = ITEM.exec(line.replace(/\r?\n$/, ''))
    return !(m?.[3] && (m[2] === 'x' || m[2] === 'X'))
  }).join('')
