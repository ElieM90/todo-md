import { expect, test } from 'claude-code/testing'

import { append, clearDone, locate, parse, toggle } from './todos'

test('parses, appends and toggles todo.md items', async () => {
  expect(parse('# Todo\n- [ ] milk\n* [x] eggs\n- bread\ntext')).toEqual([
    { text: 'milk', done: false },
    { text: 'eggs', done: true },
    { text: 'bread', done: false },
  ])
  expect(append('', 'milk')).toBe('- [ ] milk\n')
  expect(append('# Todo', 'milk')).toBe('# Todo\n- [ ] milk\n')
  expect(append('', 'milk\r\n\n- [ ] eggs\n* bread ')).toBe('- [ ] milk\n- [ ] eggs\n- [ ] bread\n')
  expect(append('x\n', ' \n')).toBe('x\n')
  expect(toggle('# T\n- [ ] a\n- [ ] b\n', 1)).toBe('# T\n- [ ] a\n- [x] b\n')
  expect(toggle('- [X] a\r\n- b\r\n', 0)).toBe('- [ ] a\r\n- b\r\n')
  expect(toggle('- a\n', 0)).toBe('- [x] a\n')
  expect(clearDone('# T\r\n- [x] a\r\n- [ ] b\r\n* [X] c')).toBe('# T\r\n- [ ] b\r\n')
})

test('handles other list markers and skips code fences', async () => {
  const md = '+ [ ] plus\n1. [x] one\n2) two\n```sh\n- [ ] not a todo\n```\n  - [ ] nested\n'
  expect(parse(md).map(t => t.text)).toEqual(['plus', 'one', 'two', 'nested'])
  // index 3 is "nested", past the fenced line: the fence must not shift indices
  expect(toggle(md, 3)).toBe(md.replace('  - [ ] nested', '  - [x] nested'))
  expect(clearDone(md)).toBe(md.replace('1. [x] one\n', ''))
  expect(append('', '1. a\n+ [x] b')).toBe('- [ ] a\n- [ ] b\n')
})

test('locate follows a todo whose line moved since it was drawn', async () => {
  const list = parse('- [ ] new\n- [ ] a\n- [ ] b\n')
  expect(locate(list, 1, 'a')).toBe(1)
  expect(locate(list, 0, 'a')).toBe(1)
  expect(locate(list, 0, 'gone')).toBe(-1)
})
