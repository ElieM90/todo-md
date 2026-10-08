import { expect, test } from 'claude-code/testing'

import { append, clearDone, parse, toggle } from './todos'

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
