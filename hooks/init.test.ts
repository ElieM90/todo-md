import { expect, test } from 'claude-code/testing'

test('/todo init creates todo.md once and opens the pane', async ($, on) => {
  let md: string | null = null
  const writes: string[] = []
  on('fs.read', () => md === null ? { deny: 'ENOENT' } as never : { value: md })
  on('fs.write', (_$, e) => {
    md = e.text
    writes.push(e.text)
    return { value: undefined }
  })
  let opened = ''
  on('ui.open', (_$, e) => {
    opened = e.id
    return { value: { isPlaced: true as const } }
  })
  const first = await $.command.run({ command: 'todo', args: 'init' } as never)
  expect(md).toBe('# Todo\n\n')
  expect(opened).toBe('todo-md')
  expect(JSON.stringify(first)).toContain('Created todo.md')
  // an existing file is left alone, not reset or given an "init" task
  md = '- [ ] keep me\n'
  const second = await $.command.run({ command: 'todo', args: ' init ' } as never)
  expect(md).toBe('- [ ] keep me\n')
  expect(writes.length).toBe(1)
  expect(JSON.stringify(second)).toContain('already exists')
})
