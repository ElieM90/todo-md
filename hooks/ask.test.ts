import { expect, mock, test } from 'claude-code/testing'

test('/todo review and /todo tidy hand a prompt to Claude', async ($, on) => {
  const clock = mock.clock(on)
  let md = '- [ ] a\n'
  const prompts: string[] = []
  on('fs.read', () => ({ value: md }))
  on('fs.write', (_$, e) => {
    md = e.text
    return { value: undefined }
  })
  on('prompt.submit', (_$, e) => {
    prompts.push(e.text)
    return { value: { text: e.text } } as never
  })
  await $.command.run({ command: 'todo', args: 'review' } as never)
  await $.command.run({ command: 'todo', args: ' tidy ' } as never)
  await clock.settle()
  expect(prompts.length).toBe(2)
  expect(prompts[0]).toContain('what to start with')
  expect(prompts[1]).toContain('ask me which one to keep')
  expect(md).toBe('- [ ] a\n')
  // an inherited name is not a subcommand: it is added as a task
  await $.command.run({ command: 'todo', args: 'toString' } as never)
  await clock.settle()
  expect(prompts.length).toBe(2)
  expect(md).toBe('- [ ] a\n- [ ] toString\n')
})
